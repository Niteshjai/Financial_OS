import { FastifyInstance }    from 'fastify'
import { verifyAccessToken }  from '../middleware/auth'
import { planEnforcer }       from '../plans/planEnforcer'
import { pool }               from '../db/connection'
import { familyVault }        from '../family/familyVault'
import { familyAggregator }   from '../family/familyAggregator'
import { familyGoals }        from '../family/familyGoals'
import { decryptPII }         from '../utils/encryption'
import { require2FA }         from '../auth/twoFactorMiddleware'

export async function familyRoutes(app: FastifyInstance) {
  const auth2FA = [verifyAccessToken, require2FA()]
  // Gate all family routes to Pro plan
  const proOnly = [verifyAccessToken, require2FA(), planEnforcer.requireFeature('family_vault', pool)]

  // ── Vault setup
  app.post('/vault', {
    preHandler: proOnly,
    schema: {
      body: {
        type: 'object',
        properties: { vaultName: { type:'string', maxLength:100 } }
      }
    },
    handler: async (req, reply) => {
      const { vaultName } = req.body as any
      const vaultId = await familyVault.createVault(
        pool, req.user!.id, vaultName
      )
      return reply.status(201).send({ success:true, data:{ vaultId } })
    }
  })

  // ── Get vault details
  app.get('/vault', {
    preHandler: proOnly,
    handler: async (req, reply) => {
      const vault = await familyVault.getVaultDetails(pool, req.user!.id)
      if (!vault) return reply.status(404).send({
        success:false, error:{ code:'NO_VAULT',
        message:'Create your family vault first' }
      })
      return { success:true, data:vault }
    }
  })

  // ── Invite a member
  app.post('/invite', {
    preHandler: proOnly,
    schema: {
      body: {
        type:'object',
        required:['mobile','name','relationship'],
        properties: {
          mobile:       { type:'string', pattern:'^[6-9][0-9]{9}$' },
          name:         { type:'string', minLength:2, maxLength:100 },
          relationship: {
            type:'string',
            enum:['spouse','parent','child','sibling',
                  'grandparent','grandchild','other']
          }
        },
        additionalProperties:false
      }
    },
    handler: async (req, reply) => {
      const body = req.body as any
      try {
        const result = await familyVault.inviteMember(
          pool, req.user!.id, body
        )
        return reply.status(201).send({ success:true, data:result })
      } catch (err:any) {
        return reply.status(400).send({
          success:false, error:{ code:'INVITE_FAILED', message:err.message }
        })
      }
    }
  })

  // ── Accept invite (public — no auth needed to accept)
  app.post('/join', {
    preHandler: auth2FA,
    schema: {
      body: {
        type:'object', required:['token'],
        properties: { token:{ type:'string', minLength:64, maxLength:64 } }
      }
    },
    handler: async (req, reply) => {
      const { token } = req.body as any
      try {
        const result = await familyVault.acceptInvite(
          pool, req.user!.id, token
        )
        return { success:true, data:result }
      } catch (err:any) {
        return reply.status(400).send({
          success:false, error:{ code:'JOIN_FAILED', message:err.message }
        })
      }
    }
  })

  // ── Remove a member (primary user only)
  app.delete('/members/:memberId', {
    preHandler: proOnly,
    handler: async (req, reply) => {
      const { memberId } = req.params as { memberId:string }
      await familyVault.removeMember(pool, req.user!.id, memberId)
      return { success:true }
    }
  })

  // ── Leave vault (member action)
  app.post('/leave', {
    preHandler: auth2FA,
    handler: async (req, reply) => {
      await familyVault.leaveVault(pool, req.user!.id)
      return { success:true }
    }
  })

  // ── Update visibility settings (member controls what they share)
  app.patch('/visibility', {
    preHandler: auth2FA,
    schema: {
      body: {
        type:'object',
        properties: {
          shareBankAccounts:  { type:'boolean' },
          shareFixedDeposits: { type:'boolean' },
          shareMutualFunds:   { type:'boolean' },
          shareEquity:        { type:'boolean' },
          shareNps:           { type:'boolean' },
          shareEpf:           { type:'boolean' },
          shareInsurance:     { type:'boolean' },
          shareLand:          { type:'boolean' },
          shareGold:          { type:'boolean' },
          shareTotalNetworth: { type:'boolean' },
          displayName:        { type:'string', maxLength:50 }
        },
        additionalProperties:false
      }
    },
    handler: async (req, reply) => {
      await familyVault.updateVisibility(pool, req.user!.id, req.body as any)
      return { success:true }
    }
  })

  // ── Combined net worth
  app.get('/vault/:vaultId/networth', {
    preHandler: auth2FA,
    handler: async (req, reply) => {
      const { vaultId } = req.params as { vaultId:string }
      const data = await familyAggregator.getCombinedNetWorth(
        pool, vaultId, req.user!.id
      )
      return { success:true, data }
    }
  })

  // ── Combined history (for chart)
  app.get('/vault/:vaultId/history', {
    preHandler: auth2FA,
    schema: {
      querystring: {
        type:'object',
        properties:{ months:{ type:'integer', minimum:1, maximum:36 } }
      }
    },
    handler: async (req, reply) => {
      const { vaultId } = req.params as { vaultId:string }
      const { months = 12 } = req.query as any
      const history = await familyAggregator.getCombinedHistory(
        pool, vaultId, req.user!.id, months
      )
      return { success:true, data:history }
    }
  })

  // ── One member's assets (drill-down)
  app.get('/vault/:vaultId/member/:memberId/assets', {
    preHandler: auth2FA,
    handler: async (req, reply) => {
      const { vaultId, memberId } = req.params as any
      const data = await familyAggregator.getMemberAssets(
        pool, vaultId, req.user!.id, memberId
      )
      return { success:true, data }
    }
  })

  // ── Estate readiness
  app.get('/vault/:vaultId/estate', {
    preHandler: auth2FA,
    handler: async (req, reply) => {
      const { vaultId } = req.params as { vaultId:string }
      const data = await familyAggregator.getEstateReadiness(
        pool, vaultId, req.user!.id
      )
      return { success:true, data }
    }
  })

  // ── Activity feed
  app.get('/vault/:vaultId/activity', {
    preHandler: auth2FA,
    handler: async (req, reply) => {
      const { vaultId } = req.params as { vaultId:string }
      const result = await pool.query(`
        SELECT
          fa.activity_type, fa.title, fa.body,
          fa.metadata, fa.created_at,
          u.name_encrypted
        FROM family_activity_feed fa
        LEFT JOIN users u ON u.id = fa.user_id
        WHERE fa.vault_id = $1
        AND fa.is_visible_to_all = true
        ORDER BY fa.created_at DESC
        LIMIT 30
      `, [vaultId])

      const { decryptPII } = await import('../utils/encryption')
      const activities = result.rows.map(r => ({
        ...r,
        userName: r.name_encrypted ? decryptPII(r.name_encrypted) : null,
        name_encrypted: undefined
      }))

      return { success:true, data:activities }
    }
  })

  // ── Goals
  app.get('/vault/:vaultId/goals', {
    preHandler: auth2FA,
    handler: async (req, reply) => {
      const { vaultId } = req.params as { vaultId:string }
      const data = await familyGoals.getGoals(pool, vaultId)
      return { success:true, data }
    }
  })

  app.post('/vault/:vaultId/goals', {
    preHandler: auth2FA,
    schema: {
      body: {
        type: 'object',
        required: ['name', 'goalType', 'targetAmountPaise', 'contributingMembers'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          goalType: { type: 'string' },
          emoji: { type: 'string' },
          targetAmountPaise: { type: 'number' },
          targetDate: { type: 'string' },
          contributingMembers: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    handler: async (req, reply) => {
      const { vaultId } = req.params as { vaultId: string }
      const body = req.body as any
      const id = await familyGoals.createGoal(pool, vaultId, req.user!.id, body)
      return reply.status(201).send({ success: true, data: { id } })
    }
  })

  app.post('/vault/:vaultId/goals/:goalId/contributions', {
    preHandler: auth2FA,
    schema: {
      body: {
        type: 'object',
        required: ['amountPaise'],
        properties: {
          amountPaise: { type: 'number' },
          note: { type: 'string' }
        }
      }
    },
    handler: async (req, reply) => {
      const { goalId } = req.params as { goalId: string }
      const body = req.body as any
      await familyGoals.addContribution(pool, goalId, req.user!.id, body.amountPaise, body.note)
      return reply.status(201).send({ success: true })
    }
  })
}
