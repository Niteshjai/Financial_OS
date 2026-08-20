import crypto  from 'crypto'
import bcrypt  from 'bcrypt'
import { Pool }from 'pg'

const BACKUP_CODE_COUNT  = 10
const BACKUP_CODE_LENGTH = 10   // e.g. XXXX-XXXXX
const BCRYPT_ROUNDS      = 10

function generateCode(): string {
  const raw = crypto.randomBytes(6).toString('hex').toUpperCase()
  return `${raw.slice(0,4)}-${raw.slice(4,9)}`
}

export const backupCodeService = {

  // Generate 10 backup codes for a user
  async generateCodes(
    pool:   Pool,
    userId: string
  ): Promise<string[]> {
    // Delete existing unused codes
    await pool.query(
      'DELETE FROM two_factor_backup_codes WHERE user_id = $1 AND is_used = false',
      [userId]
    )

    const codes: string[] = []

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = generateCode()
      const hash = await bcrypt.hash(code, BCRYPT_ROUNDS)
      codes.push(code)

      await pool.query(`
        INSERT INTO two_factor_backup_codes (user_id, code_hash)
        VALUES ($1, $2)
      `, [userId, hash])
    }

    return codes  // Return plain codes ONCE to show user
  },

  // Verify and consume a backup code
  async verifyAndConsume(
    pool:      Pool,
    userId:    string,
    inputCode: string,
    ipAddress: string
  ): Promise<boolean> {
    const cleanCode = inputCode.trim().toUpperCase()

    // Get all unused codes for this user
    const codes = await pool.query(`
      SELECT id, code_hash FROM two_factor_backup_codes
      WHERE user_id = $1 AND is_used = false
    `, [userId])

    for (const row of codes.rows) {
      const isValid = await bcrypt.compare(cleanCode, row.code_hash)
      if (isValid) {
        // Mark as used — one-time only
        await pool.query(`
          UPDATE two_factor_backup_codes
          SET is_used = true, used_at = NOW(), used_from_ip = $2
          WHERE id = $1
        `, [row.id, ipAddress])
        return true
      }
    }

    return false
  },

  async getRemainingCount(pool: Pool, userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) AS count FROM two_factor_backup_codes WHERE user_id=$1 AND is_used=false',
      [userId]
    )
    return parseInt(result.rows[0].count)
  }
}
