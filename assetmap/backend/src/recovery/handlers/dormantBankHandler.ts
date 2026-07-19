// ═══════════════════════════════════════════════════════════════
// Dormant Bank Handler — Reactivation of Dormant Bank Accounts
// RBI Master Circular on Inoperative Accounts
// ═══════════════════════════════════════════════════════════════

import { RECOVERY_CONFIGS } from '../types/recoveryTypes'

export const dormantBankHandler = {

  getProcessingSteps() {
    const config = RECOVERY_CONFIGS['dormant_bank']
    return {
      type:          'dormant_bank' as const,
      label:         config.label,
      steps:         config.steps,
      legalBasis:    config.legalBasis,
      estimatedDays: config.avgDaysToComplete,
      rbiGuidelines: [
        'Banks cannot levy penalty for reactivation of inoperative accounts',
        'No minimum balance required for reactivation',
        'Bank must reactivate within 7 working days of receiving KYC documents',
        'If account has been transferred to DEAF (Depositor Education and Awareness Fund), recovery through RBI portal',
      ],
      deafNote:
        'If the dormant balance has been transferred to RBI\'s DEAF fund, ' +
        'the recovery timeline is longer (30–60 days). We will determine ' +
        'this during the initial assessment.',
    }
  },

  validateSubmission(caseData: {
    bankName?:       string
    accountNumber?:  string
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!caseData.bankName) {
      errors.push('Bank name is required')
    }
    if (!caseData.accountNumber) {
      errors.push('Account number is required')
    }
    return { valid: errors.length === 0, errors }
  }
}
