import { Pool } from 'pg'
import { DimensionResult } from './assetStrengthScore'

export async function landCollateralScore(
  pool: Pool,
  userId: string,
  requestedAmountPaise: number,
  loanProduct: string
): Promise<DimensionResult> {

  const result = await pool.query(`
    SELECT
      current_value_paise,
      title_status,
      ownership_type,
      ai_anomaly_flag,
      asset_subtype AS land_type,
      asset_name
    FROM canonical_assets
    WHERE user_id = $1
    AND asset_class IN ('LAND','PROPERTY')
    AND is_active = true
    ORDER BY current_value_paise DESC
  `, [userId])

  const parcels = result.rows

  const clearTitleValue = parcels
    .filter(p => p.title_status === 'clear' && !p.ai_anomaly_flag)
    .reduce((s, p) => s + parseInt(p.current_value_paise), 0)

  const disputedValue = parcels
    .filter(p => p.title_status === 'dispute')
    .reduce((s, p) => s + parseInt(p.current_value_paise), 0)

  const jointOwnedValue = parcels
    .filter(p => p.ownership_type === 'joint')
    .reduce((s, p) => s + parseInt(p.current_value_paise), 0)

  const totalLandValue = parcels
    .reduce((s, p) => s + parseInt(p.current_value_paise), 0)

  // LTV: for LAP max 50% of clear title land value
  const maxLAPValue = Math.round(clearTitleValue * 0.50)

  // LTV: for home loan 75% of property value
  const maxHomeLoanValue = Math.round(clearTitleValue * 0.75)

  let score   = 0
  const reasons:  string[] = []
  const warnings: string[] = []

  if (clearTitleValue === 0) {
    score = 0
    warnings.push('No clear-title land or property found')
  } else {
    // Coverage ratio with clear-title land
    const coverageRatio = requestedAmountPaise > 0
      ? clearTitleValue / requestedAmountPaise : 0

    if (coverageRatio >= 2)        score += 50
    else if (coverageRatio >= 1.5) score += 40
    else if (coverageRatio >= 1)   score += 30
    else if (coverageRatio >= 0.5) score += 18

    // Parcel count and diversification
    if (parcels.length >= 3) score += 15
    else if (parcels.length >= 2) score += 10
    else if (parcels.length >= 1) score += 5

    // Title quality
    const clearTitlePct = totalLandValue > 0
      ? clearTitleValue / totalLandValue : 0
    if (clearTitlePct >= 0.9)      score += 25
    else if (clearTitlePct >= 0.7) score += 15
    else if (clearTitlePct >= 0.5) score += 8

    // Ownership type
    if (jointOwnedValue === 0) {
      score += 10
      reasons.push('All properties in sole ownership')
    }

    score = Math.min(100, score)

    reasons.push(
      `Clear-title collateral of ₹${fmt(clearTitleValue)} ` +
      `across ${parcels.length} parcel(s)`
    )

    if (loanProduct === 'lap')
      reasons.push(`Maximum LAP eligibility: ₹${fmt(maxLAPValue)}`)
  }

  if (disputedValue > 0)
    warnings.push(
      `₹${fmt(disputedValue)} in disputed property — excluded from collateral`
    )
  if (jointOwnedValue > requestedAmountPaise * 0.5)
    warnings.push(`Large joint-ownership holding — co-owner consent required`)

  return {
    score,
    reasons,
    warnings,
    data: {
      totalLandValuePaise:     totalLandValue,
      clearTitleValuePaise:    clearTitleValue,
      disputedValuePaise:      disputedValue,
      jointOwnedValuePaise:    jointOwnedValue,
      maxLAPEligiblePaise:     maxLAPValue,
      maxHomeLoanEligiblePaise:maxHomeLoanValue,
      parcelCount:             parcels.length
    }
  }
}

function fmt(paise: number): string {
  const v = paise / 100
  if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`
  if (v >= 100000)   return `₹${(v/100000).toFixed(1)}L`
  return `₹${Math.round(v).toLocaleString('en-IN')}`
}
