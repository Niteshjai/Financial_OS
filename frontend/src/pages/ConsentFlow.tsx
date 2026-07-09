import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createConsent } from '../services/assets';

const FI_TYPE_OPTIONS = [
  { value: 'DEPOSIT', label: 'Bank Accounts', desc: 'Savings, current, and fixed deposit accounts', icon: '🏦' },
  { value: 'EQUITY', label: 'Stocks & Shares', desc: 'Demat holdings across all brokers', icon: '📈' },
  { value: 'MUTUAL_FUND', label: 'Mutual Funds', desc: 'All mutual fund investments', icon: '💎' },
  { value: 'INSURANCE_POLICIES', label: 'Insurance', desc: 'Life, health, and general policies', icon: '🛡️' },
  { value: 'NPS', label: 'National Pension', desc: 'NPS Tier I and Tier II accounts', icon: '🏛️' },
  { value: 'GSTN', label: 'GST Records', desc: 'GST-linked financial records', icon: '📋' },
];

export default function ConsentFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if returning from AA callback
  const callbackConsentId = searchParams.get('consentId');

  const [step, setStep] = useState(callbackConsentId ? 3 : 1);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [purpose] = useState('Comprehensive asset discovery and visualisation for personal financial planning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dateRangeStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateRangeEnd = new Date().toISOString().split('T')[0];

  function toggleFIType(value: string) {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  function selectAll() {
    setSelectedTypes(FI_TYPE_OPTIONS.map((o) => o.value));
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    try {
      const result = await createConsent({
        fiTypes: selectedTypes,
        purpose,
        dateRangeStart,
        dateRangeEnd,
      });

      // In production, redirect to AA app
      // In sandbox, go to step 3 directly
      if (result.redirectUrl.includes('localhost') || result.redirectUrl.includes('callback')) {
        setStep(3);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        window.location.href = result.redirectUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create consent request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-[fade-in_0.5s_ease]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold gradient-text mb-2">Grant Data Access</h1>
          <p className="text-surface-100/50 text-sm">
            Choose what financial data AssetMap can access on your behalf
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Select Data', 'Review', 'Confirm'].map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  idx + 1 <= step
                    ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'
                    : 'bg-surface-800 text-surface-100/40 border border-surface-700'
                }`}>
                  {idx + 1 < step ? '✓' : idx + 1}
                </div>
                <span className="text-xs text-surface-100/50">{label}</span>
              </div>
              {idx < 2 && <div className={`w-16 h-0.5 mb-5 rounded ${idx + 1 < step ? 'bg-primary-500' : 'bg-surface-700'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Select FI Types */}
        {step === 1 && (
          <div className="glass-card p-6 animate-[slide-up_0.4s_ease]">
            {/* DPDP Act compliance notice */}
            <div className="mb-6 p-4 rounded-lg bg-primary-500/10 border border-primary-500/20">
              <h3 className="text-sm font-semibold text-primary-300 mb-1">🔒 Your Data, Your Control</h3>
              <p className="text-xs text-surface-100/60">
                Under the Digital Personal Data Protection Act 2023, you have full control over your data.
                Select only what you want to share. You can revoke access at any time.
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-50">Select data types to access</h2>
              <button onClick={selectAll} className="text-xs text-primary-400 hover:text-primary-300 transition">
                Select All
              </button>
            </div>

            <div className="grid gap-3">
              {FI_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTypes.includes(opt.value)
                      ? 'border-primary-500/50 bg-primary-500/10'
                      : 'border-surface-700/50 bg-surface-800/30 hover:border-surface-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(opt.value)}
                    onChange={() => toggleFIType(opt.value)}
                    className="sr-only"
                  />
                  <span className="text-2xl">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-surface-50">{opt.label}</div>
                    <div className="text-xs text-surface-100/50">{opt.desc}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    selectedTypes.includes(opt.value)
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-surface-600'
                  }`}>
                    {selectedTypes.includes(opt.value) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={selectedTypes.length === 0}
              className="btn-primary w-full mt-6"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="glass-card p-6 animate-[slide-up_0.4s_ease]">
            <h2 className="text-lg font-semibold text-surface-50 mb-4">Review your consent</h2>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg bg-surface-800/50">
                <div className="text-xs text-surface-100/50 mb-1">DATA TYPES</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTypes.map((type) => {
                    const opt = FI_TYPE_OPTIONS.find((o) => o.value === type);
                    return (
                      <span key={type} className="badge badge-active">
                        {opt?.icon} {opt?.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-800/50">
                <div className="text-xs text-surface-100/50 mb-1">PURPOSE</div>
                <p className="text-sm text-surface-100">{purpose}</p>
              </div>

              <div className="p-4 rounded-lg bg-surface-800/50">
                <div className="text-xs text-surface-100/50 mb-1">DATE RANGE</div>
                <p className="text-sm text-surface-100">
                  {dateRangeStart} to {dateRangeEnd}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-surface-800/50">
                <div className="text-xs text-surface-100/50 mb-1">YOUR RIGHTS</div>
                <ul className="text-xs text-surface-100/70 space-y-1">
                  <li>✓ You can revoke this consent at any time</li>
                  <li>✓ Your data is encrypted end-to-end</li>
                  <li>✓ We never share your data with third parties</li>
                  <li>✓ You can request data deletion under DPDP Act</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">← Back</button>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Grant Consent'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="glass-card p-8 text-center animate-[scale-in_0.5s_ease]">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-surface-50 mb-2">Consent Granted!</h2>
            <p className="text-surface-100/50 text-sm mb-4">
              Your financial data is being fetched securely via the Account Aggregator network.
            </p>
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
            <p className="text-surface-100/30 text-xs mt-4">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
