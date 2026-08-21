import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';

import { pool, checkDatabaseHealth, checkRedisHealth, closeConnections, connectRedis } from './db/connection';
import { logger } from './utils/logger';
import { errorResponse, successResponse, ERROR_CODES } from './utils/constants';
import { env } from './config/env';

// Route imports
import authRoutes from './routes/auth';
import consentRoutes from './routes/consent';
import assetRoutes from './routes/assets';
import estateRoutes from './routes/estate';
import reportRoutes from './routes/reports';
import { landRoutes } from './routes/land';
import { engagementRoutes } from './routes/alerts';
import { startLandSyncWorker } from './workers/landSyncWorker';
import { startAssetChangeWorker } from './workers/assetChangeWorker';
import { startNetWorthSnapshotWorker } from './workers/netWorthSnapshotWorker';
import { runUnclaimedSyncWorker } from './workers/unclaimedSyncWorker';
import { insuranceRoutes } from './routes/insurance';
import { unclaimedRoutes } from './routes/unclaimed';
import { recoveryRoutes } from './routes/recovery';
import { willRoutes } from './routes/will';
import { loanRoutes } from './routes/loan';
import logsRoutes from './routes/logs';
import { plansRoutes } from './routes/plans';
import { supportRoutes } from './routes/support';
import { nomineeRoutes } from './routes/nominee';
import { spendAnalyticsRoutes } from './routes/spend';
import { familyRoutes } from './routes/family';
import { scoringRoutes } from './routes/scoring';
import { manualRoutes } from './routes/manual';
// import { startNomineeWorker } from './workers/nomineeQueue';
import { startStatusSweeper } from './cron/statusSweeper';
import { startNomineeVerificationWorker } from './workers/nomineeVerificationWorker';
import { startClassifierWorker } from './workers/classifierWorker';
import { startFamilySnapshotWorker } from './workers/familySnapshotWorker';
import { ancestralRoutes } from './routes/ancestral';
import { startAncestralSearchWorker } from './workers/ancestralSearchWorker';
import { twoFactorRoutes } from './routes/twoFactor';
import { startTwoFactorSweeper } from './cron/twoFactorSweeper';

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

  await app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
  await app.register(rateLimit, { max: 500, timeWindow: '3 seconds' }); // General limit

  await app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET, // for cookie signature
    hook: 'onRequest'
  });

  await app.register(jwt, { 
    secret: { private: env.JWT_PRIVATE_KEY, public: env.JWT_PUBLIC_KEY }, 
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
  const error = err as Record<string, any>;
  if (error.validation) {
    reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, error.message));
    return;
  }
  // Handle empty JSON body errors from Fastify's parser
  if (error.message?.includes('Body cannot be empty')) {
    reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Request body is required'));
    return;
  }
  logger.error('Unhandled error', { error: error.stack || error.message });
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
  await app.register(landRoutes, { prefix: '/api/assets' });
  await app.register(estateRoutes, { prefix: '/api/estate' });
  await app.register(reportRoutes, { prefix: '/api/reports' });
  await app.register(engagementRoutes, { prefix: '/api/engagement' });
  await app.register(insuranceRoutes, { prefix: '/api/insurance' });
  await app.register(unclaimedRoutes, { prefix: '/api/unclaimed' });
  await app.register(scoringRoutes, { prefix: '/api/scoring' });
  await app.register(recoveryRoutes, { prefix: '/api/recovery' });
  await app.register(willRoutes, { prefix: '/api/will' });
  await app.register(loanRoutes, { prefix: '/api/loan' });
  await app.register(logsRoutes, { prefix: '/api/logs' });
  await app.register(plansRoutes); // Prefix is defined inside plans.ts as /api/...
  await app.register(supportRoutes, { prefix: '/api/support' });
  await app.register(nomineeRoutes, { prefix: '/api/nominee' });
  await app.register(spendAnalyticsRoutes, { prefix: '/api/spend' });
  await app.register(familyRoutes, { prefix: '/api/family' });
  await app.register(manualRoutes, { prefix: '/api/manual' });
  await app.register(ancestralRoutes);
  await app.register(twoFactorRoutes);

  app.post('/api/admin/run-migration', async (req, reply) => {
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, 'db', 'migrations', '011_plans_billing.sql'), 'utf-8');
    await pool.query(sql);
    return { success: true };
  });
}

async function startServer(): Promise<void> {
  try {
    await registerPlugins();
    await registerRoutes();

    if (process.env.MOCK_MODE === 'true') {
      logger.info('Running in MOCK_MODE. Bypassing PostgreSQL and Redis connections.');
      // Actually we still need Postgres for mock mode because we query it. 
      // The original code was bypassing Postgres for mock mode but we shouldn't bypass it.
      await pool.query('SELECT 1');
      logger.info('PostgreSQL connection established for MOCK_MODE');
      
      // Ensure mock user exists to prevent foreign key violations (e.g. net worth history)
      await pool.query(`
        INSERT INTO users (id, name_encrypted, registered_at)
        VALUES ('00000000-0000-4000-a000-000000000001', 'Mock User', NOW())
        ON CONFLICT (id) DO NOTHING
      `);
      
      const redisConnected = await connectRedis();
      if (redisConnected) {
        logger.info('Redis connection established');
      }
    } else {
      await pool.query('SELECT 1');
      logger.info('PostgreSQL connection established');

      const redisConnected = await connectRedis();
      if (redisConnected) {
        logger.info('Redis connection established');
      }
    }

    startLandSyncWorker(pool);
    startAssetChangeWorker(pool);
    startNetWorthSnapshotWorker(pool);
    runUnclaimedSyncWorker(pool);
    // startNomineeWorker();
    startStatusSweeper();
    startNomineeVerificationWorker();
    startClassifierWorker(pool);
    startFamilySnapshotWorker(pool);
    startAncestralSearchWorker(pool);
    startTwoFactorSweeper();

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
