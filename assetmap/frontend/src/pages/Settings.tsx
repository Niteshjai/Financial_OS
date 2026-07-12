import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Lock, Moon, Shield, Smartphone } from 'lucide-react';
import { useState } from 'react';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#efeeea] text-zinc-900 font-sans pb-20">
      <header className="sticky top-0 z-20 bg-[#efeeea]/80 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition font-medium text-sm"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-12">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-light tracking-tight text-zinc-900">Account Settings</h1>
          <p className="text-zinc-500 mt-2">Manage your preferences, security, and application settings.</p>
        </div>

        <div className="flex flex-col gap-6">
          <SettingSection title="Security & Authentication" icon={<Lock className="size-5" />}>
            <ToggleRow label="Two-Factor Authentication (2FA)" description="Require a one-time code when logging in." defaultChecked={true} />
            <ToggleRow label="Biometric Login" description="Use Face ID or Fingerprint on supported devices." defaultChecked={false} />
            <div className="px-6 py-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-xs text-zinc-500 mt-0.5">Last changed 3 months ago</p>
              </div>
              <button className="text-sm font-medium bg-zinc-100 px-4 py-1.5 rounded-full hover:bg-zinc-200 transition">Update</button>
            </div>
          </SettingSection>

          <SettingSection title="Notifications" icon={<Bell className="size-5" />}>
            <ToggleRow label="Email Alerts" description="Receive summaries of your portfolio performance." defaultChecked={true} />
            <ToggleRow label="Push Notifications" description="Real-time alerts for large transactions." defaultChecked={true} />
            <ToggleRow label="Marketing Updates" description="News, feature updates, and offers." defaultChecked={false} />
          </SettingSection>

          <SettingSection title="Privacy & Data" icon={<Shield className="size-5" />}>
            <ToggleRow label="Data Sync via AA" description="Automatically fetch new transactions via Account Aggregator." defaultChecked={true} />
            <div className="px-6 py-4 border-t border-zinc-100">
              <button className="text-sm font-medium text-rose-600 hover:text-rose-700 transition">Manage Consent Approvals</button>
            </div>
          </SettingSection>

          <SettingSection title="Appearance" icon={<Moon className="size-5" />}>
            <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">App Theme</p>
                <p className="text-xs text-zinc-500 mt-0.5">Choose your preferred visual style.</p>
              </div>
              <div className="flex bg-zinc-100 p-1 rounded-full">
                <button className="px-4 py-1.5 text-xs font-medium rounded-full bg-white shadow-sm">Light</button>
                <button className="px-4 py-1.5 text-xs font-medium rounded-full text-zinc-500 hover:text-zinc-900 transition">Dark</button>
                <button className="px-4 py-1.5 text-xs font-medium rounded-full text-zinc-500 hover:text-zinc-900 transition">System</button>
              </div>
            </div>
          </SettingSection>
        </div>
      </main>
    </div>
  );
}

function SettingSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[24px] shadow-sm border border-zinc-100 overflow-hidden">
      <div className="p-6 flex items-center gap-3 border-b border-zinc-100 bg-zinc-50/50">
        <div className="p-2 bg-white rounded-xl shadow-sm border border-zinc-100 text-zinc-700">
          {icon}
        </div>
        <h3 className="text-lg font-display font-semibold">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, defaultChecked }: { label: string; description: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <button 
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-lime-400' : 'bg-zinc-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
