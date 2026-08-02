import { FastifyPluginAsync } from 'fastify'
import { verifyAccessToken } from '../middleware/auth'
import { pool } from '../db/connection'
import { loanEligibility } from '../services/loanEligibility'
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants'
import { LoanAssessSchema } from '../utils/validators'
import { planEnforcer } from '../plans/planEnforcer'

export const loanRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.post('/assess', {
    schema: { body: LoanAssessSchema },
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('loan_eligibility', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const body = request.body as any
      const result = await loanEligibility.assessEligibility(pool, userId, body)
      return successResponse(result)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to assess loan eligibility'))
    }
  })
}
