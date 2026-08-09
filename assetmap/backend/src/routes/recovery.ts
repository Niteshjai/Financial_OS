// ═══════════════════════════════════════════════════════════════
// Recovery Routes — Full Success-Fee Recovery API
// ═══════════════════════════════════════════════════════════════

import { FastifyPluginAsync } from 'fastify'
import { verifyAccessToken } from '../middleware/auth'
import { pool } from '../db/connection'
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants'
import { recoveryEngine } from '../recovery/recoveryEngine'
import { RECOVERY_CONFIGS, RecoveryType, LEGAL_DISCLAIMER } from '../recovery/types/recoveryTypes'
import { RecoveryCaseSchema, RecoveryDocumentSchema, RecoveryLegacyRequestSchema } from '../utils/validators'
import { successFeeCalculator } from '../recovery/billing/successFeeCalculator'
import { formFiller } from '../recovery/documents/formFiller'
import * as digilocker from '../services/digilocker'
import { ROLES, PERMISSIONS } from '../config/roles'
import { planEnforcer } from '../plans/planEnforcer'

// ─────────────────────────────────────────────
// NOTE: All success_fee_recovery routes are EXPLICITLY UNGATED.
// They are free on all plans by business decision. Do not add planEnforcer here.
// ─────────────────────────────────────────────

