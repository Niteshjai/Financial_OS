import 'dotenv/config';
import { pool } from './src/db/connection';

async function fixUsersTable() {
  try {
    console.log('Adding columns to users table...');
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS fathers_name_encrypted TEXT;");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(50) DEFAULT 'Indian';");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(10);");
    console.log('Successfully updated users table');
  } catch (error) {
    console.error('Failed to update table:', error);
  } finally {
    await pool.end();
  }
}

fixUsersTable();
