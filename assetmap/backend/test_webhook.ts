import { handleConsentCallback } from './src/services/accountAggregator';
import { pool } from './src/db/connection';

async function run() {
  try {
    const res = await pool.query('SELECT consent_id FROM consents');
    console.log(`Found ${res.rows.length} consents. Triggering webhooks...`);
    
    for (const row of res.rows) {
      console.log('Testing consentId:', row.consent_id);
      await handleConsentCallback(row.consent_id, 'ACTIVE');
    }
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
