// ═══════════════════════════════════════════════════════════════
// AssetMap — Constants & Enums
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// Financial Information Types (AA framework)
// ─────────────────────────────────────────────

export const FI_TYPES = [
  'DEPOSIT',
  'EQUITY',
  'MUTUAL_FUND',
  'INSURANCE_POLICIES',
  'NPS',
  'GSTN',
  'LAND_RECORDS',
] as const;

export type FIType = (typeof FI_TYPES)[number];

// ─────────────────────────────────────────────
// Consent Status
// ─────────────────────────────────────────────

export const CONSENT_STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING'] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

// ─────────────────────────────────────────────
// Estate Case Status
// ─────────────────────────────────────────────

export const ESTATE_STATUSES = ['PENDING', 'VERIFIED', 'COMPLETE', 'REJECTED'] as const;
export type EstateStatus = (typeof ESTATE_STATUSES)[number];

// ─────────────────────────────────────────────
// Land Record Source
// ─────────────────────────────────────────────

export const LAND_SOURCES = ['SUREPASS', 'MANUAL'] as const;
export type LandSource = (typeof LAND_SOURCES)[number];

// ─────────────────────────────────────────────
// Audit Actions
// ─────────────────────────────────────────────

export const AUDIT_ACTIONS = [
  'AADHAAR_INITIATED',
  'AADHAAR_VERIFIED',
  'PHONE_OTP_INITIATED',
  'PHONE_VERIFIED',
  'LOGIN',
  'LOGOUT',
  'TOKEN_REFRESHED',
  'CONSENT_CREATED',
  'CONSENT_APPROVED',
  'CONSENT_REVOKED',
  'CONSENT_EXPIRED',
  'DATA_FETCHED',
  'DATA_REFRESHED',
  'LAND_SEARCH',
  'REPORT_GENERATED',
  'REPORT_DOWNLOADED',
  'ESTATE_FILED',
  'ESTATE_VERIFIED',
  'ESTATE_ASSETS_VIEWED',
  'AUDIT_LOG_VIEWED',
  'USER_DATA_DELETED',
  'INSURANCE_GAP_ANALYSED',
  'AFFILIATE_CLICK',
  'LAND_DATA_FETCHED',
  'LAND_RECORD_VIEWED',
  'LOAN_ELIGIBILITY_ASSESSED',
  'UNCLAIMED_SEARCH_COMPLETED',
  'WILL_CREATED',
  'WILL_PDF_GENERATED'
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// ─────────────────────────────────────────────
// FI Type Display Labels
// ─────────────────────────────────────────────

export const FI_TYPE_LABELS: Record<FIType, string> = {
  DEPOSIT: 'Bank Deposits',
  EQUITY: 'Stocks & Shares',
  MUTUAL_FUND: 'Mutual Funds',
  INSURANCE_POLICIES: 'Insurance Policies',
  NPS: 'National Pension System',
  GSTN: 'GST Records',
  LAND_RECORDS: 'Land Records',
};

// ─────────────────────────────────────────────
// API Response Envelope
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function errorResponse(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}

// ─────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────

export const ERROR_CODES = {
  // Auth
  INVALID_AADHAAR: 'AUTH_001',
  OTP_EXPIRED: 'AUTH_002',
  OTP_INVALID: 'AUTH_003',
  TOKEN_EXPIRED: 'AUTH_004',
  TOKEN_INVALID: 'AUTH_005',
  UNAUTHORIZED: 'AUTH_006',
  RATE_LIMITED: 'AUTH_007',

  // Consent
  CONSENT_NOT_FOUND: 'CONSENT_001',
  CONSENT_EXPIRED: 'CONSENT_002',
  CONSENT_ALREADY_REVOKED: 'CONSENT_003',
  NO_ACTIVE_CONSENT: 'CONSENT_004',

  // Assets
  DATA_FETCH_FAILED: 'ASSET_001',
  INVALID_FI_TYPE: 'ASSET_002',

  // Land
  LAND_SEARCH_FAILED: 'LAND_001',
  STATE_NOT_SUPPORTED: 'LAND_002',

  // Estate
  ESTATE_NOT_FOUND: 'ESTATE_001',
  ESTATE_UPLOAD_FAILED: 'ESTATE_002',
  ESTATE_NOT_VERIFIED: 'ESTATE_003',

  // General
  VALIDATION_ERROR: 'GENERAL_001',
  INTERNAL_ERROR: 'GENERAL_002',
  NOT_FOUND: 'GENERAL_003',
  SERVICE_UNAVAILABLE: 'GENERAL_004',
} as const;

// ─────────────────────────────────────────────
// Rate Limit Config
// ─────────────────────────────────────────────

export const RATE_LIMITS = {
  OTP_PER_MOBILE_PER_HOUR: 5,
  DATA_FETCH_PER_USER_PER_DAY: 10,
  GENERAL_PER_MINUTE: 60,
} as const;

// ─────────────────────────────────────────────
// Token Expiry
// ─────────────────────────────────────────────

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000,
} as const;
