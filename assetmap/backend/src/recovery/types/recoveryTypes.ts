// ═══════════════════════════════════════════════════════════════
// Recovery Engine — Type Definitions & Configuration
// All recovery types, statuses, document requirements, and fee logic
// ═══════════════════════════════════════════════════════════════

export type RecoveryType =
  | 'iepf_shares'
  | 'iepf_dividend'
  | 'epf_balance'
  | 'epf_pension'
  | 'mutual_fund'
  | 'dormant_bank'
  | 'insurance_maturity'
  | 'ppf_balance'

export type RecoveryStatus =
  | 'pending_agreement'
  | 'agreement_signed'
  | 'documents_collecting'
  | 'documents_complete'
  | 'submitted'
  | 'under_review'
  | 'additional_docs_needed'
  | 'approved'
  | 'amount_credited'
  | 'fee_collected'
  | 'completed'
  | 'rejected'
  | 'withdrawn'

export interface DocumentRequirement {
  docType:             string
  label:               string
  description:         string
  isRequired:          boolean
  canAutoFetch:        boolean
  digilockerDocType?:  string
  helpText:            string
}

export interface RecoveryTypeConfig {
  type:              RecoveryType
  label:             string
  description:       string
  avgDaysToComplete: number
  minDays:           number
  maxDays:           number
  successRatePct:    number
  feeMin:            number
  feeMax:            number
  documents:         DocumentRequirement[]
  steps:             string[]
  legalBasis:        string
  govPortalUrl:      string
}

export interface RecoveryCase {
  id:                    string
  userId:                string
  recoveryType:          RecoveryType
  assetDescription:      string
  institutionName?:      string
  status:                RecoveryStatus
  estimatedValuePaise:   number
  confirmedValuePaise?:  number
  recoveredValuePaise?:  number
  feePct:                number
  feeAmountPaise?:       number
  estimatedCompletion?:  string
  submittedAt?:          string
  completedAt?:          string
  createdAt:             string
  docsTotal?:            number
  docsReceived?:         number
}

export interface RecoveryDocument {
  id:           string
  caseId:       string
  docType:      string
  docLabel:     string
  isRequired:   boolean
  isReceived:   boolean
  isVerified:   boolean
  fileName?:    string
  uploadedAt?:  string
  autoFetched:  boolean
  notes?:       string
}

export interface RecoveryTimelineEntry {
  title:        string
  description?: string
  toStatus:     string
  createdAt:    string
}

export interface FeeCalculation {
  feePct:          number
  feeAmountPaise:  number
  gstPaise:        number
  totalPaise:      number
}

// ─────────────────────────────────────────────
// Legal Disclaimer — MUST appear on every recovery page
// ─────────────────────────────────────────────
export const LEGAL_DISCLAIMER =
  'AssetMap Recovery Services assists with document preparation and ' +
  'submission tracking. We do not provide legal advice. Recovery is ' +
  'subject to government processing timelines outside our control. ' +
  'Success fee is charged only on confirmed credit to your account.'

