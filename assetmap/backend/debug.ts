import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const res = await c.query('SELECT canonical_asset_id, status FROM nominee_update_tasks');
  console.log('Tasks:', res.rows);
  const res2 = await c.query(`
    SELECT
        ns.id, ns.institution_name, ns.has_nominee,
        t.status as task_status
      FROM nominee_status ns
      LEFT JOIN (
        SELECT canonical_asset_id, status 
        FROM nominee_update_tasks 
        WHERE status NOT IN ('completed', 'failed', 'skipped', 'verified')
      ) t ON t.canonical_asset_id = ns.id
      WHERE ns.user_id = (SELECT user_id FROM nominee_status LIMIT 1)
  `);
  console.log('NomineeStatusJoin:', res2.rows);
  await c.end();
}
run();
