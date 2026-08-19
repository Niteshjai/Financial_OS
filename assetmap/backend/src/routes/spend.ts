import { FastifyInstance }      from 'fastify'
import { verifyAccessToken }    from '../middleware/auth'
import { planEnforcer }         from '../plans/planEnforcer'
import { transactionClassifier }from '../classifier/transactionClassifier'
import { pool }                 from '../db/connection'

export async function spendAnalyticsRoutes(app: FastifyInstance) {

  // GET spend summary for a month
  app.get('/summary', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('spend_analyser', pool)],
    schema: {
      querystring: {
        type:'object',
        properties:{
          month:{ type:'string' },   // YYYY-MM
          months:{ type:'integer', minimum:1, maximum:24 }
        }
      }
    },
    handler: async (req, reply) => {
      const { month, months = 1 } = req.query as any
      const targetMonth = month
        ? new Date(month + '-01')
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1)

      const result = await pool.query(`
        SELECT
          category, category_group,
          SUM(total_paise)          AS total_paise,
          SUM(transaction_count)    AS transaction_count,
          MAX(largest_tx_paise)     AS largest_tx_paise
        FROM monthly_spend_summary
        WHERE user_id = $1
        AND month >= $2 - INTERVAL '$3 months'
        AND month <= $2
        AND category_group IN ('expense','revenue')
        GROUP BY category, category_group
        ORDER BY total_paise DESC
      `, [req.user!.id, targetMonth, months - 1])

      const expenses = result.rows.filter((r: any) => r.category_group === 'expense')
      const revenue  = result.rows.filter((r: any) => r.category_group === 'revenue')

      const totalExpense = expenses.reduce((s: number, r: any) => s + parseInt(r.total_paise), 0)
      const totalRevenue = revenue.reduce((s: number, r: any) => s + parseInt(r.total_paise), 0)

      return {
        success: true,
        data: {
          period: { months, endMonth: targetMonth },
          expenses,
          revenue,
          totalExpensePaise: totalExpense,
          totalRevenuePaise: totalRevenue,
          netPaise:          totalRevenue - totalExpense,
          savingsRatePct:    totalRevenue > 0
            ? Math.round((totalRevenue - totalExpense) / totalRevenue * 100)
            : 0
        }
      }
    }
  })

  // GET transactions with filters
  app.get('/transactions', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('spend_analyser', pool)],
    schema: {
      querystring: {
        type:'object',
        properties:{
          category:  { type:'string' },
          month:     { type:'string' },
          type:      { type:'string', enum:['debit','credit'] },
          search:    { type:'string' },
          page:      { type:'integer', default:1 },
          limit:     { type:'integer', default:50, maximum:200 }
        }
      }
    },
    handler: async (req, reply) => {
      const { category, month, type, search, page=1, limit=50 } = req.query as any
      const offset = (page - 1) * limit
      const conditions = ['user_id = $1']
      const params: any[] = [req.user!.id]
      let idx = 2

      if (category) { conditions.push(`category = $${idx++}`); params.push(category) }
      if (month) {
        conditions.push(`DATE_TRUNC('month', transaction_date) = $${idx++}`)
        params.push(new Date(month + '-01'))
      }
      if (type) { conditions.push(`transaction_type = $${idx++}`); params.push(type) }
      if (search) {
        conditions.push(`(LOWER(narration) LIKE $${idx} OR LOWER(merchant_name) LIKE $${idx})`)
        params.push(`%${search.toLowerCase()}%`)
        idx++
      }

      const [txResult, countResult] = await Promise.all([
        pool.query(`
          SELECT
            id, transaction_date, merchant_name,
            narration, amount_paise, transaction_type,
            category, subcategory, category_group,
            confidence, classified_by, is_recurring, is_emi,
            user_category, user_notes, bank_name
          FROM classified_transactions
          WHERE ${conditions.join(' AND ')}
          AND is_ignored = false
          ORDER BY transaction_date DESC
          LIMIT $${idx++} OFFSET $${idx++}
        `, [...params, limit, offset]),

        pool.query(
          `SELECT COUNT(*) AS count FROM classified_transactions
           WHERE ${conditions.join(' AND ')} AND is_ignored = false`,
          params
        )
      ])

      return {
        success: true,
        data: {
          transactions: txResult.rows,
          total:        parseInt(countResult.rows[0].count),
          page, limit
        }
      }
    }
  })

  // PATCH user corrects a classification
  app.patch('/transactions/:txId/category', {
    preHandler: [verifyAccessToken],
    schema: {
      body: {
        type:'object',
        required:['category'],
        properties:{
          category:    { type:'string' },
          subcategory: { type:'string' },
          notes:       { type:'string' }
        }
      }
    },
    handler: async (req, reply) => {
      const { txId } = req.params as { txId:string }
      const { category, subcategory, notes } = req.body as any

      await pool.query(`
        UPDATE classified_transactions
        SET user_category     = $2,
            user_corrected_at = NOW(),
            user_notes        = $3,
            updated_at        = NOW()
        WHERE id = $1 AND user_id = $4
      `, [txId, category, notes ?? null, req.user!.id])

      // Learn from correction — highest confidence
      const tx = await pool.query(
        'SELECT merchant_name FROM classified_transactions WHERE id=$1', [txId]
      )
      if (tx.rows[0]?.merchant_name) {
        await transactionClassifier.learnMerchant(
          pool, req.user!.id, tx.rows[0].merchant_name,
          {
            category,
            subcategory: subcategory ?? '',
            categoryGroup: 'expense' as any,
            confidence:  100
          }
        )
      }

      // Rebuild summary
      await transactionClassifier.rebuildMonthlySummary(
        pool, req.user!.id
      )

      return { success:true }
    }
  })

  // GET spend insights
  app.get('/insights', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('spend_analyser', pool)],
    handler: async (req, reply) => {
      const result = await pool.query(`
        SELECT * FROM spend_insights
        WHERE user_id = $1
        AND month >= NOW() - INTERVAL '3 months'
        ORDER BY created_at DESC
        LIMIT 20
      `, [req.user!.id])
      return { success:true, data:result.rows }
    }
  })

  // POST set budget for a category
  app.post('/budgets', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('spend_analyser', pool)],
    schema: {
      body: {
        type:'object',
        required:['category','budgetPaise'],
        properties:{
          category:    { type:'string' },
          budgetPaise: { type:'integer', minimum:100 }
        }
      }
    },
    handler: async (req, reply) => {
      const { category, budgetPaise } = req.body as any
      await pool.query(`
        INSERT INTO category_budgets (user_id, category, budget_paise)
        VALUES ($1,$2,$3)
        ON CONFLICT (user_id, category) DO UPDATE SET
          budget_paise = EXCLUDED.budget_paise,
          is_active    = true
      `, [req.user!.id, category, budgetPaise])
      return { success:true }
    }
  })

  // GET budgets with current spend
  app.get('/budgets', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const result = await pool.query(`
        SELECT
          cb.category, cb.budget_paise,
          COALESCE(ms.total_paise, 0) AS spent_paise,
          CASE WHEN cb.budget_paise > 0
            THEN ROUND(COALESCE(ms.total_paise,0)::DECIMAL / cb.budget_paise * 100)
            ELSE 0 END AS used_pct
        FROM category_budgets cb
        LEFT JOIN monthly_spend_summary ms
          ON ms.user_id = cb.user_id
          AND ms.category = cb.category
          AND ms.month = DATE_TRUNC('month', CURRENT_DATE)::DATE
        WHERE cb.user_id = $1 AND cb.is_active = true
        ORDER BY used_pct DESC
      `, [req.user!.id])
      return { success:true, data:result.rows }
    }
  })

  // POST trigger re-classification for user
  app.post('/reclassify', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('spend_analyser', pool)],
    config: { rateLimit:{ max:2, timeWindow:'1 hour' } },
    handler: async (req, reply) => {
      const { classifierWorkerQueue } = await import('../workers/classifierWorker')
      await classifierWorkerQueue.add('classify', { userId: req.user!.id })
      return {
        success: true,
        data: { message:'Classification queued — results in 1–2 minutes' }
      }
    }
  })

  // GET subscription detector
  app.get('/subscriptions', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('subscription_detector', pool)],
    handler: async (req, reply) => {
      const result = await pool.query(`
        SELECT
          merchant_name,
          COUNT(*)                  AS occurrences,
          AVG(amount_paise)::BIGINT AS avg_amount,
          MAX(transaction_date)     AS last_charged,
          MIN(transaction_date)     AS first_charged,
          SUM(amount_paise)         AS total_spent_ever
        FROM classified_transactions
        WHERE user_id = $1
        AND category = 'SUBSCRIPTIONS'
        AND is_ignored = false
        GROUP BY merchant_name
        ORDER BY occurrences DESC, total_spent_ever DESC
      `, [req.user!.id])
      return { success:true, data:result.rows }
    }
  })
}
