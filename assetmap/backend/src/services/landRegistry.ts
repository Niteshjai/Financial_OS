import axios from 'axios'
import { Pool } from 'pg'
import { landCache } from './landCache'
import {
  insertLandRecord,
  getLandRecordsByUser,
  getLandRecordById,
  logLandSync
} from '../db/queries/landRecords'
import { auditLogger } from './auditLogger'

const ZOOP_BASE = process.env.ZOOP_API_URL || 'https://prod.aadhaarapi.com/api/v1'
const ZOOP_APP_ID = process.env.ZOOP_APP_ID || ''
const ZOOP_API_KEY = process.env.ZOOP_API_KEY || ''

interface ZoopLandRecord {
  survey_number?: string
  plot_number?: string
  owner_name?: string
  village?: string
  taluka?: string
  district?: string
  state?: string
  area?: number
  area_unit?: string
  land_type?: string
  registration_date?: string
  latitude?: number
  longitude?: number
  title_status?: string
  mutation_status?: string
  source_id?: string
}

function normalizeZoopRecord(
  raw: ZoopLandRecord,
  stateCode: string
): Partial<any> {
  return {
    surveyNumber:     raw.survey_number,
    plotNumber:       raw.plot_number,
    ownerName:        raw.owner_name,
    village:          raw.village,
    taluka:           raw.taluka,
    district:         raw.district,
    state:            raw.state,
    stateCode,
    areaValue:        raw.area,
    areaUnit:         raw.area_unit ?? 'acres',
    landType:         raw.land_type,
    ownershipType:    'unknown',
    titleStatus:      raw.title_status ?? 'unknown',
    mutationStatus:   raw.mutation_status ?? 'not_required',
    registrationDate: raw.registration_date,
    latitude:         raw.latitude,
    longitude:        raw.longitude,
    source:           'zoop',
    sourceRecordId:   raw.source_id ?? raw.survey_number,
    syncFrequencyDays: 30,
  }
}

function getMockZoopRecords(stateCode: string): ZoopLandRecord[] {
  return [
    {
      survey_number: 'SUR-892-A',
      owner_name: 'Mock Owner',
      village: 'Sample Village',
      district: 'Sample District',
      state: stateCode,
      area: 2.5,
      area_unit: 'acres',
      land_type: 'Agricultural',
      title_status: 'clear',
      source_id: 'Z-MOCK-1',
    },
    {
      survey_number: 'SUR-114-B',
      owner_name: 'Mock Owner',
      village: 'Test Town',
      district: 'Sample District',
      state: stateCode,
      area: 1200,
      area_unit: 'sq_ft',
      land_type: 'Residential',
      title_status: 'clear',
      source_id: 'Z-MOCK-2',
    }
  ]
}

