import { FastifyPluginAsync } from 'fastify';
import { createConsentRequest, handleConsentCallback, revokeConsent } from '../services/accountAggregator';
import { ConsentCreateSchema, ConsentCallbackSchema } from '../utils/validators';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants';
import { ConsentModel } from '../models/consent';
import { logger } from '../utils/logger';
import { verifyAccessToken } from '../middleware/auth';

const consentRoutes: FastifyPluginAsync = async (fastify, opts) => {

  // ─────────────────────────────────────────────
  // POST /api/consent/create
  // ─────────────────────────────────────────────
  fastify.post('/create', {
    schema: { body: ConsentCreateSchema },
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const { fiTypes, purpose, dateRangeStart, dateRangeEnd } = request.body as Record<string, any>;
      const userId = request.user!.id;
      const ipAddress = request.ip || '';
      const userAgent = request.headers['user-agent'] || '';

      const result = await createConsentRequest(
        userId,
        fiTypes,
        purpose,
        { start: dateRangeStart, end: dateRangeEnd },
        ipAddress,
        userAgent
      );

      return reply.send(successResponse(result));
    } catch (error) {
      logger.error('Consent creation failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, (error as Error).message));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/consent/status/:consentId
  // ─────────────────────────────────────────────
  fastify.get('/status/:consentId', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const { consentId } = request.params as Record<string, any>;
      const consent = await ConsentModel.findByConsentId(consentId);

      if (!consent) {
        return reply.status(404).send(errorResponse(ERROR_CODES.CONSENT_NOT_FOUND, 'Consent not found'));
      }

      if (consent.userId !== request.user!.id) {
        return reply.status(403).send(errorResponse(ERROR_CODES.UNAUTHORIZED, 'Access denied'));
      }

      return reply.send(successResponse(consent));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch consent status'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/consent/callback — Setu Webhook
  // ─────────────────────────────────────────────
  fastify.post('/callback', {
    schema: { body: ConsentCallbackSchema }
  }, async (request, reply) => {
    try {
      const { consentId, status } = request.body as Record<string, any>;
      const webhookSignature = request.headers['x-setu-signature'] as string | undefined;

      await handleConsentCallback(consentId, status, webhookSignature);

      return reply.send(successResponse({ message: 'Callback processed' }));
    } catch (error) {
      logger.error('Consent callback failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Callback processing failed'));
    }
  });

  // ─────────────────────────────────────────────
  // DELETE /api/consent/:consentId — Revoke
  // ─────────────────────────────────────────────
  fastify.delete('/:consentId', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const { consentId } = request.params as Record<string, any>;
      const consent = await ConsentModel.findByConsentId(consentId);

      if (!consent) {
        return reply.status(404).send(errorResponse(ERROR_CODES.CONSENT_NOT_FOUND, 'Consent not found'));
      }

      if (consent.userId !== request.user!.id) {
        return reply.status(403).send(errorResponse(ERROR_CODES.UNAUTHORIZED, 'Access denied'));
      }

      if (consent.status === 'REVOKED') {
        return reply.status(400).send(errorResponse(ERROR_CODES.CONSENT_ALREADY_REVOKED, 'Consent is already revoked'));
      }

      await revokeConsent(
        consentId,
        request.user!.id,
        request.ip || '',
        request.headers['user-agent'] || ''
      );

      return reply.send(successResponse({ message: 'Consent revoked successfully' }));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to revoke consent'));
    }
  });

  // ─────────────────────────────────────────────
  // GET /api/consent — List user's consents
  // ─────────────────────────────────────────────
  fastify.get('/', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const consents = await ConsentModel.findByUserId(request.user!.id);
      return reply.send(successResponse(consents));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch consents'));
    }
  });

};

export default consentRoutes;
