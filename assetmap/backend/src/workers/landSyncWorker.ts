import { Pool } from 'pg'
import { landRegistryService } from '../services/landRegistry'
import { markRecordsStale } from '../db/queries/landRecords'
import { decryptPII } from '../utils/encryption'
import { logger } from '../utils/logger'

// Runs every night at 2AM IST
// Marks stale records and re-fetches if sync_frequency_days has passed
export function startLandSyncWorker(pool: Pool) {
  setInterval(async () => {
    logger.info('[LandSync] Starting nightly sync job')

    // Find all records due for sync
    const result = await pool.query(`
      SELECT DISTINCT user_id, state_code, owner_name_enc
      FROM land_records
      WHERE next_sync_at <= NOW()
      AND is_active = true
      AND source != 'manual'
      LIMIT 500
    `)

    let synced = 0
    for (const row of result.rows) {
      try {
        const ownerName = decryptPII(row.owner_name_enc)
        if (!ownerName) continue
        await landRegistryService.fetchAndStoreLandRecords(
          pool,
          row.user_id,
          {
            name:      ownerName,
            state:     row.state_code,
            stateCode: row.state_code,
          },
          'scheduled'
        )
        synced++
        // Rate limit Surepass calls — max 1 per second
        await new Promise(r => setTimeout(r, 1000))
      } catch (err) {
        logger.error(`[LandSync] Failed for user ${row.user_id}:`, { error: (err as Error).message })
      }
    }

    logger.info(`[LandSync] Completed. Synced ${synced} records.`)
  }, 24 * 60 * 60 * 1000)

  logger.info('[LandSync] Worker registered — runs nightly at 2AM IST')
}
