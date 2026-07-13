import { Pool } from 'pg'
import { encryptPII as encrypt, decryptPII as decrypt } from '../../utils/encryption'

const SENSITIVE_FIELDS = [
  'survey_number', 'plot_number', 'khasra_number',
  'owner_name', 'registration_number',
  'dispute_details', 'raw_response',
  'from_owner', 'to_owner', 'creditor_name'
]

function encryptField(value: string | null): string | null {
  if (!value) return null
  return encrypt(value)
}

function decryptField(value: string | null): string | null {
  if (!value) return null
  return decrypt(value)
}

export async function insertLandRecord(
  pool: Pool,
  userId: string,
  data: Partial<any>,
  rawResponse: object
): Promise<string> {
  const result = await pool.query(`
    INSERT INTO land_records (
      user_id,
      survey_number_enc, plot_number_enc, khasra_number_enc,
      owner_name_enc, registration_number_enc,
      village, taluka, district, state, state_code, pin_code,
      area_value, area_unit, land_type, ownership_type,
      title_status, mutation_status,
      registration_date,
      latitude, longitude, ulpin,
      estimated_value_paise, circle_rate_paise,
      valuation_date, valuation_source,
      digilocker_doc_available, digilocker_doc_uri,
      source, source_record_id, raw_response_enc,
      sync_frequency_days, next_sync_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24,
      $25, $26, $27, $28, $29, $30,
      $31, $32, $33
    )
    ON CONFLICT (user_id, source, source_record_id)
    DO UPDATE SET
      title_status        = EXCLUDED.title_status,
      mutation_status     = EXCLUDED.mutation_status,
      estimated_value_paise = EXCLUDED.estimated_value_paise,
      raw_response_enc    = EXCLUDED.raw_response_enc,
      last_synced_at      = NOW(),
      next_sync_at        = NOW() + (EXCLUDED.sync_frequency_days || 30 || ' days')::INTERVAL,
      is_stale            = false,
      updated_at          = NOW()
    RETURNING id
  `, [
    userId,
    encryptField(data.surveyNumber),
    encryptField(data.plotNumber),
    encryptField(data.khasraNumber),
    encryptField(data.ownerName),
    encryptField(data.registrationNumber),
    data.village, data.taluka, data.district,
    data.state, data.stateCode, data.pinCode,
    data.areaValue, data.areaUnit ?? 'acres',
    data.landType, data.ownershipType ?? 'unknown',
    data.titleStatus ?? 'unknown',
    data.mutationStatus ?? 'not_required',
    data.registrationDate,
    data.latitude, data.longitude, data.ulpin,
    data.estimatedValuePaise, data.circleRatePaise,
    data.valuationDate, data.valuationSource,
    data.digilockerDocAvailable ?? false,
    data.digilockerDocUri,
    data.source, data.sourceRecordId,
    encryptField(JSON.stringify(rawResponse)),
    data.syncFrequencyDays ?? 30,
    `NOW() + INTERVAL '${data.syncFrequencyDays ?? 30} days'`
  ])
  return result.rows[0].id
}

export async function getLandRecordsByUser(
  pool: Pool,
  userId: string,
  filters: {
    stateCode?: string
    titleStatus?: string
    ownershipType?: string
    isActive?: boolean
  } = {}
): Promise<any[]> {
  const conditions = ['user_id = $1']
  const params: any[] = [userId]
  let idx = 2

  if (filters.stateCode) {
    conditions.push(`state_code = $${idx++}`)
    params.push(filters.stateCode)
  }
  if (filters.titleStatus) {
    conditions.push(`title_status = $${idx++}`)
    params.push(filters.titleStatus)
  }
  if (filters.ownershipType) {
    conditions.push(`ownership_type = $${idx++}`)
    params.push(filters.ownershipType)
  }
  if (filters.isActive !== undefined) {
    conditions.push(`is_active = $${idx++}`)
    params.push(filters.isActive)
  }

  const result = await pool.query(`
    SELECT
      id, user_id,
      survey_number_enc, plot_number_enc, khasra_number_enc, owner_name_enc,
      village, taluka, district, state, state_code, pin_code,
      area_value, area_unit, land_type, land_use,
      ownership_type, co_owners_count,
      title_status, mutation_status, encumbrance_status,
      registration_date,
      latitude, longitude, ulpin,
      estimated_value_paise, circle_rate_paise,
      valuation_date, valuation_source,
      digilocker_doc_available, digilocker_doc_uri,
      source, is_verified, verified_at,
      fetched_at, last_synced_at, next_sync_at,
      is_stale, is_active, notes, created_at, updated_at
    FROM land_records
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
  `, params)

  return result.rows.map(row => ({
    ...row,
    surveyNumber:       decryptField(row.survey_number_enc),
    plotNumber:         decryptField(row.plot_number_enc),
    khasraNumber:       decryptField(row.khasra_number_enc),
    ownerName:          decryptField(row.owner_name_enc),
    survey_number_enc:  undefined,
    plot_number_enc:    undefined,
    khasra_number_enc:  undefined,
    owner_name_enc:     undefined,
  }))
}

