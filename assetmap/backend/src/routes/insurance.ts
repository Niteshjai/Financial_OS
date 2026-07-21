import { FastifyPluginAsync } from 'fastify'
import { verifyAccessToken } from '../middleware/auth'
import { pool } from '../db/connection'
import { insuranceGapFinder } from '../services/insuranceGapFinder'
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants'
import { InsuranceAnalyzeSchema } from '../utils/validators'

export const insuranceRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.post('/analyze', {
    schema: { body: InsuranceAnalyzeSchema },
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const body = request.body as Record<string, any>
      const profile = body.profile
      
      const result = await insuranceGapFinder.analyzeGaps(pool, userId, profile)
      return successResponse(result)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to analyze insurance gaps'))
    }
  })

  fastify.post('/affiliate-click', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const body = request.body as Record<string, any>
      const { partner, productType } = body
      await insuranceGapFinder.trackAffiliateClick(pool, userId, partner, productType)
      return successResponse({ success: true })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to track affiliate click'))
    }
  })
}
