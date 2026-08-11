const { Pool } = require('pg');
require('dotenv').config();
// Because landRegistry uses pg Pool and landCache uses redis, this script just tests the mock generation
const { landRegistryService } = require('./dist/services/landRegistry');

// Create dummy pool to pass along
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  console.log("Testing Zoop.one Land Registry Service...");
  try {
    // If ZOOP_API_KEY is empty, this should automatically trigger the new mock mode
    // and return the dummy records without making a network call.
    const result = await landRegistryService.fetchAndStoreLandRecords(
      pool,
      'test-user-123',
      {
        name: 'John Doe',
        state: 'Maharashtra',
        stateCode: 'MH'
      },
      'initial_fetch'
    );
    console.log("Success! Mock records fetched:", result.records.length);
  } catch (err) {
    console.error("Test failed:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

test();
