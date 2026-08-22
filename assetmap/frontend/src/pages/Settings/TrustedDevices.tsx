import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MonitorSmartphone, Monitor, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    try {
      const res = await api.get('/2fa/devices');
      setDevices(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load trusted devices.');
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
      toast.error(err.response?.data?.error?.message || 'Failed to revoke device.');
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
      toast.error(err.response?.data?.error?.message || 'Failed to revoke devices.');
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
    <div className="min-h-screen text-zinc-900 font-sans pb-20" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
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
        <main className="max-w-[560px] mx-auto px-6 mt-2 sm:mt-4">
        <div className="mb-10 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-display font-light tracking-tight text-zinc-900">Trusted Devices</h1>
          <p className="text-zinc-600 mt-2.5 text-xs sm:text-sm max-w-[440px] mx-auto leading-relaxed">
            Devices listed here can bypass 2FA for 30 days. If you don't recognize a device, revoke it immediately.
          </p>
          {devices.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button 
                onClick={handleRevokeAll}
                className="px-3.5 py-1.5 bg-white text-red-600 border border-red-200 hover:border-red-300 font-medium text-xs rounded-xl hover:bg-red-50 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="size-3.5 text-red-500" />
                <span>Revoke All Devices</span>
              </button>
            </div>
          )}
        </div>

        {devices.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-zinc-200/60 p-8 sm:p-10 flex flex-col items-center text-center">
            <div className="size-12 bg-zinc-100/80 rounded-2xl flex items-center justify-center mb-3.5 text-zinc-400">
              <MonitorSmartphone className="size-6" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900">No Trusted Devices</h3>
            <p className="text-xs text-zinc-500 mt-1.5 max-w-[340px] leading-relaxed">
              You haven't trusted any devices yet. You can choose to trust a device during the 2FA login process.
            </p>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
            {devices.map(device => (
              <div key={device.id} className="p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-zinc-50/80 transition-colors">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-2 bg-zinc-100 rounded-lg text-zinc-500 shrink-0">
                    {getIcon(device.device_name)}
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="font-semibold text-sm text-zinc-900 truncate">{device.device_name || 'Unknown Device'}</h4>
                    <div className="text-xs text-zinc-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>IP: {device.ip_address}</span>
                      <span>•</span>
                      <span>Last active: {formatDate(device.last_used_at)}</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleRevoke(device.id)}
                  disabled={revokingId === device.id}
                  className="px-3 py-1.5 text-red-600 hover:bg-red-50 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 border border-transparent hover:border-red-100 disabled:opacity-50"
                  title="Revoke Trust"
                >
                  <Trash2 className="size-3.5" />
                  <span>{revokingId === device.id ? 'Revoking...' : 'Revoke'}</span>
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
