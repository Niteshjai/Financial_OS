import { FastifyPluginAsync } from 'fastify'
import { verifyAccessToken } from '../middleware/auth'
import { pool } from '../db/connection'
import { unclaimedAssets } from '../services/unclaimedAssets'
import { UnclaimedAssetModel } from '../models/unclaimedAsset'
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants'
import { UnclaimedSearchSchema } from '../utils/validators'
import { planEnforcer } from '../plans/planEnforcer'

export const unclaimedRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get('/assets', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('unclaimed_search', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const assets = await UnclaimedAssetModel.findByUserId(userId)
      return successResponse(assets)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to get unclaimed assets'))
    }
  })
  fastify.post('/search/initiate', {
    schema: { body: UnclaimedSearchSchema },
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('unclaimed_search', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const body = request.body as any

      const limitCheck = await planEnforcer.checkLimit(pool, userId, 'unclaimed_search', 'limit_unclaimed_searches_py');
      if (!limitCheck.allowed) {
        return reply.status(403).send(errorResponse(ERROR_CODES.UNAUTHORIZED, 'You have reached your unclaimed search limit. Please upgrade your plan.'));
      }

      const searchId = await unclaimedAssets.initiateSearch(pool, userId, body)

      await planEnforcer.incrementUsage(pool, userId, 'unclaimed_search', 'year');

      return successResponse({ searchId })
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to initiate search'))
    }
  })

  fastify.get('/search/:id', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('unclaimed_search', pool)]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id
      const params = request.params as any
      const searchId = params.id
      const result = await unclaimedAssets.getSearchResults(pool, userId, searchId)
      return successResponse(result)
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to get search results'))
    }
  })
}
