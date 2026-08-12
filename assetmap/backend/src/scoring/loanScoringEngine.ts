import { Pool }                       from 'pg'
import { assetStrengthScore }         from './dimensions/assetStrengthScore'
import { incomeStabilityScore }       from './dimensions/incomeStabilityScore'
import { liabilityBurdenScore }       from './dimensions/liabilityBurdenScore'
import { liquidityScore }             from './dimensions/liquidityScore'
import { landCollateralScore }        from './dimensions/landCollateralScore'
import { behavioralScore }            from './dimensions/behavioralScore'
import { nomineeComplianceScore }     from './dimensions/nomineeComplianceScore'
import { fraudRiskScore }             from './dimensions/fraudRiskScore'
import { runAIExplainer }             from './aiExplainer'
import { makeDecision }               from './decisionEngine'
import { auditLogger }                from '../services/auditLogger'
import { v4 as uuidv4 }              from 'uuid'

export interface ScoringRequest {
  userId:                 string
  loanProduct:            string
  requestedAmountPaise:   number
  requestedTenureMonths:  number
  purpose?:               string
  requestedByLenderId?:   string
}

export interface ScorecardResult {
  scorecardId:            string
  compositeScore:         number
  decision:               'APPROVE' | 'CONDITIONAL' | 'REJECT'
  decisionReasons:        string[]
  conditions:             string[]
  maxEligiblePaise:       number
  recommendedTenureMonths:number
  recommendedRateMinPct:  number
  recommendedRateMaxPct:  number
  dimensions:             Record<string, {
    score:    number
    weight:   number
    reasons:  string[]
    warnings: string[]
    data:     Record<string, any>
  }>
  aiSummary:              string
  aiStrengths:            string[]
  aiWeaknesses:           string[]
  aiRiskFlags:            string[]
  aiLenderNotes:          string
  generatedAt:            string
}

// Dimension weights — must sum to 1.0
const WEIGHTS = {
  asset_strength:      0.22,
  income_stability:    0.22,
  liability_burden:    0.18,
  liquidity:           0.12,
  land_collateral:     0.12,
  behavioral:          0.08,
  nominee_compliance:  0.04,
  fraud_risk:          0.04,
}

