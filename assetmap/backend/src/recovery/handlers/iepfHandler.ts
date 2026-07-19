// ═══════════════════════════════════════════════════════════════
// IEPF Handler — Unclaimed Shares & Dividends Recovery
// Section 125(3)(a) Companies Act 2013
// ═══════════════════════════════════════════════════════════════

import { RecoveryType, RECOVERY_CONFIGS } from '../types/recoveryTypes'

export const iepfHandler = {

  /**
   * Get IEPF-specific processing instructions.
   */
  getProcessingSteps(recoveryType: 'iepf_shares' | 'iepf_dividend') {
    const config = RECOVERY_CONFIGS[recoveryType]
    return {
      type:        recoveryType,
      label:       config.label,
      steps:       config.steps,
      legalBasis:  config.legalBasis,
      govPortalUrl:config.govPortalUrl,
      estimatedDays: config.avgDaysToComplete,

      // IEPF-specific details
      formRequired:  'Form IEPF-5',
      filingPortal:  'https://www.mca.gov.in/mcafoportal/login.do',
      physicalDocs: [
        'Self-attested copies of all uploaded documents',
        'Original indemnity bond (notarized if amount > ₹10,000)',
        'Passport size photographs (2 copies)',
        'Advance stamped receipt',
      ],
      nodalOfficerNote:
        'Physical documents must be couriered to the Nodal Officer ' +
        'of the company/RTA within 15 days of online submission.',
      srnTracking:
        'Track your claim using the SRN number at ' +
        'https://www.iepf.gov.in/IEPF/refund.html',
    }
  },

  /**
   * Validate IEPF-specific fields before submission.
   */
  validateSubmission(caseData: {
    folioNumber?:    string
    dematId?:        string
    companyName?:    string
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!caseData.dematId) {
      errors.push('Demat account number is required for IEPF claims')
    }
    if (!caseData.companyName) {
      errors.push('Company name is required')
    }

    return { valid: errors.length === 0, errors }
  }
}
