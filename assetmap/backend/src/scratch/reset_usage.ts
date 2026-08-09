import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query('TRUNCATE TABLE feature_usage;');
    console.log('Successfully reset feature usage limits for all users.');
    
    // Optionally also set all users to premium for dev
    // await pool.query(`
    //   INSERT INTO user_current_plan (user_id, plan_id, status)
    //   SELECT id, 'plus', 'active' FROM users
    //   ON CONFLICT (user_id) DO UPDATE SET plan_id = 'plus', status = 'active';
    // `);
    // console.log('Successfully upgraded all users to Plus plan.');
  } catch (err) {
    console.error('Error resetting limits:', err);
  } finally {
    await pool.end();
  }
}

run();
