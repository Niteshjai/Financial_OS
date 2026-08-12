export interface DecisionInput {
  compositeScore:       number
  loanProduct:          string
  requestedAmountPaise: number
  requestedTenureMonths:number
  dimensions:           Record<string, any>
  incomeData:           Record<string, any>
  landData:             Record<string, any>
  liabilityData:        Record<string, any>
}

export interface DecisionOutput {
  decision:               'APPROVE' | 'CONDITIONAL' | 'REJECT'
  decisionReasons:        string[]
  conditions:             string[]
  maxEligiblePaise:       number
  recommendedTenureMonths:number
  rateMin:                number
  rateMax:                number
}

// Score thresholds per loan product
const THRESHOLDS: Record<string, {
  approve: number
  conditional: number
}> = {
  home_loan:        { approve: 700, conditional: 550 },
  lap:              { approve: 650, conditional: 500 },
  personal_loan:    { approve: 750, conditional: 620 },
  business_loan:    { approve: 680, conditional: 540 },
  vehicle_loan:     { approve: 680, conditional: 540 },
  gold_loan:        { approve: 500, conditional: 350 },
  education_loan:   { approve: 600, conditional: 450 },
}

// Rate grid (lower score = higher rate)
const RATE_GRID: Record<string, Array<{
  minScore: number; rateMin: number; rateMax: number
}>> = {
  home_loan: [
    { minScore: 850, rateMin: 8.25, rateMax: 8.75 },
    { minScore: 750, rateMin: 8.75, rateMax: 9.25 },
    { minScore: 650, rateMin: 9.25, rateMax: 10.00 },
    { minScore: 550, rateMin: 10.00,rateMax: 11.50 },
    { minScore: 0,   rateMin: 11.50,rateMax: 14.00 },
  ],
  personal_loan: [
    { minScore: 850, rateMin: 10.50,rateMax: 11.50 },
    { minScore: 750, rateMin: 11.50,rateMax: 13.00 },
    { minScore: 650, rateMin: 13.00,rateMax: 15.00 },
    { minScore: 0,   rateMin: 15.00,rateMax: 18.00 },
  ],
  lap: [
    { minScore: 750, rateMin: 9.00, rateMax: 10.00 },
    { minScore: 600, rateMin: 10.00,rateMax: 11.50 },
    { minScore: 0,   rateMin: 11.50,rateMax: 14.00 },
  ],
}

export function makeDecision(input: DecisionInput): DecisionOutput {
  const {
    compositeScore, loanProduct,
    requestedAmountPaise, requestedTenureMonths,
    dimensions, incomeData, landData, liabilityData
  } = input

  const thresholds = THRESHOLDS[loanProduct] ??
                     THRESHOLDS['personal_loan']

  const reasons:    string[] = []
  const conditions: string[] = []

  // Maximum eligible amount calculation
  const availableEMI = Math.max(
    0,
    incomeData.avgMonthlyIncomePaise * 0.55 -
    incomeData.monthlyObligationsPaise
  )

  // Max loan based on FOIR
  const r = 9 / 100 / 12  // 9% annual
  const n = Math.min(requestedTenureMonths, 240)
  const maxByIncomePaise = availableEMI > 0
    ? Math.round(
        availableEMI * (Math.pow(1+r,n)-1) /
        (r * Math.pow(1+r,n))
      )
    : 0

  // Max by collateral (for LAP/home loan)
  let maxByCollateralPaise = Infinity
  if (loanProduct === 'lap') {
    maxByCollateralPaise = landData.maxLAPEligiblePaise || 0
  } else if (loanProduct === 'home_loan') {
    maxByCollateralPaise = landData.maxHomeLoanEligiblePaise || 0
  }

  const maxEligiblePaise = Math.min(maxByIncomePaise, maxByCollateralPaise)

  // Decision logic
  let decision: 'APPROVE' | 'CONDITIONAL' | 'REJECT' = 'REJECT'

  if (compositeScore >= thresholds.approve) {
    if (requestedAmountPaise <= maxEligiblePaise) {
      decision = 'APPROVE'
      reasons.push(`Composite score of ${compositeScore} exceeds approval threshold of ${thresholds.approve}`)
      reasons.push(`Requested amount is within eligible limits based on FOIR and collateral`)
    } else {
      decision = 'CONDITIONAL'
      reasons.push(`Composite score meets approval threshold, but requested amount exceeds maximum eligibility`)
      conditions.push(`Reduce loan amount to maximum eligible limit of ₹${maxEligiblePaise / 100}`)
    }
  } else if (compositeScore >= thresholds.conditional) {
    decision = 'CONDITIONAL'
    reasons.push(`Composite score of ${compositeScore} requires conditional review (threshold: ${thresholds.conditional})`)
    
    // Add dynamic conditions based on dimensions
    if (dimensions.income_stability?.score < 50) {
      conditions.push('Provide additional proof of stable income or co-applicant')
    }
    if (dimensions.fraud_risk?.score < 80) {
      conditions.push('Undergo manual underwriter review for anomaly resolution')
    }
    if (dimensions.land_collateral && dimensions.land_collateral.score < 50 && (loanProduct === 'lap' || loanProduct === 'home_loan')) {
      conditions.push('Provide additional clear-title collateral')
    }
    
    if (requestedAmountPaise > maxEligiblePaise) {
      conditions.push(`Reduce loan amount to maximum eligible limit of ₹${maxEligiblePaise / 100}`)
    }
  } else {
    decision = 'REJECT'
    reasons.push(`Composite score of ${compositeScore} falls below minimum requirement of ${thresholds.conditional}`)
  }

  // Rate pricing
  const grid = RATE_GRID[loanProduct] ?? RATE_GRID['personal_loan']
  let rateMin = grid[grid.length - 1].rateMin
  let rateMax = grid[grid.length - 1].rateMax

  for (const tier of grid) {
    if (compositeScore >= tier.minScore) {
      rateMin = tier.rateMin
      rateMax = tier.rateMax
      break
    }
  }

  // Recommended tenure
  let recommendedTenureMonths = requestedTenureMonths
  if (decision === 'CONDITIONAL' && requestedAmountPaise > maxEligiblePaise && maxByIncomePaise < requestedAmountPaise) {
    // Try to extend tenure to make EMI fit, up to max allowed
    const maxAllowedTenure = loanProduct === 'home_loan' ? 360 : 120
    if (requestedTenureMonths < maxAllowedTenure) {
      recommendedTenureMonths = Math.min(maxAllowedTenure, requestedTenureMonths + 60)
      conditions.push(`Consider extending loan tenure to ${recommendedTenureMonths} months to improve EMI affordability`)
    }
  }

  return {
    decision,
    decisionReasons: reasons,
    conditions,
    maxEligiblePaise,
    recommendedTenureMonths,
    rateMin,
    rateMax
  }
}
