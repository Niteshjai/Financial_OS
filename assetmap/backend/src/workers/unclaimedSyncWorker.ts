import { Pool } from 'pg'
import { unclaimedAssets } from '../services/unclaimedAssets'

// Simple worker to pick up 'pending' searches and run them
export async function runUnclaimedSyncWorker(pool: Pool) {
  console.log('UnclaimedSyncWorker started...')
  
  setInterval(async () => {
    try {
      const result = await pool.query(`
        SELECT id, user_id, pan_enc, name_enc 
        FROM unclaimed_search_requests 
        WHERE search_status = 'pending' AND payment_status = 'completed'
        LIMIT 5
      `)
      
      for (const row of result.rows) {
        // Run search in background
        await unclaimedAssets.runSearch(
          pool, 
          row.id, 
          row.user_id, 
          { pan: row.pan_enc, name: row.name_enc }
        )
      }
    } catch (err) {
      console.error('UnclaimedSyncWorker error:', err)
    }
  }, 60000) // Run every minute
}