export const recoveryRoutes: FastifyPluginAsync = async (fastify, opts) => {

  // Middleware to ensure role is correct, if needed
  const requireRole = (allowedRoles: readonly string[]) => {
      return async (request: any, reply: any) => {
          // If we had user.role on request.user, we'd check here
          // For now, assume all authenticated users are "user" role for these routes
          // If a user is not in allowedRoles, return 403
      }
  }

  // ─── GET /cases — List all user's recovery cases ───
  fastify.get('/cases', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const cases = await recoveryEngine.getUserCases(pool, userId)
      return successResponse(cases)
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── GET /cases/:id — Full case detail ───
  fastify.get('/cases/:id', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const { id } = request.params as { id: string }
      const caseDetail = await recoveryEngine.getCaseDetails(pool, userId, id)
      return successResponse(caseDetail)
    } catch (error: any) {
      request.log.error(error)
      const status = error.message === 'Case not found' ? 404 : 500
      return reply.status(status).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── GET /cases/:id/form — Get filled form data ───
  fastify.get('/cases/:id/form', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const { id } = request.params as { id: string }
      
      const caseDetail = await recoveryEngine.getCaseDetails(pool, userId, id)
      if (!caseDetail) return reply.status(404).send(errorResponse(ERROR_CODES.NOT_FOUND, 'Case not found'))

      const formData = formFiller.generateFormData(caseDetail.recovery_type as RecoveryType, {
        fullName: 'Account Holder', // Usually fetched from user profile in a real app
        panNumber: 'USER_PAN',
        claimAmount: caseDetail.estimated_value_paise / 100,
        companyName: caseDetail.institution_name,
      })

      return successResponse(formData)
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── POST /cases — Initiate a new recovery case ───
  fastify.post('/cases', {
    schema: { body: RecoveryCaseSchema },
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const body = request.body as {
        recoveryType:        string
        assetDescription:    string
        institutionName?:    string
        estimatedValuePaise: number
        folioNumber?:        string
        policyNumber?:       string
        uanNumber?:          string
        accountNumber?:      string
        isin?:               string
      }

      // Validate recovery type
      if (!body.recoveryType || !RECOVERY_CONFIGS[body.recoveryType as RecoveryType]) {
        return reply.status(400).send(errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          `Invalid recovery type. Valid types: ${Object.keys(RECOVERY_CONFIGS).join(', ')}`
        ))
      }

      if (!body.assetDescription || !body.estimatedValuePaise) {
        return reply.status(400).send(errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'assetDescription and estimatedValuePaise are required'
        ))
      }

      const result = await recoveryEngine.initiateCase(pool, userId, {
        recoveryType:        body.recoveryType as RecoveryType,
        assetDescription:    body.assetDescription,
        institutionName:     body.institutionName,
        estimatedValuePaise: body.estimatedValuePaise,
        folioNumber:         body.folioNumber,
        policyNumber:        body.policyNumber,
        uanNumber:           body.uanNumber,
        accountNumber:       body.accountNumber,
        isin:                body.isin,
      })

      return successResponse(result)
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── POST /cases/:id/accept-fee — Sign fee agreement ───
  fastify.post('/cases/:id/accept-fee', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const { id } = request.params as { id: string }
      const ipAddress = request.ip || '0.0.0.0'
      const userAgent = request.headers['user-agent'] || ''

      await recoveryEngine.acceptFeeAgreement(pool, userId, id, ipAddress, userAgent)
      return successResponse({ success: true, message: 'Fee agreement accepted. Please upload required documents.' })
    } catch (error: any) {
      request.log.error(error)
      const status = error.message.includes('not found') ? 404 : 400
      return reply.status(status).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── POST /cases/:id/documents — Upload a document ───
  fastify.post('/cases/:id/documents', {
    schema: { body: RecoveryDocumentSchema },
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const { id } = request.params as { id: string }
      const body = request.body as {
        docType:       string
        s3Key:         string
        fileName:      string
        fileSizeBytes: number
        mimeType:      string
      }

      if (!body.docType || !body.fileName) {
        return reply.status(400).send(errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'docType and fileName are required'
        ))
      }

      const result = await recoveryEngine.uploadDocument(
        pool, userId, id,
        body.docType,
        body.s3Key || `uploads/${userId}/${id}/${body.fileName}`,
        body.fileName,
        body.fileSizeBytes || 0,
        body.mimeType || 'application/octet-stream'
      )

      return successResponse(result)
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── GET /configs — Get all recovery type configurations ───
  fastify.get('/configs', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const configs = Object.values(RECOVERY_CONFIGS).map(c => ({
        type:              c.type,
        label:             c.label,
        description:       c.description,
        avgDaysToComplete: c.avgDaysToComplete,
        successRatePct:    c.successRatePct,
        feeMin:            c.feeMin,
        feeMax:            c.feeMax,
        steps:             c.steps,
        documentsCount:    c.documents.filter(d => d.isRequired).length,
      }))
      return successResponse({
        configs,
        legalDisclaimer: LEGAL_DISCLAIMER,
      })
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── POST /calculate-fee — Preview fee calculation ───
  fastify.post('/calculate-fee', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const body = request.body as {
        estimatedValuePaise: number
        recoveryType:        string
      }

      if (!body.estimatedValuePaise || !body.recoveryType) {
        return reply.status(400).send(errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'estimatedValuePaise and recoveryType are required'
        ))
      }

      const fee = successFeeCalculator.calculate(body.estimatedValuePaise, body.recoveryType as RecoveryType)
      return successResponse({
        ...fee,
        legalDisclaimer: LEGAL_DISCLAIMER,
      })
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── GET /digilocker/auth — Initiate OAuth ───
  fastify.get('/digilocker/auth', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('digilocker_vault', pool)]
  }, async (request, reply) => {
    try {
      const authUrl = digilocker.getAuthorizationUrl(request.user!.id)
      return successResponse({ authUrl })
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── GET /digilocker/callback — OAuth redirect callback ───
  fastify.get('/digilocker/callback', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('digilocker_vault', pool)]
  }, async (request, reply) => {
    try {
      const { code, state } = request.query as { code: string; state: string }

      if (!code) {
        return reply.status(400).send(errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Authorization code is required'
        ))
      }

      const accessToken = await digilocker.exchangeToken(code)
      const documents = await digilocker.fetchDocuments(accessToken)

      return successResponse({
        message: 'DigiLocker connected successfully',
        documentsAvailable: documents.length,
        documents: documents.map(d => ({
          docType: d.docType,
          name:    d.name,
          issuer:  d.issuer,
        })),
      })
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'DigiLocker connection failed'))
    }
  })

  // ─── GET /status-summary — Dashboard metrics via statusTracker ───
  fastify.get('/status-summary', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const summary = await recoveryEngine.getStatusSummary(pool, userId)
      return successResponse(summary)
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  // ─── Keep legacy endpoint working ───
  fastify.get('/requests', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const cases = await recoveryEngine.getUserCases(pool, userId)
      return successResponse(cases)
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })

  fastify.post('/requests', {
    schema: { body: RecoveryLegacyRequestSchema },
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const body = request.body as Record<string, any>

      if (!body.unclaimedAssetId) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Invalid request body'))
      }

      // Map legacy request to new engine
      const result = await recoveryEngine.initiateCase(pool, userId, {
        recoveryType:        'epf_balance',
        assetDescription:    body.assetDescription || 'Unclaimed Asset',
        institutionName:     body.institutionName,
        estimatedValuePaise: (body.estimatedValue || 0) * 100,
      })

      // Auto-accept fee for legacy flow
      await recoveryEngine.acceptFeeAgreement(pool, userId, result.caseId, '0.0.0.0', 'legacy')

      return successResponse({
        id:               result.caseId,
        userId,
        unclaimedAssetId: body.unclaimedAssetId,
        feePercentage:    result.feeDetails.feePct,
        estimatedFee:     result.feeDetails.feeAmountPaise / 100,
        status:           'In Progress',
        signedAgreement:  true,
        createdAt:        new Date().toISOString(),
      })
    } catch (error: any) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'))
    }
  })
}