export async function getLandRecordById(
  pool: Pool,
  recordId: string,
  userId: string
): Promise<any | null> {
  const result = await pool.query(`
    SELECT lr.*,
      json_agg(DISTINCT lm.*) FILTER (WHERE lm.id IS NOT NULL) AS mutations,
      json_agg(DISTINCT le.*) FILTER (WHERE le.id IS NOT NULL) AS encumbrances
    FROM land_records lr
    LEFT JOIN land_mutations lm ON lm.land_record_id = lr.id
    LEFT JOIN land_encumbrances le ON le.land_record_id = lr.id
    WHERE lr.id = $1 AND lr.user_id = $2
    GROUP BY lr.id
  `, [recordId, userId])

  if (!result.rows[0]) return null

  const row = result.rows[0]
  return {
    ...row,
    surveyNumber:         decryptField(row.survey_number_enc),
    plotNumber:           decryptField(row.plot_number_enc),
    khasraNumber:         decryptField(row.khasra_number_enc),
    ownerName:            decryptField(row.owner_name_enc),
    registrationNumber:   decryptField(row.registration_number_enc),
    survey_number_enc:    undefined,
    plot_number_enc:      undefined,
    khasra_number_enc:    undefined,
    owner_name_enc:       undefined,
    registration_number_enc: undefined,
    raw_response_enc:     undefined,
  }
}

export async function markRecordsStale(
  pool: Pool,
  userId: string
): Promise<void> {
  await pool.query(`
    UPDATE land_records
    SET is_stale = true
    WHERE user_id = $1
    AND next_sync_at < NOW()
    AND is_active = true
  `, [userId])
}

export async function updateLandRecordManual(
  pool: Pool,
  recordId: string,
  userId: string,
  updates: Partial<any>
): Promise<void> {
  await pool.query(`
    UPDATE land_records SET
      notes         = COALESCE($3, notes),
      ownership_type = COALESCE($4, ownership_type),
      area_value    = COALESCE($5, area_value),
      area_unit     = COALESCE($6, area_unit),
      is_active     = COALESCE($7, is_active),
      updated_at    = NOW()
    WHERE id = $1 AND user_id = $2
  `, [
    recordId, userId,
    updates.notes, updates.ownershipType,
    updates.areaValue, updates.areaUnit,
    updates.isActive
  ])
}

export async function softDeleteLandRecord(
  pool: Pool,
  recordId: string,
  userId: string
): Promise<void> {
  await pool.query(`
    UPDATE land_records
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
  `, [recordId, userId])
}

export async function logLandSync(
  pool: Pool,
  data: {
    userId: string
    landRecordId?: string
    source: string
    trigger: string
    status: string
    recordsFound?: number
    recordsUpdated?: number
    recordsCreated?: number
    errorMessage?: string
    apiResponseTimeMs?: number
    costPaise?: number
  }
): Promise<void> {
  await pool.query(`
    INSERT INTO land_sync_log (
      user_id, land_record_id, source, trigger,
      status, records_found, records_updated, records_created,
      error_message, api_response_time_ms, cost_paise
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [
    data.userId, data.landRecordId ?? null,
    data.source, data.trigger, data.status,
    data.recordsFound ?? 0, data.recordsUpdated ?? 0,
    data.recordsCreated ?? 0, data.errorMessage ?? null,
    data.apiResponseTimeMs ?? null, data.costPaise ?? null
  ])
}
