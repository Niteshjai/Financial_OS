const { Pool } = require('pg');
require('dotenv').config();
const { razorpaySubscriptionService } = require('./dist/billing/razorpaySubscription');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    // get a real user ID
    const userRes = await pool.query("SELECT id FROM users LIMIT 1");
    if (!userRes.rows[0]) throw new Error("No users found");
    const userId = userRes.rows[0].id;
    
    const res = await razorpaySubscriptionService.createSubscription(pool, userId, 'plus', 'monthly');
    console.log("Success:", res);
  } catch (err) {
    if (err.response) {
      console.error("Razorpay Error:", err.response.data);
    } else {
      console.error("Local Error:", err);
    }
  } finally {
    await pool.end();
  }
}

test();
