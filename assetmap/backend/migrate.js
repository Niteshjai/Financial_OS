const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in environment or .env file');
  process.exit(1);
}

console.log('🔄 Connecting to database to run migrations...');
const pool = new Pool({ 
  connectionString,
  ssl: connectionString.includes('azure.com') ? { rejectUnauthorized: false } : undefined
});

async function run() {
  try {
    // 1. Check if schema needs to be initialized (check if users table exists)
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const schemaExists = tableCheck.rows[0].exists;
    
    if (!schemaExists) {
      console.log('🌱 Database is empty. Initializing schema from schema.sql...');
      const schemaSql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'schema.sql'), 'utf8');
      await pool.query(schemaSql);
      console.log('✅ Schema initialized successfully.');
    } else {
      console.log('ℹ️ Schema already exists. Skipping schema.sql initialization.');
    }

    // 2. Run migrations in order
    const migrationsDir = path.join(__dirname, 'src', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    console.log(`🔍 Found ${files.length} migration files. Applying updates...`);
    
    for (const file of files) {
      console.log(`⚙️ Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // We run each migration inside a transaction block to ensure safety
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed: ${file}. Error: ${err.message}`);
        throw err;
      } finally {
        client.release();
      }
    }
    
    console.log('🎉 All migrations applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database migration failed:', err);
    process.exit(1);
  }
}

run();
