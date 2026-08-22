import crypto  from 'crypto'
import { Pool }from 'pg'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const trustedDeviceService = {

  // Issue a trusted device token after successful 2FA
  async trustDevice(
    pool:      Pool,
    userId:    string,
    request:   {
      ip:        string
      userAgent: string
      deviceName?:string
    }
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)

    // Parse device info from UA
    const deviceType = parseDeviceType(request.userAgent)
    const browser    = parseBrowser(request.userAgent)
    const os         = parseOS(request.userAgent)

    await pool.query(`
      INSERT INTO trusted_devices (
        user_id, device_token_hash, device_name,
        device_type, browser, os,
        ip_address, trusted_at, last_used_at, expires_at, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW() + INTERVAL '30 days', true)
    `, [
      userId, tokenHash,
      request.deviceName ?? `${browser} on ${os}`,
      deviceType, browser, os, request.ip
    ])

    return token
  },

  // Check if a device token is valid and trusted
  async isTrusted(
    pool:    Pool,
    userId:  string,
    token:   string
  ): Promise<boolean> {
    if (!token) return false
    const tokenHash = hashToken(token)

    const result = await pool.query(`
      UPDATE trusted_devices
      SET last_used_at = NOW()
      WHERE user_id    = $1
      AND device_token_hash = $2
      AND is_active    = true
      AND expires_at   > NOW()
      RETURNING id
    `, [userId, tokenHash])

    return result.rows.length > 0
  },

  async listDevices(pool: Pool, userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT
        id, device_name, device_type, browser, os,
        ip_address, trusted_at, expires_at, last_used_at
      FROM trusted_devices
      WHERE user_id = $1
      AND is_active = true
      AND expires_at > NOW()
      ORDER BY last_used_at DESC
    `, [userId])
    return result.rows
  },

  async revokeDevice(pool: Pool, userId: string, deviceId: string): Promise<void> {
    await pool.query(`
      UPDATE trusted_devices
      SET is_active = false
      WHERE id = $1 AND user_id = $2
    `, [deviceId, userId])
  },

  async revokeAllDevices(pool: Pool, userId: string): Promise<void> {
    await pool.query(
      'UPDATE trusted_devices SET is_active = false WHERE user_id = $1',
      [userId]
    )
  }
}

function parseDeviceType(ua: string): string {
  if (/mobile|iphone|android/i.test(ua))  return 'mobile'
  if (/tablet|ipad/i.test(ua))           return 'tablet'
  return 'desktop'
}

function parseBrowser(ua: string): string {
  if (/Chrome/i.test(ua)  && !/Chromium/i.test(ua)) return 'Chrome'
  if (/Firefox/i.test(ua))  return 'Firefox'
  if (/Safari/i.test(ua)  && !/Chrome/i.test(ua))   return 'Safari'
  if (/Edge/i.test(ua))     return 'Edge'
  if (/OPR|Opera/i.test(ua))return 'Opera'
  return 'Browser'
}

function parseOS(ua: string): string {
  if (/Windows/i.test(ua))   return 'Windows'
  if (/Mac OS/i.test(ua))    return 'macOS'
  if (/Linux/i.test(ua))     return 'Linux'
  if (/Android/i.test(ua))   return 'Android'
  if (/iOS|iPhone|iPad/i.test(ua)) return 'iOS'
  return 'Unknown OS'
}
