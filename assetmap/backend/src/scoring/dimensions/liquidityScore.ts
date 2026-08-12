import { Pool } from 'pg'
import { DimensionResult } from './assetStrengthScore'

export async function liquidityScore(
  pool: Pool,
  userId: string,
  requestedAmountPaise: number
): Promise<DimensionResult> {

  const result = await pool.query(`
    SELECT asset_class, ai_liquidity_score,
           SUM(current_value_paise) AS total_value
    FROM canonical_assets
    WHERE user_id = $1 AND is_active = true
    GROUP BY asset_class, ai_liquidity_score
  `, [userId])

  let weightedLiquidity = 0
  let totalValue        = 0
  let instantLiquid     = 0  // Available within 24 hours

  for (const row of result.rows) {
    const value      = parseInt(row.total_value)
    const liqScore   = row.ai_liquidity_score ?? 50
    weightedLiquidity += value * liqScore
    totalValue        += value

    if (liqScore >= 90) instantLiquid += value
  }

  const avgLiquidityScore = totalValue > 0
    ? Math.round(weightedLiquidity / totalValue) : 0

  const liquidityCoverageRatio = requestedAmountPaise > 0
    ? instantLiquid / requestedAmountPaise : 0

  let score   = 0
  const reasons:  string[] = []
  const warnings: string[] = []

  // Base from average liquidity
  score += Math.round(avgLiquidityScore * 0.6)

  // Coverage ratio bonus
  if (liquidityCoverageRatio >= 1)       score += 40
  else if (liquidityCoverageRatio >= 0.5)score += 28
  else if (liquidityCoverageRatio >= 0.2)score += 16
  else if (liquidityCoverageRatio >= 0.1)score += 8

  score = Math.min(100, score)

  if (liquidityCoverageRatio >= 0.5)
    reasons.push(
      `Liquid assets cover ${Math.round(liquidityCoverageRatio*100)}% ` +
      `of requested loan`
    )
  if (avgLiquidityScore >= 70)
    reasons.push(`Well-structured portfolio with high liquidity`)

  if (avgLiquidityScore < 40)
    warnings.push(`Most assets are illiquid — limited emergency liquidity`)
  if (liquidityCoverageRatio < 0.1)
    warnings.push(`Very low immediate liquidity relative to loan size`)

  return {
    score,
    reasons,
    warnings,
    data: {
      avgLiquidityScore,
      instantLiquidPaise:        instantLiquid,
      liquidityCoverageRatioPct: Math.round(liquidityCoverageRatio * 100)
    }
  }
}
