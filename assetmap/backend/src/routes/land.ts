import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { landRegistryService } from '../services/landRegistry'
import { verifyAccessToken } from '../middleware/auth'
import { softDeleteLandRecord, updateLandRecordManual, insertLandRecord } from '../db/queries/landRecords'
import { ManualLandRecordSchema } from '../models/landRecord'
import { landCache } from '../services/landCache'
import { pool } from '../db/connection'
import { ConsentModel } from '../models/consent'

import { planEnforcer } from '../plans/planEnforcer'

export async function landRoutes(app: FastifyInstance) {

  // GET all land records for authenticated user
  app.get('/land', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('land_records', pool)],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          stateCode: { type: 'string', maxLength: 5 },
          titleStatus: { type: 'string' },
          ownershipType: { type: 'string' },
        }
      }
    },
    handler: async (request, reply) => {
      const { stateCode, titleStatus, ownershipType } =
        request.query as Record<string, any>

      const consents = await ConsentModel.getActiveConsents(request.user!.id);
      const activeConsent = consents[0];
      const hasLandConsent = activeConsent?.fiTypes?.includes('LAND_RECORDS') ?? false;

      if (!hasLandConsent) {
        return { success: true, data: { records: [], count: 0 } };
      }

      const records = await landRegistryService.getUserLandRecords(
        pool, request.user!.id,
        { stateCode, titleStatus, ownershipType }
      )

      // Enforce plan-based parcel limit
      const limitCheck = await planEnforcer.checkLimit(pool, request.user!.id, 'land_records', 'limit_land_parcels');
      const limit = limitCheck.limit; // null = unlimited
      const cappedRecords = (limit !== null && limit !== undefined) ? records.slice(0, limit) : records;

      return {
        success: true,
        data: {
          records: cappedRecords,
          count: cappedRecords.length,
          totalAvailable: records.length,
          limitReached: limit !== null && limit !== undefined && records.length > limit,
        }
      }
    }
  })

  // GET summary stats
  app.get('/land/summary', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('land_records', pool)],
    handler: async (request, reply) => {
      const stats = await landRegistryService.getSummaryStats(
        pool, request.user!.id
      )
      return { success: true, data: stats }
    }
  })

  // GET single land record with mutations + encumbrances
  app.get('/land/:recordId', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('land_records', pool)],
    schema: {
      params: {
        type: 'object',
        required: ['recordId'],
        properties: { recordId: { type: 'string', format: 'uuid' } }
      }
    },
    handler: async (request, reply) => {
      const { recordId } = request.params as { recordId: string }
      const record = await landRegistryService.getLandRecordDetail(
        pool, recordId, request.user!.id
      )
      if (!record) return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Land record not found' }
      })
      return { success: true, data: record }
    }
  })

  // POST fetch fresh land records from Surepass
  app.post('/land/fetch', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('land_records', pool)],
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
    schema: {
      body: {
        type: 'object',
        required: ['name', 'state', 'stateCode'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100 },
          state: { type: 'string', minLength: 2, maxLength: 100 },
          stateCode: { type: 'string', maxLength: 5 },
          district: { type: 'string', maxLength: 100 },
          taluka: { type: 'string', maxLength: 100 },
        },
        additionalProperties: false
      }
    },
    handler: async (request, reply) => {
      const body = request.body as Record<string, any>
      const result = await landRegistryService.fetchAndStoreLandRecords(
        pool, request.user!.id,
        {
          name: body.name,
          state: body.state,
          stateCode: body.stateCode,
          district: body.district,
          taluka: body.taluka,
        },
        'user_request'
      )
      return {
        success: true,
        data: {
          recordsFound: result.created + result.updated,
          recordsCreated: result.created,
          recordsUpdated: result.updated,
          records: result.records,
        }
      }
    }
  })

  // POST manually add a land record
  app.post('/land/manual', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('land_records', pool)],
    handler: async (request, reply) => {
      const parsed = ManualLandRecordSchema.safeParse(request.body)
      if (!parsed.success) return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message }
      })

      const data = parsed.data
      const recordId = await insertLandRecord(
        pool,
        request.user!.id,
        { ...data, source: 'manual', ownershipType: data.ownershipType },
        {}
      )

      await landCache.invalidateUserRecords(request.user!.id)

      return reply.status(201).send({
        success: true, data: { id: recordId }
      })
    }
  })

  // PATCH update notes / ownership on a record
  app.patch('/land/:recordId', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('land_records', pool)],
    schema: {
      params: {
        type: 'object',
        required: ['recordId'],
        properties: { recordId: { type: 'string', format: 'uuid' } }
      },
      body: {
        type: 'object',
        properties: {
          notes: { type: 'string', maxLength: 500 },
          ownershipType: { type: 'string' },
        },
        additionalProperties: false
      }
    },
    handler: async (request, reply) => {
      const { recordId } = request.params as { recordId: string }
      await updateLandRecordManual(
        pool, recordId, request.user!.id, request.body as Record<string, any>
      )
      await landCache.invalidateSingleRecord(recordId)
      await landCache.invalidateUserRecords(request.user!.id)
      return { success: true }
    }
  })

  // DELETE soft-delete a land record
  app.delete('/land/:recordId', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('land_records', pool)],
    schema: {
      params: {
        type: 'object',
        required: ['recordId'],
        properties: { recordId: { type: 'string', format: 'uuid' } }
      }
    },
    handler: async (request, reply) => {
      const { recordId } = request.params as { recordId: string }
      await softDeleteLandRecord(pool, recordId, request.user!.id)
      await landCache.invalidateSingleRecord(recordId)
      await landCache.invalidateUserRecords(request.user!.id)
      return { success: true }
    }
  })
}
