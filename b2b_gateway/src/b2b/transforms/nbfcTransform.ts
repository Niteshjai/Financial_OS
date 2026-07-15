import { Pool } from 'pg'
import { z }    from 'zod'

export const NBFCResponseSchema = z.object({
  requestId:    z.string(),
  userId:       z.string(),
  generatedAt:  z.string(),
  expiresAt:    z.string(),
  modelVersion: z.string(),

  // Composite creditworthiness
  creditProfile: z.object({
    assetMapScore:        z.number(),   // 0–1000
    decision:             z.enum(['APPROVE','CONDITIONAL','REJECT']),
    decisionReasons:      z.array(z.string()),
    conditions:           z.array(z.string()),
    maxEligiblePaise:     z.number(),
    recommendedRateMin:   z.number(),
    recommendedRateMax:   z.number(),
    confidenceLevel:      z.enum(['high','medium','low']),
    aiLenderNotes:        z.string(),
  }),

  // Income verification
  income: z.object({
    estimatedMonthlyPaise:   z.number(),
    monthsOfHistory:         z.number(),
    consistencyScore:        z.number(),
    incomeType:              z.string(),
    foirWithNewLoan:         z.number(),
    availableEMIPaise:       z.number(),
  }),

  // Asset summary (for collateral assessment)
  assets: z.object({
    totalNetWorthPaise:       z.number(),
    liquidAssetsPaise:        z.number(),
    investmentAssetsPaise:    z.number(),
    clearTitleLandPaise:      z.number(),
    assetToLoanRatio:         z.number(),
  }),

  // Liability summary
  liabilities: z.object({
    existingLoansCount:       z.number(),
    monthlyEMIBurdenPaise:    z.number(),
    bouncedPayments12m:       z.number(),
    creditCardCount:          z.number(),
  }),

  // Dimension breakdown
  dimensionScores: z.record(z.string(), z.object({
    score:    z.number(),
    weight:   z.number(),
    band:     z.string(),
  })),

  // AI explanation
  aiExplanation: z.object({
    summary:      z.string(),
    strengths:    z.array(z.string()),
    weaknesses:   z.array(z.string()),
    riskFlags:    z.array(z.string()),
  }),

  // Compliance
  disclaimer: z.string(),
})

export type NBFCResponse = z.infer<typeof NBFCResponseSchema>

export async function transformForNBFC(
  pool:          Pool,
  userId:        string,
  scorecardId:   string,
  requestId:     string
): Promise<NBFCResponse> {

  const result = await pool.query(`
    SELECT * FROM loan_scorecards
    WHERE id = $1 AND user_id = $2
  `, [scorecardId, userId])

  if (!result.rows[0]) throw new Error('Scorecard not found')

  const sc = result.rows[0]

  const band = (score: number): string =>
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'fair' :
    score >= 20 ? 'poor' : 'critical'

  const confidence =
    sc.composite_score >= 750 ? 'high' :
    sc.composite_score >= 550 ? 'medium' : 'low'

  return {
    requestId,
    userId,
    generatedAt: sc.generated_at,
    expiresAt:   sc.expires_at,
    modelVersion:sc.score_model_version,

    creditProfile: {
      assetMapScore:    sc.composite_score,
      decision:         sc.decision,
      decisionReasons:  sc.decision_reasons ?? [],
      conditions:       sc.conditions ?? [],
      maxEligiblePaise: sc.max_eligible_paise ?? 0,
      recommendedRateMin:sc.recommended_rate_min_pct,
      recommendedRateMax:sc.recommended_rate_max_pct,
      confidenceLevel:  confidence,
      aiLenderNotes:    sc.ai_lender_notes ?? '',
    },

    income: {
      estimatedMonthlyPaise:  sc.monthly_income_paise ?? 0,
      monthsOfHistory:        0,
      consistencyScore:       sc.score_income_stability ?? 0,
      incomeType:             'salaried',
      foirWithNewLoan:        sc.monthly_income_paise > 0
        ? Math.round(
            sc.monthly_obligations_paise / sc.monthly_income_paise * 100
          ) / 100
        : 0,
      availableEMIPaise: Math.max(
        0,
        (sc.monthly_income_paise ?? 0) * 0.55 -
        (sc.monthly_obligations_paise ?? 0)
      ),
    },

    assets: {
      totalNetWorthPaise:    sc.net_worth_paise ?? 0,
      liquidAssetsPaise:     sc.liquid_assets_paise ?? 0,
      investmentAssetsPaise: (sc.total_assets_paise ?? 0) -
                             (sc.liquid_assets_paise ?? 0) -
                             (sc.land_value_paise ?? 0),
      clearTitleLandPaise:   sc.clear_title_land_paise ?? 0,
      assetToLoanRatio:      sc.requested_amount_paise > 0
        ? Math.round(
            (sc.total_assets_paise ?? 0) / sc.requested_amount_paise * 100
          ) / 100
        : 0,
    },

    liabilities: {
      existingLoansCount:    0,
      monthlyEMIBurdenPaise: sc.monthly_obligations_paise ?? 0,
      bouncedPayments12m:    0,
      creditCardCount:       0,
    },

    dimensionScores: {
      asset_strength:     { score: sc.score_asset_strength,     weight: sc.weight_asset_strength,    band: band(sc.score_asset_strength) },
      income_stability:   { score: sc.score_income_stability,   weight: sc.weight_income_stability,  band: band(sc.score_income_stability) },
      liability_burden:   { score: sc.score_liability_burden,   weight: sc.weight_liability_burden,  band: band(sc.score_liability_burden) },
      liquidity:          { score: sc.score_liquidity,          weight: sc.weight_liquidity,         band: band(sc.score_liquidity) },
      land_collateral:    { score: sc.score_land_collateral,    weight: sc.weight_land_collateral,   band: band(sc.score_land_collateral) },
      behavioral:         { score: sc.score_behavioral,         weight: sc.weight_behavioral,        band: band(sc.score_behavioral) },
      nominee_compliance: { score: sc.score_nominee_compliance, weight: sc.weight_nominee_compliance,band: band(sc.score_nominee_compliance) },
      fraud_risk:         { score: sc.score_fraud_risk,         weight: sc.weight_fraud_risk,        band: band(sc.score_fraud_risk) },
    },

    aiExplanation: {
      summary:   sc.ai_summary    ?? '',
      strengths: sc.ai_strengths  ?? [],
      weaknesses:sc.ai_weaknesses ?? [],
      riskFlags: sc.ai_risk_flags ?? [],
    },

    disclaimer:
      'AssetMap provides asset-backed financial intelligence supplementary ' +
      'to credit bureau data. This is not a credit bureau report. ' +
      'All lending decisions are solely the lender\'s responsibility. ' +
      'AssetMap assumes no liability for loan outcomes.',
  }
}
