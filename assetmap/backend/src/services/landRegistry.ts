import axios from 'axios';
import { pool, kvStore } from '../db/connection';
import { encryptPII } from '../utils/encryption';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// Land Registry Service — Surepass API
// Property records lookup with Redis caching
// ═══════════════════════════════════════════════════════════════

interface LandParcel {
  state: string;
  district: string;
  surveyNumber: string;
  ownerName: string;
  areaSqft: number;
  registrationDate: string | null;
  source: 'SUREPASS' | 'MANUAL';
  rawJson: Record<string, unknown>;
}

interface LandSearchResult {
  records: LandParcel[];
  manualUploadRequired: boolean;
  message: string;
}

const SUREPASS_API_URL = process.env.SUREPASS_API_URL || 'https://kyc-api.surepass.io/api/v1';
const CACHE_TTL = 86400; // 24 hours in seconds

// States supported by Surepass API (not all Indian states are covered)
const SUPPORTED_STATES = [
  'Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Rajasthan', 'Gujarat',
  'Madhya Pradesh', 'West Bengal', 'Kerala', 'Delhi',
];

// ─────────────────────────────────────────────
// Search by Name
// ─────────────────────────────────────────────

export async function searchByName(
  name: string,
  state: string,
  district: string
): Promise<LandSearchResult> {
  const cacheKey = `land:name:${hashKey(name)}:${state}:${district}`;

  // Check Redis cache
  const cached = await kvStore.get(cacheKey);
  if (cached) {
    logger.info('Land search cache hit', { state, district });
    return JSON.parse(cached);
  }

  // Check if state is supported
  if (!SUPPORTED_STATES.some((s) => s.toLowerCase() === state.toLowerCase())) {
    logger.warn('Land search for unsupported state', { state });
    return {
      records: [],
      manualUploadRequired: true,
      message: `Land records for ${state} are not available via automated lookup. Please upload records manually.`,
    };
  }

  try {
    let records: LandParcel[];

    if (process.env.NODE_ENV === 'production') {
      const response = await axios.post(
        `${SUREPASS_API_URL}/land-records/search`,
        {
          name,
          state,
          district,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUREPASS_TOKEN}`,
          },
          timeout: 30000,
        }
      );

      records = normalizeRecords(response.data.data || [], state, district);
    } else {
      // Sandbox mock data
      records = generateMockLandRecords(name, state, district);
    }

    const result: LandSearchResult = {
      records,
      manualUploadRequired: records.length === 0,
      message:
        records.length > 0
          ? `Found ${records.length} property record(s) in ${district}, ${state}`
          : 'No records found. You can upload property documents manually.',
    };

    // Cache results for 24 hours
    await kvStore.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return result;
  } catch (error) {
    logger.error('Surepass land search failed', {
      state,
      district,
      error: (error as Error).message,
    });

    return {
      records: [],
      manualUploadRequired: true,
      message: 'Land record lookup temporarily unavailable. Please upload records manually.',
    };
  }
}

// ─────────────────────────────────────────────
// Search by PAN
// ─────────────────────────────────────────────

export async function searchByPAN(
  pan: string,
  state: string
): Promise<LandSearchResult> {
  const cacheKey = `land:pan:${hashKey(pan)}:${state}`;

  const cached = await kvStore.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  if (!SUPPORTED_STATES.some((s) => s.toLowerCase() === state.toLowerCase())) {
    return {
      records: [],
      manualUploadRequired: true,
      message: `PAN-linked property lookup not available for ${state}.`,
    };
  }

  try {
    let records: LandParcel[];

    if (process.env.NODE_ENV === 'production') {
      const response = await axios.post(
        `${SUREPASS_API_URL}/land-records/pan-search`,
        { pan, state },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUREPASS_TOKEN}`,
          },
          timeout: 30000,
        }
      );
      records = normalizeRecords(response.data.data || [], state, '');
    } else {
      records = generateMockLandRecords('PAN Owner', state, 'Various');
    }

    const result: LandSearchResult = {
      records,
      manualUploadRequired: records.length === 0,
      message:
        records.length > 0
          ? `Found ${records.length} PAN-linked property record(s) in ${state}`
          : 'No PAN-linked properties found.',
    };

    await kvStore.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    return result;
  } catch (error) {
    logger.error('PAN land search failed', { state, error: (error as Error).message });
    return {
      records: [],
      manualUploadRequired: true,
      message: 'PAN-linked property lookup temporarily unavailable.',
    };
  }
}

// ─────────────────────────────────────────────
// Store Land Records
// ─────────────────────────────────────────────

export async function storeLandRecords(
  userId: string,
  records: LandParcel[]
): Promise<void> {
  for (const record of records) {
    await pool.query(
      `INSERT INTO land_records
        (user_id, state, district, survey_number, owner_name_encrypted, area_sqft, registration_date, source, raw_json_encrypted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::land_source, $9)
       ON CONFLICT DO NOTHING`,
      [
        userId,
        record.state,
        record.district,
        record.surveyNumber,
        encryptPII(record.ownerName),
        record.areaSqft,
        record.registrationDate,
        record.source,
        encryptPII(JSON.stringify(record.rawJson)),
      ]
    );
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalizeRecords(rawData: any[], state: string, district: string): LandParcel[] {
  return rawData.map((item) => ({
    state: item.state || state,
    district: item.district || district,
    surveyNumber: item.surveyNumber || item.khasraNumber || item.plotNumber || '',
    ownerName: item.ownerName || item.holderName || '',
    areaSqft: parseFloat(item.areaSqft || item.area || '0'),
    registrationDate: item.registrationDate || item.dateOfRegistration || null,
    source: 'SUREPASS' as const,
    rawJson: item,
  }));
}

function hashKey(value: string): string {
  // Simple hash for cache key (not cryptographic)
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function generateMockLandRecords(name: string, state: string, district: string): LandParcel[] {
  return [
    {
      state,
      district: district || 'Bengaluru Urban',
      surveyNumber: 'SY-456/2A',
      ownerName: name || 'Rajesh Kumar Sharma',
      areaSqft: 2400,
      registrationDate: '2018-03-15',
      source: 'SUREPASS',
      rawJson: {
        plotType: 'Residential',
        encumbrance: 'None',
        marketValue: 8500000,
      },
    },
    {
      state,
      district: district || 'Mysuru',
      surveyNumber: 'SY-123/1B',
      ownerName: name || 'Rajesh Kumar Sharma',
      areaSqft: 5000,
      registrationDate: '2015-08-22',
      source: 'SUREPASS',
      rawJson: {
        plotType: 'Agricultural',
        encumbrance: 'None',
        marketValue: 3200000,
      },
    },
  ];
}
