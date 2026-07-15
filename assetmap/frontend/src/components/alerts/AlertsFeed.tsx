import { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function AlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    api.get<{ data: { alerts: Alert[] } }>('/engagement/alerts')
      .then(res => setAlerts(res.data.data.alerts))
      .catch(console.error);
  }, []);

  const markAllRead = () => {
    api.post('/engagement/alerts/read-all', {})
      .then(() => setAlerts(alerts.map(a => ({ ...a, is_read: true }))))
      .catch(console.error);
  };

  return (
    <div style={{ padding: '20px', background: 'var(--surface-1)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Alerts</h3>
        <button onClick={markAllRead} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
          Mark all as read
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alerts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No alerts to show.</p>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} style={{
              padding: 16,
              background: alert.is_read ? 'var(--surface-2)' : 'var(--surface-3)',
              borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--error)' : alert.severity === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
              borderRadius: '0 8px 8px 0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{alert.title}</strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(alert.created_at).toLocaleDateString()}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>{alert.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
