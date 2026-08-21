import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Lock, Moon, Shield, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import ConsentManagerModal from '../components/settings/ConsentManagerModal';

type Theme = 'light' | 'dark' | 'system';

export default function Settings() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<Theme>('light');
  const [savedMessage, setSavedMessage] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean | 'error' | null>(null);

  useEffect(() => {
    async function fetchTwoFactorStatus() {
      try {
        const res = await api.get('/2fa/status');
        setTwoFactorEnabled(res.data.data.isEnabled);
      } catch (err) {
        console.error('Failed to fetch 2FA status', err);
        setTwoFactorEnabled('error');
      }
    }
    fetchTwoFactorStatus();
  }, []);

  // Show a brief "Saved!" toast when any setting changes
  function flashSaved(msg: string) {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(''), 2000);
  }

  return (
    <div className="min-h-screen text-zinc-900 font-sans pb-20" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      {/* Save confirmation toast */}
      <div
        className={`fixed top-6 right-6 z-50 flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium transition-all duration-300 ${
          savedMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <Check className="size-4 text-lime-400" strokeWidth={2.5} />
        {savedMessage}
      </div>

      <header className="sticky top-0 z-20 pt-4">
        <div className="w-full px-6 md:px-10 py-2 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 text-zinc-700 hover:text-zinc-900 bg-white/70 hover:bg-white border border-zinc-300 shadow-sm px-5 py-2.5 rounded-full transition-all font-medium text-base backdrop-blur-sm"
          >
            <ArrowLeft className="size-5" />
            Back
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-0">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-display font-light tracking-tight text-zinc-900">Account Settings</h1>
          <p className="text-zinc-600 mt-2">Manage your preferences, security, and application settings.</p>
        </div>

        <div className="flex flex-col gap-6">
          <SettingSection title="Security & Authentication" icon={<Lock className="size-5" />}>
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/50 last:border-0 hover:bg-zinc-100/50 transition cursor-pointer" onClick={() => navigate('/settings/2fa')}>
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication (2FA)</p>
                <p className="text-xs text-zinc-500 mt-0.5">Manage your 2FA methods and trusted devices.</p>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                {twoFactorEnabled === null ? (
                  <div className="size-4 rounded-full border-2 border-zinc-200 border-t-zinc-600 animate-spin" />
                ) : twoFactorEnabled === 'error' ? (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-600">Error</span>
                ) : (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${twoFactorEnabled ? 'bg-lime-100 text-lime-700' : 'bg-zinc-100 text-zinc-600'}`}>
                    {twoFactorEnabled ? 'On' : 'Off'}
                  </span>
                )}
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </div>
            </div>
          </SettingSection>

          <SettingSection title="Notifications" icon={<Bell className="size-5" />}>
            <ToggleRow label="Email Alerts" description="Receive summaries of your portfolio performance." defaultChecked={true} onToggle={(v) => flashSaved(v ? 'Email alerts on' : 'Email alerts off')} />
            <ToggleRow label="Push Notifications" description="Real-time alerts for large transactions." defaultChecked={true} onToggle={(v) => flashSaved(v ? 'Push notifications on' : 'Push notifications off')} />
            <ToggleRow label="Marketing Updates" description="News, feature updates, and offers." defaultChecked={false} onToggle={(v) => flashSaved(v ? 'Marketing updates on' : 'Marketing updates off')} />
          </SettingSection>

          <SettingSection title="Privacy & Data" icon={<Shield className="size-5" />}>
            <ToggleRow label="Data Sync via AA" description="Automatically fetch new transactions via Account Aggregator." defaultChecked={true} onToggle={(v) => flashSaved(v ? 'Data sync enabled' : 'Data sync paused')} />
            <div className="px-6 py-4 border-t border-zinc-100">
              <button
                onClick={() => setShowConsentModal(true)}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition active:scale-95"
              >
                Manage Consent Approvals
              </button>
            </div>
          </SettingSection>

          <SettingSection title="Appearance" icon={<Moon className="size-5" />}>
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">App Theme</p>
                <p className="text-xs text-zinc-500 mt-0.5">Choose your preferred visual style.</p>
              </div>
              <div className="flex bg-zinc-100 p-1 rounded-full">
                {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTheme(t); flashSaved(`Theme set to ${t}`); }}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full capitalize transition-all duration-200 ${
                      theme === t
                        ? 'bg-white shadow-sm text-zinc-900 scale-105'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </SettingSection>
        </div>
      </main>

      {showConsentModal && (
        <ConsentManagerModal onClose={() => setShowConsentModal(false)} />
      )}
    </div>
  );
}

function SettingSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-[24px] shadow-sm border border-zinc-200/50 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-zinc-200/50">
        <div className="p-2 bg-white/50 backdrop-blur-sm rounded-xl shadow-sm border border-zinc-200/50 text-zinc-700">
          {icon}
        </div>
        <h3 className="text-lg font-display font-semibold">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, defaultChecked, onToggle }: { label: string; description: string; defaultChecked: boolean; onToggle?: (value: boolean) => void }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/50 last:border-0 hover:bg-zinc-100/50 transition">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <button 
        onClick={() => { const next = !checked; setChecked(next); onToggle?.(next); }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-lime-400' : 'bg-zinc-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

