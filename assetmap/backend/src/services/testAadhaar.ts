import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../../.env') });

import { initiateOKYC } from './aadhaar';
import { redis, pool } from '../db/connection';
import crypto from 'crypto';

async function testAadhaar() {
  console.log('Testing UIDAI integration...');
  
  // Generate dummy RSA keys for testing XML cryptography if not set or invalid
  const hasValidPrivateKey = process.env.UIDAI_PRIVATE_KEY && process.env.UIDAI_PRIVATE_KEY.includes('-----BEGIN');
  if (!process.env.UIDAI_PUBLIC_CERT || !hasValidPrivateKey) {
    console.log('Generating dummy RSA keys for testing (valid PEM required)...');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.UIDAI_PUBLIC_CERT = process.env.UIDAI_PUBLIC_CERT || publicKey;
    if (!hasValidPrivateKey) {
      // User might have put ASA License Key here by mistake
      if (process.env.UIDAI_PRIVATE_KEY) {
        process.env.UIDAI_ASA_CODE = process.env.UIDAI_PRIVATE_KEY;
      }
      process.env.UIDAI_PRIVATE_KEY = privateKey;
    }
  }

  console.log('KYC_PROVIDER before:', process.env.KYC_PROVIDER);
  console.log('MOCK_MODE before:', process.env.MOCK_MODE);
  
  // Force UIDAI provider and disable mock mode for testing
  process.env.KYC_PROVIDER = 'uidai';
  process.env.MOCK_MODE = 'false';

  console.log('UIDAI_AUA_CODE:', process.env.UIDAI_AUA_CODE ? 'Set' : 'NOT SET');
  console.log('UIDAI_LICENSE_KEY:', process.env.UIDAI_LICENSE_KEY ? 'Set' : 'NOT SET');

  try {
    const result = await initiateOKYC('999999999999', '127.0.0.1');
    console.log('\n--- SUCCESS ---');
    console.log(result);
  } catch (error: any) {
    console.log('\n--- FAILED ---');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  } finally {
    await redis.quit();
    await pool.end();
    process.exit(0);
  }
}

testAadhaar();
