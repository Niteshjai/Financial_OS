import { Queue, Worker } from 'bullmq'
import { Pool }          from 'pg'
import { transactionClassifier } from '../classifier/transactionClassifier'

let classifierWorkerQueue: Queue

export function startClassifierWorker(pool: Pool): void {
  const connection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
  }

  classifierWorkerQueue = new Queue('transaction-classifier', { connection })

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
