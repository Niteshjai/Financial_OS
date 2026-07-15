import { FastifyInstance }      from 'fastify'
import { Pool } from 'pg'
import { b2bMiddleware,
         handleB2BRequest }    from '../b2b/gateway'
import { apiKeyManager }        from '../b2b/auth/apiKeyManager'
import { verifyAccessToken,
         requireRole }          from '../middleware/auth'
import { generateOpenApiSpec }  from '../b2b/docs/openApiGenerator'

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
  }
}

export async function b2bRoutes(app: FastifyInstance) {

  // ── ADMIN: Create B2B client and issue first API key
  app.post('/admin/b2b/clients', {
    preHandler: [verifyAccessToken, requireRole('admin')],
    handler: async (req, reply) => {
      const body = req.body as any

      const clientResult = await app.pg.query(`
        INSERT INTO b2b_clients (
          business_name, business_type, gstin, pan,
          contact_name, contact_email, contact_mobile,
          tier, rate_limit_per_hour, rate_limit_per_day,
          rate_limit_per_month, allowed_endpoints,
          price_per_call_paise, monthly_fee_paise,
          webhook_url, webhook_secret, webhook_events,
          data_sharing_agreement_signed
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        RETURNING id
      `, [
        body.businessName, body.businessType,
        body.gstin, body.pan,
        body.contactName, body.contactEmail, body.contactMobile,
        body.tier ?? 'basic',
        body.rateLimitPerHour ?? 100,
        body.rateLimitPerDay  ?? 1000,
        body.rateLimitPerMonth?? 20000,
        body.allowedEndpoints ?? [],
        body.pricePerCallPaise ?? 0,
        body.monthlyFeePaise   ?? 0,
        body.webhookUrl, body.webhookSecret,
        body.webhookEvents ?? [],
        body.agreementSigned ?? false
      ])

      const clientId = clientResult.rows[0].id

      // Issue first live API key
      const { keyId, apiKey, prefix } = await apiKeyManager.createKey(
        app.pg, clientId,
        { environment: 'live', description: 'Initial API key' }
      )

      // Issue sandbox key
      const sandbox = await apiKeyManager.createKey(
        app.pg, clientId,
        { environment: 'sandbox', description: 'Sandbox API key' }
      )

      return reply.status(201).send({
        success: true,
        data: {
          clientId,
          liveKey: {
            keyId,
            apiKey,     // Show ONCE
            prefix
          },
          sandboxKey: {
            keyId:  sandbox.keyId,
            apiKey: sandbox.apiKey,  // Show ONCE
            prefix: sandbox.prefix
          },
          warning: 'Store API keys securely. They will not be shown again.'
        }
      })
    }
  })

  // ── ADMIN: Get client usage
  app.get('/admin/b2b/clients/:clientId/usage', {
    preHandler: [verifyAccessToken, requireRole('admin')],
    handler: async (req, reply) => {
      const { clientId } = req.params as { clientId: string }
      const result = await app.pg.query(`
        SELECT
          period_start, period_type,
          total_calls, successful_calls, failed_calls,
          total_cost_paise
        FROM b2b_usage_summary
        WHERE client_id = $1
        ORDER BY period_start DESC LIMIT 60
      `, [clientId])
      return { success: true, data: result.rows }
    }
  })

  // ── USER: Grant consent to a B2B client
  app.post('/api/b2b/consent', {
    preHandler: [verifyAccessToken],
    schema: {
      body: {
        type: 'object',
        required: ['clientId', 'purpose'],
        properties: {
          clientId: { type: 'string', format: 'uuid' },
          purpose:  { type: 'string', minLength: 5 },
          scope:    { type: 'array', items: { type: 'string' } },
        }
      }
    },
    handler: async (req, reply) => {
      const { clientId, purpose, scope } = req.body as any

      const client = await app.pg.query(
        'SELECT business_name, business_type FROM b2b_clients WHERE id=$1 AND is_active=true',
        [clientId]
      )
      if (!client.rows[0]) return reply.status(404).send({
        success: false, error: { code: 'CLIENT_NOT_FOUND' }
      })

      await app.pg.query(`
        INSERT INTO b2b_user_consents (
          user_id, client_id, consent_scope, purpose
        ) VALUES ($1,$2,$3,$4)
        ON CONFLICT (user_id, client_id)
        DO UPDATE SET
          consent_scope = EXCLUDED.consent_scope,
          purpose       = EXCLUDED.purpose,
          consented_at  = NOW(),
          expires_at    = NOW() + INTERVAL '1 year',
          is_active     = true,
          revoked_at    = NULL
      `, [req.user!.id, clientId, scope ?? [], purpose])

      return { success: true, data: {
        message: `Consent granted to ${client.rows[0].business_name}`,
        expiresAt: new Date(Date.now() + 365*24*60*60*1000).toISOString()
      }}
    }
  })

  // ── USER: Revoke consent
  app.delete('/api/b2b/consent/:clientId', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const { clientId } = req.params as { clientId: string }
      await app.pg.query(`
        UPDATE b2b_user_consents
        SET is_active = false, revoked_at = NOW()
        WHERE user_id = $1 AND client_id = $2
      `, [req.user!.id, clientId])
      return { success: true }
    }
  })

  // ──────────────────────────────────────────────────
  // B2B API ENDPOINTS (external API key auth)
  // ──────────────────────────────────────────────────

  // Helper to run B2B middleware on routes
  const withB2BAuth = async (req: any, reply: any) => {
    const auth = await b2bMiddleware(req, reply, app.pg)
    if (!auth) return   // Reply already sent
    req.b2bClient = auth.client
    req.b2bKeyId  = auth.keyId
    req.b2bEnvironment = auth.environment
  }

  // GET /b2b/v1/user/:userId/profile
  // Returns different data based on client business_type
  app.get('/b2b/v1/user/:userId/profile', {
    preHandler: [withB2BAuth],
    handler: async (req, reply) => {
      const { userId } = req.params as { userId: string }
      return handleB2BRequest(
        app.pg, (req as any).b2bClient, (req as any).b2bKeyId, (req as any).b2bEnvironment,
        userId, '/b2b/v1/user/:userId/profile', req.query as any, reply
      )
    }
  })

  app.get('/b2b/v1/user/:userId/estate', {
    preHandler: [withB2BAuth],
    handler: async (req, reply) => {
      const { userId } = req.params as { userId: string }
      if ((req as any).b2bClient.business_type !== 'law_firm') {
        return reply.status(403).send({ success: false, error: { code:'ENDPOINT_NOT_PERMITTED' } })
      }
      return handleB2BRequest(
        app.pg, (req as any).b2bClient, (req as any).b2bKeyId, (req as any).b2bEnvironment,
        userId, '/b2b/v1/user/:userId/estate', req.query as any, reply
      )
    }
  })

  app.get('/b2b/v1/user/:userId/portfolio', {
    preHandler: [withB2BAuth],
    handler: async (req, reply) => {
      const { userId } = req.params as { userId: string }
      if (!['wealth_manager','generic'].includes((req as any).b2bClient.business_type)) {
        return reply.status(403).send({ success: false, error: { code:'ENDPOINT_NOT_PERMITTED' } })
      }
      return handleB2BRequest(
        app.pg, (req as any).b2bClient, (req as any).b2bKeyId, (req as any).b2bEnvironment,
        userId, '/b2b/v1/user/:userId/portfolio', req.query as any, reply
      )
    }
  })

  app.get('/b2b/v1/user/:userId/credit', {
    preHandler: [withB2BAuth],
    schema: {
      querystring: {
        type: 'object',
        required: ['scorecardId'],
        properties: { scorecardId: { type: 'string', format: 'uuid' } }
      }
    },
    handler: async (req, reply) => {
      const { userId } = req.params as { userId: string }
      if (!['nbfc','bank','generic'].includes((req as any).b2bClient.business_type)) {
        return reply.status(403).send({ success: false, error: { code:'ENDPOINT_NOT_PERMITTED' } })
      }
      return handleB2BRequest(
        app.pg, (req as any).b2bClient, (req as any).b2bKeyId, (req as any).b2bEnvironment,
        userId, '/b2b/v1/user/:userId/credit', req.query as any, reply
      )
    }
  })

  app.get('/b2b/v1/user/:userId/insurance', {
    preHandler: [withB2BAuth],
    handler: async (req, reply) => {
      const { userId } = req.params as { userId: string }
      if (!['insurance_company','generic'].includes((req as any).b2bClient.business_type)) {
        return reply.status(403).send({ success: false, error: { code:'ENDPOINT_NOT_PERMITTED' } })
      }
      return handleB2BRequest(
        app.pg, (req as any).b2bClient, (req as any).b2bKeyId, (req as any).b2bEnvironment,
        userId, '/b2b/v1/user/:userId/insurance', req.query as any, reply
      )
    }
  })

  app.get('/b2b/v1/user/:userId/employment', {
    preHandler: [withB2BAuth],
    handler: async (req, reply) => {
      const { userId } = req.params as { userId: string }
      if (!['hr_payroll','generic'].includes((req as any).b2bClient.business_type)) {
        return reply.status(403).send({ success: false, error: { code:'ENDPOINT_NOT_PERMITTED' } })
      }
      return handleB2BRequest(
        app.pg, (req as any).b2bClient, (req as any).b2bKeyId, (req as any).b2bEnvironment,
        userId, '/b2b/v1/user/:userId/employment', req.query as any, reply
      )
    }
  })

  // POST /b2b/v1/webhook/test
  // Client tests their webhook endpoint
  app.post('/b2b/v1/webhook/test', {
    preHandler: [withB2BAuth],
    handler: async (req, reply) => {
      const client = (req as any).b2bClient
      if (!client.webhook_url) return reply.status(400).send({
        success: false,
        error: { code:'NO_WEBHOOK_URL', message:'Configure webhook URL first' }
      })

      const { fireWebhooks } = await import('../b2b/webhooks/webhookManager')
      await fireWebhooks(app.pg, client.id, null, 'webhook.test', {
        message: 'AssetMap webhook test — your endpoint is working',
        timestamp: new Date().toISOString()
      })

      return { success: true, data: { message: 'Test webhook fired' } }
    }
  })

  // GET /b2b/v1/usage
  // Client checks their own usage
  app.get('/b2b/v1/usage', {
    preHandler: [withB2BAuth],
    handler: async (req, reply) => {
      const client = (req as any).b2bClient
      const result = await app.pg.query(`
        SELECT
          period_start, period_type,
          total_calls, successful_calls, failed_calls,
          total_cost_paise
        FROM b2b_usage_summary
        WHERE client_id = $1
        AND period_start >= CURRENT_DATE - 30
        ORDER BY period_start DESC
      `, [client.id])

      return { success: true, data: { usage: result.rows } }
    }
  })

  // GET /b2b/v1/docs
  // Dynamic OpenAPI spec generation
  app.get('/b2b/v1/docs', {
    preHandler: [withB2BAuth],
    handler: async (req, reply) => {
      const client = (req as any).b2bClient
      return generateOpenApiSpec(client.business_type)
    }
  })
}
