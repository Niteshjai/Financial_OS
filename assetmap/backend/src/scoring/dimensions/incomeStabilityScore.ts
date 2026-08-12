import { Pool } from 'pg'
import { DimensionResult } from './assetStrengthScore'

export async function incomeStabilityScore(
  pool: Pool,
  userId: string,
  requestedAmountPaise: number
): Promise<DimensionResult> {

  // Pull income from AA transaction history
  const txResult = await pool.query(`
    SELECT
      DATE_TRUNC('month', value_date) AS month,
      SUM(amount_paise)               AS monthly_income,
      COUNT(*)                        AS credit_count
    FROM aa_transactions
    WHERE user_id = $1
    AND transaction_type = 'CREDIT'
    AND description ILIKE ANY(
      ARRAY['%salary%','%sal%','%payroll%','%neft%','%imps%',
            '%income%','%stipend%','%wages%']
    )
    AND value_date >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', value_date)
    ORDER BY month DESC
  `, [userId])

  const months       = txResult.rows
  const monthCount   = months.length
  const avgIncome    = monthCount > 0
    ? months.reduce((s, m) => s + parseInt(m.monthly_income), 0) / monthCount
    : 0

  // Income consistency — coefficient of variation (lower is better)
  const incomes     = months.map(m => parseInt(m.monthly_income))
  const mean        = avgIncome
  const variance    = incomes.length > 1
    ? incomes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / incomes.length
    : 0
  const stdDev      = Math.sqrt(variance)
  const cv          = mean > 0 ? stdDev / mean : 1
  const consistency = Math.max(0, 100 - Math.round(cv * 100))

  // EMI affordability: recommended max FOIR 55%
  const existingEMIs = await pool.query(`
    SELECT COALESCE(SUM(amount_paise), 0) AS monthly_obligations
    FROM aa_transactions
    WHERE user_id = $1
    AND transaction_type = 'DEBIT'
    AND description ILIKE ANY(ARRAY['%emi%','%loan%','%repay%'])
    AND value_date >= NOW() - INTERVAL '3 months'
  `, [userId])

  const monthlyObligations = Math.round(
    parseInt(existingEMIs.rows[0].monthly_obligations) / 3
  )

  // Estimate new EMI at 9% for 20 years (home loan)
  const r        = 9 / 100 / 12
  const n        = 240
  const newEMI   = requestedAmountPaise > 0
    ? Math.round(requestedAmountPaise * r * Math.pow(1+r,n) /
        (Math.pow(1+r,n) - 1))
    : 0
  const totalEMI = monthlyObligations + newEMI
  const foir     = avgIncome > 0 ? totalEMI / avgIncome : 1

  let score   = 0
  const reasons:  string[] = []
  const warnings: string[] = []

  // Income availability (6+ months is good)
  if (monthCount >= 12)        score += 25
  else if (monthCount >= 9)    score += 20
  else if (monthCount >= 6)    score += 15
  else if (monthCount >= 3)    score += 8
  else                         score += 0

  // Income adequacy
  if (avgIncome >= requestedAmountPaise * 0.08)  score += 25
  else if (avgIncome >= requestedAmountPaise * 0.05) score += 18
  else if (avgIncome >= requestedAmountPaise * 0.03) score += 10
  else score += 3

  // FOIR score (Fixed Obligation to Income Ratio)
  if (foir <= 0.35)      score += 30
  else if (foir <= 0.45) score += 22
  else if (foir <= 0.55) score += 14
  else if (foir <= 0.65) score += 6
  else                   score += 0

  // Consistency bonus
  if (consistency >= 85)      score += 20
  else if (consistency >= 70) score += 13
  else if (consistency >= 55) score += 7

  score = Math.min(100, score)

  if (monthCount >= 12)
    reasons.push(`Consistent income detected for ${monthCount} consecutive months`)
  if (foir <= 0.45)
    reasons.push(`FOIR of ${Math.round(foir * 100)}% is within acceptable range`)
  if (consistency >= 80)
    reasons.push(`Highly consistent income — low variability`)

  if (monthCount < 6)
    warnings.push(`Only ${monthCount} months of income history found`)
  if (foir > 0.55)
    warnings.push(`FOIR of ${Math.round(foir*100)}% exceeds recommended 55%`)
  if (cv > 0.3)
    warnings.push(`Income is irregular — high month-to-month variation`)

  return {
    score,
    reasons,
    warnings,
    data: {
      avgMonthlyIncomePaise:   Math.round(avgIncome),
      monthlyObligationsPaise: monthlyObligations,
      newEMIPaise:             newEMI,
      foir:                    Math.round(foir * 100) / 100,
      consistencyScore:        consistency,
      monthsOfHistory:         monthCount
    }
  }
}
