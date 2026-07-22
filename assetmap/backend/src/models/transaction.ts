import { pool } from '../db/connection';

// ═══════════════════════════════════════════════════════════════
// Transaction Model
// Stores individual transactions fetched through AA data sessions
// ═══════════════════════════════════════════════════════════════

export interface Transaction {
  id: string;
  accountId: string;
  userId: string;
  txnId: string | null;
  date: string;
  narration: string | null;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balanceAfter: number | null;
  currency: string;
  category: string | null;
  reference: string | null;
  mode: string | null;
  createdAt: string;
}

export const TransactionModel = {
  async getLatestTransactionDate(userId: string): Promise<string | null> {
    const result = await pool.query(
      'SELECT MAX(date) as latest_date FROM transactions WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.latest_date || null;
  },

  async bulkInsert(
    accountId: string,
    userId: string,
    transactions: Array<{
      txnId?: string;
      date: string;
      narration?: string;
      type: 'DEBIT' | 'CREDIT';
      amount: number;
      balanceAfter?: number;
      currency?: string;
      category?: string;
      reference?: string;
      mode?: string;
    }>
  ): Promise<number> {
    if (transactions.length === 0) return 0;

    // Build a multi-row INSERT for efficiency
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const tx of transactions) {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      values.push(
        accountId,
        userId,
        tx.txnId || null,
        tx.date,
        tx.narration || null,
        tx.type,
        tx.amount,
        tx.balanceAfter ?? null,
        tx.currency || 'INR',
        tx.category || null,
        tx.reference || null,
      );
    }

    const query = `
      INSERT INTO transactions (
        account_id, user_id, txn_id, date, narration,
        type, amount, balance_after, currency, category, reference
      ) VALUES ${placeholders.join(', ')}
    `;

    const result = await pool.query(query, values);
    return result.rowCount || 0;
  },

  async findByAccountId(
    accountId: string,
    options?: { limit?: number; offset?: number; startDate?: string; endDate?: string }
  ): Promise<Transaction[]> {
    if (process.env.MOCK_MODE === 'true') {
      return getMockTransactions(accountId);
    }

    const conditions = ['account_id = $1'];
    const params: any[] = [accountId];
    let paramIdx = 2;

    if (options?.startDate) {
      conditions.push(`date >= $${paramIdx++}`);
      params.push(options.startDate);
    }
    if (options?.endDate) {
      conditions.push(`date <= $${paramIdx++}`);
      params.push(options.endDate);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const result = await pool.query(
      `SELECT * FROM transactions
       WHERE ${conditions.join(' AND ')}
       ORDER BY date DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...params, limit, offset]
    );
    return result.rows.map(mapRow);
  },

  async findByUserId(
    userId: string,
    options?: { limit?: number; offset?: number; startDate?: string; endDate?: string }
  ): Promise<Transaction[]> {
    if (process.env.MOCK_MODE === 'true') {
      return getMockTransactions('mock-fa-1');
    }

    const conditions = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIdx = 2;

    if (options?.startDate) {
      conditions.push(`date >= $${paramIdx++}`);
      params.push(options.startDate);
    }
    if (options?.endDate) {
      conditions.push(`date <= $${paramIdx++}`);
      params.push(options.endDate);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const result = await pool.query(
      `SELECT * FROM transactions
       WHERE ${conditions.join(' AND ')}
       ORDER BY date DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      [...params, limit, offset]
    );
    return result.rows.map(mapRow);
  },

  async countByAccountId(accountId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE account_id = $1',
      [accountId]
    );
    return parseInt(result.rows[0].count, 10);
  },

  async deleteByAccountId(accountId: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM transactions WHERE account_id = $1',
      [accountId]
    );
    return result.rowCount || 0;
  },
};

function mapRow(row: any): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    userId: row.user_id,
    txnId: row.txn_id,
    date: row.date,
    narration: row.narration,
    type: row.type,
    amount: parseFloat(row.amount),
    balanceAfter: row.balance_after ? parseFloat(row.balance_after) : null,
    currency: row.currency,
    category: row.category,
    reference: row.reference,
    mode: row.mode,
    createdAt: row.created_at,
  };
}

