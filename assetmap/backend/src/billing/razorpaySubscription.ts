import axios    from 'axios'
import { Pool } from 'pg'
import { PLANS, PlanId } from '../plans/planConfig'

const RAZORPAY_BASE = 'https://api.razorpay.com/v1'

function razorpayAuth(): string {
  return Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64')
}

async function razorpayPost(endpoint: string, body: any): Promise<any> {
  const response = await axios.post(
    `${RAZORPAY_BASE}${endpoint}`, body,
    { headers: { Authorization: `Basic ${razorpayAuth()}` } }
  )
  return response.data
}

async function razorpayGet(endpoint: string): Promise<any> {
  const response = await axios.get(
    `${RAZORPAY_BASE}${endpoint}`,
    { headers: { Authorization: `Basic ${razorpayAuth()}` } }
  )
  return response.data
}

export const razorpaySubscriptionService = {

  // Create Razorpay plans on first deploy
  // Run once: POST /api/admin/billing/setup-razorpay-plans
  async setupRazorpayPlans(pool: Pool): Promise<void> {
    const plansToCreate = [
      { planId: 'plus',  cycle: 'monthly', amount: 19900,  period: 'monthly', interval: 1 },
      { planId: 'plus',  cycle: 'yearly',  amount: 179900, period: 'yearly',  interval: 1 },
      { planId: 'pro',   cycle: 'monthly', amount: 49900,  period: 'monthly', interval: 1 },
      { planId: 'pro',   cycle: 'yearly',  amount: 449900, period: 'yearly',  interval: 1 },
    ]

    for (const p of plansToCreate) {
      const plan = PLANS[p.planId as PlanId]

      const rzPlan = await razorpayPost('/plans', {
        period:   p.period,
        interval: p.interval,
        item: {
          name:     `AssetMap ${plan.name} (${p.cycle})`,
          amount:   p.amount,
          currency: 'INR',
          description: `AssetMap ${plan.name} plan - ${p.cycle} billing`
        }
      })

      const field = p.cycle === 'monthly'
        ? 'razorpay_monthly_plan_id'
        : 'razorpay_yearly_plan_id'

      await pool.query(
        `UPDATE plans SET ${field} = $1 WHERE id = $2`,
        [rzPlan.id, p.planId]
      )

      console.log(`Created Razorpay plan: ${rzPlan.id} for ${p.planId} ${p.cycle}`)
    }
  },

  // Create subscription when user selects a plan
  async createSubscription(
    pool:         Pool,
    userId:       string,
    planId:       PlanId,
    billingCycle: 'monthly' | 'yearly',
    promoCode?:   string
  ): Promise<{
    subscriptionId: string
    razorpaySubId:  string
    paymentUrl:     string
    shortUrl:       string
  }> {
    // Get Razorpay plan ID
    const planResult = await pool.query(
      `SELECT razorpay_monthly_plan_id, razorpay_yearly_plan_id
       FROM plans WHERE id = $1`,
      [planId]
    )
    const plan = planResult.rows[0]
    const rzPlanId = billingCycle === 'monthly'
      ? plan.razorpay_monthly_plan_id
      : plan.razorpay_yearly_plan_id

    if (!rzPlanId) throw new Error('Razorpay plan not configured')

    // Handle promo code
    let discountPct = 0
    if (promoCode) {
      const promoResult = await pool.query(`
        SELECT discount_pct FROM promo_codes
        WHERE code = $1
        AND is_active = true
        AND (valid_until IS NULL OR valid_until > NOW())
        AND (max_uses IS NULL OR uses_count < max_uses)
        AND ($2 = ANY(applicable_plans) OR applicable_plans = '{}')
      `, [promoCode.toUpperCase(), planId])

      if (promoResult.rows[0]) {
        discountPct = promoResult.rows[0].discount_pct
        await pool.query(
          'UPDATE promo_codes SET uses_count = uses_count + 1 WHERE code = $1',
          [promoCode.toUpperCase()]
        )
      }
    }

    // Create Razorpay subscription
    const rzSub = await razorpayPost('/subscriptions', {
      plan_id:         rzPlanId,
      total_count:     billingCycle === 'yearly' ? 10 : 120,  // 10 years / 10 months
      quantity:        1,
      customer_notify: 1,
      notes: {
        userId,
        planId,
        billingCycle,
        promoCode: promoCode ?? ''
      }
    })

    // Store in DB
    const planConfig = PLANS[planId]
    const basePrice  = billingCycle === 'monthly'
      ? planConfig.priceMonthly
      : planConfig.priceYearly
    const discountedPrice = Math.round(basePrice * (1 - discountPct / 100))

    const result = await pool.query(`
      INSERT INTO user_subscriptions (
        user_id, plan_id, billing_cycle,
        status, razorpay_subscription_id,
        razorpay_plan_id, price_paise,
        promo_code, discount_pct
      ) VALUES ($1,$2,$3,'active',$4,$5,$6,$7,$8)
      RETURNING id
    `, [
      userId, planId, billingCycle,
      rzSub.id, rzPlanId,
      discountedPrice,
      promoCode?.toUpperCase() ?? null,
      discountPct
    ])

    return {
      subscriptionId: result.rows[0].id,
      razorpaySubId:  rzSub.id,
      paymentUrl:     rzSub.short_url ?? '',
      shortUrl:       rzSub.short_url ?? ''
    }
  },

  // Cancel subscription
  async cancelSubscription(
    pool:             Pool,
    userId:           string,
    cancelImmediately:boolean = false
  ): Promise<void> {
    const subResult = await pool.query(
      `SELECT id, razorpay_subscription_id
       FROM user_subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    )

    if (!subResult.rows[0]) throw new Error('No active subscription')

    const { id: subId, razorpay_subscription_id: rzSubId } = subResult.rows[0]

    // Cancel on Razorpay
    if (rzSubId) {
      await razorpayPost(
        `/subscriptions/${rzSubId}/cancel`,
        { cancel_at_cycle_end: cancelImmediately ? 0 : 1 }
      )
    }

    if (cancelImmediately) {
      await pool.query(`
        UPDATE user_subscriptions
        SET status = 'cancelled', cancelled_at = NOW(),
            cancel_at_period_end = false, updated_at = NOW()
        WHERE id = $1
      `, [subId])
    } else {
      await pool.query(`
        UPDATE user_subscriptions
        SET cancel_at_period_end = true, cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `, [subId])
    }
  },

  // Razorpay webhook handler
  async handleWebhook(
    pool:    Pool,
    event:   string,
    payload: any
  ): Promise<void> {
    const rzSubId = payload?.subscription?.entity?.id
    if (!rzSubId) return

    const subResult = await pool.query(
      'SELECT * FROM user_subscriptions WHERE razorpay_subscription_id = $1',
      [rzSubId]
    )
    if (!subResult.rows[0]) return

    const sub = subResult.rows[0]

    switch (event) {

      case 'subscription.activated':
        await pool.query(`
          UPDATE user_subscriptions
          SET status = 'active',
              current_period_start = TO_TIMESTAMP($2),
              current_period_end   = TO_TIMESTAMP($3),
              updated_at           = NOW()
          WHERE id = $1
        `, [
          sub.id,
          payload.subscription.entity.current_start,
          payload.subscription.entity.current_end
        ])
        break

      case 'subscription.charged':
        const payment = payload.payment?.entity
        if (payment) {
          await pool.query(`
            INSERT INTO subscription_payments (
              subscription_id, user_id,
              razorpay_payment_id, amount_paise,
              gst_paise, total_paise, status,
              payment_method, paid_at
            ) VALUES ($1,$2,$3,$4,$5,$6,'paid',$7,NOW())
          `, [
            sub.id, sub.user_id,
            payment.id,
            Math.round(payment.amount / 1.18),  // ex-GST
            Math.round(payment.amount - payment.amount / 1.18),  // GST
            payment.amount,
            payment.method
          ])
        }
        break

      case 'subscription.cancelled':
        await pool.query(`
          UPDATE user_subscriptions
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = $1
        `, [sub.id])
        break

      case 'subscription.halted':
      case 'subscription.pending':
        await pool.query(`
          UPDATE user_subscriptions
          SET status = 'past_due', updated_at = NOW()
          WHERE id = $1
        `, [sub.id])
        break
    }
  },

  // Validate promo code
  async validatePromoCode(
    pool:    Pool,
    code:    string,
    planId:  PlanId
  ): Promise<{
    valid:       boolean
    discountPct: number
    message:     string
  }> {
    const result = await pool.query(`
      SELECT discount_pct, description FROM promo_codes
      WHERE UPPER(code) = UPPER($1)
      AND is_active = true
      AND (valid_until IS NULL OR valid_until > NOW())
      AND (max_uses IS NULL OR uses_count < max_uses)
      AND ($2 = ANY(applicable_plans) OR applicable_plans = '{}')
    `, [code, planId])

    if (!result.rows[0]) {
      return { valid: false, discountPct: 0, message: 'Invalid or expired promo code' }
    }

    return {
      valid:       true,
      discountPct: result.rows[0].discount_pct,
      message:     `${result.rows[0].discount_pct}% discount applied!`
    }
  }
}
