import { FastifyPluginAsync } from 'fastify'
import { verifyAccessToken } from '../middleware/auth'
import { pool } from '../db/connection'
import { willBuilder } from '../services/willBuilder'
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants'
import { WillCreateSchema, WillBeneficiarySchema, WillAllocationSchema } from '../utils/validators'
import { planEnforcer } from '../billing/planEnforcer'

export const willRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.post('/create', {
    schema: { body: WillCreateSchema },
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('will_builder', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const body = request.body as any
      const willId = await willBuilder.createWill(pool, userId, body)
      return successResponse({ willId })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to create will'))
    }
  })

  fastify.post('/:id/beneficiary', {
    schema: { body: WillBeneficiarySchema },
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('will_builder', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const params = request.params as any
      const willId = params.id
      const body = request.body as any
      const beneficiaryId = await willBuilder.addBeneficiary(pool, userId, willId, body)
      return successResponse({ beneficiaryId })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to add beneficiary'))
    }
  })

  fastify.post('/:id/allocation', {
    schema: { body: WillAllocationSchema },
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('will_builder', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id

      const hasLimit = await planEnforcer.checkLimit(userId, 'limit_will_allocations', pool);
      if (!hasLimit) {
        return reply.status(403).send(errorResponse(ERROR_CODES.UNAUTHORIZED, 'You have reached your will allocation limit. Please upgrade your plan.'));
      }

      const params = request.params as any
      const willId = params.id
      const body = request.body as any
      const allocationId = await willBuilder.addAllocation(pool, userId, willId, body)

      await planEnforcer.incrementUsage(userId, 'limit_will_allocations', pool);

      return successResponse({ allocationId })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to add allocation'))
    }
  })

  fastify.post('/:id/generate-pdf', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('will_builder', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const params = request.params as any
      const willId = params.id
      await willBuilder.generatePDF(pool, userId, willId)
      return successResponse({ success: true })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to generate PDF'))
    }
  })

  fastify.post('/:id/esign', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('will_builder', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const params = request.params as any
      const willId = params.id
      const url = await willBuilder.initiateESign(pool, userId, willId)
      return successResponse({ url })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to initiate e-sign'))
    }
  })
}
