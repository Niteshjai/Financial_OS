import { Pool } from 'pg'
import { z }    from 'zod'

export const HRPayrollResponseSchema = z.object({
  requestId:    z.string(),
  userId:       z.string(),
  generatedAt:  z.string(),

  // Employment verification
  employmentProfile: z.object({
    salaryCreditsDetected:      z.boolean(),
    averageMonthlySalaryPaise:  z.number(),
    salaryConsistencyScore:     z.number(),
    monthsOfSalaryHistory:      z.number(),
    estimatedEmployerType:      z.string(),
    lastSalaryCreditDate:       z.string().optional(),
    salaryRangeLabel:           z.string(),
  }),

  // PF / NPS / insurance (employer-linked)
  employerBenefits: z.object({
    hasPF:          z.boolean(),
    hasNPS:         z.boolean(),
    hasGratuity:    z.boolean(),
    pfBalance:      z.string().optional(),
    npsBalance:     z.string().optional(),
  }),

  // Financial health (for ESOP / salary advance eligibility)
  financialHealth: z.object({
    netWorthRange:         z.string(),
    hasOutstandingLoans:   z.boolean(),
    monthlyObligations:    z.string(),
    savingsRatePct:        z.number(),
  }),

  disclaimer: z.string(),
})

export type HRPayrollResponse = z.infer<typeof HRPayrollResponseSchema>

export async function transformForHRPayroll(
  pool:      Pool,
  userId:    string,
  requestId: string
): Promise<HRPayrollResponse> {

  const [txResult, assetsResult] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(DISTINCT DATE_TRUNC('month', value_date)) AS months,
        AVG(monthly_total) AS avg_salary,
        MAX(value_date) AS last_credit
      FROM (
        SELECT
          DATE_TRUNC('month', value_date) AS month_date,
          MAX(value_date) AS value_date,
          SUM(amount_paise) AS monthly_total
        FROM aa_transactions
        WHERE user_id = $1
        AND transaction_type = 'CREDIT'
        AND description ILIKE ANY(
          ARRAY['%salary%','%sal%','%payroll%','%neft%']
        )
        AND value_date >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', value_date)
      ) monthly
    `, [userId]),

    pool.query(`
      SELECT asset_class, current_value_paise
      FROM canonical_assets
      WHERE user_id = $1 AND is_active = true
    `, [userId])
  ])

  const txRow    = txResult.rows[0]
  const assets   = assetsResult.rows

  const avgSalary    = parseFloat(txRow.avg_salary) || 0
  const monthsHistory= parseInt(txRow.months) || 0
  const hasSalary    = avgSalary > 0

  const totalAssets  = assets.reduce(
    (s, a) => s + parseInt(a.current_value_paise), 0
  )
  const hasPF = assets.some(a => a.asset_class === 'EPF')
  const hasNPS= assets.some(a => a.asset_class === 'NPS')

  const pfBalance  = assets.find(a => a.asset_class === 'EPF')
  const npsBalance = assets.find(a => a.asset_class === 'NPS')

  const netWorthLabel = (paise: number): string => {
    const v = paise / 100
    if (v < 500000)   return 'Under ₹5L'
    if (v < 2000000)  return '₹5L–₹20L'
    if (v < 10000000) return '₹20L–₹1Cr'
    return 'Above ₹1Cr'
  }

  const salaryLabel = (paise: number): string => {
    const v = paise / 100
    if (v < 30000)  return 'Under ₹30K/month'
    if (v < 75000)  return '₹30K–₹75K/month'
    if (v < 150000) return '₹75K–₹1.5L/month'
    if (v < 500000) return '₹1.5L–₹5L/month'
    return 'Above ₹5L/month'
  }

  return {
    requestId,
    userId,
    generatedAt: new Date().toISOString(),

    employmentProfile: {
      salaryCreditsDetected:     hasSalary,
      averageMonthlySalaryPaise: Math.round(avgSalary),
      salaryConsistencyScore:    monthsHistory >= 12 ? 95 :
                                 monthsHistory >= 9  ? 80 :
                                 monthsHistory >= 6  ? 65 :
                                 monthsHistory >= 3  ? 45 : 20,
      monthsOfSalaryHistory:     monthsHistory,
      estimatedEmployerType:     avgSalary > 500000 ? 'corporate' :
                                 avgSalary > 100000 ? 'mid_size' : 'sme',
      lastSalaryCreditDate:      txRow.last_credit,
      salaryRangeLabel:          salaryLabel(avgSalary),
    },

    employerBenefits: {
      hasPF,
      hasNPS,
      hasGratuity: false,
      pfBalance:   pfBalance
        ? netWorthLabel(parseInt(pfBalance.current_value_paise))
        : undefined,
      npsBalance:  npsBalance
        ? netWorthLabel(parseInt(npsBalance.current_value_paise))
        : undefined,
    },

    financialHealth: {
      netWorthRange:       netWorthLabel(totalAssets),
      hasOutstandingLoans: false,
      monthlyObligations:  'Not determined',
      savingsRatePct:      0,
    },

    disclaimer:
      'This verification is based on user-consented Account Aggregator data. ' +
      'Salary values are estimated from transaction patterns — not a formal ' +
      'payslip verification. Use for indicative purposes only.',
  }
}
