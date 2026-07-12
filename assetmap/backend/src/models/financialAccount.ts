import { pool } from '../db/connection';
import { decryptPII, encryptPII } from '../utils/encryption';
import { FIType } from '../utils/constants';

// ═══════════════════════════════════════════════════════════════
// Financial Account Model
// Stores detailed account info fetched via AA consent
// ═══════════════════════════════════════════════════════════════

export interface FinancialAccount {
  id: string;
  userId: string;
  consentId: string | null;
  fiType: FIType;
  institutionName: string;
  accountRef: string;
  accountType: string | null;
  holderName: string | null;
  ifscCode: string | null;
  branch: string | null;
  nominee: string | null;
  balance: number;
  currency: string;
  status: string;
  openedAt: string | null;
  maturityDate: string | null;
  fetchedAt: string;
  rawJson: Record<string, unknown> | null;
}

export const FinancialAccountModel = {
  async create(data: {
    userId: string;
    consentId: string | null;
    fiType: FIType;
    institutionName: string;
    accountRef: string;
    accountType?: string;
    holderName?: string;
    ifscCode?: string;
    branch?: string;
    nominee?: string;
    balance: number;
    currency?: string;
    status?: string;
    openedAt?: string;
    maturityDate?: string;
    rawJson?: Record<string, unknown>;
  }): Promise<string> {
    const result = await pool.query(
      `INSERT INTO financial_accounts (
        user_id, consent_id, fi_type, institution_name,
        account_ref_encrypted, account_type, holder_name_encrypted,
        ifsc_code, branch, nominee_encrypted,
        balance_encrypted, currency, status,
        opened_at, maturity_date, raw_json_encrypted
      ) VALUES (
        $1, $2, $3::fi_type, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16
      ) RETURNING id`,
      [
        data.userId,
        data.consentId,
        data.fiType,
        data.institutionName,
        encryptPII(data.accountRef),
        data.accountType || null,
        data.holderName ? encryptPII(data.holderName) : null,
        data.ifscCode || null,
        data.branch || null,
        data.nominee ? encryptPII(data.nominee) : null,
        encryptPII(data.balance.toString()),
        data.currency || 'INR',
        data.status || 'ACTIVE',
        data.openedAt || null,
        data.maturityDate || null,
        data.rawJson ? encryptPII(JSON.stringify(data.rawJson)) : null,
      ]
    );
    return result.rows[0].id;
  },

  async findByUserId(userId: string): Promise<FinancialAccount[]> {
    if (process.env.MOCK_MODE === 'true') {
      return getMockFinancialAccounts(userId);
    }
    const result = await pool.query(
      'SELECT * FROM financial_accounts WHERE user_id = $1 ORDER BY fi_type, institution_name',
      [userId]
    );
    return result.rows.map(mapRow);
  },

  async findById(id: string): Promise<FinancialAccount | null> {
    if (process.env.MOCK_MODE === 'true') {
      const mocks = getMockFinancialAccounts('mock-user');
      return mocks.find(a => a.id === id) || null;
    }
    const result = await pool.query(
      'SELECT * FROM financial_accounts WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  },

  async findByConsentId(consentId: string): Promise<FinancialAccount[]> {
    const result = await pool.query(
      'SELECT * FROM financial_accounts WHERE consent_id = $1 ORDER BY fi_type',
      [consentId]
    );
    return result.rows.map(mapRow);
  },

  async deleteByConsentId(consentId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM financial_accounts WHERE consent_id = $1',
      [consentId]
    );
    return result.rowCount || 0;
  },

  async deleteByUserId(userId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM financial_accounts WHERE user_id = $1',
      [userId]
    );
    return result.rowCount || 0;
  },
};

function mapRow(row: any): FinancialAccount {
  return {
    id: row.id,
    userId: row.user_id,
    consentId: row.consent_id,
    fiType: row.fi_type,
    institutionName: row.institution_name,
    accountRef: row.account_ref_encrypted ? decryptPII(row.account_ref_encrypted) : 'N/A',
    accountType: row.account_type,
    holderName: row.holder_name_encrypted ? decryptPII(row.holder_name_encrypted) : null,
    ifscCode: row.ifsc_code,
    branch: row.branch,
    nominee: row.nominee_encrypted ? decryptPII(row.nominee_encrypted) : null,
    balance: row.balance_encrypted ? parseFloat(decryptPII(row.balance_encrypted)) : 0,
    currency: row.currency,
    status: row.status,
    openedAt: row.opened_at,
    maturityDate: row.maturity_date,
    fetchedAt: row.fetched_at,
    rawJson: row.raw_json_encrypted ? JSON.parse(decryptPII(row.raw_json_encrypted)) : null,
  };
}

function getMockFinancialAccounts(userId: string): FinancialAccount[] {
  return [
    {
      id: 'mock-fa-1',
      userId,
      consentId: 'mock-consent-1',
      fiType: 'DEPOSIT' as FIType,
      institutionName: 'HDFC Bank',
      accountRef: 'XXXX-XXXX-5678',
      accountType: 'Savings',
      holderName: 'Marcus Sterling',
      ifscCode: 'HDFC0001234',
      branch: 'Koramangala, Bengaluru',
      nominee: 'Jane Sterling',
      balance: 1540000.50,
      currency: 'INR',
      status: 'ACTIVE',
      openedAt: '2018-03-15',
      maturityDate: null,
      fetchedAt: new Date().toISOString(),
      rawJson: null,
    },
    {
      id: 'mock-fa-2',
      userId,
      consentId: 'mock-consent-1',
      fiType: 'EQUITY' as FIType,
      institutionName: 'Zerodha Broking',
      accountRef: 'ZRD-DEMAT-9876',
      accountType: 'Demat',
      holderName: 'Marcus Sterling',
      ifscCode: null,
      branch: null,
      nominee: 'Jane Sterling',
      balance: 2450000.00,
      currency: 'INR',
      status: 'ACTIVE',
      openedAt: '2020-01-10',
      maturityDate: null,
      fetchedAt: new Date().toISOString(),
      rawJson: null,
    },
    {
      id: 'mock-fa-3',
      userId,
      consentId: 'mock-consent-1',
      fiType: 'MUTUAL_FUND' as FIType,
      institutionName: 'SBI Mutual Fund',
      accountRef: 'FOLIO-5432',
      accountType: 'Growth',
      holderName: 'Marcus Sterling',
      ifscCode: null,
      branch: null,
      nominee: null,
      balance: 820000.00,
      currency: 'INR',
      status: 'ACTIVE',
      openedAt: '2019-06-20',
      maturityDate: null,
      fetchedAt: new Date().toISOString(),
      rawJson: null,
    },
  ];
}
