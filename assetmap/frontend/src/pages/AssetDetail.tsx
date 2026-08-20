// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAssetStore } from '../store/assetStore';
import { getFinancialAssets } from '../services/assets';

import { Calendar as CalendarIcon, ArrowLeft, Wallet, TrendingUp, Landmark, Shield, FileText, Globe, CheckCircle2, Building2 } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AssetTimeline from '../components/AssetTimeline';






const RealisticCard = ({ last4, bgClass, textColor = 'white' }: { type: 'DEBIT' | 'CREDIT', bankName: string, last4: string, bgClass: string, textColor?: 'white' | 'dark' }) => {
  const isDark = textColor === 'dark';
  const textClass = isDark ? 'text-zinc-800' : 'text-white';
  const textMuted = isDark ? 'text-zinc-500' : 'text-white/70';
  
  return (
    <div className={`relative overflow-hidden rounded-[20px] aspect-[1.58] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 ${bgClass} flex flex-col justify-between ${textClass} cursor-pointer hover:-translate-y-1 transition-transform duration-300`}>
      {/* Abstract overlapping shapes like Olith */}
      <div className={`absolute -bottom-10 -right-10 w-64 h-64 rounded-full pointer-events-none mix-blend-overlay ${isDark ? 'bg-white/50' : 'bg-white/10'}`} />
      <div className={`absolute -top-20 -left-10 w-48 h-48 rounded-full pointer-events-none mix-blend-overlay ${isDark ? 'bg-black/5' : 'bg-black/20'}`} />
      
      {/* Top: Logo icon (simplified) */}
      <div className="relative z-10">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mix-blend-overlay ${isDark ? 'bg-black/10' : 'bg-white/20'}`}>
          <div className={`w-4 h-4 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-white'} opacity-80 flex items-center justify-center`}>
            <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#ebebea]' : 'bg-[#60707a]'}`} />
          </div>
        </div>
      </div>

      {/* Bottom Details */}
      <div className="relative z-10 flex justify-between items-end mt-auto">
        <div className={`text-[13px] font-medium tracking-widest ${textClass} opacity-90 flex items-center gap-1`}>
          <span className="text-[10px] tracking-widest mt-0.5">••••</span>
          <span>{last4 || '0000'}</span>
        </div>
        <div className={`text-[11px] font-medium tracking-wide ${textMuted}`}>
          04/24
        </div>
      </div>
    </div>
  );
};

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const assets = useAssetStore((s) => s.assets);
  const setAssets = useAssetStore((s) => s.setAssets);

  const [isLoading, setIsLoading] = useState(assets.length === 0);
  const [dateFilter, setDateFilter] = useState<string>('ALL'); // 'ALL' or 'YYYY-MM-DD'
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (assets.length === 0) {
      setIsLoading(true);
      getFinancialAssets()
        .then((res) => {
          if (Array.isArray(res)) setAssets(res);
        })
        .catch(() => { })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [assets.length, setAssets]);

  const asset = assets.find((a) => a.id === id);

  const ACCENT = '#a3e635'; // Lime green





  const FI_LABELS: Record<string, string> = {
    DEPOSIT: 'Bank Deposit', EQUITY: 'Equity', MUTUAL_FUND: 'Mutual Fund',
    INSURANCE_POLICIES: 'Insurance Policy', NPS: 'National Pension', GSTN: 'GST Record',
  };

  const FI_ICONS: Record<string, React.ReactNode> = {
    DEPOSIT: <Wallet className="size-6 text-black" strokeWidth={1.75} />,
    EQUITY: <TrendingUp className="size-6 text-black" strokeWidth={1.75} />,
    MUTUAL_FUND: <Building2 className="size-6 text-black" strokeWidth={1.75} />,
    INSURANCE_POLICIES: <Shield className="size-6 text-black" strokeWidth={1.75} />,
    NPS: <Landmark className="size-6 text-black" strokeWidth={1.75} />,
    GSTN: <FileText className="size-6 text-black" strokeWidth={1.75} />,
  };


  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center font-sans text-black/60 font-medium" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
        Loading asset details...
      </div>
    );
  }

  if (!asset) {
    return <Navigate to="/dashboard" replace />;
  }

  function DetailRow({ label, value, isCode, icon }: { label: string, value: string, isCode?: boolean, icon?: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
        <span className="text-xs font-bold text-black/60 uppercase tracking-widest">{label}</span>
        <div className="flex items-center gap-1.5">
          {icon}
          <span className={`text-sm text-black ${isCode ? 'font-mono tracking-wider' : 'font-bold'}`}>{value}</span>
        </div>
      </div>
    );
  }

  const icon = FI_ICONS[asset.fiType] || <Wallet className="size-6 text-black" strokeWidth={1.75} />;

  return (
    <div className="h-screen flex flex-col font-sans text-black selection:bg-[#a3e635] selection:text-black overflow-hidden" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      <nav className="bg-white/30 backdrop-blur-xl border-b border-white/20 shadow-sm px-6 py-4 flex-shrink-0 z-40">
        <div className="max-w-[1600px] mx-auto flex items-center gap-2">
          <button onClick={() => {
            if (window.history.length > 2) {
              navigate(-1);
            } else {
              navigate('/dashboard');
            }
          }} className="flex items-center gap-2 text-zinc-800 hover:text-black bg-white/50 hover:bg-white/80 border border-zinc-300/50 shadow-sm px-3 py-1.5 rounded-full transition-all font-medium text-sm backdrop-blur-sm">
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
      </nav>

      <div className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-12 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="col-span-12 md:col-span-3 flex flex-col gap-3 md:gap-4 overflow-y-auto pr-1 md:pr-2 scrollbar-hide">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-black relative overflow-hidden flex-shrink-0">

            <div className="flex items-center gap-4 relative z-10 mb-4">
              <div className="size-14 rounded-2xl flex items-center justify-center shadow-sm border border-black" style={{ backgroundColor: ACCENT }}>
                {icon}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-display font-bold text-black tracking-tight mb-1 leading-tight truncate">{asset.institutionName}</h1>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-black text-black" style={{ backgroundColor: ACCENT }}>
                  {FI_LABELS[asset.fiType] || asset.fiType}
                </span>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-xs font-bold text-black/60 mb-1 uppercase tracking-wider">Current Balance</p>
              <p className="text-3xl font-display font-bold tracking-tight truncate text-black">
                ₹{asset.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-black/20 flex-shrink-0">
            <h3 className="text-sm font-bold text-black mb-2 flex items-center gap-2">
              <div className="bg-black p-1 rounded-full text-white"><FileText className="size-3" /></div> Account Details
            </h3>
            <div className="space-y-1">
              <DetailRow label="Institution" value={asset.institutionName} />
              <DetailRow label="Account Number" value={asset.accountRef} isCode />
              <DetailRow label="Account Type" value={asset.accountType || 'Savings'} />
              <DetailRow label="Currency" value={asset.currency} />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-black/20 flex-shrink-0">
            <h3 className="text-sm font-bold text-black mb-2 flex items-center gap-2">
              <div className="bg-black p-1 rounded-full text-white"><Shield className="size-3" /></div> Security & Source
            </h3>
            <div className="space-y-1">
              <DetailRow label="Source" value="Setu AA" icon={<Globe className="size-3 mr-1 text-black/50" />} />
              <DetailRow label="Framework" value="ReBIT v2.0" />
              <DetailRow label="Status" value="Verified" icon={<CheckCircle2 className="size-3 mr-1" style={{ color: ACCENT }} />} />
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6 flex flex-col gap-4 md:gap-6 min-h-0">
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-black/20 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-lg font-bold tracking-tight text-black">Value History</h3>
              <span className="text-[10px] font-bold text-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-black" style={{ backgroundColor: ACCENT }}>Simulated</span>
            </div>
            <div className="flex-1 min-h-0 -mx-2 -mb-2 flex items-center justify-center">
              <AssetTimeline color="#000000" currentValue={asset.balance} />
            </div>
          </div>

          {asset.fiType === 'DEPOSIT' && (
            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex-shrink-0">
              <h3 className="text-[13px] font-medium text-zinc-600 mb-4">Applied Cards</h3>
              <div className="flex gap-4 overflow-hidden">
                <div className="w-64 shrink-0">
                  <RealisticCard type="DEBIT" bankName={asset.institutionName} last4="3600" bgClass="bg-gradient-to-br from-[#808d94] to-[#5b6a74]" textColor="white" />
                </div>
                <div className="w-48 shrink-0">
                  <RealisticCard type="CREDIT" bankName={asset.institutionName} last4="6907" bgClass="bg-gradient-to-br from-[#ebebea] to-[#dfdedc]" textColor="dark" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-3 bg-white/70 backdrop-blur-xl rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col min-h-0 overflow-hidden">
          <div className="p-6 pb-2 flex items-center justify-between flex-shrink-0">
            <h3 className="text-[13px] font-medium text-zinc-600">Latest Transactions</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${dateFilter !== 'ALL' && dateFilter.includes('-') ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                    >
                      <CalendarIcon className="size-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl border-black/10 shadow-xl" align="end">
                    <div className="p-3 bg-white/95 backdrop-blur-xl rounded-2xl">
                      <CalendarComponent
                        mode="single"
                        selected={dateFilter !== 'ALL' && dateFilter.includes('-') ? new Date(dateFilter) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setDateFilter(`${y}-${m}-${d}`);
                          } else {
                            setDateFilter('ALL');
                          }
                          setIsDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <button
                onClick={() => setDateFilter('ALL')}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${dateFilter === 'ALL' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
              >
                All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {[
              {
                label: 'Today',
                transactions: [
                  { id: 1, date: '11 Jul 2026, 14:30', desc: 'Amazon Web Services', type: 'DEBIT', amt: -2450.50 },
                ]
              },
              {
                label: 'Yesterday',
                transactions: [
                  { id: 2, date: '10 Jul 2026, 09:15', desc: 'Salary Credit', type: 'CREDIT', amt: 154000.00 },
                ]
              },
              {
                label: 'Past',
                transactions: [
                  { id: 3, date: '08 Jul 2026, 18:45', desc: 'Starbucks Coffee', type: 'DEBIT', amt: -450.00 },
                  { id: 4, date: '05 Jul 2026, 11:20', desc: 'Netflix', type: 'DEBIT', amt: -649.00 },
                  { id: 5, date: '03 Jul 2026, 20:10', desc: 'Uber Rides', type: 'DEBIT', amt: -1240.00 },
                  { id: 6, date: '30 Jun 2026, 15:35', desc: 'Grocery Store', type: 'DEBIT', amt: -3200.00 },
                  { id: 7, date: '28 Jun 2026, 08:50', desc: 'Gas Station', type: 'DEBIT', amt: -2100.00 },
                  { id: 8, date: '25 Jun 2026, 19:00', desc: 'Spotify', type: 'DEBIT', amt: -119.00 },
                  { id: 9, date: '22 Jun 2026, 12:45', desc: 'Electric Bill', type: 'DEBIT', amt: -1500.00 },
                  { id: 10, date: '20 Jun 2026, 21:30', desc: 'Restaurant', type: 'DEBIT', amt: -2300.00 },
                ]
              }
            ].map(group => {
              const isSpecificDate = dateFilter !== 'ALL' && dateFilter.includes('-');
              return {
                ...group,
                transactions: group.transactions.filter(tx => {
                  if (dateFilter === 'ALL') return true;
                  if (!isSpecificDate) return group.label.toUpperCase() === dateFilter;

                  // specific date match using local parts to avoid timezone shifting
                  const txDate = new Date(tx.date);
                  const [fy, fm, fd] = dateFilter.split('-').map(Number);
                  return txDate.getDate() === fd && txDate.getMonth() === (fm - 1) && txDate.getFullYear() === fy;
                })
              };
            })
              .filter(group => group.transactions.length > 0)
              .map(group => (
                <div key={group.label}>
                  <h4 className="text-[11px] font-medium text-zinc-400 mb-3 px-2">{group.label}</h4>
                  <div className="space-y-1">
                    {group.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-[14px] hover:bg-white transition-colors group cursor-pointer">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="size-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-500">
                            {tx.type === 'CREDIT' ? <ArrowLeft className="size-4 rotate-45" /> : <ArrowLeft className="size-4 rotate-[225deg]" />}
                          </div>
                          <div className="min-w-0 pr-2">
                            <p className="font-medium text-[13px] text-zinc-800 truncate">{tx.desc}</p>
                            <p className="text-[11px] text-zinc-400">{tx.date.split(',')[1].trim()}</p>
                          </div>
                        </div>
                        <div className={`font-medium text-[13.5px] tracking-tight whitespace-nowrap flex-shrink-0 ${tx.type === 'CREDIT' ? 'text-zinc-800' : 'text-rose-500/90'}`}>
                          {tx.type === 'CREDIT' ? '+' : ''}₹{Math.abs(tx.amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

