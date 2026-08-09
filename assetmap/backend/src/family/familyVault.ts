import { Pool } from 'pg'
import { randomBytes } from 'crypto'
import { auditLogger } from '../services/auditLogger'
import { familyAggregator } from './familyAggregator'
import { alertService } from '../services/alertService'

export const familyVault = {

  // Create a vault when Pro user enables the feature
  async createVault(
    pool: Pool,
    userId: string,
    vaultName: string = 'My Family'
  ): Promise<string> {


    const result = await pool.query(`
      INSERT INTO family_vaults (primary_user_id, vault_name)
      VALUES ($1, $2)
      ON CONFLICT (primary_user_id)
      DO UPDATE SET vault_name = EXCLUDED.vault_name,
                    updated_at = NOW()
      RETURNING id
    `, [userId, vaultName])

    const vaultId = result.rows[0].id

    // Add primary user as first member (always active)
    await pool.query(`
      INSERT INTO family_vault_members (
        vault_id, user_id, primary_user_id,
        status, relationship, display_name, avatar_color,
        share_bank_accounts, share_fixed_deposits, share_mutual_funds,
        share_equity, share_nps, share_epf, share_insurance,
        share_land, share_gold, share_total_networth, accepted_at
      ) VALUES (
        $1,$2,$2,'active','other','Me','#185FA5',
        true,true,true,true,true,true,true,true,false,true,NOW()
      )
      ON CONFLICT DO NOTHING
    `, [vaultId, userId])

    await auditLogger.log(
      userId,
      'FAMILY_VAULT_CREATED' as any,
      'family_vault',
      vaultId
    )

    return vaultId
  },

  // Send an invite to a family member
  async inviteMember(
    pool: Pool,
    primaryUserId: string,
    params: {
      mobile: string
      name: string
      relationship: string
    }
  ): Promise<{
    inviteToken: string
    inviteUrl: string
    memberId: string
  }> {
    // Get vault
    const vault = await pool.query(
      'SELECT id, max_members FROM family_vaults WHERE primary_user_id = $1',
      [primaryUserId]
    )
    if (!vault.rows[0]) {
      throw new Error('Create your family vault first')
    }

    const vaultId = vault.rows[0].id

    // Check member limit
    const memberCount = await pool.query(`
      SELECT COUNT(*) AS count FROM family_vault_members
      WHERE vault_id = $1 AND status IN ('invited','active')
    `, [vaultId])

    if (parseInt(memberCount.rows[0].count) >= vault.rows[0].max_members) {
      throw new Error(
        `Family vault is full (${vault.rows[0].max_members} members maximum). ` +
        'Remove a member to invite someone new.'
      )
    }

    // Check if this mobile is already in the vault
    const existing = await pool.query(`
      SELECT id FROM family_vault_members
      WHERE vault_id = $1
      AND invited_mobile = $2
      AND status IN ('invited','active')
    `, [vaultId, params.mobile])

    if (existing.rows[0]) {
      throw new Error('This person is already in your family vault')
    }

    // Generate secure invite token (expires 7 days)
    const inviteToken = randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Pick a unique avatar colour for this member
    const colours = ['#1D9E75', '#534AB7', '#E24B4A', '#eda100', '#D85A30']
    const usedColours = await pool.query(`
      SELECT avatar_color FROM family_vault_members
      WHERE vault_id = $1
    `, [vaultId])
    const used = usedColours.rows.map((r: any) => r.avatar_color)
    const colour = colours.find(c => !used.includes(c)) ?? colours[0]

    const result = await pool.query(`
      INSERT INTO family_vault_members (
        vault_id, primary_user_id,
        invite_token, invite_token_expires,
        invited_mobile, invited_name,
        relationship, status,
        display_name, avatar_color
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'invited',$6,$8)
      RETURNING id
    `, [
      vaultId, primaryUserId,
      inviteToken, tokenExpiry,
      params.mobile, params.name,
      params.relationship, colour
    ])

    const memberId = result.rows[0].id
    const inviteUrl = `${process.env.FRONTEND_URL}/family/join?token=${inviteToken}`

    // Send SMS invite
    const primaryUser = await pool.query(
      'SELECT name_encrypted FROM users WHERE id = $1',
      [primaryUserId]
    )
    const { decryptPII } = await import('../utils/encryption')
    const primaryName = decryptPII(primaryUser.rows[0].name_encrypted)

    await alertService.sendSMS(
      primaryUserId,
      params.mobile,
      `${primaryName} has invited you to their AssetMap Family Vault. ` +
      `Join to see your combined family finances: ${inviteUrl} ` +
      `(expires in 7 days)`,
      'dummy_template_id'
    )

    // Log activity
    await this.logActivity(pool, vaultId, primaryUserId, {
      type: 'member_joined',
      title: `${params.name} invited to family vault`,
      body: `Invite sent to ${params.mobile}`,
      meta: { memberId, relationship: params.relationship }
    })

    await auditLogger.log(
      primaryUserId,
      'FAMILY_MEMBER_INVITED' as any,
      'family_vault_member',
      memberId,
      undefined,
      undefined,
      { relationship: params.relationship }
    )

    return { inviteToken, inviteUrl, memberId }
  },

  // New member accepts invite
  async acceptInvite(
    pool: Pool,
    userId: string,
    inviteToken: string
  ): Promise<{ vaultId: string; primaryUserName: string }> {
    const member = await pool.query(`
      SELECT fvm.*, fv.primary_user_id, fv.vault_name, fv.id AS vault_id
      FROM family_vault_members fvm
      JOIN family_vaults fv ON fv.id = fvm.vault_id
      WHERE fvm.invite_token = $1
      AND fvm.status = 'invited'
      AND fvm.invite_token_expires > NOW()
    `, [inviteToken])

    if (!member.rows[0]) {
      throw new Error('Invite link is invalid or has expired')
    }

    const m = member.rows[0]

    // Check if this user already has an AssetMap account
    // If not, they register first, then this is called again

    await pool.query(`
      UPDATE family_vault_members
      SET user_id      = $2,
          status       = 'active',
          accepted_at  = NOW(),
          invite_token = NULL,    -- consume the token
          updated_at   = NOW()
      WHERE id = $1
    `, [m.id, userId])

    // Get primary user name
    const { decryptPII } = await import('../utils/encryption')
    const primaryUser = await pool.query(
      'SELECT name_encrypted FROM users WHERE id = $1',
      [m.primary_user_id]
    )
    const primaryName = decryptPII(primaryUser.rows[0].name_encrypted)

    // Trigger AA data fetch for new member so vault populates
    // Using existing data synchronization if available or a basic refresh
    // For now, we will assume background sync or user will sync manually

    // Log activity
    await this.logActivity(pool, m.vault_id, userId, {
      type: 'member_joined',
      title: `${m.invited_name} joined the family vault`,
      body: `${m.invited_name} accepted the invitation`,
      meta: { relationship: m.relationship }
    })

    await alertService.sendPushNotification(
      pool,
      m.primary_user_id,
      'New Member Joined',
      `${m.invited_name} has accepted your family vault invitation`
    )

    return {
      vaultId: m.vault_id,
      primaryUserName: primaryName
    }
  },

  // Member updates what they share
  async updateVisibility(
    pool: Pool,
    userId: string,
    prefs: {
      shareBankAccounts?: boolean
      shareFixedDeposits?: boolean
      shareMutualFunds?: boolean
      shareEquity?: boolean
      shareNps?: boolean
      shareEpf?: boolean
      shareInsurance?: boolean
      shareLand?: boolean
      shareGold?: boolean
      shareTotalNetworth?: boolean
      displayName?: string
    }
  ): Promise<void> {
    await pool.query(`
      UPDATE family_vault_members SET
        share_bank_accounts  = COALESCE($2, share_bank_accounts),
        share_fixed_deposits = COALESCE($3, share_fixed_deposits),
        share_mutual_funds   = COALESCE($4, share_mutual_funds),
        share_equity         = COALESCE($5, share_equity),
        share_nps            = COALESCE($6, share_nps),
        share_epf            = COALESCE($7, share_epf),
        share_insurance      = COALESCE($8, share_insurance),
        share_land           = COALESCE($9, share_land),
        share_gold           = COALESCE($10, share_gold),
        share_total_networth = COALESCE($11, share_total_networth),
        display_name         = COALESCE($12, display_name),
        updated_at           = NOW()
      WHERE user_id = $1 AND status = 'active'
    `, [
      userId,
      prefs.shareBankAccounts,
      prefs.shareFixedDeposits,
      prefs.shareMutualFunds,
      prefs.shareEquity,
      prefs.shareNps,
      prefs.shareEpf,
      prefs.shareInsurance,
      prefs.shareLand,
      prefs.shareGold,
      prefs.shareTotalNetworth,
      prefs.displayName
    ])
  },

  // Remove a member (primary user action)
  async removeMember(
    pool: Pool,
    primaryUserId: string,
    memberId: string
  ): Promise<void> {
    const member = await pool.query(`
      SELECT fvm.user_id, fvm.invited_name, fv.id AS vault_id
      FROM family_vault_members fvm
      JOIN family_vaults fv ON fv.id = fvm.vault_id
      WHERE fvm.id = $1 AND fv.primary_user_id = $2
    `, [memberId, primaryUserId])

    if (!member.rows[0]) throw new Error('Member not found')

    const m = member.rows[0]

    await pool.query(`
      UPDATE family_vault_members
      SET status = 'removed', updated_at = NOW()
      WHERE id = $1
    `, [memberId])

    await this.logActivity(pool, m.vault_id, primaryUserId, {
      type: 'member_left',
      title: `${m.invited_name} was removed from the vault`,
      body: null,
      meta: {}
    })

    // Notify removed member
    if (m.user_id) {
      await alertService.sendPushNotification(
        pool,
        m.user_id,
        'Removed from family vault',
        'You have been removed from the family vault'
      )
    }
  },

  // Member leaves vault voluntarily
  async leaveVault(
    pool: Pool,
    userId: string
  ): Promise<void> {
    await pool.query(`
      UPDATE family_vault_members
      SET status = 'removed', updated_at = NOW()
      WHERE user_id = $1 AND status = 'active'
    `, [userId])
  },

  // Log an activity event
  async logActivity(
    pool: Pool,
    vaultId: string,
    userId: string,
    data: {
      type: string
      title: string
      body: string | null
      meta: object
    }
  ): Promise<void> {
    await pool.query(`
      INSERT INTO family_activity_feed (
        vault_id, user_id, activity_type, title, body, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6)
    `, [vaultId, userId, data.type, data.title, data.body, JSON.stringify(data.meta)])
  },

  // Get vault details and members for primary user
  async getVaultDetails(
    pool: Pool,
    userId: string
  ): Promise<any> {
    const vault = await pool.query(`
      SELECT fv.*,
        json_agg(
          json_build_object(
            'id',              fvm.id,
            'userId',          fvm.user_id,
            'displayName',     COALESCE(fvm.display_name, fvm.invited_name),
            'relationship',    fvm.relationship,
            'status',          fvm.status,
            'avatarColor',     fvm.avatar_color,
            'shareBankAccounts',    fvm.share_bank_accounts,
            'shareFixedDeposits',   fvm.share_fixed_deposits,
            'shareMutualFunds',     fvm.share_mutual_funds,
            'shareEquity',          fvm.share_equity,
            'shareNps',             fvm.share_nps,
            'shareEpf',             fvm.share_epf,
            'shareInsurance',       fvm.share_insurance,
            'shareLand',            fvm.share_land,
            'shareGold',            fvm.share_gold,
            'shareTotalNetworth',   fvm.share_total_networth,
            'acceptedAt',      fvm.accepted_at,
            'invitedAt',       fvm.invited_at,
            'lastSyncedAt',    fvm.last_synced_at
          )
          ORDER BY fvm.accepted_at ASC NULLS LAST
        ) FILTER (WHERE fvm.status != 'removed') AS members
      FROM family_vaults fv
      LEFT JOIN family_vault_members fvm ON fvm.vault_id = fv.id
      WHERE fv.primary_user_id = $1 OR
            fv.id IN (
              SELECT vault_id FROM family_vault_members
              WHERE user_id = $1 AND status = 'active'
            )
      GROUP BY fv.id
    `, [userId])

    return vault.rows[0] ?? null
  }
}
