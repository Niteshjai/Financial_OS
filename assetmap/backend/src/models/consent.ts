import { pool } from '../db/connection';
import { ConsentStatus, FIType } from '../utils/constants';

// ═══════════════════════════════════════════════════════════════
// Consent Model
// ═══════════════════════════════════════════════════════════════

export interface Consent {
  id: string;
  userId: string;
  aaHandle: string | null;
  consentId: string;
  fiTypes: FIType[];
  purpose: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  status: ConsentStatus;
  createdAt: string;
  revokedAt: string | null;
}

export const ConsentModel = {
  async findById(id: string): Promise<Consent | null> {
    const result = await pool.query('SELECT * FROM consents WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  },

  async findByConsentId(consentId: string): Promise<Consent | null> {
    const result = await pool.query('SELECT * FROM consents WHERE consent_id = $1', [consentId]);
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  },

  async findByUserId(userId: string): Promise<Consent[]> {
    if (process.env.MOCK_MODE === 'true') {
      return [{
        id: 'mock-consent-1',
        userId,
        aaHandle: null,
        consentId: 'mock-consent-id-1',
        fiTypes: ['DEPOSIT', 'EQUITY', 'MUTUAL_FUND'] as FIType[],
        purpose: 'View and manage all financial assets for wealth planning',
        dateRangeStart: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        dateRangeEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE' as ConsentStatus,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        revokedAt: null,
      }];
    }
    const result = await pool.query(
      'SELECT * FROM consents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(mapRow);
  },

  async getActiveConsents(userId: string): Promise<Consent[]> {
    if (process.env.MOCK_MODE === 'true') {
      return [{
        id: 'mock-consent-1',
        userId,
        aaHandle: null,
        consentId: 'mock-consent-id-1',
        fiTypes: ['DEPOSIT', 'EQUITY', 'MUTUAL_FUND'] as FIType[],
        purpose: 'View and manage all financial assets for wealth planning',
        dateRangeStart: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        dateRangeEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        revokedAt: null,
      }];
    }
    const result = await pool.query(
      "SELECT * FROM consents WHERE user_id = $1 AND status = 'ACTIVE' AND date_range_end >= NOW() ORDER BY created_at DESC",
      [userId]
    );
    return result.rows.map(mapRow);
  },

  async updateStatus(consentId: string, status: ConsentStatus): Promise<void> {
    await pool.query(
      `UPDATE consents SET status = $1, revoked_at = CASE WHEN $1 = 'REVOKED' THEN NOW() ELSE revoked_at END WHERE consent_id = $2`,
      [status, consentId]
    );
  },
};

function mapRow(row: any): Consent {
  return {
    id: row.id,
    userId: row.user_id,
    aaHandle: row.aa_handle,
    consentId: row.consent_id,
    fiTypes: row.fi_types,
    purpose: row.purpose,
    dateRangeStart: row.date_range_start,
    dateRangeEnd: row.date_range_end,
    status: row.status,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}
