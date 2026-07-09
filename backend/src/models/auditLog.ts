import { pool } from '../db/connection';
import { AuditAction } from '../utils/constants';

// ═══════════════════════════════════════════════════════════════
// Audit Log Model — READ ONLY
// No UPDATE or DELETE — enforced by database triggers
// ═══════════════════════════════════════════════════════════════

export interface AuditLog {
  id: string;
  userId: string | null;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export const AuditLogModel = {
  /** INSERT only — the only write operation allowed */
  async insert(data: {
    userId: string | null;
    action: AuditAction;
    entityType?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const result = await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
       VALUES ($1, $2::audit_action, $3, $4, $5::inet, $6, $7::jsonb) RETURNING id`,
      [data.userId, data.action, data.entityType, data.entityId, data.ipAddress, data.userAgent, data.metadata ? JSON.stringify(data.metadata) : null]
    );
    return result.rows[0].id;
  },

  /** Paginated fetch — user can only see their own logs */
  async findByUserId(userId: string, page: number = 1, limit: number = 20): Promise<{ logs: AuditLog[]; total: number }> {
    const offset = (page - 1) * limit;

    const [logsResult, countResult] = await Promise.all([
      pool.query(
        'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int as total FROM audit_logs WHERE user_id = $1', [userId]),
    ]);

    return {
      logs: logsResult.rows.map(mapRow),
      total: countResult.rows[0].total,
    };
  },
};

function mapRow(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata,
    timestamp: row.timestamp,
  };
}
