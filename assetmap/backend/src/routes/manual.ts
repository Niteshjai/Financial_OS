// ═══════════════════════════════════════════════════════════════
// AssetMap — Manual Asset Routes
// CRUD API for manually entered physical, financial, business assets
// ═══════════════════════════════════════════════════════════════

import { FastifyInstance }    from 'fastify'
import { verifyAccessToken }  from '../middleware/auth'
import { manualAssetService } from '../manual/manualAssetService'
import { manualAIEnricher }   from '../manual/manualAIEnricher'
import { ASSET_CATEGORIES, CATEGORY_GROUPS } from '../manual/assetCategories'

export async function manualRoutes(app: FastifyInstance) {

  // ──────────── GET /categories ────────────
  // Returns category config to drive the frontend category picker + form
  app.get('/', async () => {
    return {
      success: true,
      data: {
        categories: Object.values(ASSET_CATEGORIES).map(c => ({
          category:          c.category,
          label:             c.label,
          emoji:             c.emoji,
          description:       c.description,
          group:             c.group,
          color:             c.color,
          valuationHelpText: c.valuationHelpText,
          extraFields:       c.extraFields,
        })),
        groups: CATEGORY_GROUPS,
      },
    }
  })

  // ──────────── GET /assets ────────────
  // List all manual assets for the authenticated user
  app.get('/assets', {
    preHandler: [verifyAccessToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
        },
      },
    },
    handler: async (req) => {
      const { category } = req.query as any
      const data = await manualAssetService.getUserAssets(
        req.user!.id, category
      )
      return { success: true, data }
    },
  })

  // ──────────── GET /assets/:assetId ────────────
  // Get single asset detail + value history
  app.get('/assets/:assetId', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const { assetId } = req.params as { assetId: string }
      const asset = await manualAssetService.getAssetById(req.user!.id, assetId)

      if (!asset) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Asset not found' },
        })
      }

      const history = await manualAssetService.getValueHistory(
        req.user!.id, assetId
      )

      return { success: true, data: { asset, history } }
    },
  })

  // ──────────── POST /assets ────────────
  // Create a new manual asset
  app.post('/assets', {
    preHandler: [verifyAccessToken],
    schema: {
      body: {
        type: 'object',
        required: ['assetCategory', 'assetName', 'currentValuePaise'],
        properties: {
          assetCategory:          { type: 'string' },
          assetName:              { type: 'string', minLength: 2, maxLength: 300 },
          description:            { type: 'string', maxLength: 1000 },
          currentValuePaise:      { type: 'integer', minimum: 1 },
          purchaseValuePaise:     { type: 'integer', minimum: 0 },
          purchaseDate:           { type: 'string' },
          currency:               { type: 'string' },
          foreignCurrency:        { type: 'string' },
          foreignAmount:          { type: 'number' },
          extraFields:            { type: 'object' },
          valuationMethod:        { type: 'string' },
          tags:                   { type: 'array', items: { type: 'string' } },
          notes:                  { type: 'string' },
          includeInNetworth:      { type: 'boolean' },
          isEncumbered:           { type: 'boolean' },
          encumbranceAmountPaise: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    },
    handler: async (req, reply) => {
      const body = req.body as any

      // Validate category
      if (!ASSET_CATEGORIES[body.assetCategory]) {
        return reply.status(400).send({
          success: false,
          error: {
            code:    'INVALID_CATEGORY',
            message: `Unknown category: ${body.assetCategory}`,
          },
        })
      }

      try {
        const result = await manualAssetService.createAsset(
          req.user!.id,
          { ...body, extraFields: body.extraFields ?? {} }
        )

        // Fire-and-forget AI enrichment
        manualAIEnricher.enrich(req.user!.id, result.assetId).catch(() => {})

        return reply.status(201).send({ success: true, data: result })
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: { code: 'CREATE_FAILED', message: err.message },
        })
      }
    },
  })

  // ──────────── PATCH /assets/:assetId ────────────
  // Update asset fields
  app.patch('/assets/:assetId', {
    preHandler: [verifyAccessToken],
    handler: async (req) => {
      const { assetId } = req.params as { assetId: string }
      await manualAssetService.updateAsset(
        req.user!.id, assetId, req.body as any
      )
      return { success: true }
    },
  })

  // ──────────── POST /assets/:assetId/update-value ────────────
  // Quick value update (most common action)
  app.post('/assets/:assetId/update-value', {
    preHandler: [verifyAccessToken],
    schema: {
      body: {
        type: 'object',
        required: ['newValuePaise'],
        properties: {
          newValuePaise:   { type: 'integer', minimum: 1 },
          valuationMethod: { type: 'string' },
          reason:          { type: 'string', maxLength: 200 },
        },
        additionalProperties: false,
      },
    },
    handler: async (req) => {
      const { assetId } = req.params as { assetId: string }
      const { newValuePaise, valuationMethod, reason } = req.body as any
      await manualAssetService.updateValue(
        req.user!.id, assetId,
        newValuePaise, valuationMethod, reason
      )
      return { success: true }
    },
  })

  // ──────────── DELETE /assets/:assetId ────────────
  // Soft delete
  app.delete('/assets/:assetId', {
    preHandler: [verifyAccessToken],
    handler: async (req) => {
      const { assetId } = req.params as { assetId: string }
      await manualAssetService.deleteAsset(req.user!.id, assetId)
      return { success: true }
    },
  })

  // ──────────── GET /assets/:assetId/history ────────────
  // Value history for a specific asset
  app.get('/assets/:assetId/history', {
    preHandler: [verifyAccessToken],
    handler: async (req) => {
      const { assetId } = req.params as { assetId: string }
      const history = await manualAssetService.getValueHistory(
        req.user!.id, assetId
      )
      return { success: true, data: history }
    },
  })

  // ──────────── POST /assets/:assetId/enrich ────────────
  // Re-run AI enrichment for an asset
  app.post('/assets/:assetId/enrich', {
    preHandler: [verifyAccessToken],
    handler: async (req) => {
      const { assetId } = req.params as { assetId: string }
      await manualAIEnricher.enrich(req.user!.id, assetId)
      return { success: true, data: { message: 'Enrichment triggered' } }
    },
  })

  // ──────────── GET /summary ────────────
  // Summary of all manual assets with totals by category
  app.get('/summary', {
    preHandler: [verifyAccessToken],
    handler: async (req) => {
      const data = await manualAssetService.getSummary(req.user!.id)
      return { success: true, data }
    },
  })
}