// ─────────────────────────────────────────────
// Complete config for each recovery type
// ─────────────────────────────────────────────
export const RECOVERY_CONFIGS: Record<RecoveryType, RecoveryTypeConfig> = {

  iepf_shares: {
    type:              'iepf_shares',
    label:             'Unclaimed Shares (IEPF)',
    description:       'Recover shares transferred to IEPF after 7 years',
    avgDaysToComplete: 630,
    minDays:           180,
    maxDays:           900,
    successRatePct:    78,
    feeMin:            7,
    feeMax:            10,
    govPortalUrl:      'https://www.iepf.gov.in/IEPF/refund.html',
    legalBasis:        'Section 125(3)(a) Companies Act 2013, IEPF Rules 2016',
    steps: [
      'Obtain entitlement letter from company / RTA',
      'File Form IEPF-5 on MCA portal',
      'Generate SRN tracking number',
      'Courier physical documents to company nodal officer',
      'Company submits e-verification to IEPF within 30 days',
      'IEPF authority review (up to 21 months)',
      'Shares credited to demat account + dividends to bank'
    ],
    documents: [
      { docType:'aadhaar_front',     label:'Aadhaar card (front)',         description:'Self-attested copy',                           isRequired:true,  canAutoFetch:true,  digilockerDocType:'ADHAR', helpText:'Will auto-fetch from DigiLocker' },
      { docType:'pan_card',          label:'PAN card',                     description:'Self-attested copy',                           isRequired:true,  canAutoFetch:true,  digilockerDocType:'PANCR', helpText:'Will auto-fetch from DigiLocker' },
      { docType:'cancelled_cheque',  label:'Cancelled cheque',             description:'Bank account where amount will be credited',   isRequired:true,  canAutoFetch:false, helpText:'Upload photo of cancelled cheque leaf' },
      { docType:'demat_statement',   label:'Demat account statement',      description:'16-digit Demat ID + Client ID required',      isRequired:true,  canAutoFetch:false, helpText:'Download from your broker app' },
      { docType:'share_certificate', label:'Original share certificate',   description:'If shares were in physical form',              isRequired:false, canAutoFetch:false, helpText:'Required only for physical shares' },
      { docType:'indemnity_bond',    label:'Indemnity bond',               description:'Required if amount > ₹10,000',                isRequired:true,  canAutoFetch:false, helpText:'We provide the template — you sign and upload' },
      { docType:'passport_photo',    label:'Passport size photo (2 copies)',description:'Recent photograph',                           isRequired:true,  canAutoFetch:false, helpText:'Plain background, recent photo' },
    ]
  },

  iepf_dividend: {
    type:              'iepf_dividend',
    label:             'Unclaimed Dividends (IEPF)',
    description:       'Recover unclaimed dividends transferred to IEPF',
    avgDaysToComplete: 630,
    minDays:           180,
    maxDays:           900,
    successRatePct:    82,
    feeMin:            7,
    feeMax:            10,
    govPortalUrl:      'https://www.iepf.gov.in/IEPF/refund.html',
    legalBasis:        'Section 125(3)(a) Companies Act 2013',
    steps: [
      'Verify dividend amount on IEPF website',
      'File Form IEPF-5 on MCA portal',
      'Send physical documents to company nodal officer',
      'Company e-verification within 30 days',
      'IEPF approval and bank credit'
    ],
    documents: [
      { docType:'aadhaar_front',     label:'Aadhaar card',           description:'Self-attested', isRequired:true,  canAutoFetch:true,  digilockerDocType:'ADHAR', helpText:'Auto-fetch from DigiLocker' },
      { docType:'pan_card',          label:'PAN card',               description:'Self-attested', isRequired:true,  canAutoFetch:true,  digilockerDocType:'PANCR', helpText:'Auto-fetch from DigiLocker' },
      { docType:'cancelled_cheque',  label:'Cancelled cheque',       description:'Your bank',     isRequired:true,  canAutoFetch:false, helpText:'Upload photo' },
      { docType:'indemnity_bond',    label:'Indemnity bond',         description:'Signed',        isRequired:true,  canAutoFetch:false, helpText:'Template provided by us' },
      { docType:'passport_photo',    label:'Passport photo',         description:'2 copies',      isRequired:true,  canAutoFetch:false, helpText:'Recent, plain background' },
    ]
  },

  epf_balance: {
    type:              'epf_balance',
    label:             'Unclaimed EPF Balance',
    description:       'Recover unclaimed provident fund from previous employer',
    avgDaysToComplete: 20,
    minDays:           10,
    maxDays:           45,
    successRatePct:    91,
    feeMin:            5,
    feeMax:            7,
    govPortalUrl:      'https://unifiedportal-mem.epfindia.gov.in',
    legalBasis:        'Employees Provident Funds Act 1952',
    steps: [
      'Activate UAN on EPFO portal (if inactive)',
      'Link Aadhaar + PAN + bank to UAN',
      'Update date of exit from previous employer',
      'File Composite Claim Form online (Form 19 + 10C)',
      'EPFO processes within 10–20 days',
      'Amount credited to bank account'
    ],
    documents: [
      { docType:'aadhaar_front',     label:'Aadhaar (for UAN linking)',   description:'Must match UAN records',    isRequired:true,  canAutoFetch:true,  digilockerDocType:'ADHAR', helpText:'Auto-fetch from DigiLocker' },
      { docType:'pan_card',          label:'PAN card',                    description:'For TDS purposes',          isRequired:true,  canAutoFetch:true,  digilockerDocType:'PANCR', helpText:'Auto-fetch from DigiLocker' },
      { docType:'cancelled_cheque',  label:'Cancelled cheque',            description:'Bank account for transfer', isRequired:true,  canAutoFetch:false, helpText:'Must match bank linked to UAN' },
      { docType:'bank_passbook',     label:'Bank passbook first page',    description:'Account details visible',   isRequired:false, canAutoFetch:false, helpText:'If cancelled cheque not available' },
    ]
  },

  epf_pension: {
    type:              'epf_pension',
    label:             'Unclaimed EPS Pension',
    description:       'Withdraw employee pension scheme balance',
    avgDaysToComplete: 25,
    minDays:           15,
    maxDays:           60,
    successRatePct:    88,
    feeMin:            5,
    feeMax:            7,
    govPortalUrl:      'https://unifiedportal-mem.epfindia.gov.in',
    legalBasis:        'Employees Pension Scheme 1995',
    steps: [
      'Confirm EPS balance and eligibility',
      'Link Aadhaar + bank to UAN',
      'File Form 10C online (pension withdrawal)',
      'EPFO processes within 15–30 days',
      'Pension certificate or lump sum credited'
    ],
    documents: [
      { docType:'aadhaar_front',   label:'Aadhaar card',     description:'UAN linked', isRequired:true,  canAutoFetch:true,  digilockerDocType:'ADHAR', helpText:'Auto-fetch' },
      { docType:'pan_card',        label:'PAN card',         description:'TDS',        isRequired:true,  canAutoFetch:true,  digilockerDocType:'PANCR', helpText:'Auto-fetch' },
      { docType:'cancelled_cheque',label:'Cancelled cheque', description:'Bank',       isRequired:true,  canAutoFetch:false, helpText:'Upload photo' },
    ]
  },

  mutual_fund: {
    type:              'mutual_fund',
    label:             'Unclaimed Mutual Fund Redemption',
    description:       'Recover unclaimed redemption proceeds or dividends from AMC',
    avgDaysToComplete: 35,
    minDays:           21,
    maxDays:           60,
    successRatePct:    85,
    feeMin:            5,
    feeMax:            7,
    govPortalUrl:      'https://www.camsonline.com',
    legalBasis:        'SEBI MF Regulations 1996',
    steps: [
      'Identify unclaimed amount with AMC or CAMS/KFintech',
      'Submit KYC update if outdated',
      'Update bank account details with AMC',
      'Submit redemption/dividend claim form',
      'AMC processes and credits to updated bank'
    ],
    documents: [
      { docType:'aadhaar_front',   label:'Aadhaar card',       description:'KYC update', isRequired:true,  canAutoFetch:true,  digilockerDocType:'ADHAR', helpText:'Auto-fetch' },
      { docType:'pan_card',        label:'PAN card',           description:'KYC',        isRequired:true,  canAutoFetch:true,  digilockerDocType:'PANCR', helpText:'Auto-fetch' },
      { docType:'cancelled_cheque',label:'Cancelled cheque',   description:'New bank',   isRequired:true,  canAutoFetch:false, helpText:'Upload photo' },
      { docType:'mf_statement',    label:'MF account statement',description:'Folio no.', isRequired:true,  canAutoFetch:false, helpText:'Download from AMC or CAMS' },
    ]
  },

  dormant_bank: {
    type:              'dormant_bank',
    label:             'Dormant Bank Account',
    description:       'Reactivate and recover balance from dormant bank account',
    avgDaysToComplete: 10,
    minDays:           7,
    maxDays:           21,
    successRatePct:    94,
    feeMin:            5,
    feeMax:            5,
    govPortalUrl:      '',
    legalBasis:        'RBI Master Circular on Inoperative Accounts',
    steps: [
      'Identify bank and branch of dormant account',
      'Submit reactivation request with KYC documents',
      'Bank verifies identity and activates account',
      'Transfer balance to active account'
    ],
    documents: [
      { docType:'aadhaar_front',   label:'Aadhaar card',     description:'KYC', isRequired:true,  canAutoFetch:true,  digilockerDocType:'ADHAR', helpText:'Auto-fetch' },
      { docType:'pan_card',        label:'PAN card',         description:'KYC', isRequired:true,  canAutoFetch:true,  digilockerDocType:'PANCR', helpText:'Auto-fetch' },
      { docType:'passport_photo',  label:'Passport photo',   description:'KYC', isRequired:true,  canAutoFetch:false, helpText:'Recent photo' },
      { docType:'cancelled_cheque',label:'Active bank cheque',description:'Transfer destination', isRequired:true,  canAutoFetch:false, helpText:'From your active account' },
    ]
  },

  insurance_maturity: {
    type:              'insurance_maturity',
    label:             'Unclaimed Insurance Maturity',
    description:       'Claim matured insurance policy amount from insurer',
    avgDaysToComplete: 45,
    minDays:           30,
    maxDays:           90,
    successRatePct:    87,
    feeMin:            5,
    feeMax:            7,
    govPortalUrl:      'https://insurancesamadhan.gov.in',
    legalBasis:        'IRDAI Regulations on Unclaimed Amounts',
    steps: [
      'Identify policy and maturity amount with insurer',
      'Submit claim with updated KYC and bank details',
      'Insurer processes the maturity claim',
      'Amount credited to bank account'
    ],
    documents: [
      { docType:'aadhaar_front',   label:'Aadhaar card',     description:'KYC', isRequired:true,  canAutoFetch:true,  digilockerDocType:'ADHAR', helpText:'Auto-fetch' },
      { docType:'pan_card',        label:'PAN card',         description:'KYC', isRequired:true,  canAutoFetch:true,  digilockerDocType:'PANCR', helpText:'Auto-fetch' },
      { docType:'cancelled_cheque',label:'Cancelled cheque', description:'Bank', isRequired:true,  canAutoFetch:false, helpText:'Upload photo' },
    ]
  },

  ppf_balance: {
    type:              'ppf_balance',
    label:             'Matured PPF Account',
    description:       'Withdraw matured Public Provident Fund balance',
    avgDaysToComplete: 14,
    minDays:           7,
    maxDays:           30,
    successRatePct:    96,
    feeMin:            5,
    feeMax:            5,
    govPortalUrl:      'https://www.indiapost.gov.in',
    legalBasis:        'PPF Scheme 2019',
    steps: [
      'Confirm maturity date and balance with bank/post office',
      'Submit Form-H (PPF withdrawal application)',
      'Bank/post office processes request',
      'Amount credited within 7–14 days'
    ],
    documents: [
      { docType:'aadhaar_front',   label:'Aadhaar card',        description:'KYC', isRequired:true,  canAutoFetch:true,  digilockerDocType:'ADHAR', helpText:'Auto-fetch' },
      { docType:'pan_card',        label:'PAN card',            description:'TDS', isRequired:true,  canAutoFetch:true,  digilockerDocType:'PANCR', helpText:'Auto-fetch' },
      { docType:'cancelled_cheque',label:'Cancelled cheque',    description:'Bank', isRequired:true,  canAutoFetch:false, helpText:'Upload photo' },
      { docType:'bank_passbook',   label:'PPF passbook',        description:'Account details', isRequired:true,  canAutoFetch:false, helpText:'Upload photo of PPF passbook' },
    ]
  }
}

