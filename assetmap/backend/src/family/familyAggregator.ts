import { Pool }    from 'pg'

// Asset class → share column mapping
const SHARE_COLUMNS: Record<string, string> = {
  BANK_ACCOUNT:    'share_bank_accounts',
  FIXED_DEPOSIT:   'share_fixed_deposits',
  MUTUAL_FUND:     'share_mutual_funds',
  EQUITY:          'share_equity',
  NPS:             'share_nps',
  EPF:             'share_epf',
  PPF:             'share_epf',
  INSURANCE_LIFE:  'share_insurance',
  INSURANCE_HEALTH:'share_insurance',
  INSURANCE_OTHER: 'share_insurance',
  LAND:            'share_land',
  PROPERTY:        'share_land',
  GOLD:            'share_gold',
}

export const familyAggregator = {

  // Get combined net worth for the vault
  // CRITICAL: only includes asset classes each member has chosen to share
  async getCombinedNetWorth(
    pool:    Pool,
    vaultId: string,
    userId:  string  // must be primary user or active member
  ): Promise<{
    totalPaise:      number
    members:         MemberSummary[]
    byAssetClass:    Record<string, number>
    memberCount:     number
  }> {
    // Verify access
    await verifyVaultAccess(pool, vaultId, userId)

    // Get all active members with their sharing preferences
    const members = await pool.query(`
      SELECT
        fvm.user_id,
        fvm.display_name, fvm.invited_name,
        fvm.avatar_color, fvm.relationship,
        fvm.share_bank_accounts, fvm.share_fixed_deposits,
        fvm.share_mutual_funds, fvm.share_equity,
        fvm.share_nps, fvm.share_epf, fvm.share_insurance,
        fvm.share_land, fvm.share_gold, fvm.share_total_networth
      FROM family_vault_members fvm
      WHERE fvm.vault_id = $1 AND fvm.status = 'active'
      AND fvm.user_id IS NOT NULL
    `, [vaultId])

    const memberSummaries: MemberSummary[] = []
    const byAssetClass: Record<string, number> = {}
    let totalPaise = 0

    for (const member of members.rows) {
      if (!member.user_id) continue

      // Fetch only the asset classes this member shares
      // Build WHERE clause dynamically based on their preferences
      const sharedClasses = Object.entries(SHARE_COLUMNS)
        .filter(([_, col]) => member[col] === true)
        .map(([cls]) => cls)

      if (sharedClasses.length === 0) {
        memberSummaries.push({
          userId:        member.user_id,
          name:          member.display_name ?? member.invited_name,
          avatarColor:   member.avatar_color,
          relationship:  member.relationship,
          totalPaise:    0,
          byAssetClass:  {},
          sharesNothing: true,
        })
        continue
      }

      const placeholders = sharedClasses
        .map((_, i) => `$${i + 2}`)
        .join(',')

      const assets = await pool.query(`
        SELECT
          asset_class,
          SUM(current_value_paise) AS total_value
        FROM canonical_assets
        WHERE user_id = $1
        AND is_active = true
        AND asset_class IN (${placeholders})
        AND ai_anomaly_flag = false
        GROUP BY asset_class
      `, [member.user_id, ...sharedClasses])

      const memberAssets: Record<string, number> = {}
      let memberTotal = 0

      for (const row of assets.rows) {
        const value = parseInt(row.total_value)
        memberAssets[row.asset_class] = value
        memberTotal += value
        byAssetClass[row.asset_class] =
          (byAssetClass[row.asset_class] ?? 0) + value
      }

      totalPaise += memberTotal

      memberSummaries.push({
        userId:       member.user_id,
        name:         member.display_name ?? member.invited_name,
        avatarColor:  member.avatar_color,
        relationship: member.relationship,
        totalPaise:   memberTotal,
        byAssetClass: memberAssets,
        sharesNothing:false,
      })
    }

    return {
      totalPaise,
      members:      memberSummaries,
      byAssetClass,
      memberCount:  members.rows.length
    }
  },

  // Get one member's shared assets (for drill-down view)
  async getMemberAssets(
    pool:          Pool,
    vaultId:       string,
    requestingUserId:string,    // who is asking
    targetUserId:  string       // whose data
  ): Promise<{
    member:   any
    assets:   any[]
    summary:  Record<string, number>
  }> {
    await verifyVaultAccess(pool, vaultId, requestingUserId)

    // Get member preferences
    const member = await pool.query(`
      SELECT * FROM family_vault_members
      WHERE vault_id = $1 AND user_id = $2 AND status = 'active'
    `, [vaultId, targetUserId])

    if (!member.rows[0]) throw new Error('Member not found')

    const m = member.rows[0]

    // Only show what they have shared
    const sharedClasses = Object.entries(SHARE_COLUMNS)
      .filter(([_, col]) => m[col] === true)
      .map(([cls]) => cls)

    if (sharedClasses.length === 0) {
      return {
        member: m,
        assets: [],
        summary: {}
      }
    }

    const placeholders = sharedClasses
      .map((_, i) => `$${i + 2}`)
      .join(',')

    const assets = await pool.query(`
      SELECT
        id, asset_class, institution_name,
        asset_name, asset_subtype,
        current_value_paise, gain_loss_paise,
        gain_loss_pct, quantity, unit,
        has_nominee, maturity_date,
        ai_category_label, ai_risk_level,
        ai_liquidity_score, ai_summary,
        last_synced_at
      FROM canonical_assets
      WHERE user_id = $1
      AND is_active = true
      AND asset_class IN (${placeholders})
      ORDER BY current_value_paise DESC
    `, [targetUserId, ...sharedClasses])

    const summary: Record<string, number> = {}
    for (const asset of assets.rows) {
      summary[asset.asset_class] =
        (summary[asset.asset_class] ?? 0) +
        parseInt(asset.current_value_paise)
    }

    return {
      member: {
        id:           m.id,
        name:         m.display_name ?? m.invited_name,
        avatarColor:  m.avatar_color,
        relationship: m.relationship,
      },
      assets: assets.rows,
      summary
    }
  },

  // Get combined net worth history for chart
  async getCombinedHistory(
    pool:    Pool,
    vaultId: string,
    userId:  string,
    months:  number = 12
  ): Promise<{
    month:      string
    totalPaise: number
    members:    Record<string, number>
  }[]> {
    await verifyVaultAccess(pool, vaultId, userId)

    const result = await pool.query(`
      SELECT
        snapshot_month,
        total_paise,
        member_breakdown
      FROM family_networth_snapshots
      WHERE vault_id = $1
      ORDER BY snapshot_month DESC
      LIMIT $2
    `, [vaultId, months])

    return result.rows.map(r => ({
      month:      r.snapshot_month,
      totalPaise: parseInt(r.total_paise),
      members:    r.member_breakdown ?? {}
    })).reverse()
  },

  // Family estate readiness
  async getEstateReadiness(
    pool:    Pool,
    vaultId: string,
    userId:  string
  ): Promise<{
    overallScore: number
    members:      EstateReadinessPerMember[]
  }> {
    await verifyVaultAccess(pool, vaultId, userId)

    const members = await pool.query(`
      SELECT user_id, display_name, invited_name, avatar_color
      FROM family_vault_members
      WHERE vault_id = $1 AND status = 'active'
      AND user_id IS NOT NULL
    `, [vaultId])

    const results: EstateReadinessPerMember[] = []

    for (const m of members.rows) {
      // Nominee completeness
      const nomineeResult = await pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE has_nominee = true) AS with_nominee
        FROM canonical_assets
        WHERE user_id = $1
        AND asset_class IN (
          'BANK_ACCOUNT','FIXED_DEPOSIT','MUTUAL_FUND',
          'EQUITY','NPS','INSURANCE_LIFE','EPF'
        )
        AND is_active = true
      `, [m.user_id])

      const total       = parseInt(nomineeResult.rows[0].total)
      const withNominee = parseInt(nomineeResult.rows[0].with_nominee)
      const nomineePct  = total > 0
        ? Math.round(withNominee / total * 100) : 0

      // Will status
      const willResult = await pool.query(`
        SELECT COUNT(*) AS count
        FROM wills
        WHERE user_id = $1
        AND status IN ('completed','signed')
      `, [m.user_id])
      const hasWill = parseInt(willResult.rows[0].count) > 0

      // Estate score (0–100)
      const estateScore = Math.round(
        nomineePct * 0.7 +
        (hasWill ? 30 : 0)
      )

      results.push({
        userId:      m.user_id,
        name:        m.display_name ?? m.invited_name,
        avatarColor: m.avatar_color,
        nomineePct,
        hasWill,
        estateScore,
        totalAccounts:       total,
        accountsWithNominee: withNominee,
      })
    }

    const overallScore = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.estateScore, 0) / results.length)
      : 0

    return { overallScore, members: results }
  }
}

interface MemberSummary {
  userId:       string
  name:         string
  avatarColor:  string
  relationship: string
  totalPaise:   number
  byAssetClass: Record<string, number>
  sharesNothing:boolean
}

interface EstateReadinessPerMember {
  userId:              string
  name:                string
  avatarColor:         string
  nomineePct:          number
  hasWill:             boolean
  estateScore:         number
  totalAccounts:       number
  accountsWithNominee: number
}

async function verifyVaultAccess(
  pool:    Pool,
  vaultId: string,
  userId:  string
): Promise<void> {
  const result = await pool.query(`
    SELECT 1 FROM family_vaults WHERE id = $1 AND primary_user_id = $2
    UNION
    SELECT 1 FROM family_vault_members
    WHERE vault_id = $1 AND user_id = $2 AND status = 'active'
  `, [vaultId, userId])

  if (!result.rows.length) {
    throw new Error('You do not have access to this family vault')
  }
}