export async function generateScorecard(
  pool: Pool,
  request: ScoringRequest
): Promise<ScorecardResult> {

  const {
    userId, loanProduct,
    requestedAmountPaise, requestedTenureMonths
  } = request

  // Step 1: Run all dimension scorers in parallel
  const [
    assetResult,
    incomeResult,
    liabilityResult,
    liquidityResult,
    landResult,
    behaviorResult,
    nomineeResult,
    fraudResult
  ] = await Promise.all([
    assetStrengthScore(pool, userId, requestedAmountPaise),
    incomeStabilityScore(pool, userId, requestedAmountPaise),
    liabilityBurdenScore(pool, userId),
    liquidityScore(pool, userId, requestedAmountPaise),
    landCollateralScore(pool, userId, requestedAmountPaise, loanProduct),
    behavioralScore(pool, userId),
    nomineeComplianceScore(pool, userId),
    fraudRiskScore(pool, userId),
  ])

  // Step 2: Check hard rejection rules before scoring
  const inputData = {
    total_assets_paise:     assetResult.data.totalAssets,
    monthly_income_paise:   incomeResult.data.avgMonthlyIncomePaise,
    monthly_obligations_paise: incomeResult.data.monthlyObligationsPaise,
    net_worth_paise:        assetResult.data.totalAssets -
                            liabilityResult.data.monthlyEMIBurdenPaise * 12,
    fraud_risk_score:       fraudResult.score
  }

  const hardRules = await pool.query(
    'SELECT * FROM hard_rejection_rules WHERE is_active = true'
  )

  for (const rule of hardRules.rows) {
    // Safely evaluate condition
    const triggered = evalRule(rule.condition_sql, inputData)
    if (triggered) {
      // Store and return immediate rejection
      const scorecardId = uuidv4()
      await pool.query(`
        INSERT INTO loan_scorecards (
          id, user_id, loan_product,
          requested_amount_paise, requested_tenure_months,
          composite_score, decision, decision_reasons,
          score_model_version,
          monthly_income_paise, total_assets_paise
        ) VALUES ($1,$2,$3,$4,$5,0,'REJECT',$6,'v1.0',$7,$8)
      `, [
        scorecardId, userId, loanProduct,
        requestedAmountPaise, requestedTenureMonths,
        [rule.rejection_reason],
        inputData.monthly_income_paise,
        inputData.total_assets_paise
      ])

      return {
        scorecardId,
        compositeScore:  0,
        decision:        'REJECT',
        decisionReasons: [rule.rejection_reason],
        conditions:      [],
        maxEligiblePaise:0,
        recommendedTenureMonths: 0,
        recommendedRateMinPct:   0,
        recommendedRateMaxPct:   0,
        dimensions:      {},
        aiSummary:       rule.rejection_reason,
        aiStrengths:     [],
        aiWeaknesses:    [rule.rejection_reason],
        aiRiskFlags:     [rule.rule_name],
        aiLenderNotes:   `Auto-rejected by rule: ${rule.rule_name}`,
        generatedAt:     new Date().toISOString()
      }
    }
  }

  // Step 3: Calculate weighted composite score
  const dimensions = {
    asset_strength:     { result: assetResult,   weight: WEIGHTS.asset_strength     },
    income_stability:   { result: incomeResult,  weight: WEIGHTS.income_stability   },
    liability_burden:   { result: liabilityResult,weight:WEIGHTS.liability_burden   },
    liquidity:          { result: liquidityResult,weight:WEIGHTS.liquidity           },
    land_collateral:    { result: landResult,    weight: WEIGHTS.land_collateral    },
    behavioral:         { result: behaviorResult,weight: WEIGHTS.behavioral          },
    nominee_compliance: { result: nomineeResult, weight: WEIGHTS.nominee_compliance },
    fraud_risk:         { result: fraudResult,   weight: WEIGHTS.fraud_risk         },
  }

  const compositeScore = Math.round(
    Object.values(dimensions).reduce(
      (sum, d) => sum + d.result.score * d.weight, 0
    ) * 10  // Scale 0–100 → 0–1000
  )

  // Step 4: Make decision
  const {
    decision,
    decisionReasons,
    conditions,
    maxEligiblePaise,
    recommendedTenureMonths,
    rateMin,
    rateMax
  } = makeDecision({
    compositeScore,
    loanProduct,
    requestedAmountPaise,
    requestedTenureMonths,
    dimensions: Object.fromEntries(
      Object.entries(dimensions).map(([k, v]) => [k, v.result])
    ),
    incomeData:   incomeResult.data,
    landData:     landResult.data,
    liabilityData:liabilityResult.data,
  })

  // Step 5: AI explanation
  const aiResult = await runAIExplainer({
    compositeScore,
    decision,
    loanProduct,
    requestedAmountPaise,
    dimensions: Object.fromEntries(
      Object.entries(dimensions).map(([k, v]) => [k, {
        score:    v.result.score,
        weight:   v.weight,
        reasons:  v.result.reasons,
        warnings: v.result.warnings,
      }])
    ),
    inputData
  })

  // Step 6: Store scorecard
  const scorecardId = uuidv4()
  await pool.query(`
    INSERT INTO loan_scorecards (
      id, user_id, loan_product,
      requested_amount_paise, requested_tenure_months,
      composite_score, decision, decision_reasons,
      conditions, max_eligible_paise,
      recommended_tenure_months,
      recommended_rate_min_pct, recommended_rate_max_pct,

      score_asset_strength, score_income_stability,
      score_liability_burden, score_liquidity,
      score_land_collateral, score_behavioral,
      score_nominee_compliance, score_fraud_risk,

      weight_asset_strength, weight_income_stability,
      weight_liability_burden, weight_liquidity,
      weight_land_collateral, weight_behavioral,
      weight_nominee_compliance, weight_fraud_risk,

      total_assets_paise, monthly_income_paise,
      monthly_obligations_paise, liquid_assets_paise,
      land_value_paise, clear_title_land_paise,
      net_worth_paise,

      ai_summary, ai_strengths, ai_weaknesses,
      ai_risk_flags, ai_lender_notes,

      score_model_version
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
      $14,$15,$16,$17,$18,$19,$20,$21,
      $22,$23,$24,$25,$26,$27,$28,$29,
      $30,$31,$32,$33,$34,$35,$36,
      $37,$38,$39,$40,$41,
      'v1.0'
    )
  `, [
    scorecardId, userId, loanProduct,
    requestedAmountPaise, requestedTenureMonths,
    compositeScore, decision, decisionReasons,
    conditions, maxEligiblePaise,
    recommendedTenureMonths, rateMin, rateMax,

    assetResult.score,   incomeResult.score,
    liabilityResult.score,liquidityResult.score,
    landResult.score,    behaviorResult.score,
    nomineeResult.score, fraudResult.score,

    WEIGHTS.asset_strength,    WEIGHTS.income_stability,
    WEIGHTS.liability_burden,  WEIGHTS.liquidity,
    WEIGHTS.land_collateral,   WEIGHTS.behavioral,
    WEIGHTS.nominee_compliance,WEIGHTS.fraud_risk,

    assetResult.data.totalAssets,
    incomeResult.data.avgMonthlyIncomePaise,
    incomeResult.data.monthlyObligationsPaise,
    liquidityResult.data.instantLiquidPaise,
    landResult.data.totalLandValuePaise,
    landResult.data.clearTitleValuePaise,
    assetResult.data.totalAssets -
      liabilityResult.data.monthlyEMIBurdenPaise * 12,

    aiResult.summary, aiResult.strengths,
    aiResult.weaknesses, aiResult.riskFlags,
    aiResult.lenderNotes
  ])

  // Store in score history
  await pool.query(`
    INSERT INTO loan_score_history (
      user_id, scorecard_id, composite_score, decision, loan_product
    ) VALUES ($1,$2,$3,$4,$5)
  `, [userId, scorecardId, compositeScore, decision, loanProduct])

  await auditLogger.log(
    userId,
    'LOAN_ELIGIBILITY_ASSESSED',
    'loan_scorecard',
    scorecardId,
    undefined,
    undefined,
    { compositeScore, decision, loanProduct }
  )

  return {
    scorecardId,
    compositeScore,
    decision,
    decisionReasons,
    conditions,
    maxEligiblePaise,
    recommendedTenureMonths,
    recommendedRateMinPct:    rateMin,
    recommendedRateMaxPct:    rateMax,
    dimensions:               Object.fromEntries(
      Object.entries(dimensions).map(([k, v]) => [k, {
        score:    v.result.score,
        weight:   v.weight,
        reasons:  v.result.reasons,
        warnings: v.result.warnings,
        data:     v.result.data,
      }])
    ),
    aiSummary:    aiResult.summary,
    aiStrengths:  aiResult.strengths,
    aiWeaknesses: aiResult.weaknesses,
    aiRiskFlags:  aiResult.riskFlags,
    aiLenderNotes:aiResult.lenderNotes,
    generatedAt:  new Date().toISOString()
  }
}

// Simple rule evaluator — evaluates condition against data object
function evalRule(
  condition: string,
  data: Record<string, number>
): boolean {
  try {
    const sanitised = condition.replace(/[^a-z0-9_\s><=!.*+\-()]/gi, '')
    const fn = new Function(...Object.keys(data), `return ${sanitised}`)
    return fn(...Object.values(data))
  } catch {
    return false
  }
}
