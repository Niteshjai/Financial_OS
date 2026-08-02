import { pool } from '../db/connection';
import { AuditAction } from '../utils/constants';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════
// Immutable Audit Logger
// Append-only audit trail for RBI compliance (7-year retention)
// No UPDATE or DELETE operations — enforced by DB triggers
// ═══════════════════════════════════════════════════════════════

class AuditLogger {
  /**
   * Write an immutable audit log entry.
   * This is INSERT-ONLY — the database trigger prevents any UPDATE or DELETE.
   */
  async log(
    userId: string | null,
    action: AuditAction,
    entityType?: string,
    entityId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (process.env.MOCK_MODE === 'true') return;
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
         VALUES ($1, $2::audit_action, $3, $4, $5::inet, $6, $7::jsonb)`,
        [
          userId,
          action,
          entityType || null,
          entityId || null,
          ipAddress || null,
          userAgent || null,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );
    } catch (error) {
      logger.error('CRITICAL: Audit log write failed', {
        action,
        entityType,
        entityId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Fetch a user's own audit trail (paginated).
   * Users have the right to see who accessed their data (DPDP Act transparency).
   */
  async getUserAuditTrail(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ logs: AuditLogEntry[]; total: number; page: number; totalPages: number }> {
    if (process.env.MOCK_MODE === 'true') {
      return {
        logs: [
          { id: '1', action: 'AADHAAR_VERIFIED' as AuditAction, actionDescription: 'Identity verified via Aadhaar', entityType: 'users', entityId: userId, ipAddress: '127.0.0.1', userAgent: null, metadata: null, timestamp: new Date().toISOString() },
          { id: '2', action: 'CONSENT_CREATED' as AuditAction, actionDescription: 'Data access consent created', entityType: 'consents', entityId: 'mock-consent-1', ipAddress: '127.0.0.1', userAgent: null, metadata: null, timestamp: new Date(Date.now() - 60000).toISOString() },
          { id: '3', action: 'DATA_FETCHED' as AuditAction, actionDescription: 'Financial data retrieved', entityType: 'asset_snapshots', entityId: null, ipAddress: '127.0.0.1', userAgent: null, metadata: null, timestamp: new Date(Date.now() - 120000).toISOString() },
        ],
        total: 3, page: 1, totalPages: 1
      };
    }
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    const result = await pool.query(
      `SELECT id, action, entity_type, entity_id, ip_address, user_agent, metadata, timestamp
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      logs: result.rows.map(formatAuditLog),
      total,
      page,
      totalPages,
    };
  }
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actionDescription: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

// ─────────────────────────────────────────────
// Action Descriptions (human-readable)
// ─────────────────────────────────────────────

const ACTION_DESCRIPTIONS: Record<AuditAction, string> = {
  AADHAAR_INITIATED: 'Aadhaar verification initiated',
  AADHAAR_VERIFIED: 'Identity verified via Aadhaar',
  PHONE_OTP_INITIATED: 'Phone OTP verification initiated',
  PHONE_VERIFIED: 'Identity verified via phone OTP',
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
  TOKEN_REFRESHED: 'Session refreshed',
  CONSENT_CREATED: 'Data access consent created',
  CONSENT_APPROVED: 'Data access consent approved',
  CONSENT_REVOKED: 'Data access consent revoked',
  CONSENT_EXPIRED: 'Data access consent expired',
  DATA_FETCHED: 'Financial data retrieved',
  DATA_REFRESHED: 'Financial data refreshed',
  LAND_SEARCH: 'Land record search performed',
  REPORT_GENERATED: 'Asset report generated',
  REPORT_DOWNLOADED: 'Asset report downloaded',
  ESTATE_FILED: 'Estate discovery case filed',
  ESTATE_VERIFIED: 'Estate case verified',
  ESTATE_ASSETS_VIEWED: 'Estate assets viewed',
  AUDIT_LOG_VIEWED: 'Audit trail accessed',
  USER_DATA_DELETED: 'Personal data deleted (right to erasure)',
  INSURANCE_GAP_ANALYSED: 'Insurance gap analysis performed',
  AFFILIATE_CLICK: 'Affiliate link clicked',
  LAND_DATA_FETCHED: 'Land data fetched from registry',
  LAND_RECORD_VIEWED: 'Land record viewed',
  LOAN_ELIGIBILITY_ASSESSED: 'Loan eligibility assessed',
  UNCLAIMED_SEARCH_COMPLETED: 'Unclaimed assets search completed',
  WILL_CREATED: 'Will drafted',
  WILL_PDF_GENERATED: 'Will PDF generated',
  CREATE_RECORD: 'Record created',
  UPDATE_RECORD: 'Record updated',
  UPLOAD_DOCUMENT: 'Document uploaded',
};

function formatAuditLog(row: any): AuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    actionDescription: ACTION_DESCRIPTIONS[row.action as AuditAction] || row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata,
    timestamp: row.timestamp,
  };
}

// ─────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────

export const auditLogger = new AuditLogger();
