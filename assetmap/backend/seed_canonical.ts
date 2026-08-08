import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const sql = `
    INSERT INTO canonical_assets (
      id, user_id, asset_class, institution_name,
      account_ref_enc, has_nominee, nominee_name_enc,
      current_value_paise
    )
    SELECT 
      id, user_id, 
      CASE 
        WHEN fi_type = 'DEPOSIT' THEN 'BANK_ACCOUNT'
        WHEN fi_type = 'EQUITY' THEN 'EQUITY'
        WHEN fi_type = 'MUTUAL_FUND' THEN 'MUTUAL_FUND'
        WHEN fi_type = 'INSURANCE_POLICIES' THEN 'INSURANCE_LIFE'
        WHEN fi_type = 'NPS' THEN 'NPS'
        ELSE 'OTHER'
      END as asset_class, 
      institution_name,
      account_ref, has_nominee, nominee_name_enc,
      10000000 -- mock value of 1 Lakh INR
    FROM nominee_status
    ON CONFLICT (id) DO NOTHING;
  `;

  try {
    const res = await client.query(sql);
    console.log(`Successfully seeded ${res.rowCount} canonical assets from nominee_status.`);
  } catch (err) {
    console.error('Error seeding canonical assets:', err);
  } finally {
    await client.end();
  }
}
run();
