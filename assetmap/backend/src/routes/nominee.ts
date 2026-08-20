import { FastifyPluginAsync } from 'fastify';
import { verifyAccessToken } from '../middleware/auth';
import { pool } from '../db/connection';
import { nomineeOrchestrator, NomineeInput } from '../nominee/nomineeOrchestrator';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants';
import { logger } from '../utils/logger';
import { planEnforcer } from '../plans/planEnforcer';
import { require2FA } from '../auth/twoFactorMiddleware';

// ═══════════════════════════════════════════════════════════════
// Nominee Update Routes — "Fill Once, Update Everywhere"
// ═══════════════════════════════════════════════════════════════

const VALID_RELATIONSHIPS = [
  'spouse', 'son', 'daughter', 'father', 'mother',
  'brother', 'sister', 'grandson', 'granddaughter', 'other',
];

export const nomineeRoutes: FastifyPluginAsync = async (fastify) => {
  const auth2FA = [verifyAccessToken, require2FA()]

  // ─────────────────────────────────────────────
  // GET /missing — Accounts missing nominees
  // ─────────────────────────────────────────────
  fastify.get('/missing', {
    preHandler: auth2FA,
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      const result = await pool.query(`
        SELECT
          id, asset_class, institution_name,
          has_nominee, current_value_paise,
          last_synced_at
        FROM canonical_assets
        WHERE user_id = $1
        AND is_active = true
        AND (has_nominee = false OR has_nominee IS NULL)
        AND asset_class IN (
          'BANK_ACCOUNT','FIXED_DEPOSIT','MUTUAL_FUND',
          'EQUITY','NPS','INSURANCE_LIFE',
          'INSURANCE_HEALTH','EPF','PPF'
        )
        ORDER BY current_value_paise DESC NULLS LAST
      `, [userId]);

      const accounts = result.rows;

      const summary = {
        total: accounts.length,
        byType: {
          bank:       accounts.filter(r => ['BANK_ACCOUNT', 'FIXED_DEPOSIT', 'PPF'].includes(r.asset_class)).length,
          mutualFund: accounts.filter(r => r.asset_class === 'MUTUAL_FUND').length,
          equity:     accounts.filter(r => r.asset_class === 'EQUITY').length,
          epf:        accounts.filter(r => r.asset_class === 'EPF').length,
          nps:        accounts.filter(r => r.asset_class === 'NPS').length,
          insurance:  accounts.filter(r => ['INSURANCE_LIFE', 'INSURANCE_HEALTH'].includes(r.asset_class)).length,
        },
        totalValueAtRiskPaise: accounts.reduce(
          (s, r) => s + parseInt(r.current_value_paise || '0'), 0
        ),
      };

      return reply.send(successResponse({ accounts, summary }));
    } catch (error: any) {
      logger.error('Failed to fetch missing nominees', { error: error.message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch accounts'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /start — Save nominees + create batch + auto-run
  // ─────────────────────────────────────────────
  fastify.post('/start', {
    preHandler: [verifyAccessToken, require2FA(), planEnforcer.requireFeature('nominee_checker', pool)],
  }, async (request, reply) => {
    try {
      const userId   = request.user!.id;
      const body     = request.body as any;
      const nominees = body?.nominees;
      const assetIds = body?.assetIds;

      if (!nominees || !Array.isArray(nominees) || nominees.length === 0) {
        return reply.status(400).send(errorResponse(
          ERROR_CODES.VALIDATION_ERROR, 'At least one nominee is required'
        ));
      }

      if (nominees.length > 4) {
        return reply.status(400).send(errorResponse(
          ERROR_CODES.VALIDATION_ERROR, 'Maximum 4 nominees allowed (RBI rule)'
        ));
      }

      // Validate each nominee
      const profileIds: string[] = [];
      let totalPct = 0;

      for (const nom of nominees) {
        if (!nom.nomineeName || nom.nomineeName.length < 2) {
          return reply.status(400).send(errorResponse(
            ERROR_CODES.VALIDATION_ERROR, 'Nominee name must be at least 2 characters'
          ));
        }
        if (!nom.nomineeDob || !/^\d{4}-\d{2}-\d{2}$/.test(nom.nomineeDob)) {
          return reply.status(400).send(errorResponse(
            ERROR_CODES.VALIDATION_ERROR, 'Nominee date of birth must be YYYY-MM-DD'
          ));
        }
        if (!nom.relationship || !VALID_RELATIONSHIPS.includes(nom.relationship)) {
          return reply.status(400).send(errorResponse(
            ERROR_CODES.VALIDATION_ERROR, `Invalid relationship. Must be one of: ${VALID_RELATIONSHIPS.join(', ')}`
          ));
        }

        const input: NomineeInput = {
          nomineeName:       nom.nomineeName,
          nomineeDob:        nom.nomineeDob,
          relationship:      nom.relationship,
          relationshipLabel: nom.relationshipLabel ?? nom.relationship,
          nomineeMobile:     nom.nomineeMobile,
          nomineeEmail:      nom.nomineeEmail,
          nomineeAddress:    nom.nomineeAddress,
          nomineeAadhaar:    nom.nomineeAadhaar,
          isMinor:           nom.isMinor ?? false,
          guardianName:      nom.guardianName,
          guardianRelation:  nom.guardianRelation,
          guardianMobile:    nom.guardianMobile,
          allocationPct:     nom.allocationPct ?? 100,
          priorityOrder:     nom.priorityOrder ?? (profileIds.length + 1),
        };

        totalPct += input.allocationPct;

        const id = await nomineeOrchestrator.saveNomineeProfile(userId, input);
        profileIds.push(id);
      }

      // Validate allocation totals 100% for multiple nominees
      if (nominees.length > 1 && totalPct !== 100) {
        return reply.status(400).send(errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          `Nominee allocations must total 100%. Current total: ${totalPct}%`
        ));
      }

      // Create batch and tasks
      const batch = await nomineeOrchestrator.createBatch(userId, profileIds, assetIds);

      // Run CAMS auto tasks immediately
      const autoResult = await nomineeOrchestrator.runAutoTasks(batch.batchId, userId);

      // Process insurance form+email tasks
      await nomineeOrchestrator.processInsuranceTasks(batch.batchId, userId);

      return reply.status(201).send(successResponse({
        batchId: batch.batchId,
        summary: {
          totalAccounts: batch.tasks.length,
          autoProcessed: batch.autoCount,
          requiresOTP:   batch.guidedCount,
          formEmailed:   batch.formCount,
          manualBranch:  batch.manualCount,
          autoResult,
        },
        tasks: batch.tasks,
      }));
    } catch (error: any) {
      logger.error('Nominee start failed', { error: error.message });
      if (error.message.includes('No accounts found')) {
        return reply.status(404).send(errorResponse(ERROR_CODES.NOT_FOUND, error.message));
      }
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to start nominee update'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /batch/:batchId — Real-time batch status
  // ─────────────────────────────────────────────
  fastify.get('/batch/:batchId', {
    preHandler: auth2FA,
  }, async (request, reply) => {
    try {
      const { batchId } = request.params as any;
      const userId      = request.user!.id;
      const status      = await nomineeOrchestrator.getBatchStatus(batchId, userId);
      return reply.send(successResponse(status));
    } catch (error: any) {
      if (error.message === 'Batch not found') {
        return reply.status(404).send(errorResponse(ERROR_CODES.NOT_FOUND, 'Batch not found'));
      }
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch batch status'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /session/:taskId/prepare — Open guided OTP session
  // ─────────────────────────────────────────────
  fastify.post('/session/:taskId/prepare', {
    preHandler: auth2FA,
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as any;
      const userId     = request.user!.id;
      const session    = await nomineeOrchestrator.prepareGuidedSession(taskId, userId);
      return reply.send(successResponse(session));
    } catch (error: any) {
      if (error.message === 'Task not found') {
        return reply.status(404).send(errorResponse(ERROR_CODES.NOT_FOUND, 'Task not found'));
      }
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to prepare session'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /session/:taskId/complete — Mark session done
  // ─────────────────────────────────────────────
  fastify.post('/session/:taskId/complete', {
    preHandler: auth2FA,
  }, async (request, reply) => {
    try {
      const { taskId } = request.params as any;
      const userId     = request.user!.id;
      await nomineeOrchestrator.markSessionCompleted(taskId, userId);
      return reply.send(successResponse({ message: 'Session marked as completed' }));
    } catch (error: any) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to mark session completed'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /history — Past batches
  // ─────────────────────────────────────────────
  fastify.get('/history', {
    preHandler: auth2FA,
  }, async (request, reply) => {
    try {
      const userId  = request.user!.id;
      const batches = await nomineeOrchestrator.getBatchHistory(userId);
      return reply.send(successResponse({ batches }));
    } catch (error: any) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch history'));
    }
  });
};
