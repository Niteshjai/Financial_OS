import { pool } from './src/db/connection';

async function main() {
  try {
    await pool.query(`ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'LOAN_ELIGIBILITY_ASSESSED'`);
    console.log('Enum updated successfully.');
  } catch (err) {
    console.error('Error updating enum:', err);
  } finally {
    process.exit(0);
  }
}
main();
