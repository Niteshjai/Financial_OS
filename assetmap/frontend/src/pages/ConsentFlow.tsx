import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createConsent } from '../services/assets';
import { useAssetStore } from '../store/assetStore';
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
  const setHasConsent = useAssetStore((s) => s.setHasConsent);

  const [step, setStep] = useState(callbackConsentId ? 3 : 1);

  useEffect(() => {
    if (callbackConsentId) {
      setHasConsent(true);
      const timer = setTimeout(() => navigate('/dashboard'), 2000);
      return () => clearTimeout(timer);
    }
  }, [callbackConsentId, navigate, setHasConsent]);
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

  const isAllSelected = selectedTypes.length === FI_TYPE_OPTIONS.length;

  function handleSelectAllToggle() {
    if (isAllSelected) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(FI_TYPE_OPTIONS.map((o) => o.value));
    }
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
        setHasConsent(true);
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-[fade-in_0.5s_ease]">

        {/* Header */}
        <div className="text-center mb-10 mt-4">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">Grant Data Access</h1>
          <p className="text-zinc-600 text-sm md:text-base">
            Choose what financial data AssetMap can access on your behalf
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {['Select Data', 'Review', 'Confirm'].map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  idx + 1 <= step
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-500 border border-zinc-200'
                }`}>
                  {idx + 1 < step ? '✓' : idx + 1}
                </div>
                <span className="text-xs font-medium text-zinc-600">{label}</span>
              </div>
              {idx < 2 && <div className={`w-16 h-0.5 mb-5 rounded ${idx + 1 < step ? 'bg-zinc-900' : 'bg-zinc-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Select FI Types */}
        {step === 1 && (
          <div className="animate-[slide-up_0.4s_ease]">
            {/* DPDP Act compliance notice */}
            <div className="mb-8 p-4 md:p-5 rounded-2xl bg-amber-50 border border-amber-200">
              <h3 className="text-sm font-semibold text-amber-900 mb-1 flex items-center gap-2">
                🔒 Your Data, Your Control
              </h3>
              <p className="text-sm text-amber-800/80 leading-relaxed">
                Under the Digital Personal Data Protection Act 2023, you have full control over your data.
                Select only what you want to share. You can revoke access at any time.
              </p>
            </div>

            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-bold text-zinc-900">Select data types to access</h2>
              <button onClick={handleSelectAllToggle} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition">
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid gap-3 mb-8">
              {FI_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-4 p-4 md:p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
                    selectedTypes.includes(opt.value)
                      ? 'border-blue-500 bg-blue-50/30'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(opt.value)}
                    onChange={() => toggleFIType(opt.value)}
                    className="sr-only"
                  />
                  <span className="text-2xl md:text-3xl grayscale opacity-80">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-zinc-900 text-base">{opt.label}</div>
                    <div className="text-sm text-zinc-500 mt-0.5">{opt.desc}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedTypes.includes(opt.value)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-zinc-200 bg-zinc-50'
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
              className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition shadow-sm"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="animate-[slide-up_0.4s_ease]">
            <h2 className="text-xl font-bold text-zinc-900 mb-6">Review your consent</h2>

            <div className="space-y-4 mb-8">
              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="text-xs font-semibold text-zinc-500 mb-2 tracking-wider">DATA TYPES</div>
                <div className="flex flex-wrap gap-2">
                  {selectedTypes.map((type) => {
                    const opt = FI_TYPE_OPTIONS.find((o) => o.value === type);
                    return (
                      <span key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-sm font-medium text-zinc-700 shadow-sm">
                        {opt?.icon} {opt?.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="text-xs font-semibold text-zinc-500 mb-2 tracking-wider">PURPOSE</div>
                <p className="text-sm font-medium text-zinc-800 leading-relaxed">{purpose}</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="text-xs font-semibold text-zinc-500 mb-2 tracking-wider">DATE RANGE</div>
                <p className="text-sm font-medium text-zinc-800">
                  {dateRangeStart} to {dateRangeEnd}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="text-xs font-semibold text-zinc-500 mb-2 tracking-wider">YOUR RIGHTS</div>
                <ul className="text-sm text-zinc-600 space-y-2">
                  <li className="flex items-center gap-2">✓ You can revoke this consent at any time</li>
                  <li className="flex items-center gap-2">✓ Your data is encrypted end-to-end</li>
                  <li className="flex items-center gap-2">✓ We never share your data with third parties</li>
                  <li className="flex items-center gap-2">✓ You can request data deletion under DPDP Act</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl border border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 transition">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Grant Consent'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="p-10 text-center animate-[scale-in_0.5s_ease]">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-3">Consent Granted!</h2>
            <p className="text-zinc-500 text-base mb-8 max-w-sm mx-auto">
              Your financial data is being fetched securely via the Account Aggregator network.
            </p>
            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-zinc-400 text-sm mt-4 font-medium">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
