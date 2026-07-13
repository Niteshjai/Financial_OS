const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres:Nitesh123@localhost:5432/assetmap' });
  await client.connect();
  const sql = fs.readFileSync('src/db/migrations/005_net_worth_history.sql', 'utf8');
  await client.query(sql);
  console.log('Migration applied');
  await client.end();
}
run().catch(console.error);
