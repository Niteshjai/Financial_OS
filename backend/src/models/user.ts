import { pool } from '../db/connection';
import { decryptPII, encryptPII, hashMobile } from '../utils/encryption';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// User Model
// ═══════════════════════════════════════════════════════════════

export interface User {
  id: string;
  aadhaarHash: string;
  name?: string;
  dob?: string;
  mobile?: string;
  pan?: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export const UserModel = {
  async findById(id: string): Promise<User | null> {
    if (process.env.MOCK_MODE === 'true') {
      return {
        id: 'mock-user-1234',
        aadhaarHash: 'mock-hash',
        name: 'Arjun Mock User',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    }
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  },

  async findByAadhaarHash(hash: string): Promise<User | null> {
    if (process.env.MOCK_MODE === 'true') {
      return {
        id: 'mock-user-1234',
        aadhaarHash: hash,
        name: 'Arjun Mock User',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    }
    const result = await pool.query(
      'SELECT * FROM users WHERE aadhaar_hash = $1',
      [hash]
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  },

  async findByMobileHash(mobileHash: string): Promise<User | null> {
    if (process.env.MOCK_MODE === 'true') {
      return {
        id: 'mock-user-1234',
        aadhaarHash: 'mock-hash',
        name: 'Arjun Mock User',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    }
    const result = await pool.query(
      'SELECT * FROM users WHERE mobile_hash = $1',
      [mobileHash]
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  },

  async createFromPhone(phone: string, mobileHash: string): Promise<User> {
    if (process.env.MOCK_MODE === 'true') {
      return {
        id: 'mock-user-1234',
        aadhaarHash: 'mock-hash',
        name: 'Arjun Mock User',
        mobile: phone,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
    }
    const result = await pool.query(
      `INSERT INTO users (mobile_hash, mobile_encrypted, name_encrypted)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [mobileHash, encryptPII(phone), encryptPII('User')]
    );
    return mapRow(result.rows[0]);
  },

  async findOrCreateByPhone(phone: string): Promise<{ user: User; isNewUser: boolean }> {
    if (process.env.MOCK_MODE === 'true') {
      return {
        user: {
          id: 'mock-user-1234',
          aadhaarHash: 'mock-hash',
          name: 'Arjun Mock User',
          mobile: phone,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        },
        isNewUser: false
      };
    }

    const mobileHash = hashMobile(phone);
    const existing = await this.findByMobileHash(mobileHash);
    if (existing) {
      await this.updateLastLogin(existing.id);
      return { user: existing, isNewUser: false };
    }

    const user = await this.createFromPhone(phone, mobileHash);
    return { user, isNewUser: true };
  },

  async updateLastLogin(id: string): Promise<void> {
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [id]
    );
  },

  async updatePAN(id: string, panEncrypted: string): Promise<void> {
    await pool.query(
      'UPDATE users SET pan_encrypted = $1 WHERE id = $2',
      [panEncrypted, id]
    );
  },

  /**
   * DPDP Act right to erasure — delete all personal data.
   * Audit logs are retained as legally required.
   */
  async deleteUserData(id: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete asset snapshots
      await client.query('DELETE FROM asset_snapshots WHERE user_id = $1', [id]);
      // Delete land records
      await client.query('DELETE FROM land_records WHERE user_id = $1', [id]);
      // Delete consents
      await client.query('DELETE FROM consents WHERE user_id = $1', [id]);
      // Delete reports
      await client.query('DELETE FROM reports WHERE user_id = $1', [id]);
      // Delete refresh tokens
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
      // Delete estate cases filed BY this user
      await client.query('DELETE FROM estate_cases WHERE filed_by_user_id = $1', [id]);
      // Delete user (PII is cascade-deleted)
      await client.query('DELETE FROM users WHERE id = $1', [id]);

      // Audit logs are NOT deleted (RBI 7-year retention mandate)

      await client.query('COMMIT');
      logger.info('User data deleted (right to erasure)', { userId: id });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

function mapRow(row: any): User {
  return {
    id: row.id,
    aadhaarHash: row.aadhaar_hash,
    name: row.name_encrypted ? decryptPII(row.name_encrypted) : undefined,
    dob: row.dob_encrypted ? decryptPII(row.dob_encrypted) : undefined,
    mobile: row.mobile_encrypted ? decryptPII(row.mobile_encrypted) : undefined,
    pan: row.pan_encrypted ? decryptPII(row.pan_encrypted) : undefined,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
