import { Pool } from 'pg'
import { DimensionResult } from './assetStrengthScore'

export async function liabilityBurdenScore(
  pool: Pool,
  userId: string
): Promise<DimensionResult> {

  // Detect existing loans from transaction patterns
  const loansResult = await pool.query(`
    SELECT
      COUNT(DISTINCT description) AS loan_count,
      SUM(amount_paise)           AS total_monthly_emi
    FROM aa_transactions
    WHERE user_id = $1
    AND transaction_type = 'DEBIT'
    AND description ILIKE ANY(ARRAY['%emi%','%loan%','%repay%','%ecs%'])
    AND value_date >= NOW() - INTERVAL '3 months'
  `, [userId])

  const loanCount     = parseInt(loansResult.rows[0].loan_count)     || 0
  const monthlyEMI    = Math.round(
    parseInt(loansResult.rows[0].total_monthly_emi) / 3
  )

  // Detect credit card usage
  const ccResult = await pool.query(`
    SELECT COUNT(*) AS cc_count
    FROM canonical_assets
    WHERE user_id = $1
    AND asset_class = 'OTHER'
    AND asset_subtype ILIKE '%credit%card%'
    AND is_active = true
  `, [userId])

  const creditCardCount = parseInt(ccResult.rows[0].cc_count) || 0

  // Check for bounced/returned payments (NSF)
  const nsfResult = await pool.query(`
    SELECT COUNT(*) AS nsf_count
    FROM aa_transactions
    WHERE user_id = $1
    AND description ILIKE ANY(
      ARRAY['%bounce%','%returned%','%insufficient%',
            '%nsf%','%dishonour%']
    )
    AND value_date >= NOW() - INTERVAL '12 months'
  `, [userId])

  const nsfCount = parseInt(nsfResult.rows[0].nsf_count) || 0

  let score   = 70  // Start high, deduct for negatives
  const reasons:  string[] = []
  const warnings: string[] = []

  // Loan count deductions
  if (loanCount === 0)       { score += 20; reasons.push('No existing loans detected') }
  else if (loanCount <= 2)   score += 10
  else if (loanCount <= 4)   score -= 10
  else                       { score -= 25; warnings.push(`${loanCount} active loans detected`) }

  // Monthly EMI burden
  if (monthlyEMI === 0)      score += 10
  else if (monthlyEMI < 1000000)  score += 5  // < ₹10K
  else if (monthlyEMI < 3000000)  score -= 0  // ₹10–30K
  else if (monthlyEMI < 5000000)  score -= 10 // ₹30–50K
  else { score -= 20; warnings.push(`High EMI burden of ₹${fmt(monthlyEMI)}/month`) }

  // Credit card penalty
  if (creditCardCount >= 4) {
    score -= 10
    warnings.push(`${creditCardCount} credit cards detected`)
  }

  // NSF / bounce deductions — serious negative signal
  if (nsfCount === 0)      { score += 10; reasons.push('No bounced payments in 12 months') }
  else if (nsfCount <= 2)  { score -= 10; warnings.push(`${nsfCount} bounced payment(s) detected`) }
  else                     { score -= 25; warnings.push(`${nsfCount} bounced payments — serious risk`) }

  score = Math.max(0, Math.min(100, score))

  if (loanCount === 0 && monthlyEMI === 0)
    reasons.push('Debt-free profile — strong repayment capacity')

  return {
    score,
    reasons,
    warnings,
    data: {
      activeLoansCount:      loanCount,
      monthlyEMIBurdenPaise: monthlyEMI,
      creditCardCount,
      bouncedPayments:       nsfCount
    }
  }
}

function fmt(paise: number): string {
  const v = paise / 100
  if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}