// ─────────────────────────────────────────────
// Fee Calculator — Sliding scale by recovered amount
// ─────────────────────────────────────────────
export function calculateFee(
  recoveredPaise:  number,
  recoveryType:    RecoveryType
): FeeCalculation {
  const config = RECOVERY_CONFIGS[recoveryType]

  // Sliding fee scale — higher amounts get lower percentage
  let feePct: number
  if (recoveredPaise >= 10000000_00)       feePct = 5.0  // ₹1Cr+ → 5%
  else if (recoveredPaise >= 1000000_00)   feePct = 6.0  // ₹10L+ → 6%
  else if (recoveredPaise >= 100000_00)    feePct = 7.5  // ₹1L+ → 7.5%
  else if (recoveredPaise >= 10000_00)     feePct = 9.0  // ₹10K+ → 9%
  else                                     feePct = 10.0 // < ₹10K → 10%

  // Clamp within config bounds for the recovery type
  feePct = Math.max(config.feeMin, Math.min(config.feeMax, feePct))

  const feeAmountPaise = Math.round(recoveredPaise * feePct / 100)
  const gstPaise       = Math.round(feeAmountPaise * 0.18)  // 18% GST
  const totalPaise     = feeAmountPaise + gstPaise

  return { feePct, feeAmountPaise, gstPaise, totalPaise }
}

