import { Pool } from 'pg'
import { DimensionResult } from './assetStrengthScore'

export async function behavioralScore(
  pool: Pool,
  userId: string
): Promise<DimensionResult> {

  // Transaction regularity analysis
  const txResult = await pool.query(`
    SELECT
      COUNT(*)                                AS total_tx,
      COUNT(DISTINCT DATE_TRUNC('month', value_date))
                                              AS active_months,
      SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount_paise ELSE 0 END)
                                              AS total_credits,
      SUM(CASE WHEN transaction_type = 'DEBIT'  THEN amount_paise ELSE 0 END)
                                              AS total_debits,
      COUNT(CASE WHEN description ILIKE ANY(
              ARRAY['%bounce%','%returned%','%nsf%']
            ) THEN 1 END)                    AS bounce_count,
      COUNT(CASE WHEN description ILIKE ANY(
              ARRAY['%mutual fund%','%sip%','%nps%','%ppf%']
            ) THEN 1 END)                    AS investment_tx_count
    FROM aa_transactions
    WHERE user_id = $1
    AND value_date >= NOW() - INTERVAL '12 months'
  `, [userId])

  const tx = txResult.rows[0]

  const totalTx         = parseInt(tx.total_tx)         || 0
  const activeMonths    = parseInt(tx.active_months)     || 0
  const totalCredits    = parseInt(tx.total_credits)     || 0
  const totalDebits     = parseInt(tx.total_debits)      || 0
  const bounceCount     = parseInt(tx.bounce_count)      || 0
  const investmentTx    = parseInt(tx.investment_tx_count)|| 0

  // Savings ratio
  const netCashflow   = totalCredits - totalDebits
  const savingsRatio  = totalCredits > 0 ? netCashflow / totalCredits : 0

  // Investment behaviour (SIPs, NPS contributions = financial discipline)
  const investsRegularly = investmentTx >= 6  // 6+ investment transactions in 12 months

  let score   = 50  // Start at 50
  const reasons:  string[] = []
  const warnings: string[] = []

  // Account activity
  if (activeMonths >= 12)     score += 15
  else if (activeMonths >= 9) score += 10
  else if (activeMonths >= 6) score += 5

  // Savings behaviour
  if (savingsRatio >= 0.25)        score += 20
  else if (savingsRatio >= 0.15)   score += 14
  else if (savingsRatio >= 0.05)   score += 7
  else if (savingsRatio < 0)       { score -= 15; warnings.push('Spending exceeds income') }

  // Investment discipline
  if (investsRegularly) {
    score += 15
    reasons.push('Regular investment contributions (SIP/NPS) detected')
  }

  // Bounce penalty
  if (bounceCount === 0)      { score += 10; reasons.push('Clean payment history — no bounced payments') }
  else if (bounceCount <= 2)  score -= 10
  else                        { score -= 25; warnings.push(`${bounceCount} bounced payments in 12 months`) }

  score = Math.max(0, Math.min(100, score))

  if (savingsRatio >= 0.2)
    reasons.push(`Healthy savings rate of ${Math.round(savingsRatio*100)}%`)

  return {
    score,
    reasons,
    warnings,
    data: {
      totalTransactions: totalTx,
      activeMonths,
      savingsRatioPct:   Math.round(savingsRatio * 100),
      bounceCount,
      investsRegularly,
      investmentTxCount: investmentTx
    }
  }
}
