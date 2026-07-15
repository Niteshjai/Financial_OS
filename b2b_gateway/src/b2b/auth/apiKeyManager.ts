import { Pool }     from 'pg'
import { createHash, randomBytes } from 'crypto'
import Redis        from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')

function generateApiKey(environment: 'live' | 'sandbox'): {
  key:    string
  prefix: string
  hash:   string
} {
  const secret = randomBytes(32).toString('hex')
  const prefix = `am_${environment}_${randomBytes(4).toString('hex')}`
  const key    = `${prefix}_${secret}`
  const hash   = createHash('sha256').update(key).digest('hex')
  return { key, prefix, hash }
}

export const apiKeyManager = {

  async createKey(
    pool: Pool,
    clientId: string,
    options: {
      environment:  'live' | 'sandbox'
      description?: string
      scopes?:      string[]
      ipWhitelist?: string[]
      expiresAt?:   Date
    }
  ): Promise<{ keyId: string; apiKey: string; prefix: string }> {
    const { key, prefix, hash } = generateApiKey(options.environment)

    const result = await pool.query(`
      INSERT INTO b2b_api_keys (
        client_id, key_hash, key_prefix,
        environment, description, scopes,
        ip_whitelist, expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `, [
      clientId, hash, prefix,
      options.environment,
      options.description ?? null,
      options.scopes ?? [],
      options.ipWhitelist ?? [],
      options.expiresAt ?? null
    ])

    await redis.setex(
      `apikey:${hash}`,
      3600,
      clientId
    )

    return {
      keyId:  result.rows[0].id,
      apiKey: key,
      prefix
    }
  },

  async validate(
    pool: Pool,
    apiKey: string,
    ipAddress?: string
  ): Promise<{
    valid:    boolean
    client?:  any
    keyId?:   string
    environment?: string
    error?:   string
  }> {
    const hash = createHash('sha256').update(apiKey).digest('hex')

    const cachedClientId = await redis.get(`apikey:${hash}`)

    let client: any
    let keyRow: any

    if (cachedClientId) {
      const [clientResult, keyResult] = await Promise.all([
        pool.query(
          'SELECT * FROM b2b_clients WHERE id=$1 AND is_active=true',
          [cachedClientId]
        ),
        pool.query(
          `SELECT * FROM b2b_api_keys
           WHERE key_hash=$1 AND is_active=true`,
          [hash]
        )
      ])
      client = clientResult.rows[0]
      keyRow = keyResult.rows[0]
    } else {
      const result = await pool.query(`
        SELECT
          c.*, k.id AS key_id, k.key_prefix,
          k.environment, k.scopes, k.ip_whitelist,
          k.expires_at AS key_expires_at
        FROM b2b_api_keys k
        JOIN b2b_clients c ON c.id = k.client_id
        WHERE k.key_hash = $1
        AND k.is_active  = true
        AND c.is_active  = true
      `, [hash])

      if (!result.rows[0]) {
        return { valid: false, error: 'INVALID_API_KEY' }
      }

      client = result.rows[0]
      keyRow = {
        id:          result.rows[0].key_id,
        ip_whitelist:result.rows[0].ip_whitelist,
        expires_at:  result.rows[0].key_expires_at,
        environment: result.rows[0].environment,
        scopes:      result.rows[0].scopes,
      }

      await redis.setex(`apikey:${hash}`, 3600, client.id)
    }

    if (!client || !keyRow) {
      return { valid: false, error: 'INVALID_API_KEY' }
    }

    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      return { valid: false, error: 'API_KEY_EXPIRED' }
    }

    if (ipAddress && keyRow.ip_whitelist?.length > 0) {
      if (!keyRow.ip_whitelist.includes(ipAddress)) {
        return { valid: false, error: 'IP_NOT_WHITELISTED' }
      }
    }

    await pool.query(
      'UPDATE b2b_api_keys SET last_used_at=NOW() WHERE id=$1',
      [keyRow.id]
    )

    return { valid: true, client, keyId: keyRow.id, environment: keyRow.environment }
  },

  async revokeKey(pool: Pool, keyId: string): Promise<void> {
    const result = await pool.query(
      'SELECT key_hash FROM b2b_api_keys WHERE id=$1',
      [keyId]
    )
    if (result.rows[0]) {
      await redis.del(`apikey:${result.rows[0].key_hash}`)
    }
    await pool.query(
      'UPDATE b2b_api_keys SET is_active=false, revoked_at=NOW() WHERE id=$1',
      [keyId]
    )
  }
}
