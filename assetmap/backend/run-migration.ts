import { pool } from './src/db/connection';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'migrations', '011_plans_billing.sql'), 'utf-8');
  try {
    await pool.query(sql);
    console.log('Migration successful');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('Migration already applied');
    } else {
      console.error('Migration failed', e);
    }
  } finally {
    process.exit(0);
  }
}

run();
