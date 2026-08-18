import { FastifyInstance }  from 'fastify'
import { verifyAccessToken }from '../middleware/auth'
import { ancestralSearch }  from '../ancestral/ancestralSearch'
import { getAllStates }      from '../ancestral/stateSearchRouter'
import { pool } from '../db/connection'

export async function ancestralRoutes(app: FastifyInstance) {

  // GET all supported states (drives state dropdown)
  app.get('/api/ancestral/states', {
    handler: async (req, reply) => {
      return { success:true, data: getAllStates() }
    }
  })

  // POST start a new ancestral property search
  app.post('/api/ancestral/search', {
    preHandler: [verifyAccessToken],
    config: { rateLimit: { max:5, timeWindow:'1 hour' } },
    schema: {
      body: {
        type: 'object',
        required: ['ancestorName', 'relationship', 'state'],
        properties: {
          ancestorName:      { type:'string', minLength:2, maxLength:200 },
          relationship:      { type:'string' },
          relationshipLabel: { type:'string' },
          state:             { type:'string' },
          district:          { type:'string' },
          taluka:            { type:'string' },
          village:           { type:'string' },
          surveyNumber:      { type:'string' },
          approximateDecade: { type:'string' },
          additionalClues:   { type:'string', maxLength:500 }
        },
        additionalProperties: false
      }
    },
    handler: async (req, reply) => {
      const body = req.body as any
      try {
        const searchId = await ancestralSearch.startSearch(
          pool, req.user!.id, body
        )
        return reply.status(202).send({
          success: true,
          data: {
            searchId,
            message: 'Search started. Check status in 30–60 seconds.',
            statusUrl: `/api/ancestral/search/${searchId}`
          }
        })
      } catch (err: any) {
        if (err.message?.startsWith('FREE_PLAN_LIMIT:')) {
          return reply.status(402).send({
            success: false,
            error: {
              code:         'PLAN_GATE',
              feature:      'ancestral_search',
              currentPlan:  'free',
              requiredPlan: 'plus',
              message:      err.message.replace('FREE_PLAN_LIMIT: ', ''),
              upgradeUrl:   '/pricing'
            }
          })
        }
        throw err
      }
    }
  })

  // GET search status + results
  app.get('/api/ancestral/search/:searchId', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const { searchId } = req.params as { searchId:string }
      try {
        const status = await ancestralSearch.getSearchStatus(
          pool, req.user!.id, searchId
        )
        return { success:true, data:status }
      } catch {
        return reply.status(404).send({
          success:false, error:{ code:'NOT_FOUND' }
        })
      }
    }
  })

  // POST user confirms a result
  app.post('/api/ancestral/results/:resultId/confirm', {
    preHandler: [verifyAccessToken],
    schema: {
      body: {
        type: 'object',
        properties: { notes: { type:'string', maxLength:500 } },
        additionalProperties: false
      }
    },
    handler: async (req, reply) => {
      const { resultId } = req.params as { resultId:string }
      const { notes }    = req.body as any ?? {}
      const canonicalId  = await ancestralSearch.confirmResult(
        pool, req.user!.id, resultId, notes
      )
      return {
        success: true,
        data: {
          canonicalId,
          message: 'Property added to your records as "Ancestral — needs verification". ' +
                   'We recommend consulting a property lawyer to formally establish ownership.'
        }
      }
    }
  })

  // POST user rejects a result
  app.post('/api/ancestral/results/:resultId/reject', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const { resultId } = req.params as { resultId:string }
      await pool.query(`
        UPDATE ancestral_search_results
        SET user_status = 'rejected', updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [resultId, req.user!.id])
      return { success:true }
    }
  })

  // GET search history
  app.get('/api/ancestral/searches', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const history = await ancestralSearch.getUserSearchHistory(
        pool, req.user!.id
      )
      return { success:true, data:history }
    }
  })

  // GET offline guide for a search (for states without API)
  app.get('/api/ancestral/search/:searchId/offline-guide', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const { searchId } = req.params as { searchId:string }
      const result = await pool.query(
        `SELECT * FROM ancestral_offline_guides
         WHERE search_id = $1 AND user_id = $2`,
        [searchId, req.user!.id]
      )
      if (!result.rows[0]) return reply.status(404).send({
        success:false, error:{ code:'NO_GUIDE' }
      })
      return { success:true, data:result.rows[0] }
    }
  })
}
