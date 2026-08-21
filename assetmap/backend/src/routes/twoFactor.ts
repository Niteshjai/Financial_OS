import { FastifyInstance }      from 'fastify'
import { verifyAccessToken }    from '../middleware/auth'
import { twoFactorAuth }        from '../auth/twoFactorAuth'
import { otpService }           from '../auth/otpService'
import { trustedDeviceService } from '../auth/trustedDeviceService'
import { backupCodeService }    from '../auth/backupCodeService'
import { totpService }          from '../auth/totpService'
import { pool }                 from '../db/connection'

export async function twoFactorRoutes(app: FastifyInstance) {

  // GET 2FA status for settings page
  app.get('/api/2fa/status', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const status = await twoFactorAuth.getStatus(
        pool, (req as any).user!.id
      )
      return { success:true, data:status }
    }
  })

  // ── TOTP SETUP ──

  // POST begin TOTP setup — generate secret + QR
  app.post('/api/2fa/totp/begin-setup', {
    preHandler: [verifyAccessToken],
    config: { rateLimit: { max:3, timeWindow:'1 hour' } },
    handler: async (req, reply) => {
      const result = await twoFactorAuth.beginTOTPSetup(
        pool, (req as any).user!.id
      )
      return reply.status(201).send({ success:true, data:result })
    }
  })

  // POST confirm TOTP setup with first valid token
  app.post('/api/2fa/totp/confirm-setup', {
    preHandler: [verifyAccessToken],
    config: { rateLimit: { max:5, timeWindow:'15 minutes' } },
    schema: {
      body: {
        type:'object', required:['token'],
        properties: { token: { type:'string', minLength:6, maxLength:6 } }
      }
    },
    handler: async (req, reply) => {
      const { token } = req.body as any
      const result = await twoFactorAuth.confirmTOTPSetup(
        pool, (req as any).user!.id, token
      )
      if (!result.success) {
        return reply.status(400).send({
          success:false,
          error: {
            code:   'INVALID_TOKEN',
            message:'Invalid code. Check your authenticator app and try again.'
          }
        })
      }
      return reply.status(201).send({ success:true, data:result })
    }
  })


  // POST begin Email setup
  app.post('/api/2fa/email/begin-setup', {
    preHandler: [verifyAccessToken],
    config: { rateLimit: { max:3, timeWindow:'1 hour' } },
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' }
        },
        nullable: true
      }
    },
    handler: async (req, reply) => {
      const { email } = (req.body as any) || {}
      
      try {
        if (email) {
          const { encryptPII } = require('../utils/encryption')
          const encryptedEmail = encryptPII(email)
          await pool.query('UPDATE users SET email_encrypted = $1 WHERE id = $2', [encryptedEmail, (req as any).user!.id])
        }

        const result = await twoFactorAuth.setupEmail(
          pool, (req as any).user!.id
        )
        return reply.send({ success:true, data:result })
      } catch (err: any) {
        if (err.message === 'No email on account') {
          return reply.status(400).send({
            success: false,
            error: { code: 'NO_EMAIL', message: 'No email address associated with your account. Please provide one.' }
          })
        }
        throw err;
      }
    }
  })

  // POST confirm Email setup
  app.post('/api/2fa/email/confirm-setup', {
    preHandler: [verifyAccessToken],
    schema: {
      body: {
        type:'object', required:['code'],
        properties: { code:{type:'string'} }
      }
    },
    handler: async (req, reply) => {
      const { code } = req.body as any
      const result = await twoFactorAuth.confirmEmailSetup(
        pool, (req as any).user!.id, code
      )
      if (!result.success) {
        return reply.status(400).send({
          success:false,
          error:{ code:'INVALID_OTP', message:'Invalid or expired OTP.' }
        })
      }
      return reply.status(201).send({ success:true, data:result })
    }
  })

  // ── CHALLENGE (LOGIN) ──

  // POST send OTP for login challenge
  app.post('/api/2fa/challenge/send-otp', {
    config: { rateLimit: { max:3, timeWindow:'15 minutes' } },
    schema: {
      body: {
        type:'object', required:['pendingSessionToken','method'],
        properties: {
          pendingSessionToken: { type:'string' },
          method: { type:'string', enum:['email'] }
        }
      }
    },
    handler: async (req, reply) => {
      const { pendingSessionToken, method } = req.body as any

      // Validate pending session to get userId
      const session = await pool.query(`
        SELECT user_id FROM pending_2fa_sessions
        WHERE session_token=$1 AND is_used=false AND expires_at>NOW()
      `, [pendingSessionToken])

      if (!session.rows[0]) {
        return reply.status(400).send({
          success:false,
          error:{ code:'SESSION_EXPIRED', message:'Login session expired.' }
        })
      }

      const userId = session.rows[0].user_id

      try {
        if (method === 'email') {
          const result = await otpService.sendEmailOTP(pool, userId)
          await twoFactorAuth.logEvent(pool, userId, '2fa_otp_sent', 'email', {})
          return {
            success:true,
            data:{ expiresAt:result.expiresAt, maskedEmail:result.maskedEmail }
          }
        } else {
          return reply.status(400).send({
            success:false,
            error:{ code:'INVALID_METHOD', message:'Invalid method for OTP.' }
          })
        }
      } catch (err:any) {
        if (err.message?.startsWith('OTP_RATE_LIMIT')) {
          return reply.status(429).send({
            success:false,
            error:{ code:'RATE_LIMIT', message:err.message.replace('OTP_RATE_LIMIT: ','') }
          })
        }
        throw err
      }
    }
  })

  // POST verify 2FA challenge
  app.post('/api/2fa/challenge/verify', {
    config: { rateLimit: { max:5, timeWindow:'15 minutes' } },
    schema: {
      body: {
        type:'object',
        required:['pendingSessionToken','code','method'],
        properties: {
          pendingSessionToken: { type:'string' },
          code:                { type:'string', minLength:4, maxLength:10 },
          method: {
            type:'string',
            enum:['totp','email','backup']
          },
          trustDevice: { type:'boolean', default:false },
        },
        additionalProperties:false
      }
    },
    handler: async (req, reply) => {
      const body = req.body as any

      const result = await twoFactorAuth.verifyChallenge(pool, {
        pendingSessionToken: body.pendingSessionToken,
        code:                body.code,
        method:              body.method,
        trustDevice:         body.trustDevice ?? false,
        ipAddress:           req.headers['x-forwarded-for'] as string ||
                             req.socket.remoteAddress || '',
        userAgent:           req.headers['user-agent'] || '',
      })

      if (!result.success) {
        return reply.status(401).send({
          success:false,
          error:{ code:'VERIFICATION_FAILED', message:result.error }
        })
      }

      // Set device token cookie if trusted
      if (result.deviceToken) {
        reply.setCookie('device_token', result.deviceToken, {
          httpOnly: true,
          secure:   process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge:   30 * 24 * 60 * 60,  // 30 days
          path:     '/'
        })
      }

      // Issue full JWT session
      const { issueTokenPair } = await import('../services/tokenService')
      await issueTokenPair(app, result.userId!, 'user', reply, true)

      return { success:true, data:{ deviceToken:result.deviceToken } }
    }
  })

  // ── DISABLE ──

  // POST disable 2FA (requires current 2FA verification)
  app.post('/api/2fa/disable', {
    preHandler: [verifyAccessToken],
    config: { rateLimit: { max:3, timeWindow:'1 hour' } },
    schema: {
      body: {
        type:'object', required:['verificationCode','method'],
        properties: {
          verificationCode: { type:'string' },
          method:           { type:'string' }
        }
      }
    },
    handler: async (req, reply) => {
      const { verificationCode, method } = req.body as any
      const userId = (req as any).user!.id

      // Must verify current 2FA before disabling
      const record = await pool.query(
        'SELECT totp_secret_enc, method FROM user_two_factor WHERE user_id=$1',
        [userId]
      )
      const userMethod = record.rows[0]?.method

      let isValid = false
      if (userMethod === 'totp' && record.rows[0]?.totp_secret_enc) {
        const { valid } = totpService.verifyToken(
          record.rows[0].totp_secret_enc, verificationCode
        )
        isValid = valid
      } else if (userMethod === 'email') {
        isValid = await otpService.verifyOTP(pool, userId, verificationCode)
      }

      if (!isValid) {
        return reply.status(401).send({
          success:false,
          error:{ code:'INVALID_CODE', message:'Verification failed. 2FA not disabled.' }
        })
      }

      const ip = req.headers['x-forwarded-for'] as string ||
                 req.socket.remoteAddress || ''
      await twoFactorAuth.disable(pool, userId, ip)

      return { success:true, data:{ message:'2FA disabled successfully.' } }
    }
  })

  // ── BACKUP CODES ──

  // POST regenerate backup codes (requires 2FA verification)
  app.post('/api/2fa/backup-codes/regenerate', {
    preHandler: [verifyAccessToken],
    config: { rateLimit: { max:3, timeWindow:'24 hours' } },
    handler: async (req, reply) => {
      const codes = await backupCodeService.generateCodes(
        pool, (req as any).user!.id
      )
      return reply.status(201).send({
        success:true,
        data: {
          codes,
          message:'New backup codes generated. Your old codes are now invalid.'
        }
      })
    }
  })

  // GET backup code count
  app.get('/api/2fa/backup-codes/count', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const count = await backupCodeService.getRemainingCount(
        pool, (req as any).user!.id
      )
      return { success:true, data:{ remaining:count } }
    }
  })

  // ── TRUSTED DEVICES ──

  // GET list trusted devices
  app.get('/api/2fa/devices', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const devices = await trustedDeviceService.listDevices(
        pool, (req as any).user!.id
      )
      return { success:true, data:devices }
    }
  })

  // DELETE revoke a trusted device
  app.delete('/api/2fa/devices/:deviceId', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const { deviceId } = req.params as { deviceId:string }
      await trustedDeviceService.revokeDevice(
        pool, (req as any).user!.id, deviceId
      )
      await twoFactorAuth.logEvent(
        pool, (req as any).user!.id, '2fa_device_revoked', null, { deviceId }
      )
      return { success:true }
    }
  })

  // DELETE revoke all trusted devices
  app.delete('/api/2fa/devices', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      await trustedDeviceService.revokeAllDevices(pool, (req as any).user!.id)
      return { success:true }
    }
  })

  // GET 2FA audit log
  app.get('/api/2fa/audit-log', {
    preHandler: [verifyAccessToken],
    handler: async (req, reply) => {
      const result = await pool.query(`
        SELECT event, method, metadata, created_at
        FROM two_factor_audit_log
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [(req as any).user!.id])
      return { success:true, data:result.rows }
    }
  })
}
