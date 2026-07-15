import { Pool } from 'pg';
import path from 'path';
import { encryptPII } from './src/utils/encryption';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function cleanAndSeed() {
  try {
    console.log('Connecting to database...');
    // Get the first user
    const res = await pool.query(`SELECT id FROM users LIMIT 1`);
    if (res.rows.length === 0) {
      console.log('No users found in the database. Please create a user first.');
      process.exit(1);
    }
    const userId = res.rows[0].id;
    console.log(`Cleaning and reseeding data for user ${userId}`);

    // Clean existing data for this user
    await pool.query(`DELETE FROM asset_snapshots WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM land_records WHERE user_id = $1`, [userId]);
    console.log('Cleaned existing records.');

    // Create a consent if not exists
    let consentRes = await pool.query(`SELECT id FROM consents WHERE user_id = $1 LIMIT 1`, [userId]);
    let consentId;
    if (consentRes.rows.length === 0) {
      consentRes = await pool.query(`
        INSERT INTO consents (user_id, aa_handle, consent_id, fi_types, purpose, date_range_start, date_range_end, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
        RETURNING id
      `, [userId, 'test@onemoney', 'mock-consent-' + Date.now(), '{DEPOSIT,EQUITY,MUTUAL_FUND,INSURANCE_POLICIES,NPS}', 'Wealth Management', '2020-01-01', '2030-01-01']);
    }
    consentId = consentRes.rows[0].id;

    const assetsToInsert = [
      // Bank Accounts
      { fi_type: 'DEPOSIT', institution: 'HDFC Bank', accountRef: 'XXXX1234', balance: 543200 },
      { fi_type: 'DEPOSIT', institution: 'State Bank of India', accountRef: 'XXXX9876', balance: 1250000 },
      { fi_type: 'DEPOSIT', institution: 'ICICI Bank', accountRef: 'XXXX5555', balance: 75000 },
      { fi_type: 'DEPOSIT', institution: 'Axis Bank', accountRef: 'XXXX4444', balance: 350000 },
      { fi_type: 'DEPOSIT', institution: 'Kotak Mahindra', accountRef: 'XXXX7777', balance: 15500 },

      // Stocks (Equity)
      { fi_type: 'EQUITY', institution: 'Zerodha Broking', accountRef: 'DP-XXXX12', balance: 4500000 },
      { fi_type: 'EQUITY', institution: 'Upstox', accountRef: 'DP-XXXX88', balance: 1200000 },
      { fi_type: 'EQUITY', institution: 'Groww', accountRef: 'DP-XXXX99', balance: 850000 },
      { fi_type: 'EQUITY', institution: 'ICICI Direct', accountRef: 'DP-XXXX45', balance: 2100000 },

      // Mutual Funds
      { fi_type: 'MUTUAL_FUND', institution: 'SBI Mutual Fund', accountRef: 'FOLIO-123', balance: 1500000 },
      { fi_type: 'MUTUAL_FUND', institution: 'HDFC Mutual Fund', accountRef: 'FOLIO-456', balance: 2500000 },
      { fi_type: 'MUTUAL_FUND', institution: 'Axis Mutual Fund', accountRef: 'FOLIO-789', balance: 1800000 },
      { fi_type: 'MUTUAL_FUND', institution: 'Nippon India', accountRef: 'FOLIO-999', balance: 900000 },
      { fi_type: 'MUTUAL_FUND', institution: 'Parag Parikh Flexi Cap', accountRef: 'FOLIO-111', balance: 3200000 },

      // Insurance
      { fi_type: 'INSURANCE_POLICIES', institution: 'LIC of India', accountRef: 'POL-112233', balance: 500000 },
      { fi_type: 'INSURANCE_POLICIES', institution: 'HDFC Life', accountRef: 'POL-445566', balance: 1000000 },
      { fi_type: 'INSURANCE_POLICIES', institution: 'ICICI Prudential', accountRef: 'POL-778899', balance: 750000 },
      { fi_type: 'INSURANCE_POLICIES', institution: 'Max Life Insurance', accountRef: 'POL-121212', balance: 1200000 },

      // NPS
      { fi_type: 'NPS', institution: 'NSDL e-Gov', accountRef: 'PRAN-12345678', balance: 1850000 },
      { fi_type: 'NPS', institution: 'KFintech NPS', accountRef: 'PRAN-87654321', balance: 450000 },

      // GSTN (just as a placeholder)
      { fi_type: 'GSTN', institution: 'GST Network', accountRef: 'GSTIN-123', balance: 0 },
    ];

    console.log('Inserting assets...');
    for (const asset of assetsToInsert) {
      await pool.query(`
        INSERT INTO asset_snapshots (user_id, consent_id, fi_type, institution_name, account_ref_encrypted, balance_encrypted)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        consentId,
        asset.fi_type,
        asset.institution,
        encryptPII(asset.accountRef),
        encryptPII(asset.balance.toString())
      ]);
    }

    const landToInsert = [
      { source: 'SUREPASS', district: 'Rangareddy', state: 'Telangana', survey: 'SY-101', area: 2400, owner: 'John Doe' },
      { source: 'SUREPASS', district: 'Bengaluru Urban', state: 'Karnataka', survey: 'SY-202', area: 1200, owner: 'John Doe' },
      { source: 'SUREPASS', district: 'Pune', state: 'Maharashtra', survey: 'SY-303', area: 1500, owner: 'John Doe' },
      { source: 'SUREPASS', district: 'Ahmedabad', state: 'Gujarat', survey: 'SY-404', area: 3000, owner: 'John Doe' },
      { source: 'SUREPASS', district: 'Lucknow', state: 'Uttar Pradesh', survey: 'SY-505', area: 4500, owner: 'John Doe' },
    ];

    console.log('Inserting land records...');
    for (const land of landToInsert) {
      await pool.query(`
        INSERT INTO land_records (user_id, source, state, district, survey_number, area_sqft, owner_name_encrypted)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        land.source,
        land.state,
        land.district,
        land.survey,
        land.area,
        encryptPII(land.owner)
      ]);
    }

    console.log('Successfully seeded database with rich asset data (without duplicates)!');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    pool.end();
  }
}

cleanAndSeed();
