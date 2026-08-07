import cron from 'node-cron';
import { logger } from '../utils/logger';
import { nomineeVerifier } from '../nominee/verification/nomineeVerifier';

/**
 * Nominee Verification Worker
 * Runs daily at 7AM IST to verify if nominee updates have been
 * confirmed via Account Aggregator data re-fetch.
 */
export function startNomineeVerificationWorker(): void {
  // Run daily at 7:00 AM IST (1:30 UTC)
  cron.schedule('30 1 * * *', async () => {
    logger.info('[NomineeVerifier] Starting daily verification job');
    try {
      const result = await nomineeVerifier.verifyPendingTasks();
      logger.info('[NomineeVerifier] Daily verification complete', result);
    } catch (err) {
      logger.error('[NomineeVerifier] Daily verification failed', {
        error: (err as Error).message,
      });
    }
  }, { timezone: 'Asia/Kolkata' });

  logger.info('[NomineeVerifier] Worker registered — runs daily at 7AM IST');
}
