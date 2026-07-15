import { pool } from './src/db/connection';

async function run() {
  try {
    const res = await pool.query('SELECT id, user_id, consent_id, fi_type FROM asset_snapshots_aa');
    console.log('All snapshots:', res.rows);
    
    const userRes = await pool.query('SELECT id FROM users');
    console.log('All users:', userRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
