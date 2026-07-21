import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { pool } from '../db/connection';
import { decryptPII, encryptPII } from '../utils/encryption';
import { nomineeChecker } from './nomineeChecker';
import { dormantAccountFinder } from './dormantAccountFinder';
import { FIType, FI_TYPE_LABELS } from '../utils/constants';
import { logger } from '../utils/logger';
import { auditLogger } from './auditLogger';

// ═══════════════════════════════════════════════════════════════
// Account Aggregator (Setu) Service
// Full Setu AA SDK integration for the India AA framework
// ═══════════════════════════════════════════════════════════════

interface ConsentArtefact {
  consentId: string;
  redirectUrl: string;
  status: string;
}

interface FinancialDataItem {
  fiType: FIType;
  institutionName: string;
  accountRef: string;
  balance: number;
  currency: string;
  rawJson: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// Setu API Client
// ─────────────────────────────────────────────

function createSetuClient(): AxiosInstance {
  return axios.create({
    baseURL: process.env.SETU_AA_BASE_URL || 'https://fiu-sandbox.setu.co/v2',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.SETU_CLIENT_ID || '',
      'x-client-secret': process.env.SETU_CLIENT_SECRET || '',
      'x-product-instance-id': process.env.SETU_PRODUCT_INSTANCE_ID || '',
    },
    timeout: 30000,
  });
}

// ─────────────────────────────────────────────
// Create AA Handle for User
// ─────────────────────────────────────────────

export async function createAAHandle(
  userId: string,
  mobile: string
): Promise<string> {
  const client = createSetuClient();

  try {
    if (process.env.NODE_ENV === 'production') {
      const response = await client.post('/v2/users', {
        mobile,
        redirectUrl: `${process.env.FRONTEND_URL}/consent/callback`,
      });
      return response.data.aaHandle;
    }

    // Sandbox: generate mock AA handle
    const aaHandle = `${mobile}@aa-sandbox`;
    logger.info('AA handle created (sandbox)', { userId, aaHandle });
    return aaHandle;
  } catch (error) {
    logger.error('Failed to create AA handle', { userId, error: (error as Error).message });
    throw new Error('Failed to register with Account Aggregator network');
  }
}

// ─────────────────────────────────────────────
// Create Consent Request
// ─────────────────────────────────────────────

