import axios from 'axios';
import { randomUUID } from 'crypto';
import { pool, kvStore } from '../db/connection';
import { encryptPII, hashAadhaar, hashSHA256 } from '../utils/encryption';
import { logger } from '../utils/logger';
import { auditLogger } from './auditLogger';
import {
  generateSessionKey,
  encryptSessionKey,
  createPidXml,
  encryptPid,
  buildSignedAuthXml,
  buildSignedOtpXml,
  buildSignedKycXml
} from './uidaiCrypto';
import { uidaiHttpsAgent } from './uidai.service';

// ═══════════════════════════════════════════════════════════════
// Aadhaar OKYC Service
// Implements UIDAI sandbox OKYC flow
// NEVER logs or stores raw Aadhaar numbers
// ═══════════════════════════════════════════════════════════════

interface OKYCInitiateResponse {
  transactionId: string;
  message: string;
}

interface EKYCData {
  name: string;
  dob: string;
  gender: string;
  address: string;
  photo?: string; // base64
}

interface OKYCVerifyResponse {
  aadhaarHash: string;
  ekycData: EKYCData;
}

const UIDAI_API_URL = process.env.UIDAI_API_URL || 'https://developer.uidai.gov.in';

/**
 * Step 1: Initiate Aadhaar OKYC — generate OTP
 * The Aadhaar number is ONLY used for the API call, never stored or logged.
 */
export async function initiateOKYC(
  aadhaarNumber: string,
  ipAddress: string
): Promise<OKYCInitiateResponse> {
  const transactionId = randomUUID();

  if (process.env.MOCK_MODE === 'true') {
    return {
      transactionId,
      message: 'OTP sent successfully (Mock Mode)',
    };
  }

  try {
    // Construct URL per UIDAI OTP 2.5 spec: https://<host>/<ver>/<ac>/<uid[0]>/<uid[1]>/<asalk>
    const auaCode = process.env.UIDAI_AUA_CODE || 'public';
    const licenseKey = process.env.UIDAI_LICENSE_KEY || '';
    const uid0 = aadhaarNumber[0] || '0';
    const uid1 = aadhaarNumber[1] || '0';

    // Following UIDAI API spec format: <host>/<ver>/<ac>/<uid[0]>/<uid[1]>/<asalk>
    const otpUrl = `${UIDAI_API_URL}/otp/2.5/${auaCode}/${uid0}/${uid1}/${licenseKey}`;

    // Build Signed OTP XML for /otp/ endpoint
    const privateKey = process.env.UIDAI_PRIVATE_KEY || '';
    const signedOtpXml = buildSignedOtpXml(
      aadhaarNumber,
      auaCode,
      process.env.UIDAI_ASA_CODE || 'public',
      licenseKey,
      privateKey
    );

    // In production, this calls the actual UIDAI OTP API
    const response = await axios.post(
      otpUrl,
      signedOtpXml,
      {
        headers: {
          'Content-Type': 'application/xml',
        },
        httpsAgent: uidaiHttpsAgent, // Use our custom certificate agent
        timeout: 30000,
      }
    );

    // Store transaction in Redis (5 min TTL for OTP validity)
    await kvStore.setex(
      `okyc:txn:${transactionId}`,
      300,
      JSON.stringify({
        aadhaarHash: hashAadhaar(aadhaarNumber),
        status: 'OTP_SENT',
        createdAt: new Date().toISOString(),
      })
    );

    return {
      transactionId,
      message: response.data?.message || 'OTP sent successfully',
    };
  } catch (error: any) {
    logger.error('OKYC initiation failed', {
      transactionId,
      error: error.message,
      response: error.response?.data
    });
    throw new Error('Failed to initiate Aadhaar OKYC. Please try again.');
  }
}

/**
 * Step 2: Verify OTP and complete OKYC
 * Receives e-KYC data, hashes Aadhaar, encrypts PII, issues JWT.
 */
