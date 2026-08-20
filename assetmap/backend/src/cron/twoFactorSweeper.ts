import cron from 'node-cron'
import { Pool } from 'pg'
import { pool } from '../db/connection'
import { logger } from '../utils/logger'

export function startTwoFactorSweeper() {
  // Run daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('Starting two-factor sweeper...')
    try {
      // 1. Delete expired pending sessions
      const delSessions = await pool.query(`
        DELETE FROM pending_2fa_sessions
        WHERE expires_at < NOW() OR is_used = true
      `)
      logger.info(`Deleted ${delSessions.rowCount} expired/used 2FA pending sessions.`)

      // 2. Delete audit logs older than 90 days
      const delLogs = await pool.query(`
        DELETE FROM two_factor_audit_log
        WHERE created_at < NOW() - INTERVAL '90 days'
      `)
      logger.info(`Deleted ${delLogs.rowCount} old 2FA audit logs.`)

    } catch (err) {
      logger.error('Two-factor sweeper failed', { error: (err as Error).message })
    }
  })
  
  logger.info('Two-factor sweeper cron initialized.')
}
