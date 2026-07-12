import { pool } from '../db/connection';
import { decryptPII, encryptPII } from '../utils/encryption';

// ═══════════════════════════════════════════════════════════════
// Insurance Policy Model
// Stores insurance policy details fetched via AA consent
// ═══════════════════════════════════════════════════════════════

export interface InsurancePolicy {
  id: string;
  accountId: string;
  userId: string;
  policyNumber: string | null;
  policyType: string | null;
  insurer: string | null;
  sumAssured: number | null;
  premiumAmount: number | null;
  premiumFrequency: string | null;
  startDate: string | null;
  maturityDate: string | null;
  nominee: string | null;
  status: string;
  fetchedAt: string;
}

export const InsurancePolicyModel = {
  async create(data: {
    accountId: string;
    userId: string;
    policyNumber?: string;
    policyType?: string;
    insurer?: string;
    sumAssured?: number;
    premiumAmount?: number;
    premiumFrequency?: string;
    startDate?: string;
    maturityDate?: string;
    nominee?: string;
    status?: string;
  }): Promise<string> {
    const result = await pool.query(
      `INSERT INTO insurance_policies (
        account_id, user_id, policy_number_encrypted, policy_type,
        insurer, sum_assured, premium_amount, premium_frequency,
        start_date, maturity_date, nominee_encrypted, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        data.accountId,
        data.userId,
        data.policyNumber ? encryptPII(data.policyNumber) : null,
        data.policyType || null,
        data.insurer || null,
        data.sumAssured ?? null,
        data.premiumAmount ?? null,
        data.premiumFrequency || null,
        data.startDate || null,
        data.maturityDate || null,
        data.nominee ? encryptPII(data.nominee) : null,
        data.status || 'ACTIVE',
      ]
    );
    return result.rows[0].id;
  },

  async findByAccountId(accountId: string): Promise<InsurancePolicy[]> {
    if (process.env.MOCK_MODE === 'true') {
      return getMockPolicies(accountId);
    }
    const result = await pool.query(
      'SELECT * FROM insurance_policies WHERE account_id = $1 ORDER BY start_date DESC NULLS LAST',
      [accountId]
    );
    return result.rows.map(mapRow);
  },

  async findByUserId(userId: string): Promise<InsurancePolicy[]> {
    if (process.env.MOCK_MODE === 'true') {
      return getMockPolicies('mock-fa-4');
    }
    const result = await pool.query(
      'SELECT * FROM insurance_policies WHERE user_id = $1 ORDER BY start_date DESC NULLS LAST',
      [userId]
    );
    return result.rows.map(mapRow);
  },

  async deleteByAccountId(accountId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM insurance_policies WHERE account_id = $1',
      [accountId]
    );
    return result.rowCount || 0;
  },
};

function mapRow(row: any): InsurancePolicy {
  return {
    id: row.id,
    accountId: row.account_id,
    userId: row.user_id,
    policyNumber: row.policy_number_encrypted ? decryptPII(row.policy_number_encrypted) : null,
    policyType: row.policy_type,
    insurer: row.insurer,
    sumAssured: row.sum_assured ? parseFloat(row.sum_assured) : null,
    premiumAmount: row.premium_amount ? parseFloat(row.premium_amount) : null,
    premiumFrequency: row.premium_frequency,
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    nominee: row.nominee_encrypted ? decryptPII(row.nominee_encrypted) : null,
    status: row.status,
    fetchedAt: row.fetched_at,
  };
}

function getMockPolicies(accountId: string): InsurancePolicy[] {
  return [
    {
      id: 'mock-pol-1',
      accountId,
      userId: 'mock-user',
      policyNumber: 'LIC-2345678',
      policyType: 'Endowment',
      insurer: 'LIC of India',
      sumAssured: 2500000.00,
      premiumAmount: 24000.00,
      premiumFrequency: 'ANNUAL',
      startDate: '2015-04-01',
      maturityDate: '2035-04-01',
      nominee: 'Jane Sterling',
      status: 'ACTIVE',
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'mock-pol-2',
      accountId,
      userId: 'mock-user',
      policyNumber: 'ICICI-P-567',
      policyType: 'Term Life',
      insurer: 'ICICI Prudential',
      sumAssured: 10000000.00,
      premiumAmount: 15000.00,
      premiumFrequency: 'ANNUAL',
      startDate: '2020-08-15',
      maturityDate: '2050-08-15',
      nominee: 'Jane Sterling',
      status: 'ACTIVE',
      fetchedAt: new Date().toISOString(),
    },
  ];
}
