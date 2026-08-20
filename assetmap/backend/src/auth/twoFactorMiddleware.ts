import { FastifyRequest, FastifyReply } from 'fastify'
import { Pool }                          from 'pg'
import { trustedDeviceService }          from './trustedDeviceService'

// Middleware: require 2FA to be completed for this request
// Reads device_token cookie or x-device-token header
export function require2FA() {
  return async (
    request: FastifyRequest,
    reply:   FastifyReply
  ) => {
    const userId = (request as any).user?.id
    if (!userId) return reply.status(401).send({
      success:false, error:{ code:'UNAUTHENTICATED' }
    })

    const pool = (request.server as any).pg as Pool

    // Check if user has 2FA enabled
    const record = await pool.query(
      'SELECT is_enabled FROM user_two_factor WHERE user_id=$1',
      [userId]
    )

    // 2FA not enabled — pass through
    if (!record.rows[0]?.is_enabled) return

    // Check for trusted device token
    const deviceToken =
      request.cookies?.['device_token'] ??
      (request.headers['x-device-token'] as string)

    if (deviceToken) {
      const isTrusted = await trustedDeviceService.isTrusted(
        pool, userId, deviceToken
      )
      if (isTrusted) return  // trusted device — skip 2FA
    }

    // Check if current JWT itself has 2FA verified
    const twoFactorVerified = (request as any).user?.twoFactorVerified
    if (twoFactorVerified) return

    // 2FA required but not completed
    return reply.status(403).send({
      success: false,
      error: {
        code:       'TWO_FACTOR_REQUIRED',
        message:    'This action requires 2FA verification.',
        redirectTo: '/auth/2fa-challenge'
      }
    })
  }
}
