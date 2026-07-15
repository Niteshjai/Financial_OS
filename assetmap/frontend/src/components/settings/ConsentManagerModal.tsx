import { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  onClose: () => void;
}

const FI_TYPE_OPTIONS = [
  { value: 'DEPOSIT', label: 'Bank Accounts', desc: 'Savings, current, and fixed deposit accounts', icon: '🏦' },
  { value: 'EQUITY', label: 'Stocks & Shares', desc: 'Demat holdings across all brokers', icon: '📈' },
  { value: 'MUTUAL_FUND', label: 'Mutual Funds', desc: 'All mutual fund investments', icon: '💎' },
  { value: 'INSURANCE_POLICIES', label: 'Insurance', desc: 'Life, health, and general policies', icon: '🛡️' },
  { value: 'NPS', label: 'National Pension', desc: 'NPS Tier I and Tier II accounts', icon: '🏛️' },
  { value: 'GSTN', label: 'GST Records', desc: 'GST-linked financial records', icon: '📋' },
  { value: 'LAND_RECORDS', label: 'Land & Property', desc: 'Real estate, land parcels, and property records', icon: '🏢' },
];

export default function ConsentManagerModal({ onClose }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch user's consents to find the currently active one
    api.get('/consent')
      .then(res => {
        const consents = res.data.data;
        const activeConsent = consents.find((c: any) => c.status === 'ACTIVE');
        if (activeConsent && activeConsent.fiTypes) {
          setSelectedTypes(activeConsent.fiTypes);
        } else {
          // Fallback to all if none found
          setSelectedTypes(FI_TYPE_OPTIONS.map(o => o.value));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleSelection = (value: string) => {
    setSelectedTypes(prev => 
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dateRangeStart = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateRangeEnd = new Date().toISOString().split('T')[0];
      
      const createRes = await api.post('/consent/create', {
        fiTypes: selectedTypes,
        purpose: 'Updating consent preferences',
        dateRangeStart,
        dateRangeEnd,
      });
      
      await api.post('/consent/callback', {
        consentId: createRes.data.data.consentId,
        status: 'ACTIVE'
      });
      
      setSuccess(true);
      
      // Delay reload so user can see the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error('Failed to update consent', err);
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300"
        style={{ width: '100%', maxWidth: '672px', backgroundColor: 'white', borderRadius: '24px' }}
      >
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center animate-[scale-in_0.3s_ease]">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Preferences Saved!</h2>
            <p className="text-zinc-500 text-sm">Your dashboard is being updated...</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <Shield className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Manage Consent Approvals</h2>
                  <p className="text-xs text-zinc-500">Select which data sources you want to sync.</p>
                </div>
              </div>
              <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition text-zinc-500">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
              {FI_TYPE_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => toggleSelection(opt.value)}
                  className={`flex items-center gap-4 p-4 md:p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
                    selectedTypes.includes(opt.value)
                      ? 'border-lime-500 bg-white'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-xl shrink-0">
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm md:text-base font-semibold text-zinc-900 mb-0.5">{opt.label}</div>
                    <div className="text-xs md:text-sm text-zinc-500">{opt.desc}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    selectedTypes.includes(opt.value)
                      ? 'border-lime-500 bg-lime-500 text-white'
                      : 'border-zinc-300 bg-white'
                  }`}>
                    {selectedTypes.includes(opt.value) && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                </div>
              ))}
              
              <div className="mt-2 text-xs text-zinc-400 text-center">
                Consents that are un-ticked will immediately hide related data from your dashboard and stop background syncing.
              </div>
            </div>
            
            <div className="p-6 pt-2">
              <button 
                onClick={handleSave} 
                disabled={saving || loading}
                className="w-full py-3 rounded-full bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save Preferences'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
