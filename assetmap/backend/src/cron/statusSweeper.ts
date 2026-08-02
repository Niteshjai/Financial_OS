import { pool } from '../db/connection';
import { logger } from '../utils/logger';
import axios from 'axios';

export function startStatusSweeper() {
  // Run every 6 hours
  setInterval(async () => {
    logger.info('[Cron Sweeper] Running sweep for stale PENDING_RTA nomination requests');

    try {
      // Find requests stuck in PENDING_RTA for more than 24 hours
      const res = await pool.query(`
        SELECT id, platform, tracking_id 
        FROM nomination_requests 
        WHERE status = 'PENDING_RTA' 
        AND updated_at < NOW() - INTERVAL '24 hours'
      `);

      for (const row of res.rows) {
        logger.info(`[Cron Sweeper] Re-polling status for request ${row.id} (${row.platform} tracking: ${row.tracking_id})`);
        
        try {
          // Mock RTA poll
          // const rtaStatus = await axios.get(`https://mock-${row.platform.toLowerCase()}.api/status/${row.tracking_id}`);
          const simulatedStatus = Math.random() > 0.2 ? 'SUCCESS' : 'FAILED';
          
          await pool.query(
            'UPDATE nomination_requests SET status = $1, updated_at = NOW() WHERE id = $2',
            [simulatedStatus, row.id]
          );

          logger.info(`[Cron Sweeper] Updated request ${row.id} to ${simulatedStatus}`);
        } catch (pollErr) {
          logger.error(`[Cron Sweeper] Failed to poll status for request ${row.id}`, { error: pollErr });
        }
      }
    } catch (error) {
      logger.error('[Cron Sweeper] Failed to run sweeper query', { error });
    }
  }, 6 * 60 * 60 * 1000); // 6 hours

  logger.info('[Cron Sweeper] Registered sweeper for stale PENDING_RTA requests');
}
