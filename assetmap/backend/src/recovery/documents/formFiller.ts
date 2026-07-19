// ═══════════════════════════════════════════════════════════════
// Form Filler — Auto-fill government form fields from case data
// ═══════════════════════════════════════════════════════════════

import { RecoveryType, RECOVERY_CONFIGS } from '../types/recoveryTypes'

export interface FormFieldData {
  formName:    string
  formUrl:     string
  fields:      Record<string, string>
  instructions:string[]
}

export const formFiller = {

  /**
   * Generate pre-filled form data for the given recovery type.
   * Used to guide users or auto-fill PDF forms.
   */
  generateFormData(
    recoveryType: RecoveryType,
    caseData: {
      fullName?:        string
      fatherName?:      string
      address?:         string
      panNumber?:       string
      aadhaarNumber?:   string
      bankName?:        string
      bankAccountNo?:   string
      ifscCode?:        string
      dematId?:         string
      folioNumber?:     string
      companyName?:     string
      claimAmount?:     number
    }
  ): FormFieldData {
    const config = RECOVERY_CONFIGS[recoveryType]

    switch (recoveryType) {
      case 'iepf_shares':
      case 'iepf_dividend':
        return {
          formName:    'Form IEPF-5 — Claim for Refund',
          formUrl:     'https://www.iepf.gov.in/IEPF/refund.html',
          fields: {
            'Name of the Claimant':   caseData.fullName ?? '',
            'Father/Husband Name':    caseData.fatherName ?? '',
            'Address':                caseData.address ?? '',
            'PAN':                    caseData.panNumber ?? '',
            'Aadhaar':                caseData.aadhaarNumber ?? '',
            'Bank Name':              caseData.bankName ?? '',
            'Bank Account No':        caseData.bankAccountNo ?? '',
            'IFSC Code':              caseData.ifscCode ?? '',
            'Demat Account No':       caseData.dematId ?? '',
            'Company Name':           caseData.companyName ?? '',
            'Folio Number':           caseData.folioNumber ?? '',
            'Amount Claimed':         caseData.claimAmount?.toString() ?? '',
          },
          instructions: [
            'Visit https://www.iepf.gov.in/IEPF/refund.html',
            'Select "Claim for refund of shares/dividend"',
            'Fill in the form with the above details',
            'Upload required documents as listed in your checklist',
            'Submit and note the SRN number',
            'Print the acknowledgement and attach to physical documents',
          ]
        }

      case 'epf_balance':
      case 'epf_pension':
        return {
          formName:    'Composite Claim Form (Form 19 + 10C)',
          formUrl:     'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
          fields: {
            'Name':                caseData.fullName ?? '',
            'UAN':                 '',  // User provides
            'PAN':                 caseData.panNumber ?? '',
            'Aadhaar':             caseData.aadhaarNumber ?? '',
            'Bank Account No':     caseData.bankAccountNo ?? '',
            'IFSC Code':           caseData.ifscCode ?? '',
          },
          instructions: [
            'Log in to EPFO Member Portal with UAN and password',
            'Go to Online Services → Claim (Form 31, 19, 10C & 10D)',
            'Verify KYC details and bank account',
            'Select "Full EPF Settlement" for Form 19',
            'Select "Pension Withdrawal" for Form 10C (if applicable)',
            'Enter PAN for TDS exemption (if service > 5 years)',
            'Submit claim — processing takes 10–20 days',
          ]
        }

      case 'mutual_fund':
        return {
          formName:    'Unclaimed Amount Claim Form',
          formUrl:     'https://www.camsonline.com',
          fields: {
            'Name':             caseData.fullName ?? '',
            'PAN':              caseData.panNumber ?? '',
            'Folio Number':     caseData.folioNumber ?? '',
            'Bank Name':        caseData.bankName ?? '',
            'Account Number':   caseData.bankAccountNo ?? '',
            'IFSC':             caseData.ifscCode ?? '',
          },
          instructions: [
            'Contact the AMC or visit CAMS/KFintech portal',
            'Submit KYC update with new Aadhaar, PAN, and bank details',
            'Request unclaimed amount claim form from the AMC',
            'Fill in folio number and updated bank details',
            'Submit with self-attested KYC documents',
            'AMC credits amount within 30–45 days',
          ]
        }

      case 'dormant_bank':
        return {
          formName:    'Dormant Account Reactivation Form',
          formUrl:     '',
          fields: {
            'Name':                caseData.fullName ?? '',
            'Account Number':      caseData.bankAccountNo ?? '',
            'Bank':                caseData.bankName ?? '',
            'PAN':                 caseData.panNumber ?? '',
            'Aadhaar':             caseData.aadhaarNumber ?? '',
          },
          instructions: [
            'Visit your bank branch with KYC documents',
            'Request dormant account reactivation form',
            'Submit filled form with Aadhaar, PAN, and passport photo',
            'Bank processes reactivation within 7–14 days',
            'Once active, transfer balance to your primary account',
          ]
        }

      default:
        return {
          formName:    config.label,
          formUrl:     config.govPortalUrl,
          fields:      {},
          instructions:config.steps,
        }
    }
  }
}
