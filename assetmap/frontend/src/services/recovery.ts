// ═══════════════════════════════════════════════════════════════
// Recovery Service — Frontend API client for recovery engine
// ═══════════════════════════════════════════════════════════════

import { api, type ApiResponse } from './api'

export interface RecoveryCaseResponse {
  id:                    string
  recovery_type:         string
  asset_description:     string
  institution_name:      string
  status:                string
  estimated_value_paise: number
  recovered_value_paise?: number
  fee_pct:               number
  fee_amount_paise:      number
  estimated_completion:  string
  submitted_at?:         string
  completed_at?:         string
  created_at:            string
  docs_total:            number
  docs_received:         number
  progress:              number
  estimate: {
    estimatedDate:  string | null
    daysRemaining:  number | null
    minDays:        number
    maxDays:        number
  }
  config: {
    label:          string
    successRatePct: number
  }
  legalDisclaimer: string
}

export interface RecoveryCaseDetail extends RecoveryCaseResponse {
  documents: {
    id:          string
    doc_type:    string
    doc_label:   string
    is_required: boolean
    is_received: boolean
    is_verified: boolean
    file_name?:  string
    uploaded_at?: string
    auto_fetched: boolean
    notes?:      string
  }[]
  docsComplete: number
  docsTotal:    number
  timeline: {
    title:       string
    description: string
    to_status:   string
    created_at:  string
  }[]
  feeDetails: {
    feePct:          number
    feeAmountPaise:  number
    gstPaise:        number
    totalPaise:      number
  }
  config: {
    label:             string
    avgDaysToComplete: number
    successRatePct:    number
    steps:             string[]
    govPortalUrl:      string
  }
}

export interface InitiateCaseResponse {
  caseId:        string
  feeDetails:    {
    feePct:          number
    feeAmountPaise:  number
    gstPaise:        number
    totalPaise:      number
  }
  config: {
    label:             string
    avgDaysToComplete: number
    successRatePct:    number
    steps:             string[]
    govPortalUrl:      string
  }
  agreementText: string
}

export interface RecoveryTypeConfig {
  type:              string
  label:             string
  description:       string
  avgDaysToComplete: number
  successRatePct:    number
  feeMin:            number
  feeMax:            number
  steps:             string[]
  documentsCount:    number
}

// ─── API Functions ───

export async function getRecoveryCases(): Promise<RecoveryCaseResponse[]> {
  const res = await api.get<ApiResponse<RecoveryCaseResponse[]>>('/recovery/cases')
  return res.data.data ?? []
}

export async function getRecoveryCaseDetail(caseId: string): Promise<RecoveryCaseDetail> {
  const res = await api.get<ApiResponse<RecoveryCaseDetail>>(`/recovery/cases/${caseId}`)
  return res.data.data!
}

export async function initiateRecoveryCase(params: {
  recoveryType:        string
  assetDescription:    string
  institutionName?:    string
  estimatedValuePaise: number
  folioNumber?:        string
  uanNumber?:          string
  accountNumber?:      string
}): Promise<InitiateCaseResponse> {
  const res = await api.post<ApiResponse<InitiateCaseResponse>>('/recovery/cases', params)
  return res.data.data!
}

export async function acceptFeeAgreement(caseId: string): Promise<void> {
  await api.post(`/recovery/cases/${caseId}/accept-fee`, {})
}

export async function uploadRecoveryDocument(
  caseId:  string,
  params: {
    docType:       string
    fileName:      string
    fileSizeBytes: number
    mimeType:      string
    s3Key?:        string
  }
): Promise<{ allDocumentsComplete: boolean }> {
  const res = await api.post<ApiResponse<{ allDocumentsComplete: boolean }>>(
    `/recovery/cases/${caseId}/documents`,
    params
  )
  return res.data.data!
}

export async function getRecoveryConfigs(): Promise<{
  configs:         RecoveryTypeConfig[]
  legalDisclaimer: string
}> {
  const res = await api.get<ApiResponse<{ configs: RecoveryTypeConfig[], legalDisclaimer: string }>>('/recovery/configs')
  return res.data.data!
}

export async function calculateRecoveryFee(
  estimatedValuePaise: number,
  recoveryType:        string
): Promise<{
  feePct:          number
  feeAmountPaise:  number
  gstPaise:        number
  totalPaise:      number
  legalDisclaimer: string
}> {
  const res = await api.post<ApiResponse<any>>('/recovery/calculate-fee', {
    estimatedValuePaise,
    recoveryType,
  })
  return res.data.data!
}

// ─── Formatting Helpers ───

export function formatPaise(paise: number): string {
  const rupees = paise / 100
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)} Cr`
  if (rupees >= 100000)   return `₹${(rupees / 100000).toFixed(2)} L`
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatRupees(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)} L`
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
