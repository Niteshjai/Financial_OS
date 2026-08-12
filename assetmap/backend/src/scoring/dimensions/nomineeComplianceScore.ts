import { Pool } from 'pg'
import { DimensionResult } from './assetStrengthScore'

export async function nomineeComplianceScore(
  pool: Pool,
  userId: string
): Promise<DimensionResult> {

  const result = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN has_nominee = true THEN 1 END) AS with_nominee
    FROM canonical_assets
    WHERE user_id = $1
    AND asset_class IN (
      'BANK_ACCOUNT','FIXED_DEPOSIT','MUTUAL_FUND',
      'EQUITY','NPS','INSURANCE_LIFE','INSURANCE_HEALTH'
    )
    AND is_active = true
  `, [userId])

  const total       = parseInt(result.rows[0].total)       || 0
  const withNominee = parseInt(result.rows[0].with_nominee) || 0
  const pct         = total > 0 ? withNominee / total : 0

  const score   = Math.round(pct * 100)
  const reasons:  string[] = []
  const warnings: string[] = []

  if (pct >= 0.9)
    reasons.push(`${withNominee}/${total} accounts have nominees — excellent compliance`)
  else if (pct >= 0.5)
    warnings.push(`Only ${withNominee}/${total} accounts have nominees`)
  else
    warnings.push(`Most accounts lack nominees — risk of estate complications`)

  return {
    score,
    reasons,
    warnings,
    data: {
      totalAccounts:         total,
      accountsWithNominee:   withNominee,
      nomineeCompletionPct:  Math.round(pct * 100)
    }
  }
}
