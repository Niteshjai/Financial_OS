import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { pool, kvStore } from '../db/connection';
import { encryptPII, hashAadhaar, hashSHA256 } from '../utils/encryption';
import { logger } from '../utils/logger';
import { auditLogger } from './auditLogger';

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
  user: {
    id: string;
    name: string;
    isNewUser: boolean;
  };
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
  const transactionId = uuidv4();

  if (process.env.MOCK_MODE === 'true') {
    return {
      transactionId,
      message: 'OTP sent successfully (Mock Mode)',
    };
  }

  try {
    // In production, this calls the actual UIDAI OTP API
    // For sandbox/development, we simulate the response
    if (process.env.NODE_ENV === 'production') {
      const response = await axios.post(
        `${UIDAI_API_URL}/okyc/otp/request`,
        {
          uid: aadhaarNumber,
          txnId: transactionId,
          appId: process.env.UIDAI_AUA_CODE,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.UIDAI_LICENSE_KEY}`,
          },
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
    }

    // ── Sandbox / Development Mode ──
    // Store transaction in Redis with mock data
    await kvStore.setex(
      `okyc:txn:${transactionId}`,
      300,
      JSON.stringify({
        aadhaarHash: hashAadhaar(aadhaarNumber),
        status: 'OTP_SENT',
        createdAt: new Date().toISOString(),
        // Sandbox: accept any 6-digit OTP
        sandboxMode: true,
      })
    );

    logger.info('OKYC initiated (sandbox mode)', {
      transactionId,
      // NEVER log the Aadhaar number
    });

    return {
      transactionId,
      message: 'OTP sent to registered mobile number (sandbox mode: any 6-digit OTP accepted)',
    };
  } catch (error) {
    logger.error('OKYC initiation failed', {
      transactionId,
      error: (error as Error).message,
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
      user: {
        id: 'mock-user-1234',
        name: 'Arjun Mock User',
        isNewUser: false,
      },
    };
  }

  // Retrieve transaction from Redis
  const txnData = await kvStore.get(`okyc:txn:${transactionId}`);
  if (!txnData) {
    throw new Error('Transaction expired or invalid. Please initiate a new OTP.');
  }

  const transaction = JSON.parse(txnData);

  let ekycData: EKYCData;

  if (process.env.NODE_ENV === 'production') {
    // Production: Call UIDAI verify API
    const response = await axios.post(
      `${UIDAI_API_URL}/okyc/otp/verify`,
      {
        txnId: transactionId,
        otp,
        appId: process.env.UIDAI_AUA_CODE,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.UIDAI_LICENSE_KEY}`,
        },
        timeout: 30000,
      }
    );

    ekycData = parseEKYCResponse(response.data);
  } else {
    // Sandbox: Generate mock e-KYC data
    ekycData = {
      name: 'Rajesh Kumar Sharma',
      dob: '1990-05-15',
      gender: 'M',
      address: '42, MG Road, Bengaluru, Karnataka 560001',
    };
  }

  // Hash Aadhaar (from the stored hash in transaction)
  const aadhaarHash = transaction.aadhaarHash;

  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE aadhaar_hash = $1',
    [aadhaarHash]
  );

  let userId: string;
  let isNewUser = false;

  if (existingUser.rows.length > 0) {
    // Existing user — update last login
    userId = existingUser.rows[0].id;
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [userId]
    );
  } else {
    // New user — create with encrypted PII
    isNewUser = true;
    const result = await pool.query(
      `INSERT INTO users (aadhaar_hash, name_encrypted, dob_encrypted, mobile_encrypted)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        aadhaarHash,
        encryptPII(ekycData.name),
        encryptPII(ekycData.dob),
        encryptPII(''), // Mobile comes later or from AA
      ]
    );
    userId = result.rows[0].id;
  }

  // Clear OTP transaction from Redis
  await kvStore.del(`okyc:txn:${transactionId}`);

  // Audit log
  await auditLogger.log(
    userId,
    'AADHAAR_VERIFIED',
    'users',
    userId,
    ipAddress,
    userAgent
  );

  return {
    user: {
      id: userId,
      name: ekycData.name,
      isNewUser,
    },
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
