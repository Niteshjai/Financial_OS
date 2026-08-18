import 'dotenv/config'
import { pool } from '../db/connection'

async function run() {
  await pool.query(`INSERT INTO plan_features (plan_id, feature_key, is_enabled) VALUES ('free', 'ancestral_search', true), ('plus', 'ancestral_search', true), ('pro', 'ancestral_search', true), ('b2b', 'ancestral_search', true) ON CONFLICT (plan_id, feature_key) DO NOTHING;`)
  console.log('Done')
  process.exit(0)
}
run()
