const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateConstraint() {
  await pool.query(`
    ALTER TABLE user_subscriptions DROP CONSTRAINT user_subscriptions_status_check;
    ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_status_check 
    CHECK (status IN ('active', 'cancelled', 'past_due', 'paused', 'trialing', 'expired', 'pending'));
  `);
  console.log("Constraint updated");
  await pool.end();
}

updateConstraint();
