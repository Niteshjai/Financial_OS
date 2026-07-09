import { FastifyPluginAsync } from 'fastify';
import { verifyAccessToken, requireRole } from '../middleware/auth';
import { AssetSnapshotModel } from '../models/assetSnapshot';
import { LandRecordModel } from '../models/landRecord';
import { ConsentModel } from '../models/consent';
import { fetchFinancialData } from '../services/accountAggregator';
import { searchByName, searchByPAN, storeLandRecords } from '../services/landRegistry';
import { LandSearchByNameSchema, LandSearchByPANSchema } from '../utils/validators';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants';
import { auditLogger } from '../services/auditLogger';
import { logger } from '../utils/logger';

const assetRoutes: FastifyPluginAsync = async (fastify, opts) => {

  // ─────────────────────────────────────────────
  // GET /api/assets/summary
  // Aggregated net worth + category breakdown
  // ─────────────────────────────────────────────
  fastify.get('/summary', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const summary = await AssetSnapshotModel.getSummary(userId);
      const landRecords = await LandRecordModel.findByUserId(userId);

      // Add land value to summary if available
      const landValue = landRecords.reduce((sum, r) => {
        // Estimate based on area (rough heuristic for display)
        return sum + (r.areaSqft * 2000); // ₹2000/sqft average placeholder
      }, 0);

      return reply.send(successResponse({
        ...summary,
        landRecordCount: landRecords.length,
        estimatedLandValue: landValue,
        totalWithLand: summary.totalNetWorth + landValue,
      }));
    } catch (error) {
      logger.error('Asset summary failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch asset summary'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/assets/financial
  // All AA-fetched financial data
  // ─────────────────────────────────────────────
  fastify.get('/financial', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const assets = await AssetSnapshotModel.findByUserId(request.user!.id);
      return reply.send(successResponse({ assets }));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch financial data'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/assets/refresh
  // Re-trigger AA data session
  // ─────────────────────────────────────────────
  fastify.post('/refresh', {
    preHandler: [verifyAccessToken],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      // Find the most recent active consent
      const consents = await ConsentModel.getActiveConsents(userId);
      if (consents.length === 0) {
        return reply.status(403).send(errorResponse(ERROR_CODES.NO_ACTIVE_CONSENT, 'No active consent. Please grant consent first.'));
      }

      const activeConsent = consents[0];
      const ipAddress = request.ip || '';
      const userAgent = request.headers['user-agent'] || '';

      const freshData = await fetchFinancialData(activeConsent.consentId, userId, ipAddress, userAgent);

      await auditLogger.log(userId, 'DATA_REFRESHED', 'asset_snapshots', activeConsent.consentId, ipAddress, userAgent);

      // Return fresh summary
      const summary = await AssetSnapshotModel.getSummary(userId);

      return reply.send(successResponse({
        message: `Refreshed ${freshData.length} asset records`,
        summary,
      }));
    } catch (error) {
      logger.error('Asset refresh failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.DATA_FETCH_FAILED, 'Failed to refresh financial data'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/assets/land
  // User's land records
  // ─────────────────────────────────────────────
  fastify.get('/land', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const records = await LandRecordModel.findByUserId(request.user!.id);
      return reply.send(successResponse({ records }));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch land records'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/assets/land/search
  // Manual land search via Surepass
  // ─────────────────────────────────────────────
  fastify.post('/land/search', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      const ipAddress = request.ip || '';
      const userAgent = request.headers['user-agent'] || '';

      const body = request.body as any;

      // Try name search first
      if (body.name && body.state && body.district) {
        const { name, state, district } = body;
        const result = await searchByName(name, state, district);

        // Store found records
        if (result.records.length > 0) {
          await storeLandRecords(userId, result.records);
        }

        await auditLogger.log(userId, 'LAND_SEARCH', 'land_records', undefined, ipAddress, userAgent);

        return reply.send(successResponse(result));
      }

      // Try PAN search
      if (body.pan && body.state) {
        const { pan, state } = body;
        const result = await searchByPAN(pan, state);

        if (result.records.length > 0) {
          await storeLandRecords(userId, result.records);
        }

        await auditLogger.log(userId, 'LAND_SEARCH', 'land_records', undefined, ipAddress, userAgent);

        return reply.send(successResponse(result));
      }

      return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Provide either (name, state, district) or (pan, state) for land search'));
    } catch (error) {
      logger.error('Land search failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.LAND_SEARCH_FAILED, 'Land record search failed'));
    }
  });

};

export default assetRoutes;
