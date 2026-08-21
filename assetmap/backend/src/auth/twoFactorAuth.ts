import { Pool } from 'pg'
import { totpService } from './totpService'
import { otpService } from './otpService'
import { backupCodeService } from './backupCodeService'
import { trustedDeviceService } from './trustedDeviceService'
import { alertService } from '../services/alertService'
import { kvStore } from '../db/connection'
import crypto from 'crypto'

export type TwoFactorMethod = 'totp' | 'email'

export const twoFactorAuth = {

  // Get user's 2FA status
  async getStatus(
    pool: Pool,
    userId: string
  ): Promise<{
    isEnabled: boolean
    method: TwoFactorMethod | null
    backupRemaining: number
    trustedDevices: any[]
  }> {
    const record = await pool.query(
      'SELECT is_enabled, method FROM user_two_factor WHERE user_id = $1',
      [userId]
    )

    if (!record.rows[0]?.is_enabled) {
      return {
        isEnabled: false,
        method: null,
        backupRemaining: 0,
        trustedDevices: [],
      }
    }

    const [backupCount, devices] = await Promise.all([
      backupCodeService.getRemainingCount(pool, userId),
      trustedDeviceService.listDevices(pool, userId)
    ])

    return {
      isEnabled: true,
      method: record.rows[0].method,
      backupRemaining: backupCount,
      trustedDevices: devices,
    }
  },

  // STEP 1 — Begin TOTP setup: generate secret + QR
  async beginTOTPSetup(
    pool: Pool,
    userId: string
  ): Promise<{
    secret: string    // show to user for manual entry
    qrCode: string    // base64 data URL
    sessionId: string    // verify with this session
  }> {
    const user = await pool.query(
      'SELECT email_encrypted, mobile_encrypted FROM users WHERE id = $1',
      [userId]
    )

    let identifier = 'User'
    const row = user.rows[0]
    if (row) {
      const { decryptPII } = await import('../utils/encryption')
      if (row.email_encrypted) {
        try { identifier = decryptPII(row.email_encrypted) } catch (e) { }
      } else if (row.mobile_encrypted) {
        try { identifier = decryptPII(row.mobile_encrypted) } catch (e) { }
      }
    }

    const result = totpService.generateSecret(identifier)

    const qrCode = await totpService.generateQRCode(result.qrCodeUrl)

    // Store encrypted secret temporarily (not yet active)
    await pool.query(`
      INSERT INTO user_two_factor (
        user_id, totp_secret_enc, totp_verified,
        is_enabled, method
      ) VALUES ($1,$2,false,false,'totp')
      ON CONFLICT (user_id) DO UPDATE SET
        totp_secret_enc = EXCLUDED.totp_secret_enc,
        totp_verified   = false,
        updated_at      = NOW()
    `, [userId, result.encryptedSecret])

    // Return ephemeral session token so frontend can
    // call confirm-totp-setup without re-fetching secret
    const sessionId = crypto.randomBytes(16).toString('hex')

    return { secret: result.secret, qrCode, sessionId }
  },

  // STEP 2 — Verify TOTP code to complete setup
  async confirmTOTPSetup(
    pool: Pool,
    userId: string,
    token: string
  ): Promise<{
    success: boolean
    backupCodes: string[]   // shown ONCE — never again
  }> {
    const record = await pool.query(
      'SELECT totp_secret_enc FROM user_two_factor WHERE user_id = $1',
      [userId]
    )

    if (!record.rows[0]?.totp_secret_enc) {
      throw new Error('No TOTP setup in progress')
    }

    const { valid } = totpService.verifyToken(
      record.rows[0].totp_secret_enc,
      token
    )

    if (!valid) {
      return { success: false, backupCodes: [] }
    }

    // Activate 2FA
    await pool.query(`
      UPDATE user_two_factor
      SET is_enabled         = true,
          totp_verified      = true,
          method             = 'totp',
          enabled_at         = NOW(),
          setup_completed_at = NOW(),
          updated_at         = NOW()
      WHERE user_id = $1
    `, [userId])

    // Generate backup codes
    const backupCodes = await backupCodeService.generateCodes(pool, userId)

    await this.logEvent(pool, userId, '2fa_enabled', 'totp', {})

    // Notify user
    await this.notifySetupComplete(pool, userId, 'totp')

    return { success: true, backupCodes }
  },

  // Setup Email 2FA
  async setupEmail(
    pool: Pool,
    userId: string
  ): Promise<{ sent: boolean; expiresAt: Date; maskedEmail: string }> {
    await pool.query(`
      INSERT INTO user_two_factor (user_id, method, is_enabled)
      VALUES ($1,'email',false)
      ON CONFLICT (user_id) DO UPDATE SET
        method     = 'email',
        updated_at = NOW()
    `, [userId])

    return otpService.sendEmailOTP(pool, userId)
  },

  // Confirm Email setup with OTP
  async confirmEmailSetup(
    pool: Pool,
    userId: string,
    code: string
  ): Promise<{
    success: boolean
    backupCodes: string[]
  }> {
    const isValid = await otpService.verifyOTP(pool, userId, code)

    if (!isValid) return { success: false, backupCodes: [] }

    await pool.query(`
      UPDATE user_two_factor
      SET is_enabled         = true,
          method             = 'email',
          enabled_at         = NOW(),
          setup_completed_at = NOW(),
          updated_at         = NOW()
      WHERE user_id = $1
    `, [userId])

    const backupCodes = await backupCodeService.generateCodes(pool, userId)
    await this.logEvent(pool, userId, '2fa_enabled', 'email', {})
    await this.notifySetupComplete(pool, userId, 'email')

    return { success: true, backupCodes }
  },

  // Disable 2FA (requires current 2FA verification first)
  async disable(
    pool: Pool,
    userId: string,
    ipAddress: string
  ): Promise<void> {
    await pool.query(`
      UPDATE user_two_factor
      SET is_enabled   = false,
          disabled_at  = NOW(),
          updated_at   = NOW()
      WHERE user_id = $1
    `, [userId])

    // Revoke all trusted devices
    await trustedDeviceService.revokeAllDevices(pool, userId)

    await this.logEvent(pool, userId, '2fa_disabled', null, { ip: ipAddress })
    await this.notifyDisabled(pool, userId)
  },

  // Create a pending session after password login
  // Returns a short-lived token to use during 2FA challenge
  async createPendingSession(
    pool: Pool,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString('hex')

    await pool.query(`
      INSERT INTO pending_2fa_sessions (
        user_id, session_token, ip_address, user_agent
      ) VALUES ($1,$2,$3,$4)
    `, [userId, sessionToken, ipAddress, userAgent])

    return sessionToken
  },

  // Verify 2FA challenge — main login flow
  async verifyChallenge(
    pool: Pool,
    params: {
      pendingSessionToken: string
      code: string
      method: 'totp' | 'email' | 'backup'
      trustDevice: boolean
      ipAddress: string
      userAgent: string
    }
  ): Promise<{
    success: boolean
    userId?: string
    deviceToken?: string
    error?: string
  }> {
    // Validate pending session
    const session = await pool.query(`
      SELECT user_id FROM pending_2fa_sessions
      WHERE session_token = $1
      AND is_used   = false
      AND expires_at > NOW()
    `, [params.pendingSessionToken])

    if (!session.rows[0]) {
      return { success: false, error: '2FA session expired. Please log in again.' }
    }

    const userId = session.rows[0].user_id

    // Check lockout in Redis
    const lockKey = `ratelimit:2fa_lock:${userId}`
    const isLocked = await kvStore.get(lockKey)

    if (isLocked) {
      return {
        success: false,
        error: `Account temporarily locked. Try again later.`
      }
    }

    let isValid = false

    // Verify based on method
    try {
      if (params.method === 'totp') {
        const record = await pool.query(
          'SELECT totp_secret_enc FROM user_two_factor WHERE user_id=$1',
          [userId]
        )
        if (record.rows[0]?.totp_secret_enc) {
          const result = totpService.verifyToken(
            record.rows[0].totp_secret_enc,
            params.code
          )
          isValid = result.valid
        }
      } else if (params.method === 'email') {
        isValid = await otpService.verifyOTP(pool, userId, params.code)
      } else if (params.method === 'backup') {
        isValid = await backupCodeService.verifyAndConsume(
          pool, userId, params.code, params.ipAddress
        )
        if (isValid) {
          await this.logEvent(pool, userId, '2fa_backup_used', 'backup', {
            ip: params.ipAddress
          })
          // Warn user that a backup code was used
          await this.notifyBackupCodeUsed(pool, userId)
        }
      }
    } catch (err) {
      console.error('[2FA] Verification error:', err)
    }

    if (!isValid) {
      // Increment failure counter in Redis
      await this.recordFailure(pool, userId, params.ipAddress)
      await this.logEvent(pool, userId, '2fa_challenge_failed', params.method, {
        ip: params.ipAddress
      })
      return { success: false, error: 'Invalid verification code' }
    }

    // SUCCESS — consume pending session
    await pool.query(
      'UPDATE pending_2fa_sessions SET is_used=true WHERE session_token=$1',
      [params.pendingSessionToken]
    )

    // Reset failure counter in Redis
    await kvStore.del(`ratelimit:2fa_fail:${userId}`)
    await kvStore.del(`ratelimit:2fa_lock:${userId}`)

    // Update last used method in DB
    await pool.query(`
      UPDATE user_two_factor
      SET last_used_at    = NOW(),
          last_used_method= $2,
          updated_at      = NOW()
      WHERE user_id = $1
    `, [userId, params.method])

    await this.logEvent(pool, userId, '2fa_challenge_passed', params.method, {
      ip: params.ipAddress
    })

    // Issue trusted device token if requested
    let deviceToken: string | undefined
    if (params.trustDevice) {
      deviceToken = await trustedDeviceService.trustDevice(pool, userId, {
        ip: params.ipAddress,
        userAgent: params.userAgent,
      })
      await this.logEvent(pool, userId, '2fa_device_trusted', null, {
        ip: params.ipAddress
      })
    }

    return { success: true, userId, deviceToken }
  },

  async recordFailure(pool: Pool, userId: string, ip: string): Promise<void> {
    const failKey = `ratelimit:2fa_fail:${userId}`
    const lockKey = `ratelimit:2fa_lock:${userId}`

    const count = await kvStore.incr(failKey)
    if (count === 1) {
      await kvStore.expire(failKey, 15 * 60) // 15 mins window
    }

    if (count >= 5) {
      await kvStore.setex(lockKey, 30 * 60, 'locked') // Lock for 30 mins
      await this.logEvent(pool, userId, '2fa_locked_out', null, { ip })
      await this.notifyLockout(pool, userId)
    }
  },

  async logEvent(
    pool: Pool,
    userId: string,
    event: string,
    method: string | null,
    metadata: object
  ): Promise<void> {
    await pool.query(`
      INSERT INTO two_factor_audit_log (
        user_id, event, method, metadata
      ) VALUES ($1,$2,$3,$4)
    `, [userId, event, method, JSON.stringify(metadata)])
  },

  async notifySetupComplete(pool: Pool, userId: string, method: string): Promise<void> {
    const user = await pool.query('SELECT email_encrypted FROM users WHERE id=$1', [userId])
    let email = null
    if (user.rows[0]?.email_encrypted) {
      const { decryptPII } = await import('../utils/encryption')
      try { email = decryptPII(user.rows[0].email_encrypted) } catch(e){}
    }
    if (!email) return

    await alertService.sendEmail({
      to: email,
      subject: 'Two-factor authentication enabled on AssetMap',
      html: `
        <p>Two-factor authentication (${method.toUpperCase()}) has been
        successfully enabled on your AssetMap account.</p>
        <p>If you did not do this, please disable 2FA immediately and
        change your password.</p>
      `
    })
  },

  async notifyDisabled(pool: Pool, userId: string): Promise<void> {
    const user = await pool.query('SELECT email_encrypted FROM users WHERE id=$1', [userId])
    let email = null
    if (user.rows[0]?.email_encrypted) {
      const { decryptPII } = await import('../utils/encryption')
      try { email = decryptPII(user.rows[0].email_encrypted) } catch(e){}
    }
    if (!email) return

    await alertService.sendEmail({
      to: email,
      subject: 'Two-factor authentication disabled — AssetMap',
      html: `
        <p><strong>Two-factor authentication has been disabled</strong>
        on your AssetMap account.</p>
        <p>If you did not do this, your account may be compromised.
        Re-enable 2FA and change your password immediately.</p>
      `
    })
  },

  async notifyLockout(pool: Pool, userId: string): Promise<void> {
    try {
      const user = await pool.query('SELECT email_encrypted FROM users WHERE id=$1', [userId])
      let email = null
      if (user.rows[0]?.email_encrypted) {
        const { decryptPII } = await import('../utils/encryption')
        try { email = decryptPII(user.rows[0].email_encrypted) } catch(e){}
      }
      if (!email) return
      await alertService.sendEmail({
        to: email,
        subject: 'AssetMap account temporarily locked',
        html: `
          <p>Your AssetMap account has been temporarily locked for
          30 minutes due to multiple failed 2FA attempts.</p>
          <p>If this was not you, change your password immediately.</p>
        `
      })
    } catch { }
  },

  async notifyBackupCodeUsed(pool: Pool, userId: string): Promise<void> {
    const user = await pool.query('SELECT email_encrypted FROM users WHERE id=$1', [userId])
    let email = null
    if (user.rows[0]?.email_encrypted) {
      const { decryptPII } = await import('../utils/encryption')
      try { email = decryptPII(user.rows[0].email_encrypted) } catch(e){}
    }
    if (!email) return

    const remaining = await backupCodeService.getRemainingCount(pool, userId)

    await alertService.sendEmail({
      to: email,
      subject: 'Backup code used — AssetMap',
      html: `
        <p>A backup code was used to log into your AssetMap account.</p>
        <p>You have <strong>${remaining} backup codes</strong> remaining.</p>
        <p>If this was not you, change your password and disable 2FA immediately.</p>
        ${remaining <= 3 ? '<p><strong>Warning: You are running low on backup codes. Generate new ones from Settings.</strong></p>' : ''}
      `
    })
  }
}
