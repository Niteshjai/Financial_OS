// ═══════════════════════════════════════════════════════════════
// Document Collector — Checklist engine for recovery documents
// ═══════════════════════════════════════════════════════════════

import { Pool } from 'pg'
import { RECOVERY_CONFIGS, RecoveryType } from '../types/recoveryTypes'
import { logger } from '../../utils/logger'

export const documentCollector = {

  /**
   * Create the document checklist for a recovery case
   * based on the recovery type configuration.
   */
  async createChecklist(
    pool:         Pool,
    caseId:       string,
    userId:       string,
    recoveryType: RecoveryType
  ): Promise<void> {
    if (process.env.MOCK_MODE === 'true') return

    const docs = RECOVERY_CONFIGS[recoveryType].documents

    for (const doc of docs) {
      await pool.query(`
        INSERT INTO recovery_documents (
          case_id, user_id, doc_type, doc_label,
          is_required, notes
        ) VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT DO NOTHING
      `, [
        caseId, userId,
        doc.docType, doc.label,
        doc.isRequired,
        doc.helpText
      ])
    }
  },

  /**
   * Attempt to auto-fetch documents from DigiLocker.
   * Marks Aadhaar and PAN as received if found.
   */
  async autoFetchDigiLocker(
    pool:   Pool,
    caseId: string,
    userId: string
  ): Promise<void> {
    if (process.env.MOCK_MODE === 'true') return

    try {
      const docsResult = await pool.query(`
        SELECT id, doc_type FROM recovery_documents
        WHERE case_id = $1 AND is_received = false
      `, [caseId])

      const digilockerMap: Record<string, string> = {
        aadhaar_front: 'ADHAR',
        pan_card:      'PANCR',
      }

      for (const doc of docsResult.rows) {
        const digiType = digilockerMap[doc.doc_type]
        if (!digiType) continue

        // Check user's DigiLocker documents
        const userDocs = await pool.query(`
          SELECT digilocker_uri FROM canonical_assets
          WHERE user_id = $1
          AND primary_source = 'digilocker'
          AND asset_subtype = $2
          LIMIT 1
        `, [userId, digiType])

        if (userDocs.rows[0]) {
          await pool.query(`
            UPDATE recovery_documents
            SET digilocker_uri = $2,
                is_received    = true,
                auto_fetched   = true,
                uploaded_at    = NOW()
            WHERE id = $1
          `, [doc.id, userDocs.rows[0].digilocker_uri])
        }
      }
    } catch (error) {
      logger.warn('DigiLocker auto-fetch failed (non-critical)', { caseId, error })
    }
  },

  /**
   * Get the document checklist for a case.
   */
  async getChecklist(
    pool:   Pool,
    caseId: string
  ): Promise<{
    required:   any[]
    optional:   any[]
    complete:   boolean
    pctDone:    number
  }> {
    if (process.env.MOCK_MODE === 'true') {
      return { required: [], optional: [], complete: false, pctDone: 0 }
    }

    const result = await pool.query(`
      SELECT * FROM recovery_documents
      WHERE case_id = $1
      ORDER BY is_required DESC, doc_type
    `, [caseId])

    const required = result.rows.filter((d: any) => d.is_required)
    const optional = result.rows.filter((d: any) => !d.is_required)
    const receivedCount = required.filter((d: any) => d.is_received).length
    const pctDone = required.length > 0 ? Math.round((receivedCount / required.length) * 100) : 0
    const complete = receivedCount >= required.length

    return { required, optional, complete, pctDone }
  },

  /**
   * Get mock checklist for development mode.
   */
  getMockChecklist(recoveryType: RecoveryType): {
    required: any[]
    optional: any[]
    complete: boolean
    pctDone:  number
  } {
    const config = RECOVERY_CONFIGS[recoveryType]
    const required = config.documents
      .filter(d => d.isRequired)
      .map((d, i) => ({
        id:          `mock-doc-${i}`,
        doc_type:    d.docType,
        doc_label:   d.label,
        is_required: true,
        is_received: d.canAutoFetch, // auto-fetched docs start as received
        is_verified: false,
        auto_fetched:d.canAutoFetch,
        notes:       d.helpText,
      }))

    const optional = config.documents
      .filter(d => !d.isRequired)
      .map((d, i) => ({
        id:          `mock-doc-opt-${i}`,
        doc_type:    d.docType,
        doc_label:   d.label,
        is_required: false,
        is_received: false,
        is_verified: false,
        auto_fetched:false,
        notes:       d.helpText,
      }))

    const receivedCount = required.filter(d => d.is_received).length
    const pctDone = required.length > 0 ? Math.round((receivedCount / required.length) * 100) : 0

    return { required, optional, complete: receivedCount >= required.length, pctDone }
  }
}
