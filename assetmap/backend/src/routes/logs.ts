import { FastifyPluginAsync } from 'fastify';
import { frontendLogger } from '../utils/logger';
import { FrontendLogSchema } from '../utils/validators';

interface LogPayload {
  message: string;
  type: string;
  stack?: string;
  url?: string;
  timestamp?: string;
  userAgent?: string;
}

const logsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/frontend', {
    schema: { body: FrontendLogSchema },
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
  }, async (request, reply) => {
    try {
      const payload = request.body as LogPayload;
      
      const { message, type, stack, url, timestamp, userAgent } = payload;
      
      const logData = {
        errorType: type || 'UnknownError',
        url: url || request.headers.referer || '',
        userAgent: userAgent || request.headers['user-agent'] || '',
        clientTimestamp: timestamp || new Date().toISOString(),
        stack,
      };

      // Write to frontend-error.log via the frontendLogger
      frontendLogger.error(message || 'Frontend Error', logData);

      return reply.send({ success: true });
    } catch (err) {
      // Don't fail the request if logging fails, just log to the main backend logger
      fastify.log.error(err as Error, 'Failed to process frontend log');
      return reply.status(500).send({ success: false, error: 'Internal logging error' });
    }
  });
};

export default logsRoutes;
