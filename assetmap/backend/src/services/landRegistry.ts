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

const SUREPASS_BASE = process.env.SUREPASS_API_URL!
const SUREPASS_TOKEN = process.env.SUREPASS_TOKEN!

interface SurepassLandRecord {
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

function normalizeSurepassRecord(
  raw: SurepassLandRecord,
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
    source:           'surepass',
    sourceRecordId:   raw.source_id ?? raw.survey_number,
    syncFrequencyDays: 30,
  }
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

    // Check cache first — Surepass costs money per call
    const cacheKey = searchParams.name + searchParams.state +
                     (searchParams.district ?? '')
    const cached = await landCache.getSurepassRaw(
      searchParams.name,
      searchParams.state,
      searchParams.district ?? ''
    )

    let rawRecords: SurepassLandRecord[] = []

    if (cached) {
      rawRecords = cached
    } else {
      // Call Surepass API
      const response = await axios.post(
        `${SUREPASS_BASE}/land-record/search`,
        {
          name:     searchParams.name,
          state:    searchParams.state,
          district: searchParams.district,
          taluka:   searchParams.taluka,
        },
        {
          headers: {
            Authorization: `Bearer ${SUREPASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      )

      rawRecords = response.data?.data ?? []

      // Cache the raw response for 7 days
      await landCache.setSurepassRaw(
        searchParams.name,
        searchParams.state,
        searchParams.district ?? '',
        rawRecords
      )
    }

    // Store each record
    const storedIds: string[] = []
    for (const raw of rawRecords) {
      const normalized = normalizeSurepassRecord(raw, searchParams.stateCode)
      const recordId = await insertLandRecord(pool, userId, normalized, raw)
      storedIds.push(recordId)

      if (recordId) created++
      else updated++
    }

    // Log the sync
    await logLandSync(pool, {
      userId,
      source: 'surepass',
      trigger,
      status: 'success',
      recordsFound:   rawRecords.length,
      recordsCreated: created,
      recordsUpdated: updated,
      apiResponseTimeMs: Date.now() - startTime,
      costPaise: rawRecords.length * 300, // ~₹3 per record
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
        source: 'surepass',
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
