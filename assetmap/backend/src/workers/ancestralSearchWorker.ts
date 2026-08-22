import { Queue, Worker } from 'bullmq'
import { Pool }          from 'pg'
import { ancestralSearch } from '../ancestral/ancestralSearch'

let ancestralSearchQueue: Queue

function getRedisConnection() {
  if (process.env.REDIS_URL) {
    try {
      const u = new URL(process.env.REDIS_URL);
      return {
        host: u.hostname,
        port: parseInt(u.port || '6379'),
        password: u.password ? decodeURIComponent(u.password) : undefined,
        username: u.username ? decodeURIComponent(u.username) : undefined,
        maxRetriesPerRequest: null,
      };
    } catch {}
  }
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    maxRetriesPerRequest: null,
  };
}

export function startAncestralSearchWorker(pool: Pool): void {
  const connection = getRedisConnection();

  ancestralSearchQueue = new Queue('ancestral-search', { 
    connection, 
    defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    skipVersionCheck: true
  } as any)

  const worker = new Worker(
    'ancestral-search',
    async (job) => {
      const { searchId, userId, input, variants } = job.data
      console.log(`[AncestralSearch] Processing search ${searchId}`)
      await ancestralSearch.executeSearch(
        pool, searchId, userId, input, variants
      )
    },
    {
      connection,
      concurrency: 3,    // Max 3 concurrent searches (Surepass rate limits)
      skipVersionCheck: true,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[AncestralSearch] Job ${job?.id} failed:`, err)
  })

  console.log('[AncestralSearch] Worker started')
}

export { ancestralSearchQueue }
