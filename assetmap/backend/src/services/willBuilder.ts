import { Pool } from 'pg'
import { encryptPII as encrypt, decryptPII as decrypt } from '../utils/encryption'
import { auditLogger } from './auditLogger'
import axios from 'axios'

// India Succession Act 1925 requirements:
// - Must be in writing
// - Signed by testator
// - Attested by 2 witnesses (not beneficiaries)
// - No stamp duty required for movable property wills

const WILL_DISCLAIMER = `
IMPORTANT NOTICE: This document is an asset allocation record
created using AssetMap and is NOT a substitute for a formally
drafted legal will. It is intended to assist you in organizing
your assets and communicating your wishes. For a legally valid
will under the Indian Succession Act 1925, please consult a
qualified lawyer. AssetMap Pvt. Ltd. does not provide legal
advice and this document creates no legal obligations.
`.trim()

export const willBuilder = {

  async createWill(
    pool: Pool,
    userId: string,
    data: {
      testatorName:      string
      testatorDob:       string
      testatorAddress:   string
      testatorPan:       string
      testatorAadhaarHash: string
      executorName:      string
      executorRelation:  string
      executorMobile:    string
      altExecutorName?:  string
      subscriptionPlan:  'basic' | 'premium'
      subscriptionId:    string
    }
  ): Promise<string> {
    // Supersede any existing draft will
    await pool.query(`
      UPDATE wills SET status = 'superseded', updated_at = NOW()
      WHERE user_id = $1 AND status IN ('draft','completed')
    `, [userId])

    const validUntil = new Date()
    validUntil.setFullYear(validUntil.getFullYear() + 1)

    const result = await pool.query(`
      INSERT INTO wills (
        user_id,
        testator_name_enc, testator_dob_enc,
        testator_address_enc, testator_pan_enc,
        testator_aadhaar_hash,
        executor_name_enc, executor_relation,
        executor_mobile_enc, alt_executor_name_enc,
        subscription_id, subscription_plan,
        subscription_valid_until, status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft'
      )
      RETURNING id
    `, [
      userId,
      encrypt(data.testatorName),
      encrypt(data.testatorDob),
      encrypt(data.testatorAddress),
      encrypt(data.testatorPan),
      data.testatorAadhaarHash,
      encrypt(data.executorName),
      data.executorRelation,
      encrypt(data.executorMobile),
      data.altExecutorName ? encrypt(data.altExecutorName) : null,
      data.subscriptionId,
      data.subscriptionPlan,
      validUntil.toISOString().split('T')[0]
    ])

    const willId = result.rows[0].id

    await auditLogger.log(
      userId,
      'WILL_CREATED' as any,
      'will',
      willId
    )

    return willId
  },

  async addBeneficiary(
    pool: Pool,
    userId: string,
    willId: string,
    data: {
      name:         string
      relation:     string
      dob?:         string
      mobile?:      string
      email?:       string
      address?:     string
      aadhaarHash?: string
      pan?:         string
    }
  ): Promise<string> {
    const result = await pool.query(`
      INSERT INTO will_beneficiaries (
        will_id, user_id,
        name_enc, relation,
        dob_enc, mobile_enc, email_enc,
        address_enc, aadhaar_hash, pan_enc
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
    `, [
      willId, userId,
      encrypt(data.name),
      data.relation,
      data.dob    ? encrypt(data.dob)    : null,
      data.mobile ? encrypt(data.mobile) : null,
      data.email  ? encrypt(data.email)  : null,
      data.address? encrypt(data.address): null,
      data.aadhaarHash ?? null,
      data.pan    ? encrypt(data.pan)    : null
    ])
    return result.rows[0].id
  },

  async addAllocation(
    pool: Pool,
    userId: string,
    willId: string,
    data: {
      assetType:           string
      assetRefId?:         string
      assetDescription:    string
      estimatedValuePaise: number
      beneficiaryId:       string
      beneficiaryName:     string
      beneficiaryRelation: string
      allocationPct:       number
      conditionText?:      string
      notes?:              string
    }
  ): Promise<string> {
    // Validate total allocation for this asset does not exceed 100%
    const existing = await pool.query(`
      SELECT COALESCE(SUM(allocation_pct), 0) AS total
      FROM will_allocations
      WHERE will_id = $1 AND asset_ref_id = $2
    `, [willId, data.assetRefId])

    const currentTotal = parseFloat(existing.rows[0].total)
    if (currentTotal + data.allocationPct > 100) {
      throw new Error(
        `Allocation exceeds 100% for this asset. ` +
        `Current: ${currentTotal}%, Adding: ${data.allocationPct}%`
      )
    }

    const result = await pool.query(`
      INSERT INTO will_allocations (
        will_id, user_id,
        asset_type, asset_ref_id, asset_description,
        estimated_value_paise,
        beneficiary_name_enc, beneficiary_relation,
        allocation_pct, condition_text, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id
    `, [
      willId, userId,
      data.assetType, data.assetRefId ?? null,
      data.assetDescription, data.estimatedValuePaise,
      encrypt(data.beneficiaryName),
      data.beneficiaryRelation,
      data.allocationPct,
      data.conditionText ?? null,
      data.notes ?? null
    ])
    return result.rows[0].id
  },

  async generatePDF(
    pool: Pool,
    userId: string,
    willId: string
  ): Promise<Buffer> {
    // Fetch complete will data
    const will = await this.getFullWill(pool, userId, willId)
    if (!will) throw new Error('Will not found')

    const PDFDocument = (await import('pdfkit')).default

    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const buffers: Buffer[] = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => resolve(Buffer.concat(buffers as Uint8Array[])))
      doc.on('error', reject)

      // Header / Title
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#111827').text('LAST WILL AND TESTAMENT', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica').fillColor('#4b5563').text(`Of ${will.testator_name}`, { align: 'center' })
      doc.moveDown(1.5)

      // Testator Details
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('1. Testator Information')
      doc.moveDown(0.3)
      doc.fontSize(10).font('Helvetica').fillColor('#374151')
      doc.text(`Name: ${will.testator_name}`)
      doc.text(`Date of Birth: ${will.testator_dob}`)
      doc.text(`Address: ${will.testator_address}`)
      doc.text(`PAN: ${will.testator_pan}`)
      doc.moveDown(1)

      // Executor Details
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('2. Appointed Executor')
      doc.moveDown(0.3)
      doc.fontSize(10).font('Helvetica').fillColor('#374151')
      doc.text(`Executor: ${will.executor_name} (${will.executor_relation})`)
      doc.text(`Mobile: ${will.executor_mobile}`)
      if (will.alt_executor_name) {
        doc.text(`Alternate Executor: ${will.alt_executor_name}`)
      }
      doc.moveDown(1)

      // Beneficiaries & Allocations
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('3. Beneficiaries & Asset Allocations')
      doc.moveDown(0.3)
      if (will.beneficiaries && will.beneficiaries.length > 0) {
        for (const b of will.beneficiaries) {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#1f2937').text(`Beneficiary: ${b.name} (${b.relationship})`)
          if (b.allocations && b.allocations.length > 0) {
            for (const a of b.allocations) {
              doc.fontSize(10).font('Helvetica').fillColor('#4b5563')
                .text(`  • ${a.asset_type.replace(/_/g, ' ').toUpperCase()}: ${a.asset_description || 'Asset'} — ${a.allocation_pct}%`)
            }
          } else {
            doc.fontSize(10).font('Helvetica-Oblique').fillColor('#9ca3af').text('  No specific asset allocations assigned.')
          }
          doc.moveDown(0.4)
        }
      } else {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#9ca3af').text('No beneficiaries added.')
      }
      doc.moveDown(1.5)

      // Legal Disclaimer
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#6b7280').text(WILL_DISCLAIMER, { align: 'justify' })
      doc.moveDown(2)

      // Signatures
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Signature of Testator: ______________________', { align: 'left' })
      doc.moveDown(1)
      doc.text('Witness 1: ______________________          Witness 2: ______________________', { align: 'left' })

      doc.end()
    })

    // Store in S3 if S3 configured
    if (process.env.AWS_REGION && process.env.S3_BUCKET_DOCUMENTS) {
      try {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
        const s3 = new S3Client({ region: process.env.AWS_REGION })
        const s3Key = `wills/${userId}/${willId}/will-v${will.will_version}.pdf`

        await s3.send(new PutObjectCommand({
          Bucket:      process.env.S3_BUCKET_DOCUMENTS,
          Key:         s3Key,
          Body:        pdfBuffer,
          ContentType: 'application/pdf',
          ServerSideEncryption: 'AES256',
          Metadata:    { userId, willId }
        }))

        await pool.query(`
          UPDATE wills
          SET pdf_s3_key = $2, pdf_generated_at = NOW(),
              status = 'completed', updated_at = NOW()
          WHERE id = $1
        `, [willId, s3Key])
      } catch (s3Err) {
        console.warn('S3 upload skipped or not configured:', (s3Err as Error).message)
      }
    }

    await auditLogger.log(
      userId,
      'WILL_PDF_GENERATED' as any,
      'will',
      willId
    )

    return pdfBuffer
  },

  async initiateESign(
    pool: Pool,
    userId: string,
    willId: string
  ): Promise<string> {
    // DigiSign / Zoho Sign API integration
    // Returns redirect URL for user to sign
    const will = await this.getFullWill(pool, userId, willId)
    if (!will?.pdf_s3_key) throw new Error('Generate PDF first')

    const response = await axios.post(
      'https://api.zoho.com/sign/v1/requests',
      {
        templates: { field_data: { field_text_data: {} } },
        actions: [{
          recipient_name:  decrypt(will.testator_name_enc),
          recipient_email: decrypt(will.testator_email_enc ?? ''),
          action_type:     'SIGN',
          signing_order:    1
        }],
        notes: 'AssetMap Will Document — ' + new Date().toLocaleDateString()
      },
      { headers: { Authorization: `Zoho-oauthtoken ${process.env.ZOHO_SIGN_TOKEN}` } }
    )

    const signRef = response.data?.requests?.request_id

    await pool.query(`
      UPDATE wills
      SET esign_ref = $2, esign_status = 'pending', updated_at = NOW()
      WHERE id = $1
    `, [willId, signRef])

    return response.data?.requests?.sign_url
  },

  async getFullWill(
    pool: Pool,
    userId: string,
    willId: string
  ): Promise<any | null> {
    const [willResult, allocResult, benResult] = await Promise.all([
      pool.query('SELECT * FROM wills WHERE id=$1 AND user_id=$2',
        [willId, userId]),
      pool.query(
        `SELECT * FROM will_allocations
         WHERE will_id=$1 ORDER BY asset_type, created_at`,
        [willId]
      ),
      pool.query(
        'SELECT * FROM will_beneficiaries WHERE will_id=$1', [willId]
      )
    ])

    if (!willResult.rows[0]) return null

    const will = willResult.rows[0]
    return {
      ...will,
      testatorName:    decrypt(will.testator_name_enc),
      testatorAddress: decrypt(will.testator_address_enc),
      executorName:    decrypt(will.executor_name_enc),
      executorMobile:  decrypt(will.executor_mobile_enc),
      testator_name_enc:    undefined,
      testator_dob_enc:     undefined,
      testator_address_enc: undefined,
      testator_pan_enc:     undefined,
      executor_name_enc:    undefined,
      executor_mobile_enc:  undefined,
      allocations: allocResult.rows.map(a => ({
        ...a,
        beneficiaryName: decrypt(a.beneficiary_name_enc),
        beneficiary_name_enc: undefined
      })),
      beneficiaries: benResult.rows.map(b => ({
        ...b,
        name:   decrypt(b.name_enc),
        mobile: b.mobile_enc ? decrypt(b.mobile_enc) : null,
        name_enc: undefined, mobile_enc: undefined
      }))
    }
  }
}
