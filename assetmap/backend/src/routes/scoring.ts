import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { pool } from '../db/connection'
import { generateScorecard, ScoringRequest } from '../scoring/loanScoringEngine'
import { generateScorecardPDF } from '../scoring/scorecardGenerator'
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants'
import { logger } from '../utils/logger'

const generateScorecardSchema = z.object({
  loanProduct: z.enum([
    'home_loan', 'lap', 'personal_loan',
    'business_loan', 'gold_loan',
    'education_loan', 'vehicle_loan'
  ]),
  requestedAmountPaise: z.number().int().positive(),
  requestedTenureMonths: z.number().int().positive(),
  purpose: z.string().optional(),
})

export const scoringRoutes: FastifyPluginAsync = async (app) => {
  // Requires authentication
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.status(401).send(errorResponse(ERROR_CODES.UNAUTHORIZED, 'Authentication required'))
    }
  })

  // Generate a new loan scorecard
  app.post('/generate', async (request, reply) => {
    const userId = request.user.id
    
    const parsed = generateScorecardSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, parsed.error.message))
    }

    try {
      // Set RLS for standard DB access in other queries
      await pool.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId])

      const scoringRequest: ScoringRequest = {
        userId,
        loanProduct: parsed.data.loanProduct,
        requestedAmountPaise: parsed.data.requestedAmountPaise,
        requestedTenureMonths: parsed.data.requestedTenureMonths,
        purpose: parsed.data.purpose,
      }

      const result = await generateScorecard(pool, scoringRequest)

      return reply.status(200).send(successResponse(result))
    } catch (error: any) {
      logger.error('Error generating scorecard', { error: error.message, userId })
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to generate scorecard'))
    }
  })

  // Get scorecard history
  app.get('/history', async (request, reply) => {
    const userId = request.user.id
    
    try {
      await pool.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId])
      
      const result = await pool.query(`
        SELECT id, scorecard_id, composite_score, decision, loan_product, scored_at
        FROM loan_score_history
        WHERE user_id = $1
        ORDER BY scored_at DESC
        LIMIT 50
      `, [userId])

      return reply.status(200).send(successResponse({ history: result.rows }))
    } catch (error: any) {
      logger.error('Error fetching score history', { error: error.message, userId })
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch score history'))
    }
  })

  // Download scorecard PDF
  app.get('/:scorecardId/pdf', async (request, reply) => {
    const userId = request.user.id
    const { scorecardId } = request.params as { scorecardId: string }
    
    try {
      await pool.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId])
      
      // Verify scorecard belongs to user
      const result = await pool.query(`
        SELECT id FROM loan_scorecards 
        WHERE id = $1 AND user_id = $2
      `, [scorecardId, userId])

      if (result.rows.length === 0) {
        return reply.status(404).send(errorResponse(ERROR_CODES.NOT_FOUND, 'Scorecard not found'))
      }

      const pdfUrl = await generateScorecardPDF(scorecardId)
      
      return reply.status(200).send(successResponse({ pdfUrl }))
    } catch (error: any) {
      logger.error('Error generating scorecard PDF', { error: error.message, userId })
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to generate scorecard PDF'))
    }
  })
}
