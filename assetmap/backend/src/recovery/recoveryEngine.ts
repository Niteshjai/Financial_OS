// ═══════════════════════════════════════════════════════════════
// Recovery Engine — Main Orchestrator
// Manages the full lifecycle of asset recovery cases
// ═══════════════════════════════════════════════════════════════

import { Pool } from 'pg'
import { RECOVERY_CONFIGS, calculateFee, RecoveryType, RecoveryStatus, LEGAL_DISCLAIMER } from './types/recoveryTypes'
import { documentCollector }  from './documents/documentCollector'
import { timelineEstimator }  from './tracking/timelineEstimator'
import { recoveryNotifier }   from './notifications/recoveryNotifier'
import { escrowManager }      from './billing/escrowManager'
import { encryptPII }         from '../utils/encryption'
import { logger }             from '../utils/logger'

// ─────────────────────────────────────────────
// Mock data store (for MOCK_MODE)
// ─────────────────────────────────────────────
interface MockCase {
  id: string
  userId: string
  recoveryType: RecoveryType
  assetDescription: string
  institutionName: string
  status: RecoveryStatus
  estimatedValuePaise: number
  recoveredValuePaise?: number
  feePct: number
  feeAmountPaise: number
  estimatedCompletion: string
  initiatedAt: string
  submittedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  documents: any[]
  timeline: any[]
  feeAgreementSignedAt?: string
}

const mockCases: MockCase[] = []
let mockIdCounter = 1

// ─────────────────────────────────────────────

