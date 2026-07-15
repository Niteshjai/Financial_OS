import { FastifyRequest, FastifyReply } from 'fastify'
import { Pool }                          from 'pg'
import { apiKeyManager }                 from './auth/apiKeyManager'
import { checkRateLimit }                from './rateLimit/slidingWindow'
import { transformForLawFirm }           from './transforms/lawFirmTransform'
import { transformForWealthManager }     from './transforms/wealthManagerTransform'
import { transformForNBFC }              from './transforms/nbfcTransform'
import { transformForInsurance }         from './transforms/insuranceTransform'
import { transformForHRPayroll }         from './transforms/hrPayrollTransform'
import { fireWebhooks }                  from './webhooks/webhookManager'
import { auditLogger }                   from '../services/auditLogger'
import { v4 as uuidv4 }                 from 'uuid'

export async function b2bMiddleware(
  request:  FastifyRequest,
  reply:    FastifyReply,
  pool:     Pool
): Promise<{ client: any; keyId: string; environment: string } | null> {

  const apiKey = request.headers['x-api-key'] as string
  if (!apiKey) {
    reply.status(401).send({
      success: false,
      error: {
        code:    'MISSING_API_KEY',
        message: 'Provide your API key in the X-Api-Key header',
        docsUrl: 'https://docs.assetmap.in/b2b/authentication'
      }
    })
    return null
  }

  const { valid, client, keyId, environment, error } = await apiKeyManager.validate(
    pool, apiKey,
    request.headers['x-forwarded-for'] as string ||
    request.socket.remoteAddress
  )

  if (!valid || !client || !environment) {
    reply.status(403).send({
      success: false,
      error: {
        code:    error ?? 'INVALID_API_KEY',
        message: 'Invalid or expired API key',
        docsUrl: 'https://docs.assetmap.in/b2b/authentication'
      }
    })
    return null
  }

  // Rate limit check
  const rateCheck = await checkRateLimit(
    client.id,
    client.rate_limit_per_hour,
    client.rate_limit_per_day
  )

  if (!rateCheck.allowed) {
    reply.status(429)
      .header('X-RateLimit-Remaining', '0')
      .header('X-RateLimit-Reset', rateCheck.resetAt.toISOString())
      .header('Retry-After', String(rateCheck.retryAfter))
      .send({
        success: false,
        error: {
          code:        'RATE_LIMIT_EXCEEDED',
          message:     `Rate limit exceeded. Retry after ${rateCheck.retryAfter}s`,
          resetAt:     rateCheck.resetAt.toISOString(),
          retryAfter:  rateCheck.retryAfter,
          docsUrl:     'https://docs.assetmap.in/b2b/rate-limits'
        }
      })
    return null
  }

  // Set rate limit headers
  reply
    .header('X-RateLimit-Remaining', String(rateCheck.remaining))
    .header('X-RateLimit-Reset', rateCheck.resetAt.toISOString())
    .header('X-AssetMap-Request-Id', uuidv4())

  return { client, keyId: keyId!, environment }
}

