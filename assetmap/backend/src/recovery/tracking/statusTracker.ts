// ═══════════════════════════════════════════════════════════════
// Status Tracker — Poll for recovery case status updates
// ═══════════════════════════════════════════════════════════════

import { Pool } from 'pg'
import { RecoveryStatus } from '../types/recoveryTypes'
import { logger } from '../../utils/logger'

export const statusTracker = {

  /**
   * Check all pending cases and update statuses.
   * Called periodically by the recovery worker.
   */
  async checkAllPendingCases(pool: Pool): Promise<void> {
    if (process.env.MOCK_MODE === 'true') return

    try {
      const pendingCases = await pool.query(`
        SELECT id, recovery_type, status, srn_number, submission_ref,
               submitted_at, estimated_completion
        FROM recovery_cases
        WHERE status IN ('submitted', 'under_review')
        AND updated_at < NOW() - INTERVAL '1 day'
        ORDER BY submitted_at ASC
        LIMIT 50
      `)

      for (const rc of pendingCases.rows) {
        // In production, this would poll government portals
        // For now, we just log that we'd check
        logger.info('Would check status for case', {
          caseId: rc.id,
          type:   rc.recovery_type,
          srn:    rc.srn_number,
        })

        // Update last checked time
        await pool.query(
          'UPDATE recovery_cases SET last_status_update = NOW() WHERE id = $1',
          [rc.id]
        )
      }
    } catch (error) {
      logger.error('Status check failed', { error })
    }
  },

  /**
   * Get aggregate status summary for user dashboard.
   */
  async getStatusSummary(pool: Pool, userId: string): Promise<{
    totalCases:     number
    activeCases:    number
    completedCases: number
    totalEstimated: number
    totalRecovered: number
    totalFeesPaid:  number
  }> {
    if (process.env.MOCK_MODE === 'true') {
      return {
        totalCases:     0,
        activeCases:    0,
        completedCases: 0,
        totalEstimated: 0,
        totalRecovered: 0,
        totalFeesPaid:  0,
      }
    }

    const result = await pool.query(`
      SELECT
        COUNT(*)::int                                                    AS total_cases,
        COUNT(*) FILTER (WHERE status NOT IN ('completed','rejected','withdrawn'))::int AS active_cases,
        COUNT(*) FILTER (WHERE status = 'completed')::int               AS completed_cases,
        COALESCE(SUM(estimated_value_paise), 0)::bigint                 AS total_estimated,
        COALESCE(SUM(recovered_value_paise) FILTER (WHERE status = 'completed'), 0)::bigint AS total_recovered,
        COALESCE(SUM(fee_amount_paise) FILTER (WHERE status = 'completed'), 0)::bigint      AS total_fees_paid
      FROM recovery_cases
      WHERE user_id = $1
    `, [userId])

    const row = result.rows[0]
    return {
      totalCases:     row.total_cases,
      activeCases:    row.active_cases,
      completedCases: row.completed_cases,
      totalEstimated: Number(row.total_estimated),
      totalRecovered: Number(row.total_recovered),
      totalFeesPaid:  Number(row.total_fees_paid),
    }
  }
}
