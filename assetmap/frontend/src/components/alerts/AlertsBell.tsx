import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../../services/api';

export default function AlertsBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get<{ data: { unread: number } }>('/engagement/alerts')
      .then(res => setUnread(res.data.data.unread))
      .catch(console.error);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}>
      <Bell size={24} color="var(--text-secondary)" />
      {unread > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          background: 'var(--error)', color: 'white',
          fontSize: 10, fontWeight: 'bold',
          padding: '2px 6px', borderRadius: 10
        }}>
          {unread}
        </span>
      )}
    </div>
  );
}