export const landRegistryService = {

  async fetchAndStoreLandRecords(
    pool: Pool,
    userId: string,
    searchParams: {
      name: string
      state: string
      stateCode: string
      district?: string
      taluka?: string
    },
    trigger: 'user_request' | 'scheduled' | 'estate_case' | 'initial_fetch'
  ): Promise<{ created: number; updated: number; records: any[] }> {
    const startTime = Date.now()
    let created = 0
    let updated = 0

    // Check cache first — API costs money per call
    const cacheKey = searchParams.name + searchParams.state +
                     (searchParams.district ?? '')
    const cached = await landCache.getZoopRaw(
      searchParams.name,
      searchParams.state,
      searchParams.district ?? ''
    )

    let rawRecords: ZoopLandRecord[] = []

    if (cached) {
      rawRecords = cached
    } else {
      // If we're in dev mode and keys are missing, return mock data instantly
      if (process.env.NODE_ENV !== 'production' && !ZOOP_API_KEY) {
        rawRecords = getMockZoopRecords(searchParams.stateCode)
      } else {
        try {
          // Call Zoop API
          const response = await axios.post(
            `${ZOOP_BASE}/land/record/check/api`,
            {
              name:     searchParams.name,
              state:    searchParams.state,
              district: searchParams.district,
              taluka:   searchParams.taluka,
            },
            {
              headers: {
                'app-id': ZOOP_APP_ID,
                'api-key': ZOOP_API_KEY,
                'Content-Type': 'application/json',
              },
              timeout: 15000,
            }
          )
          
          rawRecords = response.data?.result || response.data?.data || []
        } catch (error: any) {
           throw new Error('Failed to fetch from Zoop API: ' + (error?.response?.data?.message || error.message));
        }
      }

      // Cache the raw response for 7 days
      await landCache.setZoopRaw(
        searchParams.name,
        searchParams.state,
        searchParams.district ?? '',
        rawRecords
      )
    }

    // Store each record
    const storedIds: string[] = []
    for (const raw of rawRecords) {
      const normalized = normalizeZoopRecord(raw, searchParams.stateCode)
      const recordId = await insertLandRecord(pool, userId, normalized, raw)
      storedIds.push(recordId)

      if (recordId) created++
      else updated++
    }

    // Log the sync
    await logLandSync(pool, {
      userId,
      source: 'zoop',
      trigger,
      status: 'success',
      recordsFound:   rawRecords.length,
      recordsCreated: created,
      recordsUpdated: updated,
      apiResponseTimeMs: Date.now() - startTime,
      costPaise: rawRecords.length * 250, // ~₹2.50 per record
    })

    // Audit log
    await auditLogger.log(
      userId,
      'LAND_DATA_FETCHED' as 'LAND_DATA_FETCHED',
      'land_records',
      undefined,
      undefined,
      undefined,
      {
        source: 'zoop',
        recordsFound: rawRecords.length,
        state: searchParams.state,
        trigger,
      }
    )

    // Invalidate cache so fresh data loads
    await landCache.invalidateUserRecords(userId)

    // Fetch and return stored records
    const records = await getLandRecordsByUser(pool, userId)
    await landCache.setUserRecords(userId, records)

    return { created, updated, records }
  },

  async getUserLandRecords(
    pool: Pool,
    userId: string,
    filters: {
      stateCode?: string
      titleStatus?: string
      ownershipType?: string
    } = {}
  ): Promise<any[]> {
    // Try cache first (only when no filters)
    if (Object.keys(filters).length === 0) {
      const cached = await landCache.getUserRecords(userId)
      if (cached) return cached
    }

    const records = await getLandRecordsByUser(pool, userId, {
      ...filters,
      isActive: true
    })

    if (Object.keys(filters).length === 0) {
      await landCache.setUserRecords(userId, records)
    }

    return records
  },

  async getLandRecordDetail(
    pool: Pool,
    recordId: string,
    userId: string
  ): Promise<any | null> {
    const cached = await landCache.getSingleRecord(recordId)
    if (cached && cached.userId === userId) return cached

    const record = await getLandRecordById(pool, recordId, userId)
    if (!record) return null

    await landCache.setSingleRecord(recordId, record)

    await auditLogger.log(
      userId,
      'LAND_RECORD_VIEWED' as 'LAND_RECORD_VIEWED',
      'land_record',
      recordId
    )

    return record
  },

  async getSummaryStats(
    pool: Pool,
    userId: string
  ): Promise<{
    totalParcels: number
    totalAreaAcres: number
    estimatedTotalValuePaise: number
    statesCovered: number
    clearTitleCount: number
    disputeCount: number
    mutationPendingCount: number
  }> {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                AS total_parcels,
        SUM(area_value)                         AS total_area,
        SUM(estimated_value_paise)              AS total_value,
        COUNT(DISTINCT state_code)              AS states_covered,
        COUNT(*) FILTER (WHERE title_status = 'clear')
                                                AS clear_title_count,
        COUNT(*) FILTER (WHERE title_status = 'dispute')
                                                AS dispute_count,
        COUNT(*) FILTER (WHERE title_status = 'mutation_pending')
                                                AS mutation_pending_count
      FROM land_records
      WHERE user_id = $1 AND is_active = true
    `, [userId])

    const r = result.rows[0]
    return {
      totalParcels:             parseInt(r.total_parcels) || 0,
      totalAreaAcres:           parseFloat(r.total_area) || 0,
      estimatedTotalValuePaise: parseInt(r.total_value) || 0,
      statesCovered:            parseInt(r.states_covered) || 0,
      clearTitleCount:          parseInt(r.clear_title_count) || 0,
      disputeCount:             parseInt(r.dispute_count) || 0,
      mutationPendingCount:     parseInt(r.mutation_pending_count) || 0,
    }
  }
}