export const recoveryEngine = {

  /**
   * Step 1: User clicks "Recover This" on a discovered asset.
   * Creates a recovery case and generates the fee agreement.
   */
  async initiateCase(
    pool:     Pool,
    userId:   string,
    params: {
      recoveryType:         RecoveryType
      assetDescription:     string
      institutionName?:     string
      estimatedValuePaise:  number
      folioNumber?:         string
      policyNumber?:        string
      uanNumber?:           string
      accountNumber?:       string
      isin?:                string
    }
  ) {
    const config     = RECOVERY_CONFIGS[params.recoveryType]
    const feeDetails = calculateFee(params.estimatedValuePaise, params.recoveryType)

    const agreementText = generateAgreementText(
      params.assetDescription,
      params.institutionName ?? 'the institution',
      params.estimatedValuePaise,
      feeDetails.feePct,
      feeDetails.feeAmountPaise,
      config.avgDaysToComplete
    )

    // Mock mode
    if (process.env.MOCK_MODE === 'true') {
      const caseId = `rc-${mockIdCounter++}-${Date.now()}`
      const now = new Date().toISOString()
      const estDate = new Date()
      estDate.setDate(estDate.getDate() + config.avgDaysToComplete)

      const documents = config.documents.map((d, i) => ({
        id:          `doc-${caseId}-${i}`,
        doc_type:    d.docType,
        doc_label:   d.label,
        is_required: d.isRequired,
        is_received: d.canAutoFetch,
        is_verified: false,
        auto_fetched:d.canAutoFetch,
        notes:       d.helpText,
        uploaded_at: d.canAutoFetch ? now : null,
      }))

      const mockCase: MockCase = {
        id:                  caseId,
        userId,
        recoveryType:        params.recoveryType,
        assetDescription:    params.assetDescription,
        institutionName:     params.institutionName ?? '',
        status:              'pending_agreement',
        estimatedValuePaise: params.estimatedValuePaise,
        feePct:              feeDetails.feePct,
        feeAmountPaise:      feeDetails.feeAmountPaise,
        estimatedCompletion: estDate.toISOString().split('T')[0],
        initiatedAt:         now,
        createdAt:           now,
        updatedAt:           now,
        documents,
        timeline: [{
          title:       'Recovery initiated',
          description: `Recovery case opened for ${params.assetDescription}. Please review and accept the success fee agreement.`,
          to_status:   'pending_agreement',
          created_at:  now,
        }],
      }

      mockCases.push(mockCase)

      return {
        caseId,
        feeDetails,
        config: {
          label:             config.label,
          avgDaysToComplete: config.avgDaysToComplete,
          successRatePct:    config.successRatePct,
          steps:             config.steps,
          govPortalUrl:      config.govPortalUrl,
        },
        agreementText,
      }
    }

    // Real DB mode
    const result = await pool.query(`
      INSERT INTO recovery_cases (
        user_id, recovery_type,
        asset_description, institution_name,
        estimated_value_paise,
        folio_number_enc, policy_number_enc,
        uan_number_enc, account_number_enc,
        isin, status, fee_pct, fee_amount_paise,
        estimated_completion
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        'pending_agreement',$11,$12,
        CURRENT_DATE + $13 * INTERVAL '1 day'
      )
      RETURNING id
    `, [
      userId,
      params.recoveryType,
      params.assetDescription,
      params.institutionName,
      params.estimatedValuePaise,
      params.folioNumber  ? encryptPII(params.folioNumber)  : null,
      params.policyNumber ? encryptPII(params.policyNumber) : null,
      params.uanNumber    ? encryptPII(params.uanNumber)    : null,
      params.accountNumber? encryptPII(params.accountNumber): null,
      params.isin,
      feeDetails.feePct,
      feeDetails.feeAmountPaise,
      config.avgDaysToComplete
    ])

    const caseId = result.rows[0].id

    await documentCollector.createChecklist(pool, caseId, userId, params.recoveryType)

    await logTimeline(pool, caseId, userId, null, 'pending_agreement',
      'Recovery initiated',
      `Recovery case opened for ${params.assetDescription}. Please review and accept the success fee agreement.`
    )

    return {
      caseId,
      feeDetails,
      config: {
        label:             config.label,
        avgDaysToComplete: config.avgDaysToComplete,
        successRatePct:    config.successRatePct,
        steps:             config.steps,
        govPortalUrl:      config.govPortalUrl,
      },
      agreementText,
    }
  },

  /**
   * Step 2: User accepts the success fee agreement.
   */
  async acceptFeeAgreement(
    pool:      Pool,
    userId:    string,
    caseId:    string,
    ipAddress: string,
    userAgent: string
  ) {
    // Mock mode
    if (process.env.MOCK_MODE === 'true') {
      const mc = mockCases.find(c => c.id === caseId && c.userId === userId)
      if (!mc) throw new Error('Recovery case not found')
      if (mc.status !== 'pending_agreement') throw new Error('Agreement already accepted')

      mc.status = 'documents_collecting'
      mc.feeAgreementSignedAt = new Date().toISOString()
      mc.updatedAt = new Date().toISOString()
      mc.timeline.push({
        title:       'Fee agreement signed',
        description: `You agreed to a ${mc.feePct}% success fee. We will only charge after money reaches your account. Now collecting required documents.`,
        to_status:   'documents_collecting',
        created_at:  new Date().toISOString(),
      })
      return
    }

    const caseRow = await getCaseOrThrow(pool, caseId, userId)
    if (caseRow.status !== 'pending_agreement') {
      throw new Error('Agreement already accepted')
    }

    const feeDetails = calculateFee(caseRow.estimated_value_paise, caseRow.recovery_type)
    const agreementText = generateAgreementText(
      caseRow.asset_description,
      caseRow.institution_name,
      caseRow.estimated_value_paise,
      feeDetails.feePct,
      feeDetails.feeAmountPaise,
      RECOVERY_CONFIGS[caseRow.recovery_type as RecoveryType].avgDaysToComplete
    )

    await pool.query(`
      INSERT INTO recovery_fee_agreements (
        case_id, user_id, fee_pct,
        estimated_fee_paise, agreement_text,
        user_ip, user_agent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [caseId, userId, feeDetails.feePct, feeDetails.feeAmountPaise, agreementText, ipAddress, userAgent])

    await pool.query(`
      UPDATE recovery_cases
      SET status = 'documents_collecting',
          fee_agreement_signed_at = NOW(),
          initiated_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [caseId])

    await logTimeline(pool, caseId, userId,
      'pending_agreement', 'documents_collecting',
      'Fee agreement signed',
      `You agreed to a ${feeDetails.feePct}% success fee. We will only charge after money reaches your account. Now collecting required documents.`
    )

    await documentCollector.autoFetchDigiLocker(pool, caseId, userId)

    await recoveryNotifier.send(pool, caseId, userId, {
      channel: 'push',
      title:   'Recovery started!',
      body:    'Please upload the required documents to proceed.'
    })
  },

  /**
   * Step 3: User uploads a document.
   */
  async uploadDocument(
    pool:          Pool,
    userId:        string,
    caseId:        string,
    docType:       string,
    s3Key:         string,
    fileName:      string,
    fileSizeBytes: number,
    mimeType:      string
  ): Promise<{ allDocumentsComplete: boolean }> {
    // Mock mode
    if (process.env.MOCK_MODE === 'true') {
      const mc = mockCases.find(c => c.id === caseId && c.userId === userId)
      if (!mc) throw new Error('Recovery case not found')

      const doc = mc.documents.find(d => d.doc_type === docType)
      if (doc) {
        doc.is_received = true
        doc.file_name = fileName
        doc.uploaded_at = new Date().toISOString()
      }

      const requiredDocs = mc.documents.filter(d => d.is_required)
      const allComplete = requiredDocs.every(d => d.is_received)

      if (allComplete && mc.status === 'documents_collecting') {
        mc.status = 'documents_complete'
        mc.updatedAt = new Date().toISOString()
        mc.timeline.push({
          title:       'All documents received',
          description: 'All required documents collected. Our team will now prepare and submit your claim.',
          to_status:   'documents_complete',
          created_at:  new Date().toISOString(),
        })
      }

      return { allDocumentsComplete: allComplete }
    }

    // Real DB mode
    await pool.query(`
      UPDATE recovery_documents
      SET is_received  = true,
          s3_key       = $3,
          file_name    = $4,
          file_size_bytes = $5,
          mime_type    = $6,
          uploaded_at  = NOW()
      WHERE case_id = $1
      AND doc_type  = $2
      AND user_id   = $7
    `, [caseId, docType, s3Key, fileName, fileSizeBytes, mimeType, userId])

    const docsStatus = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_required = true)  AS required_total,
        COUNT(*) FILTER (WHERE is_required = true AND is_received = true) AS required_received
      FROM recovery_documents
      WHERE case_id = $1
    `, [caseId])

    const total    = parseInt(docsStatus.rows[0].required_total)
    const received = parseInt(docsStatus.rows[0].required_received)
    const allComplete = received >= total

    if (allComplete) {
      await pool.query(`
        UPDATE recovery_cases
        SET status = 'documents_complete', updated_at = NOW()
        WHERE id = $1 AND status = 'documents_collecting'
      `, [caseId])

      await logTimeline(pool, caseId, userId,
        'documents_collecting', 'documents_complete',
        'All documents received',
        'All required documents collected. Our team will now prepare and submit your claim.'
      )
    }

    return { allDocumentsComplete: allComplete }
  },

  /**
   * Get full case details for user.
   */
  async getCaseDetails(
    pool:   Pool,
    userId: string,
    caseId: string
  ) {
    // Mock mode
    if (process.env.MOCK_MODE === 'true') {
      const mc = mockCases.find(c => c.id === caseId && c.userId === userId)
      if (!mc) throw new Error('Case not found')

      const config = RECOVERY_CONFIGS[mc.recoveryType]
      const feeDetails = calculateFee(mc.estimatedValuePaise, mc.recoveryType)
      const progress = timelineEstimator.getProgressPercentage(mc.status)
      const estimate = timelineEstimator.estimateCompletion(mc.recoveryType, mc.status, mc.submittedAt)

      const requiredDocs = mc.documents.filter(d => d.is_required)
      const receivedDocs = requiredDocs.filter(d => d.is_received)

      return {
        id:                   mc.id,
        recovery_type:        mc.recoveryType,
        asset_description:    mc.assetDescription,
        institution_name:     mc.institutionName,
        status:               mc.status,
        estimated_value_paise:mc.estimatedValuePaise,
        recovered_value_paise:mc.recoveredValuePaise,
        fee_pct:              mc.feePct,
        fee_amount_paise:     mc.feeAmountPaise,
        estimated_completion: mc.estimatedCompletion,
        submitted_at:         mc.submittedAt,
        completed_at:         mc.completedAt,
        created_at:           mc.createdAt,
        config: {
          label:             config.label,
          avgDaysToComplete: config.avgDaysToComplete,
          successRatePct:    config.successRatePct,
          steps:             config.steps,
          govPortalUrl:      config.govPortalUrl,
        },
        documents:    mc.documents,
        docsComplete: receivedDocs.length,
        docsTotal:    requiredDocs.length,
        timeline:     mc.timeline,
        feeDetails,
        progress,
        estimate,
        legalDisclaimer: LEGAL_DISCLAIMER,
      }
    }

    // Real DB mode
    const [caseResult, docsResult, timelineResult] = await Promise.all([
      pool.query('SELECT * FROM recovery_cases WHERE id=$1 AND user_id=$2', [caseId, userId]),
      pool.query(
        `SELECT id, doc_type, doc_label, is_required, is_received, is_verified,
                file_name, uploaded_at, auto_fetched, notes
         FROM recovery_documents WHERE case_id=$1 ORDER BY is_required DESC, doc_type`,
        [caseId]
      ),
      pool.query(
        `SELECT title, description, to_status, created_at
         FROM recovery_timeline
         WHERE case_id=$1 AND is_user_visible=true ORDER BY created_at ASC`,
        [caseId]
      )
    ])

    if (!caseResult.rows[0]) throw new Error('Case not found')

    const rc     = caseResult.rows[0]
    const config = RECOVERY_CONFIGS[rc.recovery_type as RecoveryType]
    const feeDetails = rc.recovered_value_paise
      ? calculateFee(rc.recovered_value_paise, rc.recovery_type)
      : calculateFee(rc.estimated_value_paise, rc.recovery_type)
    const progress = timelineEstimator.getProgressPercentage(rc.status)
    const estimate = timelineEstimator.estimateCompletion(rc.recovery_type, rc.status, rc.submitted_at)

    return {
      ...rc,
      config: {
        label:             config.label,
        avgDaysToComplete: config.avgDaysToComplete,
        successRatePct:    config.successRatePct,
        steps:             config.steps,
        govPortalUrl:      config.govPortalUrl,
      },
      documents:    docsResult.rows,
      docsComplete: docsResult.rows.filter((d: any) => d.is_required && d.is_received).length,
      docsTotal:    docsResult.rows.filter((d: any) => d.is_required).length,
      timeline:     timelineResult.rows,
      feeDetails,
      progress,
      estimate,
      legalDisclaimer: LEGAL_DISCLAIMER,
    }
  },

  /**
   * List all active cases for user dashboard.
   */
  async getUserCases(
    pool:   Pool,
    userId: string
  ) {
    // Mock mode
    if (process.env.MOCK_MODE === 'true') {
      return mockCases
        .filter(c => c.userId === userId && c.status !== 'withdrawn')
        .map(mc => {
          const config = RECOVERY_CONFIGS[mc.recoveryType]
          const requiredDocs = mc.documents.filter(d => d.is_required)
          const receivedDocs = requiredDocs.filter(d => d.is_received)
          const progress = timelineEstimator.getProgressPercentage(mc.status)
          const estimate = timelineEstimator.estimateCompletion(mc.recoveryType, mc.status, mc.submittedAt)

          return {
            id:                    mc.id,
            recovery_type:         mc.recoveryType,
            asset_description:     mc.assetDescription,
            institution_name:      mc.institutionName,
            status:                mc.status,
            estimated_value_paise: mc.estimatedValuePaise,
            recovered_value_paise: mc.recoveredValuePaise,
            fee_pct:               mc.feePct,
            fee_amount_paise:      mc.feeAmountPaise,
            estimated_completion:  mc.estimatedCompletion,
            submitted_at:          mc.submittedAt,
            completed_at:          mc.completedAt,
            created_at:            mc.createdAt,
            docs_total:            requiredDocs.length,
            docs_received:         receivedDocs.length,
            progress,
            estimate,
            config: {
              label:          config.label,
              successRatePct: config.successRatePct,
            },
            legalDisclaimer: LEGAL_DISCLAIMER,
          }
        })
    }

    // Real DB mode
    const result = await pool.query(`
      SELECT
        rc.id, rc.recovery_type, rc.asset_description,
        rc.institution_name, rc.status,
        rc.estimated_value_paise, rc.recovered_value_paise,
        rc.fee_pct, rc.fee_amount_paise,
        rc.estimated_completion, rc.submitted_at,
        rc.completed_at, rc.created_at,
        (SELECT COUNT(*) FROM recovery_documents rd WHERE rd.case_id = rc.id AND rd.is_required = true) AS docs_total,
        (SELECT COUNT(*) FROM recovery_documents rd WHERE rd.case_id = rc.id AND rd.is_required = true AND rd.is_received = true) AS docs_received
      FROM recovery_cases rc
      WHERE rc.user_id = $1 AND rc.status != 'withdrawn'
      ORDER BY
        CASE rc.status
          WHEN 'amount_credited' THEN 1
          WHEN 'additional_docs_needed' THEN 2
          WHEN 'documents_collecting' THEN 3
          WHEN 'submitted' THEN 4
          WHEN 'under_review' THEN 5
          ELSE 6
        END,
        rc.created_at DESC
    `, [userId])

    return result.rows.map((rc: any) => {
      const config = RECOVERY_CONFIGS[rc.recovery_type as RecoveryType]
      const progress = timelineEstimator.getProgressPercentage(rc.status)
      const estimate = timelineEstimator.estimateCompletion(rc.recovery_type, rc.status, rc.submitted_at)
      return {
        ...rc,
        progress,
        estimate,
        config: {
          label:          config?.label,
          successRatePct: config?.successRatePct,
        },
        legalDisclaimer: LEGAL_DISCLAIMER,
      }
    })
  },
}

// ── Helpers ──

function generateAgreementText(
  assetDescription:    string,
  institutionName:     string,
  estimatedValuePaise: number,
  feePct:              number,
  feeAmountPaise:      number,
  avgDays:             number
): string {
  const entityName = process.env.LEGAL_ENTITY_NAME || 'AssetMap Recovery Services Pvt. Ltd.'
  return `
${entityName.toUpperCase()} — SUCCESS FEE AGREEMENT

Asset to be recovered: ${assetDescription}
Institution: ${institutionName}
Estimated value: ₹${fmtPaise(estimatedValuePaise)}

SUCCESS FEE TERMS:
${entityName} will charge ${feePct}% of the actual amount recovered, estimated at ₹${fmtPaise(feeAmountPaise)} plus 18% GST.

The success fee is charged ONLY after the money has been confirmed credited to your bank account. You pay nothing upfront. If recovery fails, you pay nothing.

PROCESS:
${entityName} will assist with document preparation, form filling, and submission tracking. The estimated timeline is ${avgDays} days. Actual timeline depends on government processing times outside our control.

DISCLAIMER:
${LEGAL_DISCLAIMER}

By accepting, you confirm you have read and understood these terms.
  `.trim()
}

async function getCaseOrThrow(pool: Pool, caseId: string, userId: string) {
  const result = await pool.query(
    'SELECT * FROM recovery_cases WHERE id=$1 AND user_id=$2',
    [caseId, userId]
  )
  if (!result.rows[0]) throw new Error('Recovery case not found')
  return result.rows[0]
}

async function logTimeline(
  pool:        Pool,
  caseId:      string,
  userId:      string,
  fromStatus:  string | null,
  toStatus:    string,
  title:       string,
  description: string
): Promise<void> {
  if (process.env.MOCK_MODE === 'true') return
  await pool.query(`
    INSERT INTO recovery_timeline (
      case_id, user_id, from_status, to_status, title, description
    ) VALUES ($1,$2,$3,$4,$5,$6)
  `, [caseId, userId, fromStatus, toStatus, title, description])
}

function fmtPaise(paise: number): string {
  const v = paise / 100
  if (v >= 10000000) return `${(v / 10000000).toFixed(2)} Cr`
  if (v >= 100000)   return `${(v / 100000).toFixed(1)} L`
  return v.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}
