const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres:Nitesh123@localhost:5432/assetmap'
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  const sql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'migrations', '006_phase2_features.sql'), 'utf-8');
  try {
    await client.query(sql);
    console.log('Migration applied successfully');
  } catch(e) {
    console.error('Migration failed:', e);
  } finally {
    await client.end();
  }
}
run();
