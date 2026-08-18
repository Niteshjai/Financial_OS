require('dotenv').config();
const { Client } = require('pg');

async function addEnum() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/assetmap'
  });
  
  try {
    await client.connect();
    await client.query("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'INSURANCE_GAP_ANALYSED'");
    console.log('Enum updated successfully');
  } catch (e) {
    console.error('Error updating enum:', e);
  } finally {
    await client.end();
  }
}

addEnum();
