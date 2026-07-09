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
  required: ['consentId', 'status'],
  properties: {
    consentId: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING'] },
    consentHandle: { type: 'string' }
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
