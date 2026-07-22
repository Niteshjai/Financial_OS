import { pool } from '../db/connection';
import { decryptPII, encryptPII, hashMobile, hashEmail } from '../utils/encryption';
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
  email?: string;
  pan?: string;
  fathersName?: string;
  nationality?: string;
  countryCode?: string;
  registeredAt?: string;
  createdAt: string;
  lastLoginAt: string | null;
  subscriptionTier?: 'free' | 'premium';
}

export const UserModel = {
  async findById(id: string): Promise<User | null> {
    if (process.env.MOCK_MODE === 'true') {
      return {
        id: '00000000-0000-4000-a000-000000000001',
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
        id: '00000000-0000-4000-a000-000000000001',
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
      return null; // In mock mode, return null so we can test new user flow
    }
    const result = await pool.query(
      'SELECT * FROM users WHERE mobile_hash = $1',
      [mobileHash]
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  },

  /**
   * Check if a phone number is registered. Returns user or null.
   * Does NOT auto-create users — that happens after Aadhaar KYC.
   */
  async findByPhone(phone: string): Promise<User | null> {
    if (process.env.MOCK_MODE === 'true') {
      // Check in-memory mock registry
      const registered = mockRegistry.get(phone);
      if (registered) return registered;
      return null;
    }
    const mobileHash = hashMobile(phone);
    return this.findByMobileHash(mobileHash);
  },

  /**
   * Register a new user after Aadhaar KYC verification.
   * Stores phone, country, aadhaar hash, name, DOB, father's name, nationality.
   */
  async registerWithAadhaar(
    phone: string,
    countryCode: string,
    aadhaarData: {
      aadhaarHash: string;
      name: string;
      dob: string;
      fathersName: string;
      nationality: string;
      email?: string;
    }
  ): Promise<User> {
    if (process.env.MOCK_MODE === 'true') {
      const mockUser: User = {
        id: `mock-user-${Date.now()}`,
        aadhaarHash: aadhaarData.aadhaarHash,
        name: aadhaarData.name,
        dob: aadhaarData.dob,
        mobile: phone,
        email: aadhaarData.email,
        fathersName: aadhaarData.fathersName,
        nationality: aadhaarData.nationality,
        countryCode: countryCode,
        registeredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      // Store in mock registry for subsequent lookups
      mockRegistry.set(phone, mockUser);
      return mockUser;
    }

    const mobileHash = hashMobile(phone);
    const emailHash = aadhaarData.email ? hashEmail(aadhaarData.email) : null;
    const emailEncrypted = aadhaarData.email ? encryptPII(aadhaarData.email) : null;

    const result = await pool.query(
      `INSERT INTO users (
        aadhaar_hash, mobile_hash, mobile_encrypted, email_hash, email_encrypted, name_encrypted, 
        dob_encrypted, fathers_name_encrypted, nationality, country_code, registered_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [
        aadhaarData.aadhaarHash,
        mobileHash,
        encryptPII(phone),
        emailHash,
        emailEncrypted,
        encryptPII(aadhaarData.name),
        encryptPII(aadhaarData.dob),
        encryptPII(aadhaarData.fathersName),
        aadhaarData.nationality,
        countryCode,
      ]
    );
    return mapRow(result.rows[0]);
  },

  /**
   * Legacy: findOrCreateByPhone — still used as fallback for returning users.
   * Now it only finds; if not found, returns isNewUser: true without creating.
   */
  async findOrCreateByPhone(phone: string): Promise<{ user: User; isNewUser: boolean }> {
    const existing = await this.findByPhone(phone);
    if (existing) {
      if (process.env.MOCK_MODE !== 'true') {
        await this.updateLastLogin(existing.id);
      }
      return { user: existing, isNewUser: false };
    }
    return {
      user: {
        id: '',
        aadhaarHash: '',
        mobile: phone,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      },
      isNewUser: true,
    };
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

      // --- PHASE 1 TABLES ---
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
      // Delete sessions
      await client.query('DELETE FROM sessions WHERE user_id = $1', [id]);
      // Delete net worth history
      await client.query('DELETE FROM net_worth_history WHERE user_id = $1', [id]);
      
      // --- PHASE 2 TABLES ---
      // WILLS
      await client.query('DELETE FROM will_allocations WHERE user_id = $1', [id]);
      await client.query('DELETE FROM will_beneficiaries WHERE user_id = $1', [id]);
      await client.query('DELETE FROM wills WHERE user_id = $1', [id]);

      // RECOVERY
      await client.query('DELETE FROM recovery_documents WHERE user_id = $1', [id]);
      await client.query('DELETE FROM recovery_timeline WHERE user_id = $1', [id]);
      await client.query('DELETE FROM recovery_fee_agreements WHERE user_id = $1', [id]);
      await client.query('DELETE FROM recovery_notifications WHERE user_id = $1', [id]);
      await client.query('DELETE FROM recovery_revenue WHERE user_id = $1', [id]);
      await client.query('DELETE FROM recovery_cases WHERE user_id = $1', [id]);

      // UNCLAIMED & INSURANCE & LOANS
      await client.query('DELETE FROM unclaimed_search_requests WHERE user_id = $1', [id]);
      await client.query('DELETE FROM insurance_gap_analysis WHERE user_id = $1', [id]);
      await client.query('DELETE FROM loan_assessments WHERE user_id = $1', [id]);

      // Delete user (PII is cascade-deleted for anything with ON DELETE CASCADE)
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

// ─────────────────────────────────────────────
// In-memory mock registry for MOCK_MODE
// ─────────────────────────────────────────────
const mockRegistry = new Map<string, User>();

function mapRow(row: any): User {
  return {
    id: row.id,
    aadhaarHash: row.aadhaar_hash,
    name: row.name_encrypted ? decryptPII(row.name_encrypted) : undefined,
    dob: row.dob_encrypted ? decryptPII(row.dob_encrypted) : undefined,
    mobile: row.mobile_encrypted ? decryptPII(row.mobile_encrypted) : undefined,
    email: row.email_encrypted ? decryptPII(row.email_encrypted) : undefined,
    pan: row.pan_encrypted ? decryptPII(row.pan_encrypted) : undefined,
    fathersName: row.fathers_name_encrypted ? decryptPII(row.fathers_name_encrypted) : undefined,
    nationality: row.nationality,
    countryCode: row.country_code,
    registeredAt: row.registered_at,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    subscriptionTier: row.subscription_tier || 'free',
  };
}
