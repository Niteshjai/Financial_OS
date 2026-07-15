import { pool } from '../db/connection';

class AuditLogger {
  async log(data: {
    userId: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (process.env.MOCK_MODE === 'true') return;
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2::audit_action, $3, $4, $5::jsonb)`,
        [
          data.userId,
          data.action,
          data.entityType || null,
          data.entityId || null,
          data.metadata ? JSON.stringify(data.metadata) : null,
        ]
      );
    } catch (error) {
      console.error('CRITICAL: Audit log write failed', error);
    }
  }
}

export const auditLogger = new AuditLogger();
