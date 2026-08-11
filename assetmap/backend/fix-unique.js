const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixUniqueConstraint() {
  try {
    await pool.query(`
      ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_status_key;
      DROP INDEX IF EXISTS user_subscriptions_active_idx;
      CREATE UNIQUE INDEX user_subscriptions_active_idx ON user_subscriptions(user_id) WHERE status = 'active';
      DELETE FROM user_subscriptions;
    `);
    console.log("Unique constraint fixed and subscriptions cleared for retry!");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fixUniqueConstraint();
