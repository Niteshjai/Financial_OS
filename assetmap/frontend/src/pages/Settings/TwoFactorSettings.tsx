import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Smartphone, Mail, KeySquare, MonitorSmartphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface TwoFactorStatus {
  active: boolean;
  method: string | null;
}

export default function TwoFactorSettings() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disableLoading, setDisableLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await api.get('/2fa/status');
      setStatus(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    // In a real app, you'd prompt for a code to disable it. For now we just call disable directly or prompt for code.
    // Let's navigate to a disable flow, or just prompt here.
    const confirm = window.confirm("Are you sure you want to disable 2FA? This will reduce your account security.");
    if (!confirm) return;

    setDisableLoading(true);
    try {
      // Prompt user for current OTP code to disable
      const code = window.prompt("Enter your current 2FA code to disable:");
      if (!code) {
        setDisableLoading(false);
        return;
      }
      
      await api.post('/2fa/disable', { verificationCode: code, method: status?.method });
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  }

  return (
    <div className="min-h-screen text-zinc-900 font-sans pb-20" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      <header className="sticky top-0 z-20 pt-4">
        <div className="w-full px-6 md:px-10 py-2 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2.5 text-zinc-700 hover:text-zinc-900 bg-white/70 hover:bg-white border border-zinc-300 shadow-sm px-5 py-2.5 rounded-full transition-all font-medium text-base backdrop-blur-sm"
          >
            <ArrowLeft className="size-5" />
            Back to Settings
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center mt-32">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <main className="max-w-[672px] mx-auto px-6 mt-0">
        <div className="mb-10 text-left">
          <h1 className="text-4xl font-display font-light tracking-tight text-zinc-900">Two-Factor Authentication</h1>
          <p className="text-zinc-600 mt-2">Add an extra layer of security to your account.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/50 p-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${status?.active ? 'bg-lime-100 text-lime-600' : 'bg-zinc-100 text-zinc-500'}`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{status?.active ? '2FA is Enabled' : '2FA is Disabled'}</h2>
                <p className="text-sm text-zinc-500">{status?.active ? `Using ${status.method?.toUpperCase()} as primary method.` : 'Secure your account by enabling 2FA.'}</p>
              </div>
            </div>
            {status?.active && (
              <button 
                onClick={handleDisable}
                disabled={disableLoading}
                className="px-4 py-2 bg-red-50 text-red-600 font-medium text-sm rounded-xl hover:bg-red-100 transition-colors"
              >
                {disableLoading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            )}
          </div>

          <h3 className="text-lg font-semibold mt-10 mb-4">Authentication Methods</h3>
          
          <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/50 overflow-hidden">
            
            <MethodRow 
              icon={<Smartphone />}
              title="Authenticator App"
              description="Use an app like Google Authenticator or Authy to generate codes."
              active={status?.method === 'totp'}
              onSetup={() => navigate('/settings/2fa/totp')}
              disabled={status?.active && status?.method !== 'totp'}
            />
            
            <div className="h-px bg-zinc-100 w-full" />
            
            <MethodRow 
              icon={<Mail />}
              title="Email OTP"
              description="Receive a one-time passcode via Email."
              active={status?.method === 'email'}
              onSetup={() => navigate('/settings/2fa/email')}
              disabled={status?.active && status?.method !== 'email'}
            />
          </div>

          {status?.active && (
            <>
              <h3 className="text-lg font-semibold mt-10 mb-4">Recovery & Devices</h3>
              <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/50 overflow-hidden">
                <MethodRow 
                  icon={<KeySquare />}
                  title="Backup Codes"
                  description="Use these single-use codes if you lose access to your device."
                  actionLabel="Generate New"
                  onSetup={() => navigate('/settings/2fa/backup')}
                />
                <div className="h-px bg-zinc-100 w-full" />
                <MethodRow 
                  icon={<MonitorSmartphone />}
                  title="Trusted Devices"
                  description="Manage devices that can skip 2FA for 30 days."
                  actionLabel="Manage"
                  onSetup={() => navigate('/settings/2fa/devices')}
                />
              </div>
            </>
          )}

        </div>
        </main>
      )}
    </div>
  );
}

function MethodRow({ icon, title, description, active, onSetup, disabled, actionLabel = 'Setup' }: any) {
  return (
    <div className={`p-6 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row transition-colors ${disabled ? 'opacity-50' : 'hover:bg-zinc-50'}`}>
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-600">
          {icon}
        </div>
        <div className="text-left">
          <h4 className="font-semibold text-zinc-900">{title}</h4>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div>
        {active ? (
          <span className="px-3 py-1 bg-lime-100 text-lime-700 text-xs font-semibold rounded-full">Active</span>
        ) : (
          <button 
            onClick={onSetup}
            disabled={disabled}
            className="px-4 py-2 bg-zinc-900 text-white font-medium text-sm rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-900"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
