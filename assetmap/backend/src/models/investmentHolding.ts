import { pool } from '../db/connection';

// ═══════════════════════════════════════════════════════════════
// Investment Holding Model
// Stores individual stock positions and mutual fund folios
// ═══════════════════════════════════════════════════════════════

export interface InvestmentHolding {
  id: string;
  accountId: string;
  userId: string;
  symbol: string | null;
  schemeName: string | null;
  units: number | null;
  nav: number | null;
  costBasis: number | null;
  currentValue: number | null;
  currency: string;
  holdingType: string | null;
  folioNumber: string | null;
  demat: string | null;
  fetchedAt: string;
}

export const InvestmentHoldingModel = {
  async bulkInsert(
    accountId: string,
    userId: string,
    holdings: Array<{
      symbol?: string;
      schemeName?: string;
      units?: number;
      nav?: number;
      costBasis?: number;
      currentValue?: number;
      currency?: string;
      holdingType?: string;
      folioNumber?: string;
      demat?: string;
    }>
  ): Promise<number> {
    if (holdings.length === 0) return 0;

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const h of holdings) {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      values.push(
        accountId,
        userId,
        h.symbol || null,
        h.schemeName || null,
        h.units ?? null,
        h.nav ?? null,
        h.costBasis ?? null,
        h.currentValue ?? null,
        h.currency || 'INR',
        h.holdingType || null,
        h.folioNumber || null,
      );
    }

    const query = `
      INSERT INTO investment_holdings (
        account_id, user_id, symbol, scheme_name, units,
        nav, cost_basis, current_value, currency, holding_type, folio_number
      ) VALUES ${placeholders.join(', ')}
    `;

    const result = await pool.query(query, values);
    return result.rowCount || 0;
  },

  async findByAccountId(accountId: string): Promise<InvestmentHolding[]> {
    if (process.env.MOCK_MODE === 'true') {
      return getMockHoldings(accountId);
    }
    const result = await pool.query(
      'SELECT * FROM investment_holdings WHERE account_id = $1 ORDER BY current_value DESC NULLS LAST',
      [accountId]
    );
    return result.rows.map(mapRow);
  },

  async findByUserId(userId: string): Promise<InvestmentHolding[]> {
    if (process.env.MOCK_MODE === 'true') {
      return getMockHoldings('mock-fa-2');
    }
    const result = await pool.query(
      'SELECT * FROM investment_holdings WHERE user_id = $1 ORDER BY current_value DESC NULLS LAST',
      [userId]
    );
    return result.rows.map(mapRow);
  },

  async deleteByAccountId(accountId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM investment_holdings WHERE account_id = $1',
      [accountId]
    );
    return result.rowCount || 0;
  },
};

function mapRow(row: any): InvestmentHolding {
  return {
    id: row.id,
    accountId: row.account_id,
    userId: row.user_id,
    symbol: row.symbol,
    schemeName: row.scheme_name,
    units: row.units ? parseFloat(row.units) : null,
    nav: row.nav ? parseFloat(row.nav) : null,
    costBasis: row.cost_basis ? parseFloat(row.cost_basis) : null,
    currentValue: row.current_value ? parseFloat(row.current_value) : null,
    currency: row.currency,
    holdingType: row.holding_type,
    folioNumber: row.folio_number,
    demat: row.demat,
    fetchedAt: row.fetched_at,
  };
}

function getMockHoldings(accountId: string): InvestmentHolding[] {
  return [
    {
      id: 'mock-hold-1',
      accountId,
      userId: 'mock-user',
      symbol: 'RELIANCE',
      schemeName: null,
      units: 50,
      nav: 2856.40,
      costBasis: 2200.00,
      currentValue: 142820.00,
      currency: 'INR',
      holdingType: 'EQUITY',
      folioNumber: null,
      demat: 'CDSL',
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'mock-hold-2',
      accountId,
      userId: 'mock-user',
      symbol: 'TCS',
      schemeName: null,
      units: 30,
      nav: 3945.80,
      costBasis: 3100.00,
      currentValue: 118374.00,
      currency: 'INR',
      holdingType: 'EQUITY',
      folioNumber: null,
      demat: 'CDSL',
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'mock-hold-3',
      accountId,
      userId: 'mock-user',
      symbol: 'HDFCBANK',
      schemeName: null,
      units: 100,
      nav: 1680.25,
      costBasis: 1450.00,
      currentValue: 168025.00,
      currency: 'INR',
      holdingType: 'EQUITY',
      folioNumber: null,
      demat: 'NSDL',
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'mock-hold-4',
      accountId,
      userId: 'mock-user',
      symbol: null,
      schemeName: 'SBI Blue Chip Fund - Direct Growth',
      units: 1250.345,
      nav: 78.45,
      costBasis: 62.00,
      currentValue: 98089.56,
      currency: 'INR',
      holdingType: 'MF',
      folioNumber: 'SBIMF-789',
      demat: null,
      fetchedAt: new Date().toISOString(),
    },
    {
      id: 'mock-hold-5',
      accountId,
      userId: 'mock-user',
      symbol: null,
      schemeName: 'HDFC Mid Cap Opportunities Fund - Direct Growth',
      units: 845.120,
      nav: 112.30,
      costBasis: 85.50,
      currentValue: 94907.98,
      currency: 'INR',
      holdingType: 'MF',
      folioNumber: 'HDFCMF-456',
      demat: null,
      fetchedAt: new Date().toISOString(),
    },
  ];
}