function getMockTransactions(accountId: string): Transaction[] {
  const now = new Date();
  return [
    {
      id: 'mock-tx-1',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026071114300001',
      date: new Date(now.getTime() - 0 * 86400000).toISOString(),
      narration: 'Amazon Web Services',
      type: 'DEBIT',
      amount: 2450.50,
      balanceAfter: 1537550.00,
      currency: 'INR',
      category: 'Technology',
      reference: 'UPI/2026071114300001',
      mode: 'UPI',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-2',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026071009150002',
      date: new Date(now.getTime() - 1 * 86400000).toISOString(),
      narration: 'Salary Credit — Acme Corp',
      type: 'CREDIT',
      amount: 154000.00,
      balanceAfter: 1540000.50,
      currency: 'INR',
      category: 'Income',
      reference: 'NEFT/N2026071009150002',
      mode: 'NEFT',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-3',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026070818450003',
      date: new Date(now.getTime() - 3 * 86400000).toISOString(),
      narration: 'Starbucks Coffee',
      type: 'DEBIT',
      amount: 450.00,
      balanceAfter: 1386000.50,
      currency: 'INR',
      category: 'Food & Dining',
      reference: 'UPI/2026070818450003',
      mode: 'UPI',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-4',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026070511200004',
      date: new Date(now.getTime() - 6 * 86400000).toISOString(),
      narration: 'Netflix Subscription',
      type: 'DEBIT',
      amount: 649.00,
      balanceAfter: 1386450.50,
      currency: 'INR',
      category: 'Entertainment',
      reference: 'MANDATE/NETFLIX/649',
      mode: 'NACH',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-5',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026070320100005',
      date: new Date(now.getTime() - 8 * 86400000).toISOString(),
      narration: 'Uber Rides',
      type: 'DEBIT',
      amount: 1240.00,
      balanceAfter: 1387099.50,
      currency: 'INR',
      category: 'Transport',
      reference: 'UPI/2026070320100005',
      mode: 'UPI',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-6',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026063015350006',
      date: new Date(now.getTime() - 11 * 86400000).toISOString(),
      narration: 'Big Basket - Groceries',
      type: 'DEBIT',
      amount: 3200.00,
      balanceAfter: 1388339.50,
      currency: 'INR',
      category: 'Groceries',
      reference: 'UPI/2026063015350006',
      mode: 'UPI',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-7',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026062808500007',
      date: new Date(now.getTime() - 13 * 86400000).toISOString(),
      narration: 'Indian Oil — Fuel',
      type: 'DEBIT',
      amount: 2100.00,
      balanceAfter: 1391539.50,
      currency: 'INR',
      category: 'Fuel',
      reference: 'POS/IOCL/2100',
      mode: 'POS',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-8',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026062519000008',
      date: new Date(now.getTime() - 16 * 86400000).toISOString(),
      narration: 'Spotify Premium',
      type: 'DEBIT',
      amount: 119.00,
      balanceAfter: 1393639.50,
      currency: 'INR',
      category: 'Entertainment',
      reference: 'MANDATE/SPOTIFY/119',
      mode: 'NACH',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-9',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026062212450009',
      date: new Date(now.getTime() - 19 * 86400000).toISOString(),
      narration: 'BESCOM — Electric Bill',
      type: 'DEBIT',
      amount: 1500.00,
      balanceAfter: 1393758.50,
      currency: 'INR',
      category: 'Utilities',
      reference: 'BBPS/BESCOM/1500',
      mode: 'BBPS',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-tx-10',
      accountId,
      userId: 'mock-user',
      txnId: 'UTR-2026062021300010',
      date: new Date(now.getTime() - 21 * 86400000).toISOString(),
      narration: 'Mainland China Restaurant',
      type: 'DEBIT',
      amount: 2300.00,
      balanceAfter: 1395258.50,
      currency: 'INR',
      category: 'Food & Dining',
      reference: 'POS/MLC/2300',
      mode: 'POS',
      createdAt: new Date().toISOString(),
    },
  ];
}