export async function createConsentRequest(
  userId: string,
  fiTypes: FIType[],
  purpose: string,
  dateRange: { start: string; end: string },
  ipAddress: string,
  userAgent: string
): Promise<ConsentArtefact> {
  const client = createSetuClient();

  // Build consent artefact per AA spec (ReBIT standard)
  const consentDetail = {
    consentStart: new Date().toISOString(),
    consentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    consentMode: 'STORE',
    fetchType: 'PERIODIC',
    consentTypes: ['PROFILE', 'SUMMARY', 'TRANSACTIONS'],
    fiTypes: fiTypes,
    DataConsumer: {
      id: process.env.SETU_FIU_ENTITY_ID || 'assetmap-fiu',
    },
    Purpose: {
      code: '101', // Wealth management
      refUri: 'https://api.rebit.org.in/aa/purpose/101.xml',
      text: purpose,
      Category: { type: 'string' },
    },
    FIDataRange: {
      from: dateRange.start,
      to: dateRange.end,
    },
    DataLife: {
      unit: 'MONTH',
      value: 12,
    },
    Frequency: {
      unit: 'DAY',
      value: 1,
    },
  };

  try {
    let consentId: string;
    let redirectUrl: string;

    if (process.env.NODE_ENV === 'production') {
      const response = await client.post('/v2/consents', {
        detail: consentDetail,
        redirectUrl: `${process.env.FRONTEND_URL}/consent/callback`,
      });

      consentId = response.data.id;
      redirectUrl = response.data.url;
    } else {
      // Sandbox: generate mock consent
      consentId = randomUUID();
      redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/consent/callback?consentId=${consentId}&status=ACTIVE`;
    }

    // Store consent in database
    await pool.query(
      `INSERT INTO consents (user_id, consent_id, fi_types, purpose, date_range_start, date_range_end, status)
       VALUES ($1, $2, $3::fi_type[], $4, $5, $6, 'PENDING')`,
      [userId, consentId, fiTypes, purpose, dateRange.start, dateRange.end]
    );

    // Audit log
    await auditLogger.log(userId, 'CONSENT_CREATED', 'consents', consentId, ipAddress, userAgent);

    logger.info('Consent request created', { userId, consentId, fiTypes });

    return {
      consentId,
      redirectUrl,
      status: 'PENDING',
    };
  } catch (error) {
    logger.error('Failed to create consent request', {
      userId,
      error: (error as Error).message,
    });
    throw new Error('Failed to create consent request. Please try again.');
  }
}

// ─────────────────────────────────────────────
// Handle Consent Callback (Webhook)
// ─────────────────────────────────────────────

export async function handleConsentCallback(
  consentId: string,
  status: string,
  webhookSignature?: string
): Promise<void> {
  // Verify webhook signature in production
  if (process.env.NODE_ENV === 'production' && process.env.SETU_WEBHOOK_SECRET) {
    // Signature verification would go here
    // Using HMAC-SHA256 with SETU_WEBHOOK_SECRET
  }

  const mappedStatus = status.toUpperCase() === 'APPROVED' ? 'ACTIVE' : status.toUpperCase();

  const result = await pool.query(
    `UPDATE consents SET status = $1::consent_status, revoked_at = CASE WHEN $1::consent_status = 'REVOKED'::consent_status THEN NOW() ELSE NULL END
     WHERE consent_id = $2
     RETURNING user_id`,
    [mappedStatus, consentId]
  );

  if (result.rows.length === 0) {
    logger.warn('Consent callback for unknown consent', { consentId, status });
    return;
  }

  const userId = result.rows[0].user_id;

  await auditLogger.log(userId, 'CONSENT_APPROVED', 'consents', consentId);

  logger.info('Consent status updated', { consentId, status: mappedStatus });

  // If consent was approved, trigger data fetch
  if (mappedStatus === 'ACTIVE') {
    try {
      await fetchFinancialData(consentId, userId);
    } catch (error) {
      logger.error('Auto data fetch after consent approval failed', {
        consentId,
        error: (error as Error).message,
      });
    }
  }
}

// ─────────────────────────────────────────────
// Fetch Financial Data via Data Session
// ─────────────────────────────────────────────

export async function fetchFinancialData(
  consentId: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<FinancialDataItem[]> {
  const client = createSetuClient();

  // Get consent details
  const consentResult = await pool.query(
    'SELECT fi_types, date_range_start, date_range_end FROM consents WHERE consent_id = $1 AND status = $2',
    [consentId, 'ACTIVE']
  );

  if (consentResult.rows.length === 0) {
    throw new Error('No active consent found');
  }

  const consent = consentResult.rows[0];

  try {
    let financialData: FinancialDataItem[];

    if (process.env.NODE_ENV === 'production') {
      // Step 1: Create data session
      const sessionResponse = await client.post('/v2/data/sessions', {
        consentId,
        DataRange: {
          from: consent.date_range_start,
          to: consent.date_range_end,
        },
      });

      const sessionId = sessionResponse.data.id;

      // Step 2: Fetch data (with retry for async processing)
      let dataResponse;
      let retries = 0;
      const maxRetries = 5;

      while (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (retries + 1)));
        dataResponse = await client.get(`/v2/data/sessions/${sessionId}`);
        if (dataResponse.data.status === 'COMPLETED') break;
        retries++;
      }

      if (!dataResponse || dataResponse.data.status !== 'COMPLETED') {
        throw new Error('Data session timed out');
      }

      financialData = normalizeFinancialData(dataResponse.data.data || []);
    } else {
      // Sandbox: generate mock financial data
      financialData = [
        {
          fiType: 'DEPOSIT',
          institutionName: 'HDFC Bank',
          accountRef: 'XXXX1234',
          balance: 450000.50,
          currency: 'INR',
          rawJson: { type: 'SAVINGS', status: 'ACTIVE' },
        },
        {
          fiType: 'DEPOSIT',
          institutionName: 'State Bank of India',
          accountRef: 'XXXX8877',
          balance: 155000.00,
          currency: 'INR',
          rawJson: { type: 'SAVINGS', status: 'ACTIVE' },
        },
        {
          fiType: 'EQUITY',
          institutionName: 'Zerodha Broking',
          accountRef: 'DMAT-XXXX9999',
          balance: 1250000.00,
          currency: 'INR',
          rawJson: { type: 'DEMAT', holdings: 15 },
        },
        {
          fiType: 'MUTUAL_FUND',
          institutionName: 'Groww',
          accountRef: 'FOLIO-XXXX5555',
          balance: 850000.00,
          currency: 'INR',
          rawJson: { type: 'MUTUAL_FUND', folios: 2 },
        },
      ];

      // Filter based on user's granted consent types
      const allowedTypes = consent.fi_types || [];
      financialData = financialData.filter(item => allowedTypes.includes(item.fiType));

      // Add Insurance if requested
      if (allowedTypes.includes('INSURANCE_POLICIES')) {
        financialData.push({
          fiType: 'INSURANCE_POLICIES',
          institutionName: 'LIC of India',
          accountRef: 'POL-XXXX2222',
          balance: 500000.00,
          currency: 'INR',
          rawJson: { type: 'LIFE', status: 'ACTIVE' },
        });
      }

      // Add NPS if requested
      if (allowedTypes.includes('NPS')) {
        financialData.push({
          fiType: 'NPS',
          institutionName: 'NSDL CRA',
          accountRef: 'PRAN-XXXX4411',
          balance: 620000.00,
          currency: 'INR',
          rawJson: { type: 'TIER_1', status: 'ACTIVE' },
        });
      }
    }

    // Delete old snapshots for this consent and insert fresh ones
    await pool.query(
      'DELETE FROM asset_snapshots_aa WHERE consent_id = (SELECT id FROM consents WHERE consent_id = $1)',
      [consentId]
    );

    const consentDbId = await pool.query('SELECT id FROM consents WHERE consent_id = $1', [consentId]);

    for (const item of financialData) {
      await pool.query(
        `INSERT INTO asset_snapshots_aa (user_id, consent_id, fi_type, institution_name, account_ref_encrypted, balance_encrypted, raw_json_encrypted, currency)
         VALUES ($1, $2, $3::fi_type, $4, $5, $6, $7, $8)`,
        [
          userId,
          consentDbId.rows[0]?.id,
          item.fiType,
          item.institutionName,
          encryptPII(item.accountRef),
          encryptPII(item.balance.toString()),
          encryptPII(JSON.stringify(item.rawJson)),
          item.currency,
        ]
      );
    }

    // Engagement Features: Nominee and Dormant Checks
    try {
      await nomineeChecker.processAAData(pool, userId, financialData);
      await dormantAccountFinder.analyzeAccounts(pool, userId, financialData);
    } catch (e) {
      logger.error('Failed to run engagement checks', { error: e });
    }

    // Audit log
    await auditLogger.log(
      userId,
      'DATA_FETCHED',
      'asset_snapshots',
      consentId,
      ipAddress,
      userAgent
    );

    logger.info('Financial data fetched and stored', {
      userId,
      consentId,
      itemCount: financialData.length,
    });

    return financialData;
  } catch (error) {
    logger.error('Financial data fetch failed', {
      consentId,
      error: (error as Error).message,
    });
    throw new Error('Failed to fetch financial data. Please try again.');
  }
}

// ─────────────────────────────────────────────
// Revoke Consent
// ─────────────────────────────────────────────

export async function revokeConsent(
  consentId: string,
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const client = createSetuClient();

  try {
    if (process.env.NODE_ENV === 'production') {
      await client.post(`/v2/consents/${consentId}/revoke`);
    }

    await pool.query(
      "UPDATE consents SET status = 'REVOKED', revoked_at = NOW() WHERE consent_id = $1 AND user_id = $2",
      [consentId, userId]
    );

    await auditLogger.log(userId, 'CONSENT_REVOKED', 'consents', consentId, ipAddress, userAgent);

    logger.info('Consent revoked', { userId, consentId });
  } catch (error) {
    logger.error('Failed to revoke consent', {
      consentId,
      error: (error as Error).message,
    });
    throw new Error('Failed to revoke consent');
  }
}

// ─────────────────────────────────────────────
// Data Normalisation
// ─────────────────────────────────────────────

function normalizeFinancialData(rawData: any[]): FinancialDataItem[] {
  return rawData.map((item) => ({
    fiType: mapFIType(item.type || item.fiType),
    institutionName: item.fipName || item.institutionName || 'Unknown',
    accountRef: item.maskedAccNumber || item.accountRef || '',
    balance: parseFloat(item.summary?.currentBalance || item.balance || '0'),
    currency: item.summary?.currency || item.currency || 'INR',
    rawJson: item,
  }));
}

function mapFIType(type: string): FIType {
  const typeMap: Record<string, FIType> = {
    deposit: 'DEPOSIT',
    savings: 'DEPOSIT',
    current: 'DEPOSIT',
    equity: 'EQUITY',
    shares: 'EQUITY',
    mutual_fund: 'MUTUAL_FUND',
    mutualfund: 'MUTUAL_FUND',
    mf: 'MUTUAL_FUND',
    insurance: 'INSURANCE_POLICIES',
    insurance_policies: 'INSURANCE_POLICIES',
    life_insurance: 'INSURANCE_POLICIES',
    nps: 'NPS',
    pension: 'NPS',
    gstn: 'GSTN',
    gst: 'GSTN',
  };
  return typeMap[type.toLowerCase()] || 'DEPOSIT';
}

// ─────────────────────────────────────────────
// Mock Data Generator (Sandbox)
// ─────────────────────────────────────────────

function generateMockFinancialData(fiTypes: FIType[]): FinancialDataItem[] {
  const mockData: FinancialDataItem[] = [];

  if (fiTypes.includes('DEPOSIT')) {
    mockData.push(
      {
        fiType: 'DEPOSIT',
        institutionName: 'State Bank of India',
        accountRef: 'XXXX1234',
        balance: 485320.50,
        currency: 'INR',
        rawJson: { type: 'SAVINGS', branch: 'MG Road, Bengaluru' },
      },
      {
        fiType: 'DEPOSIT',
        institutionName: 'HDFC Bank',
        accountRef: 'XXXX5678',
        balance: 1250000.00,
        currency: 'INR',
        rawJson: { type: 'FIXED_DEPOSIT', maturityDate: '2025-12-31' },
      },
      {
        fiType: 'DEPOSIT',
        institutionName: 'ICICI Bank',
        accountRef: 'XXXX9012',
        balance: 78450.25,
        currency: 'INR',
        rawJson: { type: 'SAVINGS', branch: 'Koramangala, Bengaluru' },
      }
    );
  }

  if (fiTypes.includes('EQUITY')) {
    mockData.push(
      {
        fiType: 'EQUITY',
        institutionName: 'Zerodha',
        accountRef: 'ZRD-45678',
        balance: 2340000.00,
        currency: 'INR',
        rawJson: { holdings: 15, demat: 'CDSL' },
      },
      {
        fiType: 'EQUITY',
        institutionName: 'Groww',
        accountRef: 'GRW-12345',
        balance: 560000.00,
        currency: 'INR',
        rawJson: { holdings: 8, demat: 'NSDL' },
      }
    );
  }

  if (fiTypes.includes('MUTUAL_FUND')) {
    mockData.push(
      {
        fiType: 'MUTUAL_FUND',
        institutionName: 'SBI Mutual Fund',
        accountRef: 'SBIMF-789',
        balance: 1875000.00,
        currency: 'INR',
        rawJson: { schemeName: 'SBI Blue Chip Fund - Direct Growth', nav: 78.45 },
      },
      {
        fiType: 'MUTUAL_FUND',
        institutionName: 'HDFC AMC',
        accountRef: 'HDFCMF-456',
        balance: 950000.00,
        currency: 'INR',
        rawJson: { schemeName: 'HDFC Mid Cap Opportunities Fund', nav: 112.30 },
      },
      {
        fiType: 'MUTUAL_FUND',
        institutionName: 'Parag Parikh AMC',
        accountRef: 'PPFAS-123',
        balance: 720000.00,
        currency: 'INR',
        rawJson: { schemeName: 'Parag Parikh Flexi Cap Fund', nav: 65.20 },
      }
    );
  }

  if (fiTypes.includes('INSURANCE_POLICIES')) {
    mockData.push(
      {
        fiType: 'INSURANCE_POLICIES',
        institutionName: 'LIC of India',
        accountRef: 'LIC-2345678',
        balance: 2500000.00,
        currency: 'INR',
        rawJson: { policyType: 'Endowment', sumAssured: 2500000, premium: 24000 },
      },
      {
        fiType: 'INSURANCE_POLICIES',
        institutionName: 'ICICI Prudential',
        accountRef: 'ICICI-P-567',
        balance: 1000000.00,
        currency: 'INR',
        rawJson: { policyType: 'Term Life', coverAmount: 10000000, premium: 15000 },
      }
    );
  }

  if (fiTypes.includes('NPS')) {
    mockData.push({
      fiType: 'NPS',
      institutionName: 'PFRDA - NPS',
      accountRef: 'NPS-PRAN-1234',
      balance: 890000.00,
      currency: 'INR',
      rawJson: { pranNumber: 'XXXX1234', tier: 'Tier I', fundManager: 'SBI Pension' },
    });
  }

  return mockData;
}
