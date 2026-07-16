import { pool } from '../src/db/connection';
import { apiKeyManager } from '../src/b2b/auth/apiKeyManager';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

async function runDemo() {
  console.log('--- 0. Checking Database Setup ---');
  console.log('Applying migration 009_b2b_api.sql...');
  const sqlPath = path.join(__dirname, '../../assetmap/backend/src/db/migrations/009_b2b_api.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query('DROP TABLE IF EXISTS b2b_webhook_deliveries, b2b_webhook_endpoints, b2b_user_consents, b2b_api_keys, b2b_clients CASCADE;');
  await pool.query(sql);
  console.log('Migration applied successfully.\n');

  const businessTypes = [
    { type: 'law_firm', endpoint: '/estate' },
    { type: 'wealth_manager', endpoint: '/portfolio' },
    { type: 'nbfc', endpoint: `/credit?scorecardId=${uuidv4()}` },
    { type: 'insurance_company', endpoint: '/insurance' },
    { type: 'hr_payroll', endpoint: '/employment' }
  ];

  const fakeUserId = uuidv4();
  const results = [];

  for (const { type, endpoint } of businessTypes) {
    console.log(`\n======================================================`);
    console.log(`                 DEMO: ${type.toUpperCase()}`);
    console.log(`======================================================`);
    
    // 1. Get Client
    const clientResult = await pool.query("SELECT * FROM b2b_clients WHERE business_type = $1 LIMIT 1", [type]);
    const client = clientResult.rows[0];
    if (!client) {
      console.error(`No client found for ${type}`);
      continue;
    }
    console.log(`Found Client: ${client.business_name}`);

    // 2. Generate Key
    const { apiKey } = await apiKeyManager.createKey(pool, client.id, { environment: 'sandbox' });
    console.log(`API Key generated: ${apiKey}`);

    // 3. Make Request
    const url = `http://127.0.0.1:3001/b2b/v1/user/${fakeUserId}${endpoint}`;
    console.log(`GET ${url}`);
    
    const response = await fetch(url, { headers: { 'x-api-key': apiKey } });
    const data = await response.json();
    
    console.log(`Status Code: ${response.status}`);
    console.log(`Response Snippet (Data Keys):`, Object.keys(data.data || {}));
    
    results.push({ type, data });
  }

  // Save the full results to a JSON file for the artifact to display
  fs.writeFileSync(path.join(__dirname, 'demo_results.json'), JSON.stringify(results, null, 2));
  console.log(`\nDemo complete. Wrote full responses to scratch/demo_results.json`);
  
  process.exit(0);
}

runDemo().catch(err => {
  console.error(err);
  process.exit(1);
});
