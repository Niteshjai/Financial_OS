import cron    from 'node-cron'
import { Pool } from 'pg'
import { familyAggregator } from '../family/familyAggregator'

export function startFamilySnapshotWorker(pool: Pool): void {
  // Run on 1st of every month at 5AM IST
  cron.schedule('30 23 28-31 * *', async () => {
    // Only run on actual last day of month
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (tomorrow.getDate() !== 1) return

    console.log('[FamilySnapshot] Starting monthly vault snapshot')

    const vaults = await pool.query(`
      SELECT id, primary_user_id FROM family_vaults
      WHERE is_active = true
    `)

    for (const vault of vaults.rows) {
      try {
        const data = await familyAggregator.getCombinedNetWorth(
          pool, vault.id, vault.primary_user_id
        )

        const memberBreakdown = Object.fromEntries(
          data.members.map(m => [m.userId, {
            name:       m.name,
            totalPaise: m.totalPaise,
          }])
        )

        const snapshotMonth = new Date()
        snapshotMonth.setDate(1)

        await pool.query(`
          INSERT INTO family_networth_snapshots (
            vault_id, snapshot_month,
            total_paise, member_breakdown,
            asset_breakdown, member_count
          ) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (vault_id, snapshot_month)
          DO UPDATE SET
            total_paise      = EXCLUDED.total_paise,
            member_breakdown = EXCLUDED.member_breakdown,
            asset_breakdown  = EXCLUDED.asset_breakdown,
            member_count     = EXCLUDED.member_count
        `, [
          vault.id,
          snapshotMonth.toISOString().split('T')[0],
          data.totalPaise,
          JSON.stringify(memberBreakdown),
          JSON.stringify(data.byAssetClass),
          data.memberCount
        ])

        // Check for net worth milestone
        await checkMilestones(pool, vault.id, data.totalPaise)

        await new Promise(r => setTimeout(r, 500))
      } catch (err) {
        console.error(`[FamilySnapshot] Failed for vault ${vault.id}:`, err)
      }
    }

    console.log(`[FamilySnapshot] Done — ${vaults.rows.length} vaults`)
  }, { timezone: 'Asia/Kolkata' })

  console.log('[FamilySnapshot] Worker registered — runs monthly')
}

async function checkMilestones(
  pool:        Pool,
  vaultId:     string,
  totalPaise:  number
): Promise<void> {
  const milestones = [
    { paise: 10000000_00, label: '₹1 Crore family net worth' },
    { paise: 50000000_00, label: '₹5 Crore family net worth' },
    { paise: 100000000_00,label: '₹10 Crore family net worth' },
  ]

  // Get previous month total
  const prev = await pool.query(`
    SELECT total_paise FROM family_networth_snapshots
    WHERE vault_id = $1
    ORDER BY snapshot_month DESC
    LIMIT 2
  `, [vaultId])

  if (prev.rows.length < 2) return
  const prevTotal = parseInt(prev.rows[1].total_paise)

  for (const milestone of milestones) {
    if (prevTotal < milestone.paise && totalPaise >= milestone.paise) {
      const vault = await pool.query(
        'SELECT primary_user_id FROM family_vaults WHERE id = $1', [vaultId]
      )

      await pool.query(`
        INSERT INTO family_activity_feed (
          vault_id, user_id, activity_type, title, body
        ) VALUES ($1,$2,'networth_milestone',$3,$4)
      `, [
        vaultId,
        vault.rows[0].primary_user_id,
        `🎉 Family milestone: ${milestone.label}!`,
        `Your family\'s combined net worth has crossed ${milestone.label}. Congratulations!`
      ])
    }
  }
}
