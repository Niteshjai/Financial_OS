import { Pool } from 'pg'

export const netWorthTracker = {

  async saveSnapshot(
    pool: Pool,
    userId: string,
    data: {
      bankBalancePaise:      number
      mfValuePaise:          number
      equityValuePaise:      number
      npsValuePaise:         number
      insuranceValuePaise:   number
      landValuePaise:        number
      bankAccounts:          number
      investmentAccounts:    number
    }
  ): Promise<void> {
    const total =
      data.bankBalancePaise +
      data.mfValuePaise +
      data.equityValuePaise +
      data.npsValuePaise +
      data.insuranceValuePaise +
      data.landValuePaise

    await pool.query(`
      INSERT INTO asset_snapshots (
        user_id, snapshot_date,
        total_balance_paise, bank_balance_paise,
        mf_value_paise, equity_value_paise,
        nps_value_paise, insurance_value_paise,
        land_value_paise, total_accounts,
        bank_accounts, investment_accounts
      ) VALUES ($1, CURRENT_DATE, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (user_id, snapshot_date)
      DO UPDATE SET
        total_balance_paise  = EXCLUDED.total_balance_paise,
        bank_balance_paise   = EXCLUDED.bank_balance_paise,
        mf_value_paise       = EXCLUDED.mf_value_paise,
        equity_value_paise   = EXCLUDED.equity_value_paise,
        nps_value_paise      = EXCLUDED.nps_value_paise,
        insurance_value_paise= EXCLUDED.insurance_value_paise,
        land_value_paise     = EXCLUDED.land_value_paise,
        total_accounts       = EXCLUDED.total_accounts,
        bank_accounts        = EXCLUDED.bank_accounts,
        investment_accounts  = EXCLUDED.investment_accounts
    `, [
      userId,
      total,
      data.bankBalancePaise,
      data.mfValuePaise,
      data.equityValuePaise,
      data.npsValuePaise,
      data.insuranceValuePaise,
      data.landValuePaise,
      data.bankAccounts + data.investmentAccounts,
      data.bankAccounts,
      data.investmentAccounts,
    ])

    // Roll up monthly snapshot on 1st of each month
    await pool.query(`
      INSERT INTO networth_monthly (
        user_id, month,
        total_paise, bank_paise,
        investments_paise, land_paise
      )
      SELECT
        $1,
        DATE_TRUNC('month', CURRENT_DATE),
        AVG(total_balance_paise),
        AVG(bank_balance_paise),
        AVG(mf_value_paise + equity_value_paise + nps_value_paise),
        AVG(land_value_paise)
      FROM asset_snapshots
      WHERE user_id = $1
      AND snapshot_date >= DATE_TRUNC('month', CURRENT_DATE)
      ON CONFLICT (user_id, month)
      DO UPDATE SET
        total_paise       = EXCLUDED.total_paise,
        bank_paise        = EXCLUDED.bank_paise,
        investments_paise = EXCLUDED.investments_paise,
        land_paise        = EXCLUDED.land_paise,
        updated_at        = NOW()
    `, [userId])
  },

  async getNetWorthHistory(
    pool: Pool,
    userId: string,
    period: '6m' | '12m' | '24m' | 'all' = '12m'
  ): Promise<{
    monthly:   any[]
    current:   any
    change1m:  number
    change6m:  number
    change1y:  number
    allTimeHigh: number
  }> {
    const intervals: Record<string, string> = {
      '6m':  '6 months',
      '12m': '12 months',
      '24m': '24 months',
      'all': '10 years',
    }
    const monthsBack = period === '6m' ? 6 : period === '24m' ? 24 : period === 'all' ? 120 : 12;

    const monthly = await pool.query(`
      SELECT
        month,
        total_paise,
        bank_paise,
        investments_paise,
        land_paise
      FROM networth_monthly
      WHERE user_id = $1
      AND month >= NOW() - INTERVAL '${intervals[period]}'
      ORDER BY month ASC
    `, [userId])

    let rows = monthly.rows

    // Dynamically calculate past real net worth using AA transactions if we only have the current snapshot
    if (rows.length === 1) {
      const current = rows[0];
      const history = [{ ...current }];
      
      const txns = await pool.query(`
        SELECT date, amount, type 
        FROM transactions 
        WHERE user_id = $1 AND date >= NOW() - INTERVAL '${intervals[period]}'
      `, [userId]);

      const txnsByMonth: Record<string, number> = {};
      for (const tx of txns.rows) {
         const d = new Date(tx.date);
         const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
         const amt = Number(tx.amount);
         const change = tx.type === 'CREDIT' ? amt : -amt;
         txnsByMonth[monthStr] = (txnsByMonth[monthStr] || 0) + change;
      }

      let currentTotal = parseInt(current.total_paise);
      let currentBank = parseInt(current.bank_paise);
      
      for (let i = 1; i <= monthsBack; i++) {
         const d = new Date(current.month);
         d.setMonth(d.getMonth() - i);
         
         const nextMonthD = new Date(current.month);
         nextMonthD.setMonth(nextMonthD.getMonth() - i + 1);
         const nextMonthStr = `${nextMonthD.getFullYear()}-${String(nextMonthD.getMonth() + 1).padStart(2, '0')}`;
         
         const netChange = txnsByMonth[nextMonthStr] || 0;
         const paiseChange = netChange * 100;
         
         currentBank -= paiseChange;
         currentTotal -= paiseChange;
         
         history.unshift({
           month: d.toISOString(),
           total_paise: currentTotal.toString(),
           bank_paise: currentBank.toString(),
           investments_paise: current.investments_paise,
           land_paise: current.land_paise
         });
      }
      rows = history;
    }

    const current = rows[rows.length - 1]

    const findPaise = (monthsAgo: number) => {
      const target = new Date()
      target.setMonth(target.getMonth() - monthsAgo)
      const found = rows.find(r => {
        const d = new Date(r.month)
        return d.getFullYear() === target.getFullYear() &&
               d.getMonth() === target.getMonth()
      })
      return found ? parseInt(found.total_paise) : 0
    }

    const currentPaise  = current ? parseInt(current.total_paise) : 0
    const paise1mAgo    = findPaise(1)
    const paise6mAgo    = findPaise(6)
    const paise1yAgo    = findPaise(12)
    const allTimeHigh   = rows.length > 0 ? Math.max(...rows.map(r => parseInt(r.total_paise) || 0)) : 0


    const pctChange = (now: number, then: number) =>
      then > 0 ? Math.round((now - then) / then * 100) : 0

    return {
      monthly:     rows,
      current,
      change1m:    pctChange(currentPaise, paise1mAgo),
      change6m:    pctChange(currentPaise, paise6mAgo),
      change1y:    pctChange(currentPaise, paise1yAgo),
      allTimeHigh,
    }
  },

  async getLatestSnapshot(
    pool: Pool,
    userId: string
  ): Promise<any | null> {
    const r = await pool.query(`
      SELECT * FROM asset_snapshots
      WHERE user_id = $1
      ORDER BY snapshot_date DESC
      LIMIT 1
    `, [userId])
    return r.rows[0] ?? null
  }
}
