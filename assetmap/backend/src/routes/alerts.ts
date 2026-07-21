import { FastifyInstance } from 'fastify'
import { verifyAccessToken } from '../middleware/auth'
import { alertService } from '../services/alertService'
import { nomineeChecker } from '../services/nomineeChecker'
import { dormantAccountFinder } from '../services/dormantAccountFinder'
import { netWorthTracker } from '../services/netWorthTracker'
import { pool } from '../db/connection'

export async function engagementRoutes(app: FastifyInstance) {

  // ── Alerts
  app.get('/alerts', {
    preHandler: [verifyAccessToken],
    handler: async (request, reply) => {
      const { limit = 20, offset = 0 } = request.query as Record<string, any>
      const [alerts, unread] = await Promise.all([
        alertService.getUserAlerts(pool, request.user!.id, limit, offset),
        alertService.getUnreadCount(pool, request.user!.id)
      ])
      return { success: true, data: { alerts, unread } }
    }
  })

  app.post('/alerts/read-all', {
    preHandler: [verifyAccessToken],
    handler: async (request, reply) => {
      await alertService.markAllRead(pool, request.user!.id)
      return { success: true }
    }
  })

  app.get('/alerts/preferences', {
    preHandler: [verifyAccessToken],
    handler: async (request, reply) => {
      const prefs = await alertService.getPreferences(
        pool, request.user!.id
      )
      return { success: true, data: prefs }
    }
  })

  app.patch('/alerts/preferences', {
    preHandler: [verifyAccessToken],
    handler: async (request, reply) => {
      await alertService.updatePreferences(
        pool, request.user!.id, request.body as Record<string, any>
      )
      return { success: true }
    }
  })

  // ── Nominee checker
  app.get('/nominee/status', {
    preHandler: [verifyAccessToken],
    handler: async (request, reply) => {
      const status = await nomineeChecker.getNomineeStatus(
        pool, request.user!.id
      )
      return { success: true, data: status }
    }
  })

  // ── Dormant accounts
  app.get('/dormant', {
    preHandler: [verifyAccessToken],
    handler: async (request, reply) => {
      const data = await dormantAccountFinder.getDormantAccounts(
        pool, request.user!.id
      )
      return { success: true, data }
    }
  })

  app.post('/dormant/:accountId/acknowledge', {
    preHandler: [verifyAccessToken],
    handler: async (request, reply) => {
      const { accountId } = request.params as { accountId: string }
      await dormantAccountFinder.acknowledgeAccount(
        pool, request.user!.id, accountId
      )
      return { success: true }
    }
  })

  // ── Net worth tracker
  app.get('/networth/history', {
    preHandler: [verifyAccessToken],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['6m','12m','24m','all'] }
        }
      }
    },
    handler: async (request, reply) => {
      const { period = '12m' } = request.query as Record<string, any>
      const history = await netWorthTracker.getNetWorthHistory(
        pool, request.user!.id, period
      )
      return { success: true, data: history }
    }
  })

  app.get('/networth/latest', {
    preHandler: [verifyAccessToken],
    handler: async (request, reply) => {
      const snapshot = await netWorthTracker.getLatestSnapshot(
        pool, request.user!.id
      )
      return { success: true, data: snapshot }
    }
  })
}
