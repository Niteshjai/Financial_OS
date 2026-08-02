import { FastifyPluginAsync } from 'fastify';
import { verifyAccessToken } from '../middleware/auth';
import { pool } from '../db/connection';
import { NominateRequestSchema } from '../validators/nominee';
import { encryptPII } from '../utils/encryption';
import { nomineeQueue } from '../workers/nomineeQueue';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants';
import { logger } from '../utils/logger';

export const nomineeRoutes: FastifyPluginAsync = async (fastify, opts) => {
  
  // POST /api/v1/nominate
  fastify.post('/nominate', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      // 1. Zod Validation
      const parseResult = NominateRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, parseResult.error.errors[0].message));
      }

      const { platform, assetRef, nominees } = parseResult.data;
      const userId = request.user!.id;

      // 2. Encrypt sensitive payload
      const payloadEncrypted = encryptPII(JSON.stringify(nominees));

      // 3. Save to DB with PENDING status
      const insertRes = await pool.query(
        `INSERT INTO nomination_requests (user_id, platform, asset_ref, payload_encrypted, status)
         VALUES ($1, $2, $3, $4, 'PENDING') RETURNING id`,
        [userId, platform, assetRef, payloadEncrypted]
      );

      const requestId = insertRes.rows[0].id;

      // 4. Push job to BullMQ
      const job = await nomineeQueue.add('updateNominee', {
        requestId,
        userId,
        platform,
        assetRef,
        nominees // send plain to worker (worker could also decrypt, but we pass it via Queue for simplicity)
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });

      // Update DB with BullMQ job ID
      await pool.query('UPDATE nomination_requests SET job_id = $1 WHERE id = $2', [job.id, requestId]);

      // 5. Return 202 Accepted
      return reply.code(202).send(successResponse({
        message: 'Nomination update request accepted',
        trackingId: requestId, // We use internal ID as initial tracking ID
        status: 'PENDING'
      }));

    } catch (error) {
      logger.error('Nominate API failed', { error });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to process nomination request'));
    }
  });

  // POST /api/v1/nominate/webhooks/rta-status
  fastify.post('/webhooks/rta-status', async (request, reply) => {
    // This endpoint acts as a webhook receiver for MFCentral/KRA async responses
    const body: any = request.body;
    
    // Validate signature/auth in real world
    if (!body || !body.trackingId || !body.status) {
      return reply.status(400).send({ success: false, message: 'Invalid payload' });
    }

    const { trackingId, status, reason } = body;
    logger.info(`[Webhook] Received status ${status} for tracking ID ${trackingId}`);

    try {
      const targetStatus = status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
      await pool.query(
        'UPDATE nomination_requests SET status = $1, updated_at = NOW() WHERE tracking_id = $2',
        [targetStatus, trackingId]
      );
      return reply.send({ success: true });
    } catch (error) {
      logger.error('[Webhook] Failed to update DB', { error });
      return reply.status(500).send({ success: false });
    }
  });
};
