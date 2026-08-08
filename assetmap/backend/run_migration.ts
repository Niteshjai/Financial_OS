import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log('Connected to DB');
  
  const sql = fs.readFileSync(path.join(__dirname, 'src/db/migrations/015_canonical_assets.sql'), 'utf-8');
  
  try {
    await client.query(sql);
    console.log('Migration 015 applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

run();
