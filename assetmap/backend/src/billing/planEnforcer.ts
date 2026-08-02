import { FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { FeatureKey, LimitKey, FEATURE_LABELS } from './planConfig';

export const planEnforcer = {
  /**
   * Check if a user's plan has access to a specific feature flag
   */
  async canAccess(userId: string, featureKey: FeatureKey, pool: Pool): Promise<boolean> {
    const res = await pool.query(
      `
      SELECT pf.is_enabled
      FROM user_current_plan ucp
      JOIN plans p ON p.id = ucp.plan_id
      JOIN plan_features pf ON pf.plan_id = p.id
      WHERE ucp.user_id = $1 AND pf.feature_key = $2
      `,
      [userId, featureKey]
    );
    return res.rows[0]?.is_enabled === true;
  },

  /**
   * Fastify preHandler hook to require a feature for a route.
   */
  requireFeature(featureKey: FeatureKey, pool: Pool) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const hasAccess = await planEnforcer.canAccess(userId, featureKey, pool);
      if (!hasAccess) {
        return reply.status(402).send({
          success: false,
          error: 'FEATURE_NOT_IN_PLAN',
          message: `Your current plan does not include ${FEATURE_LABELS[featureKey]}. Please upgrade to access this feature.`,
          requiredFeature: featureKey
        });
      }
    };
  },

  /**
   * Check if the user has hit their numeric limit for a feature.
   * Returns true if they have usage remaining. Returns false if they hit the limit.
   */
  async checkLimit(userId: string, limitColumn: LimitKey, pool: Pool): Promise<boolean> {
    const res = await pool.query(
      `
      SELECT 
        p.${limitColumn} as "limit",
        COALESCE(fu.usage_count, 0) as "usage"
      FROM user_current_plan ucp
      JOIN plans p ON p.id = ucp.plan_id
      LEFT JOIN feature_usage fu 
        ON fu.user_id = ucp.user_id 
        AND fu.feature_key = $2
        AND fu.period = date_trunc('month', CURRENT_DATE)
      WHERE ucp.user_id = $1
      `,
      [userId, limitColumn] // using limitColumn as feature_key equivalent for usage tracking
    );

    const row = res.rows[0];
    if (!row) return false;

    // NULL limit means unlimited
    if (row.limit === null) return true;

    return row.usage < row.limit;
  },

  /**
   * Increment usage counter for a given limit/feature.
   */
  async incrementUsage(userId: string, limitColumn: LimitKey, pool: Pool): Promise<void> {
    await pool.query(
      `
      INSERT INTO feature_usage (user_id, feature_key, period, usage_count)
      VALUES ($1, $2, date_trunc('month', CURRENT_DATE), 1)
      ON CONFLICT (user_id, feature_key, period) 
      DO UPDATE SET usage_count = feature_usage.usage_count + 1
      `,
      [userId, limitColumn]
    );
  }
};
