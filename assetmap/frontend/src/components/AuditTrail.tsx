import { useEffect, useState } from 'react';
import { getAuditLog, type AuditLogEntry } from '../services/assets';

const ACTION_ICONS: Record<string, string> = {
  AADHAAR_INITIATED: '🔐', AADHAAR_VERIFIED: '✅', LOGIN: '🔑', LOGOUT: '🚪',
  TOKEN_REFRESHED: '🔄', CONSENT_CREATED: '📝', CONSENT_APPROVED: '✅',
  CONSENT_REVOKED: '❌', CONSENT_EXPIRED: '⏰', DATA_FETCHED: '📊',
  DATA_REFRESHED: '🔄', LAND_SEARCH: '🏠', REPORT_GENERATED: '📄',
  REPORT_DOWNLOADED: '⬇️', ESTATE_FILED: '📋', ESTATE_VERIFIED: '✅',
  ESTATE_ASSETS_VIEWED: '👁️', AUDIT_LOG_VIEWED: '📜', USER_DATA_DELETED: '🗑️',
};

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  async function loadLogs() {
    setLoading(true);
    try {
      const result = await getAuditLog(page, 15);
      setLogs(result.logs);
      setTotalPages(result.totalPages);
    } catch {
      // Silently handle — user will see empty state
    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(ts: string): string {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-surface-50">Data Access Log</h3>
          <p className="text-xs text-surface-100/40 mt-0.5">
            Transparency per DPDP Act 2023 — see who accessed your data and when
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="shimmer w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <div className="shimmer h-4 w-48 mb-2" />
                <div className="shimmer h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-surface-100/40">No audit log entries yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="glass-card p-4 flex items-center gap-4 animate-[fade-in_0.2s_ease]">
                <div className="w-10 h-10 rounded-lg bg-surface-800/80 flex items-center justify-center text-lg shrink-0">
                  {ACTION_ICONS[log.action] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-50">
                    {log.actionDescription}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-surface-100/40">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    {log.ipAddress && (
                      <span className="text-xs text-surface-100/30">
                        IP: {log.ipAddress}
                      </span>
                    )}
                    {log.entityType && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface-700/50 text-surface-100/40">
                        {log.entityType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-sm text-surface-100/50">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
