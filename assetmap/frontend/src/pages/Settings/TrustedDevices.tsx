import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MonitorSmartphone, Monitor, Smartphone, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

interface TrustedDevice {
  id: string;
  device_name: string;
  ip_address: string;
  last_used_at: string;
  expires_at: string;
}

export default function TrustedDevices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    try {
      const res = await api.get('/2fa/devices');
      setDevices(res.data.data);
    } catch (err: any) {
      setError('Failed to load trusted devices.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(deviceId: string) {
    if (!window.confirm("Are you sure you want to revoke this device? You'll need to enter a 2FA code the next time you log in from it.")) {
      return;
    }
    setRevokingId(deviceId);
    try {
      await api.delete(`/2fa/devices/${deviceId}`);
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to revoke device.');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeAll() {
    if (!window.confirm("Are you sure you want to revoke ALL trusted devices? You'll be asked for 2FA on every device next time you log in.")) {
      return;
    }
    try {
      await api.delete('/2fa/devices');
      setDevices([]);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to revoke devices.');
    }
  }

  function getIcon(userAgent: string) {
    if (userAgent.toLowerCase().includes('mobile') || userAgent.toLowerCase().includes('iphone') || userAgent.toLowerCase().includes('android')) {
      return <Smartphone className="w-5 h-5" />;
    }
    return <Monitor className="w-5 h-5" />;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  return (
    <div className="min-h-screen text-zinc-900 font-sans pb-20 bg-zinc-50/50">
      <header className="sticky top-0 z-20 pt-4">
        <div className="w-full px-6 md:px-10 py-2 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => navigate('/settings/2fa')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 bg-white/50 hover:bg-white/80 border border-zinc-300/50 shadow-sm px-3 py-1.5 rounded-full transition-all font-medium text-sm backdrop-blur-sm"
          >
            <ArrowLeft className="size-4" />
            Back to 2FA Settings
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center mt-32">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <main className="max-w-[672px] mx-auto px-6 mt-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-light tracking-tight text-zinc-900">Trusted Devices</h1>
            <p className="text-zinc-600 mt-2 max-w-[448px]">
              Devices listed here can bypass 2FA for 30 days. If you don't recognize a device, revoke it immediately.
            </p>
          </div>
          {devices.length > 0 && (
            <button 
              onClick={handleRevokeAll}
              className="px-4 py-2 bg-white text-red-600 border border-red-200 font-medium text-sm rounded-xl hover:bg-red-50 transition-colors flex-shrink-0"
            >
              Revoke All Devices
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 mb-6 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {devices.length === 0 ? (
          <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/50 p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 text-zinc-400">
              <MonitorSmartphone className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-lg">No Trusted Devices</h3>
            <p className="text-sm text-zinc-500 mt-2 max-w-[384px]">
              You haven't trusted any devices yet. You can choose to trust a device during the 2FA login process.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/50 overflow-hidden divide-y divide-zinc-100">
            {devices.map(device => (
              <div key={device.id} className="p-6 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row hover:bg-zinc-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-500 mt-1 sm:mt-0">
                    {getIcon(device.device_name)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 line-clamp-1">{device.device_name || 'Unknown Device'}</h4>
                    <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
                      <p>IP: {device.ip_address}</p>
                      <p>Last active: {formatDate(device.last_used_at)}</p>
                      <p>Expires: {formatDate(device.expires_at)}</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleRevoke(device.id)}
                  disabled={revokingId === device.id}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 font-medium text-sm rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
                  title="Revoke Trust"
                >
                  <Trash2 className="w-4 h-4" />
                  {revokingId === device.id ? 'Revoking...' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        )}
        </main>
      )}
    </div>
  );
}
