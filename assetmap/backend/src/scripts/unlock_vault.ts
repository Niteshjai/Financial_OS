import 'dotenv/config'
import { pool } from '../db/connection'

async function run() {
  try {
    // 1. Ensure family_vault feature exists for all plans
    await pool.query(`
      INSERT INTO plan_features (plan_id, feature_key, is_enabled)
      VALUES 
        ('free', 'family_vault', true),
        ('plus', 'family_vault', true)
      ON CONFLICT (plan_id, feature_key) 
      DO UPDATE SET is_enabled = true;
    `)
    console.log('Unlocked family_vault in plan_features for free and plus plans.')
    
    // 2. Update limits in plans table
    await pool.query(`
      UPDATE plans
      SET limit_family_members = 4
      WHERE id IN ('free', 'plus', 'pro', 'b2b');
    `)
    console.log('Updated limit_family_members to 4 for all plans.')
    
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await pool.end()
  }
}

run()
