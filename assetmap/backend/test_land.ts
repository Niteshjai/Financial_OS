import { pool } from './src/db/connection';
import { insertLandRecord } from './src/db/queries/landRecords';

async function run() {
  try {
    const userRes = await pool.query('SELECT id FROM users');
    for (const user of userRes.rows) {
      const userId = user.id;
      
      console.log(`Adding land records for user ${userId}`);

      await insertLandRecord(pool, userId, {
        surveyNumber: 'SUR-120/A',
        plotNumber: 'P-12',
        ownerName: 'Mock Owner',
        village: 'Koramangala',
        taluka: 'Bengaluru South',
        district: 'Bengaluru',
        state: 'Karnataka',
        stateCode: 'KA',
        areaValue: 2400,
        areaUnit: 'sqft',
        landType: 'RESIDENTIAL',
        ownershipType: 'SOLE',
        titleStatus: 'CLEAR',
        estimatedValuePaise: 4800000000, // 4.8 Cr
        source: 'SUREPASS',
        sourceRecordId: 'mock-surepass-' + userId + '-1',
      }, { mock: true });

      await insertLandRecord(pool, userId, {
        surveyNumber: 'SUR-505/B',
        plotNumber: 'P-88',
        ownerName: 'Mock Owner',
        village: 'Bandra West',
        taluka: 'Mumbai',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        stateCode: 'MH',
        areaValue: 1200,
        areaUnit: 'sqft',
        landType: 'COMMERCIAL',
        ownershipType: 'JOINT',
        titleStatus: 'CLEAR',
        estimatedValuePaise: 6500000000, // 6.5 Cr
        source: 'SUREPASS',
        sourceRecordId: 'mock-surepass-' + userId + '-2',
      }, { mock: true });
    }
    console.log('Successfully added land records!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