export async function handleB2BRequest(
  pool:       Pool,
  client:     any,
  keyId:      string,
  environment:string,
  userId:     string,
  endpoint:   string,
  params:     Record<string, any>,
  reply:      FastifyReply
): Promise<any> {

  const requestId = uuidv4()
  const startTime = Date.now()

  if (environment === 'sandbox') {
    const { sandboxFixtures } = await import('./fixtures/sandboxMock');
    return {
      success: true,
      requestId,
      generatedAt: new Date().toISOString(),
      data: sandboxFixtures[client.business_type] || {}
    }
  }

  // Verify user has consented to share data with this client
  const consent = await pool.query(`
    SELECT id FROM b2b_user_consents
    WHERE user_id = $1 AND client_id = $2
    AND is_active = true
    AND expires_at > NOW()
  `, [userId, client.id])

  if (!consent.rows[0]) {
    return reply.status(403).send({
      success: false,
      error: {
        code:    'USER_CONSENT_REQUIRED',
        message: 'This user has not consented to share data with your organisation.',
        action:  'Request consent via POST /b2b/v1/consent/request'
      }
    })
  }

  let responseData: any
  let fieldsReturned: string[] = []

  try {
    switch (client.business_type) {
      case 'law_firm':
        responseData   = await transformForLawFirm(pool, userId, requestId)
        fieldsReturned = ['estateValue','bankAccounts','landAndProperty',
                          'investments','insurancePolicies','riskFlags']
        break

      case 'wealth_manager':
        responseData   = await transformForWealthManager(pool, userId, requestId)
        fieldsReturned = ['netWorth','assetAllocation','holdings',
                          'portfolioHealth','netWorthHistory']
        break

      case 'nbfc':
        const scorecardId = params.scorecardId
        if (!scorecardId) {
          return reply.status(400).send({
            success: false,
            error: { code:'MISSING_PARAM', message:'scorecardId is required for NBFC endpoints' }
          })
        }
        responseData   = await transformForNBFC(pool, userId, scorecardId, requestId)
        fieldsReturned = ['creditProfile','income','assets',
                          'liabilities','dimensionScores']
        break

      case 'insurance_company':
        responseData   = await transformForInsurance(pool, userId, requestId)
        fieldsReturned = ['coverageProfile','gapAnalysis',
                          'underwritingProfile','recommendations']
        break

      case 'hr_payroll':
        responseData   = await transformForHRPayroll(pool, userId, requestId)
        fieldsReturned = ['employmentProfile','employerBenefits','financialHealth']
        break

      default:
        return reply.status(400).send({
          success: false,
          error: { code:'UNSUPPORTED_TYPE', message:`Business type ${client.business_type} not supported` }
        })
    }
  } catch (err: any) {
    // Log failed call
    await logAPICall(pool, {
      clientId:     client.id,
      apiKeyId:     keyId,
      userId,
      endpoint,
      method:       'GET',
      statusCode:   500,
      responseMs:   Date.now() - startTime,
      errorCode:    'INTERNAL_ERROR',
      errorMessage: err.message
    })
    throw err
  }

  // Log successful call
  await logAPICall(pool, {
    clientId:       client.id,
    apiKeyId:       keyId,
    userId,
    endpoint,
    method:         'GET',
    statusCode:     200,
    responseMs:     Date.now() - startTime,
    fieldsReturned,
    recordsReturned:1,
    costPaise:      client.price_per_call_paise
  })

  // Fire webhooks if client has subscribed
  if (client.webhook_url && client.webhook_events?.includes('data.accessed')) {
    await fireWebhooks(pool, client.id, userId, 'data.accessed', {
      requestId,
      endpoint,
      dataTypes: fieldsReturned
    })
  }

  await auditLogger.log({
    userId,
    action:     'B2B_DATA_ACCESSED',
    entityType: 'b2b_api',
    metadata:   {
      clientId:   client.id,
      clientName: client.business_name,
      endpoint,
      requestId
    }
  })

  return {
    success:     true,
    requestId,
    generatedAt: new Date().toISOString(),
    data:        responseData
  }
}

async function logAPICall(pool: Pool, data: {
  clientId:        string
  apiKeyId:        string
  userId?:         string
  endpoint:        string
  method:          string
  statusCode:      number
  responseMs:      number
  fieldsReturned?: string[]
  recordsReturned?:number
  costPaise?:      number
  errorCode?:      string
  errorMessage?:   string
}): Promise<void> {
  await pool.query(`
    INSERT INTO b2b_api_logs (
      client_id, api_key_id, user_id,
      endpoint, method,
      status_code, response_time_ms,
      fields_returned, records_returned,
      cost_paise, error_code, error_message
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  `, [
    data.clientId, data.apiKeyId, data.userId ?? null,
    data.endpoint, data.method,
    data.statusCode, data.responseMs,
    data.fieldsReturned ?? [],
    data.recordsReturned ?? 0,
    data.costPaise ?? 0,
    data.errorCode ?? null,
    data.errorMessage ?? null
  ])

  // Update usage summary
  await pool.query(`
    INSERT INTO b2b_usage_summary (
      client_id, period_start, period_type,
      total_calls, successful_calls, failed_calls,
      total_cost_paise
    ) VALUES (
      $1, CURRENT_DATE, 'daily',
      1,
      $2::integer,
      $3::integer,
      $4
    )
    ON CONFLICT (client_id, period_start, period_type)
    DO UPDATE SET
      total_calls      = b2b_usage_summary.total_calls + 1,
      successful_calls = b2b_usage_summary.successful_calls + $2::integer,
      failed_calls     = b2b_usage_summary.failed_calls + $3::integer,
      total_cost_paise = b2b_usage_summary.total_cost_paise + $4
  `, [
    data.clientId,
    data.statusCode < 400 ? 1 : 0,
    data.statusCode >= 400 ? 1 : 0,
    data.costPaise ?? 0
  ])
}
