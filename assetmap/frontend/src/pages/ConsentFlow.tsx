import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createConsent } from '../services/assets';
import { api } from '../services/api';
import { useAssetStore } from '../store/assetStore';

const FI_TYPE_OPTIONS = [
  { value: 'DEPOSIT', label: 'Bank Accounts', desc: 'Savings, current, and fixed deposit accounts', icon: '🏦' },
  { value: 'EQUITY', label: 'Stocks & Shares', desc: 'Demat holdings across all brokers', icon: '📈' },
  { value: 'MUTUAL_FUND', label: 'Mutual Funds', desc: 'All mutual fund investments', icon: '💎' },
  { value: 'INSURANCE_POLICIES', label: 'Insurance', desc: 'Life, health, and general policies', icon: '🛡️' },
  { value: 'NPS', label: 'National Pension', desc: 'NPS Tier I and Tier II accounts', icon: '🏛️' },
  { value: 'GSTN', label: 'GST Records', desc: 'GST-linked financial records', icon: '📋' },
  { value: 'LAND_RECORDS', label: 'Land & Property', desc: 'Real estate, land parcels, and property records', icon: '🏢' },
];

export default function ConsentFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check if returning from AA callback
  const callbackConsentId = searchParams.get('consentId');
  const setHasConsent = useAssetStore((s) => s.setHasConsent);

  const [step, setStep] = useState(callbackConsentId ? 3 : 1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    if (callbackConsentId) {
      api.post('/consent/callback', { consentId: callbackConsentId, status: 'ACTIVE' })
        .then(() => {
          setHasConsent(true);
          setTimeout(() => navigate('/dashboard'), 2000);
        })
        .catch((err) => {
          console.error('Failed to trigger mock callback', err);
          setHasConsent(true);
          setTimeout(() => navigate('/dashboard'), 2000);
        });
    }
  }, [callbackConsentId, navigate, setHasConsent]);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [purpose] = useState('Comprehensive asset discovery and visualisation for personal financial planning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkedTypes, setLinkedTypes] = useState<string[]>([]);
  const [isFetchingConsents, setIsFetchingConsents] = useState(true);

  useEffect(() => {
    // Fetch existing consents to disable already linked data types
    import('../services/assets').then(({ getConsents }) => {
      getConsents().then(consents => {
        const active = consents.filter(c => c.status === 'ACTIVE');
        const types = new Set<string>();
        active.forEach(c => c.fiTypes.forEach(t => types.add(t)));
        const linked = Array.from(types);
        setLinkedTypes(linked);

        // Pre-select the first available unlinked type
        const unlinked = FI_TYPE_OPTIONS.map(o => o.value).filter(v => !linked.includes(v));
        if (unlinked.length > 0) {
          setSelectedTypes([unlinked[0]]);
        }
      }).catch(err => {
        console.error('Failed to fetch existing consents', err);
        // Fallback pre-selection if fetch fails
        setSelectedTypes([FI_TYPE_OPTIONS[0].value]);
      }).finally(() => {
        setIsFetchingConsents(false);
      });
    });
  }, []);

  const dateRangeStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateRangeEnd = new Date().toISOString().split('T')[0];

  function toggleFIType(value: string) {
    if (linkedTypes.includes(value)) return; // Prevent toggling already linked types
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  const unlinkedOptions = FI_TYPE_OPTIONS.filter(o => !linkedTypes.includes(o.value));
  const isAllSelected = unlinkedOptions.length > 0 && selectedTypes.length === unlinkedOptions.length;

  function handleSelectAllToggle() {
    if (isAllSelected) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(unlinkedOptions.map((o) => o.value));
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

      if (result.redirectUrl.includes('localhost') || result.redirectUrl.includes('callback')) {
        setStep(3);
        api.post('/consent/callback', { consentId: result.consentId, status: 'ACTIVE' })
          .then(() => {
            setHasConsent(true);
            setTimeout(() => navigate('/dashboard'), 2000);
          })
          .catch((err) => {
            console.error('Failed to trigger mock callback', err);
            setHasConsent(true);
            setTimeout(() => navigate('/dashboard'), 2000);
          });
      } else {
        window.location.href = result.redirectUrl;
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create consent request');
    } finally {
      setLoading(false);
    }
  }

  if (isFetchingConsents) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center pt-8 md:pt-16 p-4">
      <div className="w-full max-w-2xl animate-[fade-in_0.5s_ease]">

        {/* Header */}
        <div className="text-center mb-8 md:mb-12 mt-4">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">Grant Data Access</h1>
          <p className="text-zinc-600 text-base">
            Choose what financial data AssetMap can securely access on your behalf via the Account Aggregator network.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {['Select Data', 'Review', 'Confirm'].map((label, idx) => (
            <div key={label} className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${idx + 1 <= step
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-500 border-2 border-zinc-200'
                  }`}>
                  {idx + 1 < step ? '✓' : idx + 1}
                </div>
                <span className="text-xs font-medium text-zinc-600">{label}</span>
              </div>
              {idx < 2 && <div className={`w-12 md:w-16 h-0.5 mt-4 rounded ${idx + 1 < step ? 'bg-zinc-900' : 'bg-zinc-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Select FI Types */}
        {step === 1 && (
          <div className="animate-[slide-up_0.4s_ease]">
            {/* DPDP Act compliance notice */}
            <div className="mb-6 p-4 md:p-5 rounded-2xl bg-amber-50 border border-amber-200">
              <h3 className="text-sm font-semibold text-amber-900 mb-1 flex items-center gap-2">
                🔒 Your Data, Your Control
              </h3>
              <p className="text-sm text-amber-800/80 leading-relaxed">
                Under the Digital Personal Data Protection Act 2023, you have full control over your data.
                Select only what you want to share. You can revoke access at any time.
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900">Select data types to access</h2>
              <button
                onClick={handleSelectAllToggle}
                disabled={unlinkedOptions.length === 0}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 transition-colors disabled:opacity-50"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {FI_TYPE_OPTIONS.map((opt) => {
                const isLinked = linkedTypes.includes(opt.value);
                const isSelected = selectedTypes.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${isLinked
                        ? 'border-zinc-200 bg-zinc-50 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-lime-500 bg-lime-50/30 shadow-sm cursor-pointer'
                          : 'border-zinc-200 bg-white hover:border-zinc-300 cursor-pointer'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected || isLinked}
                      disabled={isLinked}
                      onChange={() => toggleFIType(opt.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl grayscale opacity-80">{opt.icon}</span>
                        <div className="font-semibold text-zinc-900 text-sm">{opt.label}</div>
                        {isLinked && (
                          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded">Linked</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 leading-snug">{opt.desc}</div>
                    </div>
                    {!isLinked && (
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all mt-1 ${isSelected
                          ? 'bg-lime-400 border-lime-400'
                          : 'border-zinc-200 bg-zinc-50'
                        }`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    )}
                    {isLinked && (
                      <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-1 bg-zinc-300">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </label>
                )
              })}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={selectedTypes.length === 0}
              className="w-full bg-lime-400 hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-medium py-3.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2"
            >
              Review & Continue →
            </button>
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div className="animate-[slide-up_0.4s_ease]">
            <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200 shadow-sm mb-8">
              <h2 className="text-lg font-bold text-zinc-900 mb-6">Review your consent</h2>

              <div className="space-y-6">
                <div>
                  <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase mb-3">Selected Data Types</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTypes.map((type) => {
                      const opt = FI_TYPE_OPTIONS.find((o) => o.value === type);
                      return (
                        <span key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-medium text-zinc-700 shadow-sm">
                          {opt?.icon} {opt?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-zinc-200 w-full" />

                <div>
                  <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase mb-2">Purpose</div>
                  <p className="text-sm font-medium text-zinc-800">{purpose}</p>
                </div>

                <div className="h-px bg-zinc-200 w-full" />

                <div>
                  <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase mb-2">Data Period</div>
                  <p className="text-sm font-medium text-zinc-800">
                    {dateRangeStart} to {dateRangeEnd}
                  </p>
                </div>

                <div className="h-px bg-zinc-200 w-full" />

                <div>
                  <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase mb-3">Your Privacy</div>
                  <ul className="text-xs text-zinc-700 space-y-2.5 font-medium">
                    <li className="flex items-center gap-2">
                      <span className="text-lime-600 text-lg">✓</span>
                      End-to-end encrypted under DPDP Act
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-lime-600 text-lg">✓</span>
                      Revoke access anytime via dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-lime-600 text-lg">✓</span>
                      No unauthorized third-party sharing
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 rounded-xl border border-zinc-200 text-zinc-700 font-medium hover:bg-zinc-50 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-3.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-900 font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  'Grant Access Securely 🔒'
                )}
              </button>
            </div>
            <p className="text-center text-xs text-zinc-500 mt-4">
              You will be securely redirected to your Account Aggregator to authorize this request.
            </p>
          </div>
        )}

        {/* Step 3: Success / Redirecting */}
        {step === 3 && (
          <div className="py-20 text-center animate-[scale-in_0.5s_ease] bg-zinc-50 rounded-2xl border border-zinc-200">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">Consent Granted!</h2>
            <p className="text-zinc-600 text-sm max-w-sm mx-auto mb-8">
              Your financial data is being securely synced via the Account Aggregator network.
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm font-medium text-emerald-700">Setting up your dashboard...</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