// ─────────────────────────────────────────────
// Status labels for UI display
// ─────────────────────────────────────────────
export const STATUS_LABELS: Record<RecoveryStatus, string> = {
  pending_agreement:     'Awaiting Agreement',
  agreement_signed:      'Agreement Signed',
  documents_collecting:  'Collecting Documents',
  documents_complete:    'Documents Complete',
  submitted:             'Submitted to Authority',
  under_review:          'Under Review',
  additional_docs_needed:'Additional Docs Needed',
  approved:              'Approved',
  amount_credited:       'Amount Credited',
  fee_collected:         'Fee Collected',
  completed:             'Completed',
  rejected:              'Rejected',
  withdrawn:             'Withdrawn',
}

export const STATUS_COLORS: Record<RecoveryStatus, string> = {
  pending_agreement:     'bg-amber-100 text-amber-800',
  agreement_signed:      'bg-blue-100 text-blue-800',
  documents_collecting:  'bg-orange-100 text-orange-800',
  documents_complete:    'bg-blue-100 text-blue-800',
  submitted:             'bg-indigo-100 text-indigo-800',
  under_review:          'bg-purple-100 text-purple-800',
  additional_docs_needed:'bg-red-100 text-red-800',
  approved:              'bg-emerald-100 text-emerald-800',
  amount_credited:       'bg-green-100 text-green-800',
  fee_collected:         'bg-green-100 text-green-800',
  completed:             'bg-green-100 text-green-800',
  rejected:              'bg-red-100 text-red-800',
  withdrawn:             'bg-zinc-100 text-zinc-600',
}
