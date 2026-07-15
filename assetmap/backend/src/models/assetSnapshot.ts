import { pool } from '../db/connection';
import { decryptPII } from '../utils/encryption';
import { FIType } from '../utils/constants';

// ═══════════════════════════════════════════════════════════════
// Asset Snapshot Model
// ═══════════════════════════════════════════════════════════════

export interface AssetSnapshot {
  id: string;
  userId: string;
  consentId: string | null;
  fetchedAt: string;
  fiType: FIType;
  institutionName: string;
  accountRef: string;
  balance: number;
  currency: string;
}

export interface AssetSummary {
  totalNetWorth: number;
  currency: string;
  categoryBreakdown: { fiType: FIType; label: string; totalValue: number; count: number }[];
  lastFetchedAt: string | null;
}

const FI_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Bank Deposits',
  EQUITY: 'Stocks & Shares',
  MUTUAL_FUND: 'Mutual Funds',
  INSURANCE_POLICIES: 'Insurance Policies',
  NPS: 'National Pension System',
  GSTN: 'GST Records',
};

export const AssetSnapshotModel = {
  async findByUserId(userId: string): Promise<AssetSnapshot[]> {
    const result = await pool.query(
      `SELECT * FROM asset_snapshots_aa 
       WHERE user_id = $1 
         AND consent_id = (
           SELECT id FROM consents 
           WHERE user_id = $1 AND status = 'ACTIVE' 
           ORDER BY created_at DESC LIMIT 1
         )
       ORDER BY fi_type, institution_name`,
      [userId]
    );
    return result.rows.map(mapRow);
  },

  async findByConsentId(consentId: string): Promise<AssetSnapshot[]> {
    const result = await pool.query(
      'SELECT * FROM asset_snapshots_aa WHERE consent_id = $1 ORDER BY fi_type',
      [consentId]
    );
    return result.rows.map(mapRow);
  },

  async getSummary(userId: string): Promise<AssetSummary> {
    const assets = await this.findByUserId(userId);

    const breakdown = new Map<FIType, { totalValue: number; count: number }>();
    let totalNetWorth = 0;
    let lastFetchedAt: string | null = null;

    assets.forEach((asset) => {
      totalNetWorth += asset.balance;
      const existing = breakdown.get(asset.fiType) || { totalValue: 0, count: 0 };
      existing.totalValue += asset.balance;
      existing.count += 1;
      breakdown.set(asset.fiType, existing);

      if (!lastFetchedAt || asset.fetchedAt > lastFetchedAt) {
        lastFetchedAt = asset.fetchedAt;
      }
    });

    return {
      totalNetWorth,
      currency: 'INR',
      categoryBreakdown: Array.from(breakdown.entries()).map(([fiType, data]) => ({
        fiType,
        label: FI_TYPE_LABELS[fiType] || fiType,
        ...data,
      })),
      lastFetchedAt,
    };
  },

  async deleteByUserId(userId: string): Promise<number> {
    const result = await pool.query('DELETE FROM asset_snapshots_aa WHERE user_id = $1', [userId]);
    return result.rowCount || 0;
  },
};

function mapRow(row: any): AssetSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    consentId: row.consent_id,
    fetchedAt: row.fetched_at,
    fiType: row.fi_type,
    institutionName: row.institution_name,
    accountRef: row.account_ref_encrypted ? decryptPII(row.account_ref_encrypted) : 'N/A',
    balance: row.balance_encrypted ? parseFloat(decryptPII(row.balance_encrypted)) : 0,
    currency: row.currency,
  };
}

function getMockAssetData(userId: string): AssetSnapshot[] {
  return [
    {
      id: 'mock-asset-1',
      userId,
      consentId: 'mock-consent-1',
      fetchedAt: new Date().toISOString(),
      fiType: 'DEPOSIT' as FIType,
      institutionName: 'HDFC Bank',
      accountRef: 'XXXX-XXXX-1234',
      balance: 1540000.50,
      currency: 'INR'
    },
    {
      id: 'mock-asset-2',
      userId,
      consentId: 'mock-consent-1',
      fetchedAt: new Date().toISOString(),
      fiType: 'EQUITY' as FIType,
      institutionName: 'Zerodha Broking',
      accountRef: 'DEMAT-9876',
      balance: 2450000.00,
      currency: 'INR'
    },
    {
      id: 'mock-asset-3',
      userId,
      consentId: 'mock-consent-1',
      fetchedAt: new Date().toISOString(),
      fiType: 'MUTUAL_FUND' as FIType,
      institutionName: 'SBI Mutual Fund',
      accountRef: 'FOLIO-5432',
      balance: 820000.00,
      currency: 'INR'
    }
  ];
}
