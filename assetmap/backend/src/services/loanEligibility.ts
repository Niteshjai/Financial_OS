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

export const loanEligibility = {
  async assessEligibility(pool: Pool, userId: string, params: {
    monthlyIncomePaise: number,
    monthlyObligationsPaise: number,
    totalAssetsPaise: number,
    totalLandValuePaise: number,
    existingLoansPaise: number,
    creditScoreApprox: number
  }): Promise<LoanEligibilityResult> {
    // 1. Calculate available EMI (FOIR)
    const maxEmiAllowed = params.monthlyIncomePaise * MAX_FOIR;
    const availableEmi = Math.max(0, maxEmiAllowed - params.monthlyObligationsPaise);
    
    // 2. Home Loan calculation (Assume 9% interest for 20 years -> ~899 EMI per lakh)
    const homeLoanFromIncome = (availableEmi / 899) * 100000;
    // We don't have target property value, so max out on income
    const homeLoanMaxPaise = homeLoanFromIncome;

    // 3. LAP calculation (Assume 10.5% interest for 15 years -> ~1105 EMI per lakh)
    const lapFromIncome = (availableEmi / 1105) * 100000;
    const lapFromProperty = params.totalLandValuePaise * LAP_LTV;
    const lapMaxPaise = Math.min(lapFromIncome, lapFromProperty);

    // 4. Personal Loan calculation (Assume 12% interest for 5 years -> ~2224 EMI per lakh)
    const plFromIncome = (availableEmi / 2224) * 100000;
    const plMaxPaise = Math.min(plFromIncome, params.monthlyIncomePaise * PERSONAL_LOAN_MULTIPLIER, PERSONAL_LOAN_MAX_PAISE);

    // 5. Build lenders mock
    const lendersShown = [
      { name: 'HDFC Bank', min_rate_pct: 8.7, max_loan_paise: 5000000000, type: 'bank', logo_url: 'https://logo.clearbit.com/hdfcbank.com' },
      { name: 'Bajaj Finserv', min_rate_pct: 11.5, max_loan_paise: 3500000000, type: 'nbfc', logo_url: 'https://logo.clearbit.com/bajajfinserv.in' }
    ];

    const foir = params.monthlyObligationsPaise / params.monthlyIncomePaise;
    const eligibilityBand = foir < 0.4 ? 'high' : foir < 0.5 ? 'medium' : 'low';

    // 6. Save assessment
    await pool.query(`
      INSERT INTO loan_assessments (
        user_id, monthly_income_paise, monthly_obligations_paise,
        total_assets_paise, total_land_value_paise, existing_loans_paise,
        credit_score_approx, home_loan_max_paise, lap_max_paise, personal_loan_max_paise,
        foir, lenders_shown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      userId, params.monthlyIncomePaise, params.monthlyObligationsPaise,
      params.totalAssetsPaise, params.totalLandValuePaise, params.existingLoansPaise,
      params.creditScoreApprox, homeLoanMaxPaise, lapMaxPaise, plMaxPaise,
      foir, JSON.stringify(lendersShown)
    ]);

    await auditLogger.log(
      userId,
      'LOAN_ELIGIBILITY_ASSESSED' as 'LOAN_ELIGIBILITY_ASSESSED',
      'loan_assessments',
      undefined,
      undefined,
      undefined,
      { eligibilityBand, foir }
    )

    return {
      monthlyIncomePaise: params.monthlyIncomePaise,
      monthlyObligationsPaise: params.monthlyObligationsPaise,
      availableEMIPaise: availableEmi,
      foir,
      homeLoanMaxPaise,
      lapMaxPaise,
      personalLoanMaxPaise: plMaxPaise,
      homeLoanEMI: availableEmi,
      lapEMI: availableEmi,
      personalLoanEMI: availableEmi,
      eligibilityBand,
      lendersShown
    };
  }
};
