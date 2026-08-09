import { Pool } from 'pg'

export const familyGoals = {

  async createGoal(
    pool:   Pool,
    vaultId:string,
    userId: string,
    data: {
      name:                string
      description?:        string
      goalType:            string
      emoji?:              string
      targetAmountPaise:   number
      targetDate?:         string
      contributingMembers: string[]
    }
  ): Promise<string> {
    const result = await pool.query(`
      INSERT INTO family_goals (
        vault_id, created_by_user_id,
        name, description, goal_type, emoji,
        target_amount_paise, target_date,
        contributing_members
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id
    `, [
      vaultId, userId,
      data.name, data.description,
      data.goalType, data.emoji ?? '🎯',
      data.targetAmountPaise,
      data.targetDate ?? null,
      data.contributingMembers
    ])
    return result.rows[0].id
  },

  async addContribution(
    pool:       Pool,
    goalId:     string,
    userId:     string,
    amountPaise:number,
    note?:      string
  ): Promise<void> {
    await pool.query(`
      INSERT INTO family_goal_contributions (
        goal_id, user_id, amount_paise, note
      ) VALUES ($1,$2,$3,$4)
    `, [goalId, userId, amountPaise, note ?? null])

    // Update running total
    await pool.query(`
      UPDATE family_goals
      SET current_amount_paise = current_amount_paise + $2,
          status = CASE
            WHEN current_amount_paise + $2 >= target_amount_paise
            THEN 'completed' ELSE 'active'
          END,
          updated_at = NOW()
      WHERE id = $1
    `, [goalId, amountPaise])
  },

  async getGoals(
    pool:    Pool,
    vaultId: string
  ): Promise<any[]> {
    const result = await pool.query(`
      SELECT
        g.*,
        json_agg(
          json_build_object(
            'amount',     gc.amount_paise,
            'note',       gc.note,
            'userId',     gc.user_id,
            'at',         gc.contributed_at
          )
          ORDER BY gc.contributed_at DESC
        ) FILTER (WHERE gc.id IS NOT NULL) AS contributions
      FROM family_goals g
      LEFT JOIN family_goal_contributions gc ON gc.goal_id = g.id
      WHERE g.vault_id = $1 AND g.status = 'active'
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `, [vaultId])

    return result.rows.map(g => ({
      ...g,
      progressPct: g.target_amount_paise > 0
        ? Math.min(100, Math.round(
            g.current_amount_paise / g.target_amount_paise * 100
          ))
        : 0,
      remainingPaise: Math.max(
        0, g.target_amount_paise - g.current_amount_paise
      )
    }))
  }
}
