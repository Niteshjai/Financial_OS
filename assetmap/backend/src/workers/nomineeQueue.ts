import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../utils/logger';
import { pool } from '../db/connection';
import { processMFCentralNomination } from './adapters/mfCentralAdapter';
import { processKRANomination } from './adapters/kraAdapter';
import { processBankNomination } from './adapters/bankPdfAdapter';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const nomineeQueue = new Queue('nomineeUpdates', { 
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

export interface NomineeJobPayload {
  requestId: string;
  userId: string;
  platform: 'MFCENTRAL' | 'KRA' | 'BANK';
  assetRef: string;
  nominees: any[];
}

export function startNomineeWorker() {
  const worker = new Worker('nomineeUpdates', async (job: Job<NomineeJobPayload>) => {
    const { platform, requestId } = job.data;
    logger.info(`Processing nomination request ${requestId} for ${platform}`);

    try {
      // Update status to PROCESSING
      await pool.query('UPDATE nomination_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['PROCESSING', requestId]);

      if (platform === 'MFCENTRAL') {
        await processMFCentralNomination(job.data);
      } else if (platform === 'KRA') {
        await processKRANomination(job.data);
      } else if (platform === 'BANK') {
        await processBankNomination(job.data);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

    } catch (error) {
      logger.error(`Nomination request ${requestId} failed`, { error });
      // In a real scenario, we might let BullMQ retry. If it completely fails after retries, 
      // we mark it FAILED. For now, since we want BullMQ to handle retries, we throw the error.
      // The 'failed' event listener on the worker will mark the DB status as FAILED if attempts are exhausted.
      throw error;
    }
  }, { 
    connection,
    concurrency: 5,
    skipVersionCheck: true
  });

  worker.on('completed', async (job) => {
    logger.info(`Job ${job.id} completed!`);
    // Status will be updated via Webhooks for MFCENTRAL and KRA, or directly for BANK.
  });

  worker.on('failed', async (job, err) => {
    logger.error(`Job ${job?.id} failed with error ${err.message}`);
    if (job && job.attemptsMade >= job.opts.attempts!) {
      await pool.query('UPDATE nomination_requests SET status = $1, updated_at = NOW() WHERE id = $2', ['FAILED', job.data.requestId]);
    }
  });

  logger.info('[BullMQ] Nominee worker registered and listening');
}
