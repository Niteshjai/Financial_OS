import { Pool } from 'pg'

export interface DimensionResult {
  score:    number   // 0–100
  reasons:  string[]
  warnings: string[]
  data:     Record<string, any>
}

export async function assetStrengthScore(
  pool: Pool,
  userId: string,
  requestedAmountPaise: number
): Promise<DimensionResult> {

  const result = await pool.query(`
    SELECT
      asset_class,
      SUM(current_value_paise) AS total_value,
      COUNT(*)                 AS count
    FROM canonical_assets
    WHERE user_id = $1
    AND is_active = true
    AND ai_anomaly_flag = false
    GROUP BY asset_class
  `, [userId])

  const byClass: Record<string, number> = {}
  for (const row of result.rows) {
    byClass[row.asset_class] = parseInt(row.total_value)
  }

  const bankAssets    = byClass['BANK_ACCOUNT']     ?? 0
  const fdAssets      = byClass['FIXED_DEPOSIT']    ?? 0
  const mfAssets      = byClass['MUTUAL_FUND']      ?? 0
  const equityAssets  = byClass['EQUITY']           ?? 0
  const npsAssets     = byClass['NPS']              ?? 0
  const landAssets    = byClass['LAND']             ?? 0
  const propertyAssets= byClass['PROPERTY']         ?? 0
  const goldAssets    = byClass['GOLD']             ?? 0
  const insuranceAssets = (byClass['INSURANCE_LIFE'] ?? 0) +
                          (byClass['INSURANCE_HEALTH'] ?? 0)

  const liquidAssets    = bankAssets + fdAssets
  const investmentAssets= mfAssets + equityAssets + npsAssets + goldAssets
  const illiquidAssets  = landAssets + propertyAssets + insuranceAssets

  const totalAssets = liquidAssets + investmentAssets + illiquidAssets

  // Asset-to-loan ratio: ideal is 3x+ requested amount
  const assetToLoanRatio = requestedAmountPaise > 0
    ? totalAssets / requestedAmountPaise
    : 0

  let score   = 0
  const reasons:  string[] = []
  const warnings: string[] = []

  // Base score from asset-to-loan ratio
  if (assetToLoanRatio >= 5)        score += 50
  else if (assetToLoanRatio >= 3)   score += 40
  else if (assetToLoanRatio >= 2)   score += 30
  else if (assetToLoanRatio >= 1)   score += 15
  else                              score += 0

  // Liquid asset bonus
  const liquidToLoanRatio = requestedAmountPaise > 0
    ? liquidAssets / requestedAmountPaise : 0
  if (liquidToLoanRatio >= 1)       score += 25
  else if (liquidToLoanRatio >= 0.5)score += 15
  else if (liquidToLoanRatio >= 0.2)score += 8

  // Diversification bonus
  const assetClasses = Object.keys(byClass).length
  if (assetClasses >= 5)  score += 15
  else if (assetClasses >= 3) score += 10
  else if (assetClasses >= 2) score += 5

  // Property/land bonus
  if (landAssets > 0 || propertyAssets > 0) {
    score += 10
    reasons.push(
      `Property assets of ₹${fmt(landAssets + propertyAssets)} ` +
      `provide strong collateral backing`
    )
  }

  score = Math.min(100, score)

  if (totalAssets >= requestedAmountPaise * 3)
    reasons.push(`Total assets are ${assetToLoanRatio.toFixed(1)}× the loan amount`)
  if (liquidAssets >= requestedAmountPaise)
    reasons.push(`Liquid assets alone cover the full loan amount`)
  if (assetClasses >= 4)
    reasons.push(`Well-diversified portfolio across ${assetClasses} asset classes`)

  if (totalAssets < requestedAmountPaise)
    warnings.push(`Total assets (₹${fmt(totalAssets)}) are less than loan amount`)
  if (liquidAssets < requestedAmountPaise * 0.1)
    warnings.push(`Very low liquid reserves — less than 10% of loan amount`)
  if (assetClasses <= 1)
    warnings.push(`Single asset class — concentrated risk`)

  return {
    score,
    reasons,
    warnings,
    data: {
      totalAssets, liquidAssets, investmentAssets,
      illiquidAssets, assetToLoanRatio: Math.round(assetToLoanRatio * 100) / 100,
      byClass
    }
  }
}

function fmt(paise: number): string {
  const v = paise / 100
  if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`
  if (v >= 100000)   return `₹${(v/100000).toFixed(1)}L`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}
