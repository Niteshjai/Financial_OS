import { pool } from '../src/db/connection';
import { apiKeyManager } from '../src/b2b/auth/apiKeyManager';
import fs from 'fs';
import path from 'path';

async function runDemo() {
  console.log('--- 0. Checking Database Setup ---');
  try {
    await pool.query('SELECT 1 FROM b2b_clients LIMIT 1');
    console.log('Database tables already exist.');
  } catch (err) {
    console.log('Applying migration 009_b2b_api.sql...');
    const sqlPath = path.join(__dirname, '../../assetmap/backend/src/db/migrations/009_b2b_api.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Migration applied successfully.');
  }

  console.log('\n--- 1. Getting a Demo Client ---');
  const clientResult = await pool.query("SELECT * FROM b2b_clients WHERE business_type = 'law_firm' LIMIT 1");
  const client = clientResult.rows[0];
  if (!client) {
    console.error('No law firm client found!');
    process.exit(1);
  }
  console.log(`Found Client: ${client.business_name} (ID: ${client.id})`);

  console.log('\n--- 2. Generating a Sandbox API Key ---');
  const { apiKey } = await apiKeyManager.createKey(pool, client.id, { environment: 'sandbox', description: 'Demo Sandbox Key' });
  console.log(`API Key generated: ${apiKey}`);

  console.log('\n--- 3. Making API Call to Gateway (Sandbox Mode) ---');
  const fakeUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const url = `http://127.0.0.1:3001/b2b/v1/user/${fakeUserId}/estate`;
  console.log(`GET ${url}`);
  
  const response = await fetch(url, {
    headers: { 'x-api-key': apiKey }
  });
  
  const data = await response.json();
  console.log(`\nStatus Code: ${response.status}`);
  console.log('Response Body:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n--- 4. Checking Rate Limit Headers ---');
  console.log(`X-RateLimit-Remaining: ${response.headers.get('x-ratelimit-remaining')}`);
  console.log(`X-RateLimit-Reset: ${response.headers.get('x-ratelimit-reset')}`);

  process.exit(0);
}

runDemo().catch(err => {
  console.error(err);
  process.exit(1);
});
