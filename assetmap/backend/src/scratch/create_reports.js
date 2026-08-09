const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        report_type VARCHAR(50) DEFAULT 'pdf',
        s3_key TEXT,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Successfully created reports table.');
  } catch (err) {
    console.error('Error creating reports table:', err);
  } finally {
    await pool.end();
  }
}

run();
