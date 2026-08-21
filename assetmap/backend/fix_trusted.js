const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:Nitesh123@localhost:5432/assetmap' });
(async () => {
  try {
    await pool.query('ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);');
    await pool.query('ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS browser VARCHAR(100);');
    await pool.query('ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS os VARCHAR(100);');
    await pool.query('ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);');
    await pool.query('ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);');
    await pool.query('ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;');
    await pool.query(`ALTER TABLE trusted_devices ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days';`);
    console.log('Columns added successfully');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
