import 'dotenv/config';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';

import { pool, checkDatabaseHealth, checkRedisHealth, closeConnections, connectRedis } from './db/connection';
import { logger } from './utils/logger';
import { errorResponse, successResponse, ERROR_CODES } from './utils/constants';

// Route imports
import authRoutes from './routes/auth';
import consentRoutes from './routes/consent';
import assetRoutes from './routes/assets';
import estateRoutes from './routes/estate';
import reportRoutes from './routes/reports';


const app = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          // NEVER log Authorization header or any PII
        };
      }
    }
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);

import fastifyCookie from '@fastify/cookie';

declare module 'fastify' {
  interface FastifyInstance {
    // Other decorators if any
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      role: string;
      sessionId: string;
      type: string;
    };
    user: {
      id: string;
      role: string;
      sessionId: string;
    };
  }
}

async function registerPlugins() {
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"]
      }
    }
  });

  await app.register(cors, { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' }); // General limit

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'super-secret', // for cookie signature
    hook: 'onRequest'
  });

  const getPrivateKey = () => process.env.JWT_PRIVATE_KEY || '';
  const getPublicKey = () => process.env.JWT_PUBLIC_KEY || '';

  await app.register(jwt, { 
    secret: { private: getPrivateKey(), public: getPublicKey() }, 
    sign: { algorithm: 'RS256' },
    verify: { algorithms: ['RS256'] },
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
}

// Global error handler
app.setErrorHandler((err, request, reply) => {
  const error = err as any;
  if (error.validation) {
    reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, error.message));
    return;
  }
  logger.error('Unhandled error', { error: error.message });
  reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
});

// Health check
app.get('/api/health', async (request, reply) => {
  const [dbHealthy, redisHealthy] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  const status = dbHealthy && redisHealthy ? 200 : 503;

  reply.status(status).send(
    successResponse({
      status: status === 200 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
    })
  );
});

// API Routes
async function registerRoutes() {
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(consentRoutes, { prefix: '/api/consent' });
  await app.register(assetRoutes, { prefix: '/api/assets' });
  await app.register(estateRoutes, { prefix: '/api/estate' });
  await app.register(reportRoutes, { prefix: '/api/reports' });
}

async function startServer(): Promise<void> {
  try {
    await registerPlugins();
    await registerRoutes();

    if (process.env.MOCK_MODE === 'true') {
      logger.info('Running in MOCK_MODE. Bypassing PostgreSQL and Redis connections.');
    } else {
      await pool.query('SELECT 1');
      logger.info('PostgreSQL connection established');

      const redisConnected = await connectRedis();
      if (redisConnected) {
        logger.info('Redis connection established');
      }
    }

    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`AssetMap backend running on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  await closeConnections();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;
