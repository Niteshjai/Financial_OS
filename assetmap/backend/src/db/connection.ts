import 'dotenv/config';
import { Pool, PoolConfig } from 'pg';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────
// PostgreSQL Connection Pool
// ─────────────────────────────────────────────

const pgConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 120000, // 2 minutes, prevents reconnect every minute for cron workers
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
};

export const pool = new Pool(pgConfig);

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New PostgreSQL client connected');
});

// ─────────────────────────────────────────────
// Redis Client + in-memory fallback
// ─────────────────────────────────────────────

let redisAvailable = false;

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    // Exponential backoff: 200ms, 400ms, 800ms, ... up to 30s, then keep retrying
    const delay = Math.min(times * 200, 30000);
    logger.debug(`Redis reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  lazyConnect: true,
  enableOfflineQueue: false,
  keepAlive: 30000,   // Send TCP keep-alive every 30s to prevent idle drops
  connectTimeout: 10000,
});

redis.on('error', (err) => {
  if (redisAvailable) {
    logger.error('Redis connection error', { error: err.message });
    redisAvailable = false;
  }
});

redis.on('connect', () => {
  logger.debug('Redis client connected');
});

redis.on('ready', () => {
  redisAvailable = true;
  logger.info('Redis client ready');
});

const memoryStore = new Map<string, { value: string; expiresAt?: number }>();

function cleanupExpiredMemoryEntries() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt && now > entry.expiresAt) {
      memoryStore.delete(key);
    }
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export function useMemoryStore(): boolean {
  return process.env.MOCK_MODE === 'true' || !redisAvailable;
}

export async function connectRedis(): Promise<boolean> {
  if (process.env.MOCK_MODE === 'true') {
    return false;
  }

  try {
    await redis.connect();
    await redis.ping();
    redisAvailable = true;
    return true;
  } catch (err) {
    redisAvailable = false;

    if (process.env.NODE_ENV === 'development') {
      logger.warn('Redis unavailable — falling back to in-memory store for sessions and cache', {
        error: (err as Error).message,
      });
      try {
        redis.disconnect();
      } catch {
        // ignore cleanup errors
      }
      return false;
    }

    throw err;
  }
}

/** Key-value store that uses Redis when available, otherwise in-memory. */
export const kvStore = {
  async setex(key: string, ttl: number, value: string): Promise<void> {
    if (useMemoryStore()) {
      memoryStore.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
      return;
    }
    await redis.setex(key, ttl, value);
  },

  async get(key: string): Promise<string | null> {
    if (useMemoryStore()) {
      cleanupExpiredMemoryEntries();
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    }
    return redis.get(key);
  },

  async del(key: string): Promise<void> {
    if (useMemoryStore()) {
      memoryStore.delete(key);
      return;
    }
    await redis.del(key);
  },

  async incr(key: string): Promise<number> {
    if (useMemoryStore()) {
      const current = parseInt(memoryStore.get(key)?.value || '0', 10);
      const next = current + 1;
      memoryStore.set(key, { value: String(next) });
      return next;
    }
    return redis.incr(key);
  },

  async expire(key: string, ttl: number): Promise<void> {
    if (useMemoryStore()) {
      const entry = memoryStore.get(key);
      if (entry) {
        memoryStore.set(key, { ...entry, expiresAt: Date.now() + ttl * 1000 });
      }
      return;
    }
    await redis.expire(key, ttl);
  },

  async keys(pattern: string): Promise<string[]> {
    if (useMemoryStore()) {
      cleanupExpiredMemoryEntries();
      const prefix = pattern.replace('*', '');
      return Array.from(memoryStore.keys()).filter((k) => k.startsWith(prefix));
    }
    return redis.keys(pattern);
  },
};

// ─────────────────────────────────────────────
// Health Checks
// ─────────────────────────────────────────────

export async function checkDatabaseHealth(): Promise<boolean> {
  if (process.env.MOCK_MODE === 'true') return true;
  try {
    const result = await pool.query('SELECT 1 AS health');
    return result.rows[0]?.health === 1;
  } catch {
    return false;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  if (process.env.MOCK_MODE === 'true' || useMemoryStore()) return true;
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────

export async function closeConnections(): Promise<void> {
  logger.info('Closing database connections...');

  if (process.env.MOCK_MODE !== 'true') {
    await pool.end();
  }

  if (redisAvailable && redis.status !== 'end') {
    await redis.quit();
  }

  logger.info('All database connections closed');
}