export async function verifyOKYC(
  transactionId: string,
  otp: string,
  ipAddress: string,
  userAgent: string
): Promise<OKYCVerifyResponse> {

  if (process.env.MOCK_MODE === 'true') {
    return {
      aadhaarHash: 'mock-aadhaar-hash',
      ekycData: {
        name: 'Arjun Mock User',
        dob: '1990-01-01',
        gender: 'M',
        address: 'Mock Address, City'
      }
    };
  }

  // Retrieve transaction from Redis
  const txnData = await kvStore.get(`okyc:txn:${transactionId}`);
  if (!txnData) {
    throw new Error('Transaction expired or invalid. Please initiate a new OTP.');
  }

  const transaction = JSON.parse(txnData);

  let ekycData: EKYCData;

  try {
    const aadhaarNum = transaction.aadhaarNumber || '000000000000';
    const uid0 = aadhaarNum[0] || '0';
    const uid1 = aadhaarNum[1] || '0';
    const auaCode = process.env.UIDAI_AUA_CODE || 'public';
    const licenseKey = process.env.UIDAI_LICENSE_KEY || '';
    
    // Following UIDAI API spec format: <host>/<ver>/<ac>/<uid[0]>/<uid[1]>/<asalk>
    const kycUrl = `${UIDAI_API_URL}/kyc/2.5/${auaCode}/${uid0}/${uid1}/${licenseKey}`;

    // 1. Generate PID with OTP
    const sessionKey = generateSessionKey();
    const skeyEncrypted = encryptSessionKey(sessionKey);
    const pidXml = createPidXml(otp);
    const { encryptedPid, hmac } = encryptPid(pidXml, sessionKey);

    // 2. Build Signed Auth XML
    const privateKey = process.env.UIDAI_PRIVATE_KEY || '';
    const signedAuthXml = buildSignedAuthXml(
      aadhaarNum,
      auaCode,
      process.env.UIDAI_ASA_CODE || 'public',
      licenseKey,
      privateKey,
      skeyEncrypted,
      encryptedPid,
      hmac
    );

    // 3. Wrap in Kyc block
    const signedKycXml = buildSignedKycXml(privateKey, signedAuthXml);

    // Production: Call UIDAI verify API
    const response = await axios.post(
      kycUrl,
      signedKycXml,
      {
        headers: {
          'Content-Type': 'application/xml',
        },
        httpsAgent: uidaiHttpsAgent, // Use our custom certificate agent
        timeout: 30000,
      }
    );

    ekycData = parseEKYCResponse(response.data);
  } catch (error: any) {
    logger.error('OKYC verify failed', {
      transactionId,
      error: error.message,
      response: error.response?.data
    });
    throw new Error('Failed to verify Aadhaar OKYC. Please try again.');
  }

  // Hash Aadhaar (from the stored hash in transaction)
  const aadhaarHash = transaction.aadhaarHash;

  // Clear OTP transaction from Redis
  await kvStore.del(`okyc:txn:${transactionId}`);

  // We no longer log or create user here, we just return the verified data
  // so the caller (auth.ts) can proceed with the multi-step registration.

  return {
    aadhaarHash,
    ekycData,
  };
}

/**
 * Parse e-KYC XML/JSON response from UIDAI.
 */
function parseEKYCResponse(responseData: any): EKYCData {
  // UIDAI returns e-KYC data in XML format
  // This parser handles both XML and JSON responses
  if (responseData.ekyc || responseData.UidData) {
    const data = responseData.ekyc || responseData.UidData;
    return {
      name: data.name || data.poi?.name || '',
      dob: data.dob || data.poi?.dob || '',
      gender: data.gender || data.poi?.gender || '',
      address: formatAddress(data.address || data.poa || {}),
      photo: data.photo || data.pht || undefined,
    };
  }

  return {
    name: responseData.name || '',
    dob: responseData.dob || '',
    gender: responseData.gender || '',
    address: responseData.address || '',
  };
}

function formatAddress(poa: any): string {
  if (typeof poa === 'string') return poa;
  const parts = [
    poa.house, poa.street, poa.landmark,
    poa.locality, poa.district, poa.state,
    poa.pincode,
  ].filter(Boolean);
  return parts.join(', ');
}
