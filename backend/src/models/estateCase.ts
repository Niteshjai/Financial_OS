import { pool } from '../db/connection';
import { decryptPII } from '../utils/encryption';
import { EstateStatus } from '../utils/constants';

// ═══════════════════════════════════════════════════════════════
// Estate Case Model
// ═══════════════════════════════════════════════════════════════

export interface EstateCase {
  id: string;
  filedByUserId: string;
  deceasedName: string;
  deceasedAadhaarHash: string;
  deathCertificateS3Key: string;
  legalHeirDocS3Key: string;
  status: EstateStatus;
  verifiedAt: string | null;
  createdAt: string;
}

export const EstateCaseModel = {
  async findById(id: string): Promise<EstateCase | null> {
    const result = await pool.query('SELECT * FROM estate_cases WHERE id = $1', [id]);
    return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
  },

  async findByUserId(userId: string): Promise<EstateCase[]> {
    const result = await pool.query(
      'SELECT * FROM estate_cases WHERE filed_by_user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(mapRow);
  },

  async updateStatus(id: string, status: EstateStatus): Promise<void> {
    await pool.query(
      `UPDATE estate_cases SET status = $1, verified_at = CASE WHEN $1 = 'VERIFIED' THEN NOW() ELSE verified_at END WHERE id = $2`,
      [status, id]
    );
  },

  async create(data: {
    filedByUserId: string;
    deceasedNameEncrypted: string;
    deceasedAadhaarHash: string;
    deathCertificateS3Key: string;
    legalHeirDocS3Key: string;
  }): Promise<string> {
    const result = await pool.query(
      `INSERT INTO estate_cases (filed_by_user_id, deceased_name_encrypted, deceased_aadhaar_hash, death_certificate_s3_key, legal_heir_doc_s3_key)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [data.filedByUserId, data.deceasedNameEncrypted, data.deceasedAadhaarHash, data.deathCertificateS3Key, data.legalHeirDocS3Key]
    );
    return result.rows[0].id;
  },
};

function mapRow(row: any): EstateCase {
  return {
    id: row.id,
    filedByUserId: row.filed_by_user_id,
    deceasedName: row.deceased_name_encrypted ? decryptPII(row.deceased_name_encrypted) : 'N/A',
    deceasedAadhaarHash: row.deceased_aadhaar_hash,
    deathCertificateS3Key: row.death_certificate_s3_key,
    legalHeirDocS3Key: row.legal_heir_doc_s3_key,
    status: row.status,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
  };
}
