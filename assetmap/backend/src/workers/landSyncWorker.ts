import cron from 'node-cron'
import { Pool } from 'pg'
import { landRegistryService } from '../services/landRegistry'
import { markRecordsStale } from '../db/queries/landRecords'

// Runs every night at 2AM IST
// Marks stale records and re-fetches if sync_frequency_days has passed
export function startLandSyncWorker(pool: Pool) {
  cron.schedule('0 20 * * *', async () => {
    console.log('[LandSync] Starting nightly sync job')

    // Find all records due for sync
    const result = await pool.query(`
      SELECT DISTINCT user_id, state_code,
             decrypt_field(owner_name_enc) AS owner_name
      FROM land_records
      WHERE next_sync_at <= NOW()
      AND is_active = true
      AND source != 'manual'
      LIMIT 500
    `)

    let synced = 0
    for (const row of result.rows) {
      try {
        if (!row.owner_name) continue
        await landRegistryService.fetchAndStoreLandRecords(
          pool,
          row.user_id,
          {
            name:      row.owner_name,
            state:     row.state_code,
            stateCode: row.state_code,
          },
          'scheduled'
        )
        synced++
        // Rate limit Surepass calls — max 1 per second
        await new Promise(r => setTimeout(r, 1000))
      } catch (err) {
        console.error(`[LandSync] Failed for user ${row.user_id}:`, err)
      }
    }

    console.log(`[LandSync] Completed. Synced ${synced} records.`)
  }, {
    timezone: 'Asia/Kolkata'
  })

  console.log('[LandSync] Worker registered — runs nightly at 2AM IST')
}
