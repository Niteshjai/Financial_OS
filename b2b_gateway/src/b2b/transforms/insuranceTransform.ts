import { Pool } from 'pg'
import { z }    from 'zod'

export const InsuranceResponseSchema = z.object({
  requestId:    z.string(),
  userId:       z.string(),
  generatedAt:  z.string(),

  // Coverage profile
  coverageProfile: z.object({
    hasLifeInsurance:       z.boolean(),
    hasTermPlan:            z.boolean(),
    hasHealthInsurance:     z.boolean(),
    hasCriticalIllness:     z.boolean(),
    hasPropertyInsurance:   z.boolean(),
    hasVehicleInsurance:    z.boolean(),
    totalLifeCoverPaise:    z.number(),
    totalHealthCoverPaise:  z.number(),
    existingPoliciesCount:  z.number(),
  }),

  // Gap analysis
  gapAnalysis: z.object({
    gapScore:              z.number(),
    gapSeverity:           z.string(),
    recommendedLifePaise:  z.number(),
    recommendedHealthPaise:z.number(),
    lifeGapPaise:          z.number(),
    healthGapPaise:        z.number(),
    termGapPaise:          z.number(),
  }),

  // Profile for underwriting
  underwritingProfile: z.object({
    estimatedAge:            z.number().optional(),
    dependentsCount:         z.number(),
    estimatedAnnualIncomePaise: z.number(),
    netWorthPaise:           z.number(),
    hasPropertyAssets:       z.boolean(),
    hasOutstandingLoans:     z.boolean(),
    monthlyObligationsPaise: z.number(),
  }),

  // Existing policies summary
  existingPolicies: z.array(z.object({
    policyType:     z.string(),
    insurerName:    z.string(),
    sumAssuredRange:z.string(),
    status:         z.string(),
    expiryDate:     z.string().optional(),
    hasNominee:     z.boolean(),
  })),

  // Recommended products
  recommendations: z.array(z.object({
    productType:        z.string(),
    reason:             z.string(),
    priorityLevel:      z.enum(['critical','high','medium','low']),
    coverageNeededPaise:z.number(),
  })),

  disclaimer: z.string(),
})

export type InsuranceResponse = z.infer<typeof InsuranceResponseSchema>

export async function transformForInsurance(
  pool:      Pool,
  userId:    string,
  requestId: string
): Promise<InsuranceResponse> {

  const [assetsResult, gapResult, policiesResult] = await Promise.all([
    pool.query(`
      SELECT asset_class, current_value_paise,
             institution_name
      FROM canonical_assets
      WHERE user_id = $1 AND is_active = true
    `, [userId]),

    pool.query(`
      SELECT * FROM insurance_gap_analysis
      WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 1
    `, [userId]),

    pool.query(`
      SELECT policy_type, insurer_name,
             sum_assured_paise, policy_status,
             policy_end_date, has_nominee
      FROM insurance_policies
      WHERE user_id = $1 AND is_active = true
    `, [userId])
  ])

  const assets   = assetsResult.rows
  const gap      = gapResult.rows[0]
  const policies = policiesResult.rows

  const approxRange = (paise: number): string => {
    const v = paise / 100
    if (v <= 0)       return 'Not available'
    if (v < 500000)   return 'Under ₹5L'
    if (v < 1000000)  return '₹5L–₹10L'
    if (v < 5000000)  return '₹10L–₹50L'
    if (v < 10000000) return '₹50L–₹1Cr'
    return 'Above ₹1Cr'
  }

  const recommendations: InsuranceResponse['recommendations'] = []

  if (!gap?.has_term_plan) {
    recommendations.push({
      productType:        'TERM_INSURANCE',
      reason:             'No term plan detected — income replacement gap',
      priorityLevel:      'critical',
      coverageNeededPaise:gap?.recommended_term_paise ?? 0,
    })
  }
  if (!gap?.has_health_cover) {
    recommendations.push({
      productType:        'HEALTH_INSURANCE',
      reason:             'No health cover — hospitalisation risk',
      priorityLevel:      'critical',
      coverageNeededPaise:gap?.recommended_health_paise ?? 0,
    })
  }
  if (!gap?.has_critical_illness) {
    recommendations.push({
      productType:        'CRITICAL_ILLNESS',
      reason:             'No critical illness cover for age group',
      priorityLevel:      'high',
      coverageNeededPaise:5000000_00,
    })
  }
  if (!assets.some(a => a.asset_class === 'PROPERTY' && a)) {
    recommendations.push({
      productType:        'HOME_INSURANCE',
      reason:             'Property assets detected without insurance',
      priorityLevel:      'medium',
      coverageNeededPaise:0,
    })
  }

  const monthlyIncome = 0  // derived from AA tx data (simplified)
  const totalAssets   = assets.reduce(
    (s, a) => s + parseInt(a.current_value_paise), 0
  )

  return {
    requestId,
    userId,
    generatedAt: new Date().toISOString(),

    coverageProfile: {
      hasLifeInsurance:      policies.some(p =>
        ['LIFE','ENDOWMENT','ULIP'].includes(p.policy_type)
      ),
      hasTermPlan:           gap?.has_term_plan ?? false,
      hasHealthInsurance:    gap?.has_health_cover ?? false,
      hasCriticalIllness:    gap?.has_critical_illness ?? false,
      hasPropertyInsurance:  false,
      hasVehicleInsurance:   false,
      totalLifeCoverPaise:   gap?.total_life_cover_paise
        ? parseInt(gap.total_life_cover_paise) : 0,
      totalHealthCoverPaise: gap?.total_health_cover_paise
        ? parseInt(gap.total_health_cover_paise) : 0,
      existingPoliciesCount: policies.length,
    },

    gapAnalysis: {
      gapScore:              gap?.gap_score ?? 0,
      gapSeverity:           gap?.gap_severity ?? 'unknown',
      recommendedLifePaise:  gap?.recommended_life_paise
        ? parseInt(gap.recommended_life_paise) : 0,
      recommendedHealthPaise:gap?.recommended_health_paise
        ? parseInt(gap.recommended_health_paise) : 0,
      lifeGapPaise:          gap?.life_gap_paise
        ? parseInt(gap.life_gap_paise) : 0,
      healthGapPaise:        gap?.health_gap_paise
        ? parseInt(gap.health_gap_paise) : 0,
      termGapPaise:          gap?.term_gap_paise
        ? parseInt(gap.term_gap_paise) : 0,
    },

    underwritingProfile: {
      dependentsCount:              gap?.dependents_count ?? 0,
      estimatedAnnualIncomePaise:   gap?.annual_income_paise
        ? parseInt(gap.annual_income_paise) : 0,
      netWorthPaise:                totalAssets,
      hasPropertyAssets:            assets.some(a =>
        ['LAND','PROPERTY'].includes(a.asset_class)
      ),
      hasOutstandingLoans:          false,
      monthlyObligationsPaise:      0,
    },

    existingPolicies: policies.map(p => ({
      policyType:     p.policy_type,
      insurerName:    p.insurer_name ?? 'Unknown',
      sumAssuredRange:approxRange(parseInt(p.sum_assured_paise ?? '0')),
      status:         p.policy_status ?? 'unknown',
      expiryDate:     p.policy_end_date,
      hasNominee:     p.has_nominee ?? false,
    })),

    recommendations,

    disclaimer:
      'This analysis is based on user-consented data from linked financial ' +
      'accounts. Coverage values are indicative. Verify policy documents ' +
      'independently. AssetMap is not an insurance broker or advisor.',
  }
}
