import { Pool } from 'pg'
import { auditLogger } from './auditLogger'

// Standard Indian lending formulas
// FOIR (Fixed Obligation to Income Ratio): max 50–65% for most banks
// LTV (Loan to Value):
//   Home loan: max 75–90% of property value
//   LAP:       max 50–60% of property value
// Personal loan: 20–30× monthly income, max ₹25L for salaried

const MAX_FOIR              = 0.55   // 55% — conservative
const HOME_LOAN_LTV         = 0.75   // 75% of property value
const LAP_LTV               = 0.50   // 50% of property value
const PERSONAL_LOAN_MULTIPLIER = 24  // 24× monthly income
const PERSONAL_LOAN_MAX_PAISE  = 2500000_00  // ₹25L max

// Standard interest rates and tenures for EMI calculation (estimates)
const HOME_LOAN_RATE = 0.085; // 8.5%
const HOME_LOAN_TENURE = 20 * 12; // 20 years

const LAP_RATE = 0.105; // 10.5%
const LAP_TENURE = 15 * 12; // 15 years

const PERSONAL_LOAN_RATE = 0.12; // 12%
const PERSONAL_LOAN_TENURE = 5 * 12; // 5 years

interface LoanEligibilityResult {
  monthlyIncomePaise:       number
  monthlyObligationsPaise:  number
  availableEMIPaise:        number
  foir:                     number
  homeLoanMaxPaise:         number
  lapMaxPaise:              number
  personalLoanMaxPaise:     number
  homeLoanEMI:              number
  lapEMI:                   number
  personalLoanEMI:          number
  eligibilityBand:          'high' | 'medium' | 'low'
  lendersShown:             any[]
}

function calculateEMI(principal: number, annualRate: number, months: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const emi = principal * r * (Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi);
}

function calculateMaxLoanFromEMI(emi: number, annualRate: number, months: number): number {
  if (emi <= 0) return 0;
  const r = annualRate / 12;
  const principal = emi * (Math.pow(1 + r, months) - 1) / (r * Math.pow(1 + r, months));
  return Math.round(principal);
}

export const loanEligibility = {
  async assessEligibility(
    pool: Pool,
    userId: string,
    inputs: {
      monthlyIncomePaise: number;
      monthlyObligationsPaise: number;
      totalAssetsPaise: number;
      totalLandValuePaise: number;
      existingLoansPaise: number;
      creditScoreApprox: number;
    }
  ): Promise<LoanEligibilityResult> {
    
    const {
      monthlyIncomePaise,
      monthlyObligationsPaise,
      totalAssetsPaise,
      totalLandValuePaise,
      existingLoansPaise,
      creditScoreApprox
    } = inputs;

    // FOIR calculation
    const currentFOIR = monthlyIncomePaise > 0 ? monthlyObligationsPaise / monthlyIncomePaise : 1;
    const maxAllowedEMI = Math.max(0, (monthlyIncomePaise * MAX_FOIR) - monthlyObligationsPaise);

    // Calculate Home Loan Max (constrained by both LTV and FOIR)
    let homeLoanMaxPaise = Math.min(
      totalLandValuePaise * HOME_LOAN_LTV,
      calculateMaxLoanFromEMI(maxAllowedEMI, HOME_LOAN_RATE, HOME_LOAN_TENURE)
    );

    // Calculate LAP Max
    let lapMaxPaise = Math.min(
      totalLandValuePaise * LAP_LTV,
      calculateMaxLoanFromEMI(maxAllowedEMI, LAP_RATE, LAP_TENURE)
    );

    // Calculate Personal Loan Max
    let personalLoanMaxPaise = Math.min(
      monthlyIncomePaise * PERSONAL_LOAN_MULTIPLIER,
      PERSONAL_LOAN_MAX_PAISE,
      calculateMaxLoanFromEMI(maxAllowedEMI, PERSONAL_LOAN_RATE, PERSONAL_LOAN_TENURE)
    );

    // If credit score is poor, reduce or zero out eligibility
    if (creditScoreApprox < 650) {
      personalLoanMaxPaise = 0;
    }
    if (creditScoreApprox < 600) {
      homeLoanMaxPaise = 0;
      lapMaxPaise = 0;
    }

    // Determine band
    let eligibilityBand: 'high' | 'medium' | 'low' = 'low';
    if (creditScoreApprox >= 750 && currentFOIR < 0.4) {
      eligibilityBand = 'high';
    } else if (creditScoreApprox >= 650 && currentFOIR < 0.55) {
      eligibilityBand = 'medium';
    }

    // Fetch suitable lenders from DB
    const lendersResult = await pool.query(
      `SELECT * FROM loan_lenders WHERE is_active = true AND min_cibil_score <= $1 ORDER BY min_rate_pct ASC LIMIT 5`,
      [creditScoreApprox]
    );
    const lendersShown = lendersResult.rows;

    // Save assessment
    await pool.query(`
      INSERT INTO loan_assessments (
        user_id, monthly_income_paise, monthly_obligations_paise,
        total_assets_paise, total_land_value_paise, existing_loans_paise,
        credit_score_approx, home_loan_max_paise, lap_max_paise,
        personal_loan_max_paise, foir, ltv_ratio, lenders_shown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      userId, monthlyIncomePaise, monthlyObligationsPaise,
      totalAssetsPaise, totalLandValuePaise, existingLoansPaise,
      creditScoreApprox, homeLoanMaxPaise, lapMaxPaise,
      personalLoanMaxPaise, currentFOIR, 0, JSON.stringify(lendersShown)
    ]);

    await auditLogger.log(
      userId,
      'LOAN_ELIGIBILITY_ASSESSED' as any,
      'loan_assessments',
      undefined,
      undefined,
      undefined,
      { band: eligibilityBand, creditScore: creditScoreApprox }
    );

    return {
      monthlyIncomePaise,
      monthlyObligationsPaise,
      availableEMIPaise: maxAllowedEMI,
      foir: currentFOIR,
      homeLoanMaxPaise,
      lapMaxPaise,
      personalLoanMaxPaise,
      homeLoanEMI: calculateEMI(homeLoanMaxPaise, HOME_LOAN_RATE, HOME_LOAN_TENURE),
      lapEMI: calculateEMI(lapMaxPaise, LAP_RATE, LAP_TENURE),
      personalLoanEMI: calculateEMI(personalLoanMaxPaise, PERSONAL_LOAN_RATE, PERSONAL_LOAN_TENURE),
      eligibilityBand,
      lendersShown
    };
  }
}
