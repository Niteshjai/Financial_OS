import { Pool }   from 'pg'
import { z }      from 'zod'

export const WealthManagerResponseSchema = z.object({
  requestId:    z.string(),
  userId:       z.string(),
  generatedAt:  z.string(),

  // Complete net worth breakdown
  netWorth: z.object({
    totalPaise:           z.number(),
    liquidPaise:          z.number(),
    investedPaise:        z.number(),
    illiquidPaise:        z.number(),
    lastSnapshotDate:     z.string(),
    changeVsPriorMonth:   z.number().optional(),
    allTimeHighPaise:     z.number().optional(),
  }),

  // Detailed asset allocation
  assetAllocation: z.array(z.object({
    assetClass:       z.string(),
    label:            z.string(),
    valuePaise:       z.number(),
    allocationPct:    z.number(),
    riskLevel:        z.string(),
    liquidityScore:   z.number(),
  })),

  // Individual holdings
  holdings: z.array(z.object({
    id:               z.string(),
    assetClass:       z.string(),
    label:            z.string(),
    institutionName:  z.string(),
    assetName:        z.string().optional(),
    currentValuePaise:z.number(),
    investedValuePaise:z.number().optional(),
    gainLossPaise:    z.number().optional(),
    gainLossPct:      z.number().optional(),
    quantity:         z.number().optional(),
    unit:             z.string().optional(),
    maturityDate:     z.string().optional(),
    riskLevel:        z.string(),
    liquidityScore:   z.number(),
    aiSummary:        z.string().optional(),
    hasNominee:       z.boolean(),
  })),

  // Portfolio health metrics
  portfolioHealth: z.object({
    diversificationScore:   z.number(),   // 0–100
    riskScore:              z.number(),   // 0–100 (higher = riskier)
    liquidityScore:         z.number(),   // 0–100 (higher = more liquid)
    nomineeCompletionPct:   z.number(),
    anomalyCount:           z.number(),
    suggestions:            z.array(z.string()),
  }),

  // Insurance coverage
  insuranceSummary: z.object({
    totalLifeCoverPaise:    z.number(),
    totalHealthCoverPaise:  z.number(),
    hasTermPlan:            z.boolean(),
    hasHealthCover:         z.boolean(),
    gapSeverity:            z.string(),
  }),

  // Land and property
  realEstate: z.object({
    totalValuePaise:    z.number(),
    clearTitlePaise:    z.number(),
    parcelCount:        z.number(),
    states:             z.array(z.string()),
  }),

  // Historical net worth (for chart)
  netWorthHistory: z.array(z.object({
    month:        z.string(),
    totalPaise:   z.number(),
  })),
})

export type WealthManagerResponse = z.infer<typeof WealthManagerResponseSchema>

