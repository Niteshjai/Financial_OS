const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:Nitesh123@localhost:5432/assetmap' });
(async () => {
  try {
    await pool.query(`ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS trusted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`);
    console.log('Added trusted_at');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
