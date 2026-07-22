import { Pool }           from 'pg'
import { FeatureKey }     from './planConfig'
import { FastifyRequest,
         FastifyReply }   from 'fastify'

interface PlanCheck {
  allowed:       boolean
  plan:          string
  requiredPlan?: string
  limitReached?: boolean
  currentUsage?: number
  limit?:        number
  upgradeUrl?:   string
}

export const planEnforcer = {

  // Check if user can access a feature
  async canAccess(
    pool:       Pool,
    userId:     string,
    feature:    FeatureKey
  ): Promise<PlanCheck> {
    const result = await pool.query(`
      SELECT
        ucp.plan_id,
        pf.is_enabled
      FROM user_current_plan ucp
      LEFT JOIN plan_features pf
        ON pf.plan_id = ucp.plan_id
        AND pf.feature_key = $2
      WHERE ucp.user_id = $1
    `, [userId, feature])

    if (!result.rows[0]) {
      return { allowed: false, plan: 'free', requiredPlan: 'plus' }
    }

    const { plan_id, is_enabled } = result.rows[0]

    if (!is_enabled) {
      // Find minimum plan that has this feature
      const minPlan = await pool.query(`
        SELECT pf.plan_id
        FROM plan_features pf
        JOIN plans p ON p.id = pf.plan_id
        WHERE pf.feature_key = $1
        AND pf.is_enabled = true
        AND p.price_monthly_paise > 0
        ORDER BY p.price_monthly_paise ASC
        LIMIT 1
      `, [feature])

      return {
        allowed:      false,
        plan:         plan_id,
        requiredPlan: minPlan.rows[0]?.plan_id ?? 'plus',
        upgradeUrl:   '/pricing'
      }
    }

    return { allowed: true, plan: plan_id }
  },

  // Check a usage limit (e.g. PDF reports per month)
  async checkLimit(
    pool:       Pool,
    userId:     string,
    feature:    FeatureKey,
    limitField: string
  ): Promise<PlanCheck> {
    // Get plan and limit
    const planResult = await pool.query(`
      SELECT
        ucp.plan_id,
        ucp.${limitField} AS limit_value,
        pf.is_enabled
      FROM user_current_plan ucp
      LEFT JOIN plan_features pf
        ON pf.plan_id = ucp.plan_id
        AND pf.feature_key = $2
      WHERE ucp.user_id = $1
    `, [userId, feature])

    if (!planResult.rows[0]) {
      return { allowed: false, plan: 'free' }
    }

    const { plan_id, limit_value, is_enabled } = planResult.rows[0]

    if (!is_enabled) {
      return { allowed: false, plan: plan_id, requiredPlan: 'plus' }
    }

    // Null limit = unlimited
    if (limit_value === null) {
      return { allowed: true, plan: plan_id }
    }

    // Check current usage this period
    const period = feature.includes('year') || feature.includes('py')
      ? 'year'
      : 'month'

    const usageResult = await pool.query(`
      SELECT COALESCE(usage_count, 0) AS usage
      FROM feature_usage
      WHERE user_id    = $1
      AND feature_key  = $2
      AND period       = DATE_TRUNC($3, CURRENT_DATE)::DATE
    `, [userId, feature, period])

    const currentUsage = parseInt(usageResult.rows[0]?.usage ?? '0')

    if (currentUsage >= limit_value) {
      return {
        allowed:      false,
        plan:         plan_id,
        limitReached: true,
        currentUsage,
        limit:        limit_value,
        upgradeUrl:   '/pricing'
      }
    }

    return {
      allowed:      true,
      plan:         plan_id,
      currentUsage,
      limit:        limit_value
    }
  },

  // Increment usage counter
  async incrementUsage(
    pool:    Pool,
    userId:  string,
    feature: FeatureKey,
    period:  'month' | 'year' = 'month'
  ): Promise<void> {
    await pool.query(`
      INSERT INTO feature_usage (
        user_id, feature_key, period, usage_count, last_used_at
      ) VALUES (
        $1, $2,
        DATE_TRUNC($3, CURRENT_DATE)::DATE,
        1, NOW()
      )
      ON CONFLICT (user_id, feature_key, period)
      DO UPDATE SET
        usage_count  = feature_usage.usage_count + 1,
        last_used_at = NOW()
    `, [userId, feature, period])
  },

  // Fastify preHandler: gate a route by feature
  requireFeature(feature: FeatureKey, pool: Pool) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user?.id
      if (!userId) return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHENTICATED' }
      })

      const check = await planEnforcer.canAccess(pool, userId, feature)

      if (!check.allowed) {
        return reply.status(402).send({
          success: false,
          error: {
            code:         'FEATURE_NOT_IN_PLAN',
            message:      `This feature requires the ${check.requiredPlan} plan or higher`,
            currentPlan:  check.plan,
            requiredPlan: check.requiredPlan,
            upgradeUrl:   check.upgradeUrl,
            feature
          }
        })
      }
    }
  },

  // Get user's full plan status for the frontend
  async getUserPlanStatus(
    pool:   Pool,
    userId: string
  ): Promise<{
    planId:          string
    planName:        string
    status:          string
    billingCycle:    string
    currentPeriodEnd:string | null
    cancelAtPeriodEnd:boolean
    features:        Record<string, boolean>
    limits:          Record<string, number | null>
    usage:           Record<string, number>
  }> {
    const [planResult, featuresResult, usageResult] = await Promise.all([
      pool.query(
        'SELECT * FROM user_current_plan WHERE user_id = $1',
        [userId]
      ),
      pool.query(`
        SELECT feature_key, is_enabled
        FROM plan_features pf
        JOIN user_current_plan ucp ON ucp.plan_id = pf.plan_id
        WHERE ucp.user_id = $1
      `, [userId]),
      pool.query(`
        SELECT feature_key, usage_count
        FROM feature_usage
        WHERE user_id = $1
        AND period >= DATE_TRUNC('month', CURRENT_DATE)::DATE
      `, [userId])
    ])

    const plan    = planResult.rows[0] ?? { plan_id: 'free', plan_name: 'Free' }
    const features= Object.fromEntries(
      featuresResult.rows.map(f => [f.feature_key, f.is_enabled])
    )
    const usage   = Object.fromEntries(
      usageResult.rows.map(u => [u.feature_key, parseInt(u.usage_count)])
    )

    return {
      planId:           plan.plan_id,
      planName:         plan.plan_name,
      status:           plan.subscription_status ?? 'active',
      billingCycle:     plan.billing_cycle ?? 'monthly',
      currentPeriodEnd: plan.current_period_end,
      cancelAtPeriodEnd:plan.cancel_at_period_end ?? false,
      features,
      limits: {
        landParcels:               plan.limit_land_parcels,
        networthMonths:            plan.limit_networth_months,
        pdfReportsPerMonth:        plan.limit_pdf_reports_pm,
        unclaimedSearchesPerYear:  plan.limit_unclaimed_searches_py,
        familyMembers:             plan.limit_family_members,
        willAllocations:           plan.limit_will_allocations,
        propertyValuationsPerMonth:plan.limit_property_valuations_pm,
        aiMessagesPerMonth:        plan.limit_ai_messages_pm,
        apiCallsPerMonth:          plan.limit_api_calls_pm,
      },
      usage
    }
  }
}
