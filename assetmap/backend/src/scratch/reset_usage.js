const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query('TRUNCATE TABLE feature_usage;');
    console.log('Successfully reset feature usage limits for all users.');
  } catch (err) {
    console.error('Error resetting limits:', err);
  } finally {
    await pool.end();
  }
}

run();
