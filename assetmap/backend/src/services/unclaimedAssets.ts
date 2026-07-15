import axios from 'axios'
import * as cheerio from 'cheerio'
import { Pool } from 'pg'
import { encryptPII as encrypt, decryptPII as decrypt } from '../utils/encryption'
import { auditLogger } from './auditLogger'

// IEPF, EPFO, IRDAI portals — public data
const IEPF_SEARCH_URL =
  'https://iepf.gov.in/IEPF/unclaimeddividend/searchUnclaimedDividentInfo.html'
const EPFO_PASSBOOK_URL =
  'https://passbook.epfindia.gov.in/MemberPassBook/Login'
const IRDAI_UNCLAIMED_URL =
  'https://insurancesamadhan.gov.in/unclaimedamt'

export const unclaimedAssets = {

  // Initiate a paid search after payment verified
  async initiateSearch(
    pool: Pool,
    userId: string,
    params: {
      pan:          string
      name:         string
      aadhaarHash?: string
      paymentId:    string
    }
  ): Promise<string> {
    const result = await pool.query(`
      INSERT INTO unclaimed_search_requests (
        user_id, pan_enc, name_enc,
        aadhaar_hash, payment_id, payment_status,
        search_status
      ) VALUES ($1,$2,$3,$4,$5,'completed','pending')
      RETURNING id
    `, [
      userId,
      encrypt(params.pan),
      encrypt(params.name),
      params.aadhaarHash,
      params.paymentId
    ])

    const searchId = result.rows[0].id

    // Queue background search
    await this.runSearch(pool, searchId, userId, params)

    return searchId
  },

  async runSearch(
    pool: Pool,
    searchId: string,
    userId: string,
    params: { pan: string; name: string }
  ): Promise<void> {
    await pool.query(`
      UPDATE unclaimed_search_requests
      SET search_status = 'running', searched_at = NOW()
      WHERE id = $1
    `, [searchId])

    const results: any[] = []

    try {
      // Search 1 — IEPF (unclaimed dividends, shares, deposits)
      const iepfResults = await this.searchIEPF(params.pan, params.name)
      results.push(...iepfResults)

      // Search 2 — EPFO (unclaimed PF balances)
      const epfoResults = await this.searchEPFO(params.pan)
      results.push(...epfoResults)

      // Search 3 — IRDAI (unclaimed insurance amounts)
      const irdaiResults = await this.searchIRDAI(params.pan, params.name)
      results.push(...irdaiResults)

      // Store all results
      for (const item of results) {
        await pool.query(`
          INSERT INTO unclaimed_assets_found (
            search_id, user_id, source, asset_type,
            company_name, folio_number_enc, amount_paise,
            claim_url, claim_process, documents_needed,
            raw_response_enc
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
          searchId, userId,
          item.source, item.assetType,
          item.companyName,
          item.folioNumber ? encrypt(item.folioNumber) : null,
          item.amountPaise,
          item.claimUrl, item.claimProcess,
          JSON.stringify(item.documentsNeeded || []),
          encrypt(JSON.stringify(item.raw))
        ])
      }

      await pool.query(`
        UPDATE unclaimed_search_requests
        SET search_status = 'completed', completed_at = NOW()
        WHERE id = $1
      `, [searchId])

    } catch (err) {
      console.error('[UnclaimedSearch] Failed:', err)
      await pool.query(`
        UPDATE unclaimed_search_requests
        SET search_status = 'failed'
        WHERE id = $1
      `, [searchId])
    }

    await auditLogger.log(
      userId,
      'UNCLAIMED_SEARCH_COMPLETED' as any,
      'unclaimed_search',
      searchId,
      undefined,
      undefined,
      { resultsFound: results.length }
    )
  },

  async searchIEPF(pan: string, name: string): Promise<any[]> {
    try {
      const response = await axios.post(
        IEPF_SEARCH_URL,
        new URLSearchParams({ pan, name, searchType: 'PAN' }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':   'Mozilla/5.0 AssetMap/1.0'
          },
          timeout: 20000
        }
      )

      const $ = cheerio.load(response.data)
      const results: any[] = []

      // Parse IEPF result table
      $('table.data-table tbody tr').each((_: any, row: any) => {
        const cols = $(row).find('td').map((_: any, td: any) => $(td).text().trim()).get()
        if (cols.length >= 5) {
          const amountStr = cols[4]?.replace(/[₹,]/g,'') || '0'
          const amountPaise = Math.round(parseFloat(amountStr) * 100)

          if (amountPaise > 0) {
            results.push({
              source:       'iepf',
              assetType:    'Unclaimed dividend / share',
              companyName:  cols[1],
              folioNumber:  cols[2],
              amountPaise,
              claimUrl:     'https://iepf.gov.in/IEPF/refund.html',
              claimProcess: 'File IEPF-5 form online at iepf.gov.in. ' +
                            'Verification takes 60–90 days.',
              documentsNeeded: [
                'Original share certificates or folio details',
                'Proof of identity (Aadhaar/PAN)',
                'Cancelled cheque',
                'Indemnity bond (if amount > ₹10,000)'
              ],
              raw: { cols }
            })
          }
        }
      })

      return results
    } catch (err) {
      console.error('[IEPF Search] Failed:', err)
      return []
    }
  },

  async searchEPFO(pan: string): Promise<any[]> {
    // EPFO does not have a public API — use UMANG API if available
    // or return empty and prompt user to check manually
    try {
      const response = await axios.get(
        `https://api.umang.gov.in/epfo/member/balance`,
        {
          params:  { pan },
          headers: {
            'x-api-key':  process.env.UMANG_API_KEY!,
            'deptId':     'EPFO'
          },
          timeout: 15000
        }
      )

      const data = response.data?.data || []
      return data.map((item: any) => ({
        source:       'epfo',
        assetType:    'Unclaimed PF balance',
        companyName:  item.establishment_name,
        folioNumber:  item.member_id,
        amountPaise:  Math.round((item.net_balance || 0) * 100),
        claimUrl:     'https://unifiedportal-mem.epfindia.gov.in',
        claimProcess: 'Login to EPFO unified portal with UAN. ' +
                      'Submit Form 19 (PF withdrawal) or Form 10C (pension).',
        documentsNeeded: [
          'UAN number',
          'Aadhaar linked to UAN',
          'Bank account details',
          'Form 19 / 10C'
        ],
        raw: item
      }))
    } catch {
      // Return a manual check prompt if API fails
      return [{
        source:       'epfo',
        assetType:    'PF balance check required',
        companyName:  'EPFO',
        folioNumber:  null,
        amountPaise:  0,
        claimUrl:     'https://passbook.epfindia.gov.in',
        claimProcess: 'Check your PF balance manually at ' +
                      'passbook.epfindia.gov.in using your UAN.',
        documentsNeeded: ['UAN number', 'Aadhaar OTP'],
        raw: {}
      }]
    }
  },

  async searchIRDAI(pan: string, name: string): Promise<any[]> {
    try {
      const response = await axios.post(
        IRDAI_UNCLAIMED_URL,
        new URLSearchParams({ pan, name }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20000
        }
      )

      const $ = cheerio.load(response.data)
      const results: any[] = []

      $('table tbody tr').each((_: any, row: any) => {
        const cols = $(row).find('td').map((_: any, td: any) => $(td).text().trim()).get()
        if (cols.length >= 4 && cols[3]) {
          const amountStr  = cols[3]?.replace(/[₹,]/g,'') || '0'
          const amountPaise = Math.round(parseFloat(amountStr) * 100)

          if (amountPaise > 0) {
            results.push({
              source:       'irdai_insurance',
              assetType:    'Unclaimed insurance amount',
              companyName:  cols[0],
              folioNumber:  cols[1],
              amountPaise,
              claimUrl:     'https://insurancesamadhan.gov.in',
              claimProcess: 'Contact the insurer directly with policy details. ' +
                            'File a complaint on Bima Bharosa if unresolved.',
              documentsNeeded: [
                'Policy document or number',
                'KYC documents (Aadhaar, PAN)',
                'Death certificate (if claiming on behalf of deceased)',
                'Bank account details'
              ],
              raw: { cols }
            })
          }
        }
      })

      return results
    } catch (err) {
      console.error('[IRDAI Search] Failed:', err)
      return []
    }
  },

  async getSearchResults(
    pool: Pool,
    userId: string,
    searchId: string
  ): Promise<{ request: any; results: any[] }> {
    const [reqResult, foundResult] = await Promise.all([
      pool.query(
        'SELECT * FROM unclaimed_search_requests WHERE id=$1 AND user_id=$2',
        [searchId, userId]
      ),
      pool.query(
        `SELECT id, source, asset_type, company_name,
                amount_paise, claim_url, claim_process,
                documents_needed, is_claimed, created_at
         FROM unclaimed_assets_found
         WHERE search_id=$1 AND user_id=$2
         ORDER BY amount_paise DESC`,
        [searchId, userId]
      )
    ])

    return {
      request: reqResult.rows[0],
      results: foundResult.rows
    }
  }
}
