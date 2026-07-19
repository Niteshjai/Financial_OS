// ═══════════════════════════════════════════════════════════════
// EPF Handler — Unclaimed Provident Fund & Pension Recovery
// Employees Provident Funds Act 1952
// ═══════════════════════════════════════════════════════════════

import { RECOVERY_CONFIGS } from '../types/recoveryTypes'

export const epfHandler = {

  getProcessingSteps(recoveryType: 'epf_balance' | 'epf_pension') {
    const config = RECOVERY_CONFIGS[recoveryType]
    return {
      type:          recoveryType,
      label:         config.label,
      steps:         config.steps,
      legalBasis:    config.legalBasis,
      govPortalUrl:  config.govPortalUrl,
      estimatedDays: config.avgDaysToComplete,
      formRequired:  recoveryType === 'epf_balance'
        ? 'Composite Claim Form (Form 19 + 10C)'
        : 'Form 10C (Pension Withdrawal)',
      prerequisites: [
        'UAN must be activated on EPFO portal',
        'Aadhaar must be linked and verified on UAN',
        'Bank account must be linked to UAN',
        'Date of exit must be updated by employer',
      ],
      tdsNote:
        'If total EPF service is less than 5 years, TDS at 10% will be ' +
        'deducted (or 20% if PAN is not linked). Submit Form 15G/15H ' +
        'to avoid TDS if total income is below taxable limit.',
    }
  },

  validateSubmission(caseData: {
    uanNumber?: string
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!caseData.uanNumber) {
      errors.push('UAN number is required for EPF/EPS claims')
    }
    return { valid: errors.length === 0, errors }
  }
}
