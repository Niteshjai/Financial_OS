import { Pool } from 'pg'
import { alertService } from './alertService'

const DORMANT_MONTHS      = 12   // inactive for 12+ months
const IEPF_RISK_MONTHS    = 84   // 7 years = IEPF transfer risk

export const dormantAccountFinder = {

  async analyzeAccounts(
    pool: Pool,
    userId: string,
    aaTransactionData: any[]
  ): Promise<{ dormantCount: number; totalDormantBalancePaise: number }> {
    let dormantCount               = 0
    let totalDormantBalancePaise   = 0
    const today                    = new Date()

    for (const account of aaTransactionData) {
      const transactions = account.transactions ?? []

      // Find the most recent transaction date
      const txDates = transactions
        .map((t: any) => new Date(t.valueDate || t.transactionDate))
        .filter((d: Date) => !isNaN(d.getTime()))
        .sort((a: Date, b: Date) => b.getTime() - a.getTime())

      const lastTxDate   = txDates[0] ?? null
      const firstTxDate  = txDates[txDates.length - 1] ?? null
      
      // Ensure there is at least 6 months of data
      let monthsHistory = 0
      if (lastTxDate && firstTxDate) {
        monthsHistory = Math.floor((lastTxDate.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      }
      
      const monthsInactive = lastTxDate
        ? Math.floor(
            (today.getTime() - lastTxDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30)
          )
        : null

      // Dormant account detection must only run after at least 6 months of transaction history is available
      if (monthsHistory < 6) {
        continue;
      }

      const isDormant =
        monthsInactive !== null && monthsInactive >= DORMANT_MONTHS

      if (!isDormant) continue

      dormantCount++
      const balancePaise = Math.round(
        (account.currentBalance || account.balance || 0) * 100
      )
      totalDormantBalancePaise += balancePaise

      const iepfRisk = monthsInactive >= IEPF_RISK_MONTHS

      // Calculate approximate IEPF transfer date
      const iepfTransferDate = lastTxDate
        ? new Date(lastTxDate.getTime() +
            IEPF_RISK_MONTHS * 30 * 24 * 60 * 60 * 1000)
        : null

      await pool.query(`
        INSERT INTO dormant_accounts (
          user_id, account_ref, institution_name,
          fi_type, balance_paise, last_transaction_date,
          months_inactive, iepf_risk, iepf_transfer_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (user_id, account_ref)
        DO UPDATE SET
          balance_paise         = EXCLUDED.balance_paise,
          last_transaction_date = EXCLUDED.last_transaction_date,
          months_inactive       = EXCLUDED.months_inactive,
          iepf_risk             = EXCLUDED.iepf_risk,
          iepf_transfer_date    = EXCLUDED.iepf_transfer_date,
          updated_at            = NOW()
      `, [
        userId,
        account.accountRef || account.id || 'unknown_ref',
        account.fipName || account.institutionName || 'Unknown FI',
        account.fiType || 'UNKNOWN',
        balancePaise,
        lastTxDate ? lastTxDate.toISOString().split('T')[0] : null,
        monthsInactive,
        iepfRisk,
        iepfTransferDate ? iepfTransferDate.toISOString().split('T')[0] : null
      ])
    }

    // Fire alert if dormant accounts found
    if (dormantCount > 0) {
      const existing = await pool.query(`
        SELECT id FROM user_alerts
        WHERE user_id = $1
        AND alert_type = 'dormant_account_found'
        AND created_at > NOW() - INTERVAL '30 days'
        LIMIT 1
      `, [userId])

      if (!existing.rows.length) {
        await alertService.createAlert(pool, {
          userId,
          type:     'dormant_account_found',
          severity: 'warning',
          title:    `${dormantCount} dormant account${dormantCount>1?'s':''} found`,
          body:     `We found ${dormantCount} account${dormantCount>1?'s':''} with no ` +
                    `activity for over a year, holding ${formatINR(totalDormantBalancePaise)}. ` +
                    `RBI may transfer unclaimed balances to IEPF after 10 years.`,
          metadata: { dormantCount, totalDormantBalancePaise }
        })
      }
    }

    return { dormantCount, totalDormantBalancePaise }
  },

  async getDormantAccounts(
    pool: Pool,
    userId: string
  ): Promise<{
    accounts: any[]
    summary: {
      totalDormant: number
      totalBalancePaise: number
      iepfRiskCount: number
    }
  }> {
    const result = await pool.query(`
      SELECT * FROM dormant_accounts
      WHERE user_id = $1 AND is_acknowledged = false
      ORDER BY iepf_risk DESC, months_inactive DESC
    `, [userId])

    const accounts          = result.rows
    const iepfRiskCount     = accounts.filter(a => a.iepf_risk).length
    const totalBalancePaise = accounts.reduce(
      (sum, a) => sum + (parseInt(a.balance_paise) || 0), 0
    )

    return {
      accounts,
      summary: {
        totalDormant: accounts.length,
        totalBalancePaise,
        iepfRiskCount
      }
    }
  },

  async acknowledgeAccount(
    pool: Pool,
    userId: string,
    accountId: string
  ): Promise<void> {
    await pool.query(`
      UPDATE dormant_accounts
      SET is_acknowledged = true, acknowledged_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [accountId, userId])
  }
}

function formatINR(paise: number): string {
  const amount = paise / 100
  if (amount >= 100000) return `₹${(amount/100000).toFixed(1)}L`
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}
