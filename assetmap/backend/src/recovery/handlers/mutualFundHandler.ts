// ═══════════════════════════════════════════════════════════════
// Mutual Fund Handler — Unclaimed Redemption & Dividend Recovery
// SEBI MF Regulations 1996
// ═══════════════════════════════════════════════════════════════

import { RECOVERY_CONFIGS } from '../types/recoveryTypes'

export const mutualFundHandler = {

  getProcessingSteps() {
    const config = RECOVERY_CONFIGS['mutual_fund']
    return {
      type:          'mutual_fund' as const,
      label:         config.label,
      steps:         config.steps,
      legalBasis:    config.legalBasis,
      govPortalUrl:  config.govPortalUrl,
      estimatedDays: config.avgDaysToComplete,
      registrars: [
        { name: 'CAMS', url: 'https://www.camsonline.com', amc: 'HDFC, SBI, Kotak, Axis, L&T, Nippon' },
        { name: 'KFintech', url: 'https://www.kfintech.com', amc: 'Aditya Birla, ICICI Pru, Sundaram, UTI' },
      ],
      kycNote:
        'If your KYC is outdated (pre-2012 or missing Aadhaar), ' +
        'we will submit a KYC modification form along with your claim.',
    }
  },

  validateSubmission(caseData: {
    folioNumber?: string
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!caseData.folioNumber) {
      errors.push('Folio number is required for mutual fund claims')
    }
    return { valid: errors.length === 0, errors }
  }
}
