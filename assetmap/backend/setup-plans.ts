import { Pool } from 'pg';
import { razorpaySubscriptionService } from './src/billing/razorpaySubscription';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('Setting up Razorpay plans...');
  try {
    await razorpaySubscriptionService.setupRazorpayPlans(pool);
    console.log('Successfully setup Razorpay plans.');
  } catch (err) {
    console.error('Failed to setup Razorpay plans:', err);
  } finally {
    await pool.end();
  }
}

main();
