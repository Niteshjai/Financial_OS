import { FastifyPluginAsync } from 'fastify';
import { verifyAccessToken } from '../middleware/auth';
import { planEnforcer } from '../plans/planEnforcer';
import { pool } from '../db/connection';

const spendRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get('/summary', {
    preHandler: [verifyAccessToken, planEnforcer.requireFeature('spend_analyser', pool)]
  }, async (request, reply) => {
    // In a real implementation, this would aggregate actual transaction records from DB.
    // For now, we return mock aggregated spending data to power the Analytics tab.
    const mockData = {
      totalSpent: 45000,
      monthlyAverage: 38000,
      topCategories: [
        { category: 'Housing', amount: 20000, percentage: 44 },
        { category: 'Food & Dining', amount: 12000, percentage: 27 },
        { category: 'Transportation', amount: 5000, percentage: 11 },
        { category: 'Utilities', amount: 3500, percentage: 8 },
        { category: 'Entertainment', amount: 4500, percentage: 10 }
      ],
      recentMonths: [
        { month: 'Jan', spend: 36000 },
        { month: 'Feb', spend: 34500 },
        { month: 'Mar', spend: 41000 },
        { month: 'Apr', spend: 39000 },
        { month: 'May', spend: 45000 }
      ],
      insights: [
        "You spent 15% more on Food & Dining this month.",
        "Your utility bills have decreased by 5% compared to last month."
      ]
    };

    return reply.send({ success: true, data: mockData });
  });
};

export default spendRoutes;
