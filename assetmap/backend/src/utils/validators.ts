import { FI_TYPES } from './constants';

// ═══════════════════════════════════════════════════════════════
// AssetMap — JSON Validation Schemas for Fastify
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// Auth Schemas
// ─────────────────────────────────────────────

export const AadhaarInitiateSchema = {
  type: 'object',
  required: ['aadhaarNumber'],
  properties: {
    aadhaarNumber: { type: 'string', minLength: 12, maxLength: 14 }
  },
  additionalProperties: false
};

export const AadhaarVerifySchema = {
  type: 'object',
  required: ['transactionId', 'otp'],
  properties: {
    transactionId: { type: 'string', format: 'uuid' },
    otp: { type: 'string', pattern: '^\\d{6}$' }
  },
  additionalProperties: false
};

export const PhoneInitiateSchema = {
  type: 'object',
  required: ['countryCode', 'phoneNumber'],
  properties: {
    countryCode: { type: 'string', pattern: '^\\+\\d{1,4}$' },
    phoneNumber: { type: 'string', pattern: '^\\d{4,15}$' },
    channel: { type: 'string', enum: ['sms', 'whatsapp'] }
  },
  additionalProperties: false
};

export const PhoneVerifySchema = {
  type: 'object',
  required: ['transactionId', 'otp'],
  properties: {
    transactionId: { type: 'string' },
    otp: { type: 'string', pattern: '^\\d{6}$' }
  },
  additionalProperties: false
};

export const RefreshTokenSchema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string' }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Consent Schemas
// ─────────────────────────────────────────────

export const ConsentCreateSchema = {
  type: 'object',
  required: ['fiTypes', 'purpose', 'dateRangeStart', 'dateRangeEnd'],
  properties: {
    fiTypes: {
      type: 'array',
      items: { type: 'string', enum: [...FI_TYPES] },
      minItems: 1
    },
    purpose: { type: 'string', minLength: 10, maxLength: 500 },
    dateRangeStart: { type: 'string', format: 'date' },
    dateRangeEnd: { type: 'string', format: 'date' }
  },
  additionalProperties: false
};

export const ConsentCallbackSchema = {
  type: 'object',
  required: ['consentId'],
  properties: {
    consentId: { type: 'string', minLength: 1 },
    // Setu sends 'consentStatus', but we also accept 'status' for compatibility
    status: { type: 'string', enum: ['ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING', 'APPROVED', 'REJECTED'] },
    consentStatus: { type: 'string', enum: ['ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING', 'APPROVED', 'REJECTED'] },
    consentHandle: { type: 'string' },
    type: { type: 'string' },
    timestamp: { type: 'string' }
  },
  additionalProperties: true
};

// ─────────────────────────────────────────────
// Land Search Schemas
// ─────────────────────────────────────────────

export const LandSearchByNameSchema = {
  type: 'object',
  required: ['name', 'state', 'district'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 200 },
    state: { type: 'string', minLength: 2, maxLength: 100 },
    district: { type: 'string', minLength: 2, maxLength: 100 }
  },
  additionalProperties: false
};

