const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clear() {
  await pool.query("DELETE FROM user_subscriptions;");
  console.log("Subscriptions cleared");
  await pool.end();
}

clear();
