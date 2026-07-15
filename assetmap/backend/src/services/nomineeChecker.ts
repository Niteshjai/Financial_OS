import { Pool } from 'pg'
import { encryptPII as encrypt, decryptPII as decrypt } from '../utils/encryption'
import { alertService } from './alertService'

export const nomineeChecker = {

  async processAAData(
    pool: Pool,
    userId: string,
    aaFinancialData: any[]
  ): Promise<{ withNominee: number; withoutNominee: number }> {
    let withNominee    = 0
    let withoutNominee = 0

    for (const account of aaFinancialData) {
      const hasNominee = !!(
        account.nominee?.name ||
        account.nominees?.length > 0 ||
        account.nomineeRegistered === true
      )

      const nomineeName = account.nominee?.name ||
                          account.nominees?.[0]?.name || null

      await pool.query(`
        INSERT INTO nominee_status (
          user_id, account_ref, institution_name,
          fi_type, has_nominee, nominee_name_enc,
          last_checked_at
        ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (user_id, account_ref)
        DO UPDATE SET
          has_nominee       = EXCLUDED.has_nominee,
          nominee_name_enc  = EXCLUDED.nominee_name_enc,
          last_checked_at   = NOW(),
          updated_at        = NOW()
      `, [
        userId,
        account.accountRef || account.id || 'unknown_ref',
        account.fipName || account.institutionName || 'Unknown FI',
        account.fiType || 'UNKNOWN',
        hasNominee,
        nomineeName ? encrypt(nomineeName) : null
      ])

      if (hasNominee) withNominee++
      else            withoutNominee++
    }

    // Fire alert if any accounts lack nominee
    if (withoutNominee > 0) {
      const existing = await pool.query(`
        SELECT id FROM user_alerts
        WHERE user_id = $1
        AND alert_type = 'nominee_missing'
        AND created_at > NOW() - INTERVAL '30 days'
        LIMIT 1
      `, [userId])

      if (!existing.rows.length) {
        await alertService.createAlert(pool, {
          userId,
          type:     'nominee_missing',
          severity: 'warning',
          title:    `${withoutNominee} account${withoutNominee>1?'s have':' has'} no nominee`,
          body:     `${withoutNominee} of your linked accounts have no nominee. ` +
                    `RBI mandates nominee registration by Dec 2025. ` +
                    `Update now to protect your family.`,
          metadata: { withoutNominee, withNominee }
        })
      }
    }

    return { withNominee, withoutNominee }
  },

  async getNomineeStatus(
    pool: Pool,
    userId: string
  ): Promise<{
    accounts: any[]
    summary: { total: number; withNominee: number; withoutNominee: number; completionPct: number }
  }> {
    const result = await pool.query(`
      SELECT
        id, account_ref, institution_name,
        fi_type, has_nominee,
        nominee_name_enc, last_checked_at
      FROM nominee_status
      WHERE user_id = $1
      ORDER BY has_nominee ASC, institution_name ASC
    `, [userId])

    const accounts = result.rows.map(r => ({
      ...r,
      nomineeName: r.nominee_name_enc ? decrypt(r.nominee_name_enc) : null,
      nominee_name_enc: undefined
    }))

    const withNominee    = accounts.filter(a => a.has_nominee).length
    const withoutNominee = accounts.filter(a => !a.has_nominee).length
    const total          = accounts.length

    return {
      accounts,
      summary: {
        total,
        withNominee,
        withoutNominee,
        completionPct: total > 0 ? Math.round((withNominee / total) * 100) : 0
      }
    }
  }
}
