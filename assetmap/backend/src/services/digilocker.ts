import axios from 'axios';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// DigiLocker Service
// OAuth2 integration for document fetch
// ═══════════════════════════════════════════════════════════════

const DIGILOCKER_BASE_URL = 'https://api.digitallocker.gov.in';

interface DigiLockerDocument {
  docType: string;
  name: string;
  issuer: string;
  issuedDate: string;
  uri: string;
}

/**
 * Generate DigiLocker OAuth2 authorization URL.
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.DIGILOCKER_CLIENT_ID || '',
    redirect_uri: process.env.DIGILOCKER_REDIRECT_URI || '',
    state,
    scope: 'openid',
  });

  return `${DIGILOCKER_BASE_URL}/public/oauth2/1/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token.
 */
export async function exchangeToken(code: string): Promise<string> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return 'sandbox-digilocker-token';
    }

    const response = await axios.post(
      `${DIGILOCKER_BASE_URL}/public/oauth2/1/token`,
      {
        grant_type: 'authorization_code',
        code,
        client_id: process.env.DIGILOCKER_CLIENT_ID,
        client_secret: process.env.DIGILOCKER_CLIENT_SECRET,
        redirect_uri: process.env.DIGILOCKER_REDIRECT_URI,
      },
      { timeout: 15000 }
    );

    return response.data.access_token;
  } catch (error) {
    logger.error('DigiLocker token exchange failed', { error: (error as Error).message });
    throw new Error('Failed to connect to DigiLocker');
  }
}

/**
 * Fetch user's documents from DigiLocker.
 */
export async function fetchDocuments(
  accessToken: string,
  docType?: string
): Promise<DigiLockerDocument[]> {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          docType: 'PANCR',
          name: 'PAN Card',
          issuer: 'Income Tax Department',
          issuedDate: '2015-01-10',
          uri: 'dl://PANCR/mock-uri',
        },
        {
          docType: 'ADHAR',
          name: 'Aadhaar Card',
          issuer: 'UIDAI',
          issuedDate: '2016-05-20',
          uri: 'dl://ADHAR/mock-uri',
        },
      ];
    }

    const response = await axios.get(`${DIGILOCKER_BASE_URL}/public/oauth2/1/files/issued`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: docType ? { doctype: docType } : {},
      timeout: 15000,
    });

    return (response.data.items || []).map((doc: any) => ({
      docType: doc.doctype || doc.type,
      name: doc.name || doc.description,
      issuer: doc.issuerName || doc.issuer,
      issuedDate: doc.date || doc.issuedDate,
      uri: doc.uri,
    }));
  } catch (error) {
    logger.error('DigiLocker document fetch failed', { error: (error as Error).message });
    throw new Error('Failed to fetch documents from DigiLocker');
  }
}