export const LandSearchByPANSchema = {
  type: 'object',
  required: ['pan', 'state'],
  properties: {
    pan: { type: 'string', pattern: '^[A-Z]{5}\\d{4}[A-Z]$' },
    state: { type: 'string', minLength: 2, maxLength: 100 }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Estate Schemas
// ─────────────────────────────────────────────

export const EstateFileSchema = {
  type: 'object',
  required: ['deceasedName', 'deceasedAadhaar', 'relationship'],
  properties: {
    deceasedName: { type: 'string', minLength: 2, maxLength: 200 },
    deceasedAadhaar: { type: 'string', minLength: 12, maxLength: 14 },
    relationship: { type: 'string', minLength: 2, maxLength: 100 }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Report Schemas
// ─────────────────────────────────────────────

export const ReportGenerateSchema = {
  type: 'object',
  properties: {
    includeCategories: {
      type: 'array',
      items: { type: 'string', enum: [...FI_TYPES] }
    },
    includeLandRecords: { type: 'boolean' }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// User Schemas
// ─────────────────────────────────────────────

export const UserDeleteSchema = {
  type: 'object',
  required: ['confirmPhrase'],
  properties: {
    confirmPhrase: { type: 'string', const: 'DELETE MY DATA' }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Pagination Schema
// ─────────────────────────────────────────────

export const PaginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    limit: { type: 'string' }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Will Schemas
// ─────────────────────────────────────────────

export const WillCreateSchema = {
  type: 'object',
  required: ['name', 'dateOfBirth', 'aadhaarNumber'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 200 },
    dateOfBirth: { type: 'string' },
    aadhaarNumber: { type: 'string', minLength: 12, maxLength: 14 }
  },
  additionalProperties: false
};

export const WillBeneficiarySchema = {
  type: 'object',
  required: ['name', 'relationship', 'aadhaarNumber'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 200 },
    relationship: { type: 'string' },
    aadhaarNumber: { type: 'string', minLength: 12, maxLength: 14 }
  },
  additionalProperties: false
};

export const WillAllocationSchema = {
  type: 'object',
  required: ['assetId', 'beneficiaryId', 'percentage'],
  properties: {
    assetId: { type: 'string' },
    beneficiaryId: { type: 'string' },
    percentage: { type: 'number', minimum: 0, maximum: 100 }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Recovery Schemas
// ─────────────────────────────────────────────

export const RecoveryCaseSchema = {
  type: 'object',
  required: ['recoveryType', 'assetDescription', 'estimatedValuePaise'],
  properties: {
    recoveryType: { type: 'string', enum: ['epf_transfer', 'epf_withdrawal', 'life_insurance', 'bank_account', 'mutual_funds'] },
    assetDescription: { type: 'string', minLength: 5, maxLength: 500 },
    estimatedValuePaise: { type: 'number' },
    institutionName: { type: 'string' }
  },
  additionalProperties: false
};

export const RecoveryDocumentSchema = {
  type: 'object',
  required: ['docType', 'docLabel', 'fileName'],
  properties: {
    docType: { type: 'string' },
    docLabel: { type: 'string' },
    fileName: { type: 'string' }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Unclaimed Schemas
// ─────────────────────────────────────────────

export const UnclaimedSearchSchema = {
  type: 'object',
  required: ['firstName', 'lastName'],
  properties: {
    firstName: { type: 'string', minLength: 2 },
    lastName: { type: 'string', minLength: 2 },
    dob: { type: 'string' },
    pan: { type: 'string' },
    address: { type: 'string' }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Loan Schemas
// ─────────────────────────────────────────────

export const LoanAssessSchema = {
  type: 'object',
  required: ['assetId', 'assetType', 'requestedAmount'],
  properties: {
    assetId: { type: 'string' },
    assetType: { type: 'string' },
    requestedAmount: { type: 'number', minimum: 1000 }
  },
  additionalProperties: false
};

// ─────────────────────────────────────────────
// Insurance Schemas
// ─────────────────────────────────────────────

export const InsuranceAnalyzeSchema = {
  type: 'object',
  properties: {},
  additionalProperties: true
};

// ─────────────────────────────────────────────
// Logs Schemas
// ─────────────────────────────────────────────

export const FrontendLogSchema = {
  type: 'object',
  required: ['message', 'type'],
  properties: {
    message: { type: 'string', maxLength: 1000 },
    type: { type: 'string', maxLength: 100 },
    stack: { type: 'string', maxLength: 5000 },
    url: { type: 'string', maxLength: 500 },
    timestamp: { type: 'string', format: 'date-time' },
    userAgent: { type: 'string', maxLength: 300 }
  },
  additionalProperties: false
};

export const RegisterAadhaarInitiateSchema = {
  type: 'object',
  required: ['registrationToken', 'aadhaarNumber'],
  properties: {
    registrationToken: { type: 'string' },
    aadhaarNumber: { type: 'string', minLength: 12, maxLength: 14 }
  },
  additionalProperties: false
};

export const RegisterAadhaarVerifySchema = {
  type: 'object',
  required: ['registrationToken', 'referenceId', 'otp'],
  properties: {
    registrationToken: { type: 'string' },
    referenceId: { type: 'string' },
    otp: { type: 'string', pattern: '^\\d{6}$' }
  },
  additionalProperties: false
};

export const EmailInitiateSchema = {
  type: 'object',
  required: ['registrationToken', 'email'],
  properties: {
    registrationToken: { type: 'string' },
    email: { type: 'string', format: 'email' }
  },
  additionalProperties: false
};

export const EmailVerifySchema = {
  type: 'object',
  required: ['registrationToken', 'otp'],
  properties: {
    registrationToken: { type: 'string' },
    otp: { type: 'string', pattern: '^\\d{6}$' }
  },
  additionalProperties: false
};

export const RegisterConfirmSchema = {
  type: 'object',
  required: ['registrationToken'],
  properties: {
    registrationToken: { type: 'string' }
  },
  additionalProperties: false
};

export const FcmTokenSchema = {
  type: 'object',
  required: ['token'],
  properties: {
    token: { type: 'string', maxLength: 1000 }
  },
  additionalProperties: false
};

export const AlertsPreferencesSchema = {
  type: 'object',
  properties: {
    email: { type: 'boolean' },
    sms: { type: 'boolean' },
    push: { type: 'boolean' }
  },
  additionalProperties: true
};

export const RecoveryLegacyRequestSchema = {
  type: 'object',
  required: ['unclaimedAssetId'],
  properties: {
    unclaimedAssetId: { type: 'string' },
    assetDescription: { type: 'string', maxLength: 500 },
    institutionName: { type: 'string' },
    estimatedValue: { type: 'number' }
  },
  additionalProperties: false
};

