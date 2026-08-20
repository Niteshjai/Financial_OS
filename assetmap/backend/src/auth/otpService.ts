import crypto        from 'crypto'
import bcrypt        from 'bcrypt'
import { Pool }      from 'pg'
import { alertService } from '../services/alertService'
import { decryptPII } from '../utils/encryption'
import { kvStore }   from '../db/connection'

const OTP_LENGTH         = 6
const OTP_EXPIRY_MINUTES = 10
const BCRYPT_ROUNDS      = 10

function generateOTP(): string {
  // Cryptographically secure 6-digit OTP
  const bytes  = crypto.randomBytes(4)
  const number = bytes.readUInt32BE(0)
  return String(number % 1000000).padStart(6, '0')
}

export const otpService = {

  async sendSMSOTP(
    pool:   Pool,
    userId: string
  ): Promise<{ sent: boolean; expiresAt: Date }> {
    // Check send rate limit (3 per hour)
    await this.checkSendLimit(userId)

    const user = await pool.query(
      'SELECT mobile_encrypted FROM users WHERE id = $1',
      [userId]
    )
    if (!user.rows[0]?.mobile_encrypted) {
      throw new Error('No mobile number on account')
    }
    const mobile = decryptPII(user.rows[0].mobile_encrypted)

    const otp       = generateOTP()
    const hash      = await bcrypt.hash(otp, BCRYPT_ROUNDS)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    // Store hash in DB
    await pool.query(`
      UPDATE user_two_factor
      SET otp_code_hash    = $2,
          otp_expires_at   = $3,
          otp_sent_at      = NOW(),
          updated_at       = NOW()
      WHERE user_id = $1
    `, [userId, hash, expiresAt])

    // Record send in Redis
    await this.recordSend(userId)

    // Send via MSG91
    await alertService.sendSMS(
      userId,
      mobile,
      `Your AssetMap verification code is: ${otp}\n` +
      `Valid for ${OTP_EXPIRY_MINUTES} minutes.\n` +
      `Never share this code with anyone.`
    )

    return { sent: true, expiresAt }
  },

  async sendEmailOTP(
    pool:   Pool,
    userId: string
  ): Promise<{ sent: boolean; expiresAt: Date; maskedEmail: string }> {
    await this.checkSendLimit(userId)

    const user = await pool.query(
      'SELECT email_encrypted FROM users WHERE id = $1',
      [userId]
    )
    if (!user.rows[0]?.email_encrypted) {
      throw new Error('No email on account')
    }
    const email = decryptPII(user.rows[0].email_encrypted)

    const otp       = generateOTP()
    const hash      = await bcrypt.hash(otp, BCRYPT_ROUNDS)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    await pool.query(`
      UPDATE user_two_factor
      SET otp_code_hash  = $2,
          otp_expires_at = $3,
          otp_sent_at    = NOW(),
          updated_at     = NOW()
      WHERE user_id = $1
    `, [userId, hash, expiresAt])

    // Record send in Redis
    await this.recordSend(userId)

    // Send email via MSG91 email or SES
    await alertService.sendEmail({
      to:      email,
      subject: 'Your AssetMap login verification code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#042C53">Verification code</h2>
          <p>Your AssetMap 2FA code is:</p>
          <div style="font-size:36px;font-weight:600;letter-spacing:8px;
                      color:#185FA5;padding:16px;background:#E6F1FB;
                      border-radius:8px;text-align:center;margin:20px 0">
            ${otp}
          </div>
          <p style="color:#5F5E5A;font-size:13px">
            Valid for ${OTP_EXPIRY_MINUTES} minutes.
            If you did not request this, someone may be trying to
            access your account. Secure your account immediately.
          </p>
        </div>
      `
    })

    // Mask email for display: r***@g***.com
    const [local, domain] = email.split('@')
    const maskedEmail = `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`

    return { sent: true, expiresAt, maskedEmail }
  },

  async verifyOTP(
    pool:    Pool,
    userId:  string,
    code:    string
  ): Promise<boolean> {
    const record = await pool.query(
      'SELECT otp_code_hash, otp_expires_at FROM user_two_factor WHERE user_id = $1',
      [userId]
    )
    if (!record.rows[0]?.otp_code_hash) return false

    const { otp_code_hash, otp_expires_at } = record.rows[0]

    if (new Date() > new Date(otp_expires_at)) return false

    const isValid = await bcrypt.compare(code.trim(), otp_code_hash)

    if (isValid) {
      // Consume OTP — one-time use
      await pool.query(`
        UPDATE user_two_factor
        SET otp_code_hash = NULL, otp_expires_at = NULL
        WHERE user_id = $1
      `, [userId])
    }

    return isValid
  },

  async checkSendLimit(userId: string): Promise<void> {
    const key = `ratelimit:2fa_send:${userId}`
    const countStr = await kvStore.get(key)
    const count = parseInt(countStr || '0', 10)

    if (count >= 3) {
      throw new Error(
        'OTP_RATE_LIMIT: Too many OTP requests. Wait 1 hour before requesting another.'
      )
    }
  },

  async recordSend(userId: string): Promise<void> {
    const key = `ratelimit:2fa_send:${userId}`
    const count = await kvStore.incr(key)
    if (count === 1) {
      await kvStore.expire(key, 60 * 60) // 1 hour TTL
    }
  }
}
