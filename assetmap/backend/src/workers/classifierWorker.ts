import { Queue, Worker } from 'bullmq'
import { Pool }          from 'pg'
import { transactionClassifier } from '../classifier/transactionClassifier'

let classifierWorkerQueue: Queue

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

export function startClassifierWorker(pool: Pool): void {
  const connection = getRedisConnection();

  classifierWorkerQueue = new Queue('transaction-classifier', { connection, skipVersionCheck: true } as any)

  const worker = new Worker(
    'transaction-classifier',
    async (job) => {
      const { userId } = job.data
      console.log(`[Classifier] Processing user ${userId}`)
      const result = await transactionClassifier.processUserTransactions(pool, userId)
      console.log(`[Classifier] Done: ${result.processed} processed, ${result.failed} failed`)
    },
    {
      connection,
      concurrency: 5,
    }
  )

  console.log('[Classifier] Worker started')
}

export { classifierWorkerQueue }
