import { pool } from './src/db/connection.ts';
import { encryptPII } from './src/utils/encryption.ts';

const mockParcels = [
  { surveyNumber: 'Survey No. 142/B', village: 'Hadapsar', taluka: 'Haveli', district: 'Pune', state: 'Maharashtra', stateCode: 'MH', areaAcres: 1.2, areaUnit: 'acres', landType: 'Agricultural', ownershipType: 'self', titleStatus: 'clear', registrationDate: '2018-03-12', estimatedValue: 3800000, latitude: 18.5204, longitude: 73.8567, digilockerDocAvailable: true, mutationStatus: 'completed', source: 'surepass' },
  { surveyNumber: 'Plot No. 78', khasraNumber: 'Sy. 56', village: 'Dharwad', taluka: 'Dharwad', district: 'Dharwad', state: 'Karnataka', stateCode: 'KA', areaAcres: 0.8, areaUnit: 'acres', landType: 'Residential', ownershipType: 'inherited', titleStatus: 'clear', registrationDate: '2015-06-05', estimatedValue: 5200000, latitude: 15.4589, longitude: 75.0078, digilockerDocAvailable: true, mutationStatus: 'completed', source: 'surepass' },
  { surveyNumber: 'Survey No. 33/1A', village: 'Mysuru', taluka: 'Mysuru', district: 'Mysuru', state: 'Karnataka', stateCode: 'KA', areaAcres: 1.1, areaUnit: 'acres', landType: 'Commercial', ownershipType: 'self', titleStatus: 'clear', registrationDate: '2020-01-22', estimatedValue: 8500000, latitude: 12.2958, longitude: 76.6394, digilockerDocAvailable: true, mutationStatus: 'completed', source: 'surepass' },
  { surveyNumber: 'Khasra No. 122', village: 'Varanasi', taluka: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', stateCode: 'UP', areaAcres: 2.5, areaUnit: 'acres', landType: 'Agricultural', ownershipType: 'inherited', titleStatus: 'dispute', registrationDate: '1995-11-14', estimatedValue: 1200000, latitude: 25.3176, longitude: 82.9739, digilockerDocAvailable: false, mutationStatus: 'pending', source: 'surepass' }
];

async function run() {
  const usersResult = await pool.query('SELECT id FROM users');
  const users = usersResult.rows.map(row => row.id);
  
  for (const userId of users) {
    for (const p of mockParcels) {
      await pool.query(
        `INSERT INTO land_records (user_id, survey_number_enc, khasra_number_enc, village, taluka, district, state, state_code, area_value, area_unit, land_type, ownership_type, title_status, registration_date, estimated_value_paise, latitude, longitude, digilocker_doc_available, mutation_status, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [userId, encryptPII(p.surveyNumber), p.khasraNumber ? encryptPII(p.khasraNumber) : null, p.village, p.taluka, p.district, p.state, p.stateCode, p.areaAcres * 43560, 'sqft', p.landType, p.ownershipType, p.titleStatus, p.registrationDate, p.estimatedValue * 100, p.latitude, p.longitude, p.digilockerDocAvailable, p.mutationStatus, p.source]
      );
    }
  }
  console.log('Inserted for all users');
  process.exit(0);
}
run();