export async function transformForWealthManager(
  pool:      Pool,
  userId:    string,
  requestId: string
): Promise<WealthManagerResponse> {

  const [assetsResult, historyResult, gapResult] = await Promise.all([
    pool.query(`
      SELECT
        id, asset_class, institution_name, asset_name,
        asset_subtype, current_value_paise,
        invested_value_paise, gain_loss_paise,
        gain_loss_pct, quantity, unit,
        maturity_date, has_nominee,
        ai_risk_level, ai_liquidity_score,
        ai_summary, ai_anomaly_flag,
        title_status, ownership_type,
        document_available
      FROM canonical_assets
      WHERE user_id = $1 AND is_active = true
      ORDER BY current_value_paise DESC
    `, [userId]),

    pool.query(`
      SELECT month, total_paise
      FROM networth_monthly
      WHERE user_id = $1
      ORDER BY month DESC LIMIT 24
    `, [userId]),

    pool.query(`
      SELECT *
      FROM insurance_gap_analysis
      WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 1
    `, [userId])
  ])

  const rows = assetsResult.rows
  const totalPaise = rows.reduce(
    (s, r) => s + parseInt(r.current_value_paise), 0
  )

  const LIQUID_CLASSES    = ['BANK_ACCOUNT','FIXED_DEPOSIT']
  const INVESTED_CLASSES  = ['MUTUAL_FUND','EQUITY','NPS','BOND','GOLD','PPF','EPF']
  const ILLIQUID_CLASSES  = ['LAND','PROPERTY','INSURANCE_LIFE',
                             'INSURANCE_HEALTH','INSURANCE_OTHER']

  const byClasses = (cs: string[]) =>
    rows.filter(r => cs.includes(r.asset_class))

  const liquidPaise   = byClasses(LIQUID_CLASSES)
    .reduce((s, r) => s + parseInt(r.current_value_paise), 0)
  const investedPaise = byClasses(INVESTED_CLASSES)
    .reduce((s, r) => s + parseInt(r.current_value_paise), 0)
  const illiquidPaise = byClasses(ILLIQUID_CLASSES)
    .reduce((s, r) => s + parseInt(r.current_value_paise), 0)

  // Asset allocation
  const allClassesInData = [...new Set(rows.map(r => r.asset_class))]
  const assetAllocation = allClassesInData.map(cls => {
    const clsRows = rows.filter(r => r.asset_class === cls)
    const value   = clsRows.reduce(
      (s, r) => s + parseInt(r.current_value_paise), 0
    )
    const avgRisk = clsRows[0]?.ai_risk_level ?? 'medium'
    const avgLiq  = clsRows.length > 0
      ? Math.round(clsRows.reduce(
          (s, r) => s + (r.ai_liquidity_score ?? 50), 0
        ) / clsRows.length)
      : 50

    return {
      assetClass:    cls,
      label:         cls.replace(/_/g,' ').toLowerCase()
        .replace(/\b\w/g, (c: string) => c.toUpperCase()),
      valuePaise:    value,
      allocationPct: totalPaise > 0
        ? Math.round(value / totalPaise * 1000) / 10
        : 0,
      riskLevel:     avgRisk,
      liquidityScore:avgLiq,
    }
  })

  // Diversification score (more classes = better)
  const classCount = allClassesInData.length
  const diversificationScore = Math.min(100,
    classCount <= 1 ? 10 :
    classCount <= 2 ? 25 :
    classCount <= 3 ? 45 :
    classCount <= 5 ? 65 :
    classCount <= 7 ? 80 : 95
  )

  // Portfolio risk score
  const weightedRisk = rows.reduce((sum, r) => {
    const riskMap: Record<string, number> = {
      very_low:10, low:25, medium:50, high:75, very_high:95
    }
    const w = parseInt(r.current_value_paise) / (totalPaise || 1)
    return sum + (riskMap[r.ai_risk_level] ?? 50) * w
  }, 0)

  // Weighted liquidity
  const weightedLiq = rows.reduce((sum, r) => {
    const w = parseInt(r.current_value_paise) / (totalPaise || 1)
    return sum + (r.ai_liquidity_score ?? 50) * w
  }, 0)

  // Suggestions
  const suggestions: string[] = []
  if (liquidPaise < totalPaise * 0.1)
    suggestions.push('Liquid reserves are below 10% of portfolio — consider rebalancing')
  if (byClasses(['EQUITY']).length === 0)
    suggestions.push('No equity exposure — consider SIP investments for long-term growth')
  if (byClasses(['INSURANCE_LIFE']).length === 0)
    suggestions.push('No life insurance detected — critical gap for dependents')
  if (rows.filter(r => !r.has_nominee).length > rows.length * 0.4)
    suggestions.push('Over 40% of accounts lack nominees — update immediately')

  const gap = gapResult.rows[0]
  const landRows = byClasses(['LAND','PROPERTY'])

  return {
    requestId,
    userId,
    generatedAt: new Date().toISOString(),

    netWorth: {
      totalPaise,
      liquidPaise,
      investedPaise,
      illiquidPaise,
      lastSnapshotDate: new Date().toISOString(),
    },

    assetAllocation,

    holdings: rows.map(r => ({
      id:                r.id,
      assetClass:        r.asset_class,
      label:             r.ai_summary ?? r.asset_name ?? r.institution_name,
      institutionName:   r.institution_name ?? 'Unknown',
      assetName:         r.asset_name,
      currentValuePaise: parseInt(r.current_value_paise),
      investedValuePaise:r.invested_value_paise
        ? parseInt(r.invested_value_paise) : undefined,
      gainLossPaise:     r.gain_loss_paise
        ? parseInt(r.gain_loss_paise) : undefined,
      gainLossPct:       r.gain_loss_pct
        ? parseFloat(r.gain_loss_pct) : undefined,
      quantity:          r.quantity ? parseFloat(r.quantity) : undefined,
      unit:              r.unit,
      maturityDate:      r.maturity_date,
      riskLevel:         r.ai_risk_level ?? 'medium',
      liquidityScore:    r.ai_liquidity_score ?? 50,
      aiSummary:         r.ai_summary,
      hasNominee:        r.has_nominee ?? false,
    })),

    portfolioHealth: {
      diversificationScore,
      riskScore:            Math.round(weightedRisk),
      liquidityScore:       Math.round(weightedLiq),
      nomineeCompletionPct: rows.length > 0
        ? Math.round(
            rows.filter(r => r.has_nominee).length / rows.length * 100
          )
        : 0,
      anomalyCount:         rows.filter(r => r.ai_anomaly_flag).length,
      suggestions,
    },

    insuranceSummary: {
      totalLifeCoverPaise:   gap?.total_life_cover_paise
        ? parseInt(gap.total_life_cover_paise) : 0,
      totalHealthCoverPaise: gap?.total_health_cover_paise
        ? parseInt(gap.total_health_cover_paise) : 0,
      hasTermPlan:           gap?.has_term_plan ?? false,
      hasHealthCover:        gap?.has_health_cover ?? false,
      gapSeverity:           gap?.gap_severity ?? 'unknown',
    },

    realEstate: {
      totalValuePaise:  landRows.reduce(
        (s, r) => s + parseInt(r.current_value_paise), 0
      ),
      clearTitlePaise:  landRows
        .filter(r => r.title_status === 'clear')
        .reduce((s, r) => s + parseInt(r.current_value_paise), 0),
      parcelCount:      landRows.length,
      states:           [...new Set(
        landRows.map(r => r.institution_name?.split(',').pop()?.trim() ?? '')
      )].filter(Boolean),
    },

    netWorthHistory: historyResult.rows.map(r => ({
      month:      r.month,
      totalPaise: parseInt(r.total_paise),
    })),
  }
}
