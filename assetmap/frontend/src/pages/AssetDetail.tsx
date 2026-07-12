import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAssetStore } from '../store/assetStore';
import { getFinancialAssets } from '../services/assets';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft, Wallet, TrendingUp, Landmark, Shield, FileText, Calendar, Globe, CheckCircle2, Building2, ChevronDown } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import AssetTimeline from '../components/AssetTimeline';

const SVG_LOGOS = new Set(['hdfc', 'sbi', 'axis', 'kotak', 'zerodha', 'goldman']);

const getBankLogo = (name: string) => {
  const n = (name || '').toLowerCase();
  let id = '';
  let domain = '';
  if (n.includes('hdfc')) { id = 'hdfc'; domain = 'hdfcbank.com'; }
  else if (n.includes('sbi') || n.includes('state bank')) { id = 'sbi'; domain = 'onlinesbi.sbi'; }
  else if (n.includes('icici')) { id = 'icici'; domain = 'icicibank.com'; }
  else if (n.includes('axis')) { id = 'axis'; domain = 'axisbank.com'; }
  else if (n.includes('kotak')) { id = 'kotak'; domain = 'kotak.com'; }
  else if (n.includes('yes')) { id = 'yes'; domain = 'yesbank.in'; }
  else if (n.includes('indusind')) { id = 'indusind'; domain = 'indusind.com'; }
  else if (n.includes('pnb') || n.includes('punjab')) { id = 'pnb'; domain = 'pnbindia.in'; }
  else if (n.includes('zerodha')) { id = 'zerodha'; domain = 'zerodha.com'; }
  else if (n.includes('groww')) { id = 'groww'; domain = 'groww.in'; }
  else if (n.includes('lic')) { id = 'lic'; domain = 'licindia.in'; }
  else if (n.includes('parag parikh') || n.includes('ppfas')) { id = 'ppfas'; domain = 'amc.ppfas.com'; }
  else if (n.includes('pfrda') || n.includes('nps')) { id = 'nps'; domain = 'npscra.nsdl.co.in'; }
  else if (n.includes('epfo')) { id = 'epfo'; domain = 'epfindia.gov.in'; }
  else if (n.includes('goldman')) { id = 'goldman'; domain = 'goldmansachs.com'; }
  else if (n.includes('hsbc')) { id = 'hsbc'; domain = 'hsbc.com'; }
  
  if (!id) return null;
  const ext = SVG_LOGOS.has(id) ? 'svg' : 'png';
  return { local: `/logos/${id}.${ext}`, fallback: `https://unavatar.io/${domain}` };
};

const GoldChip = () => (
  <svg width="34" height="26" viewBox="0 0 34 26" fill="none" className="drop-shadow-sm rounded-[4px] opacity-90 overflow-hidden shrink-0">
    <rect width="34" height="26" rx="4" fill="url(#chip-grad)" />
    <path d="M0 8H10C11.5 8 13 9 13 11V15C13 17 11.5 18 10 18H0" stroke="#a38230" strokeWidth="0.75" />
    <path d="M34 8H24C22.5 8 21 9 21 11V15C21 17 22.5 18 24 18H34" stroke="#a38230" strokeWidth="0.75" />
    <path d="M13 0V5C13 6.5 14 8 15 8H19C20 8 21 6.5 21 5V0" stroke="#a38230" strokeWidth="0.75" />
    <path d="M13 26V21C13 19.5 14 18 15 18H19C20 18 21 19.5 21 21V26" stroke="#a38230" strokeWidth="0.75" />
    <circle cx="17" cy="13" r="3" stroke="#a38230" strokeWidth="0.75" />
    <defs>
      <linearGradient id="chip-grad" x1="0" y1="0" x2="34" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE68A" />
        <stop offset="0.5" stopColor="#D97706" />
        <stop offset="1" stopColor="#B45309" />
      </linearGradient>
    </defs>
  </svg>
);

const Contactless = () => (
  <svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 shrink-0">
    <path d="M5.5 15.5a4.5 4.5 0 0 0 0-7" />
    <path d="M9 18a8 8 0 0 0 0-12" />
    <path d="M12.5 20.5a11.5 11.5 0 0 0 0-17" />
    <path d="M16 23a15 15 0 0 0 0-22" />
  </svg>
);

const VisaLogo = () => (
  <div className="flex items-center">
    <span 
      className="text-white drop-shadow-md text-[18px] font-black italic tracking-tighter leading-none" 
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      VISA
    </span>
  </div>
);

const RealisticCard = ({ type, bankName, last4, variant, bgClass }: { type: 'DEBIT' | 'CREDIT', bankName: string, last4: string, variant: string, bgClass: string }) => {
  return (
    <div className={`relative overflow-hidden rounded-[16px] aspect-[1.58] shadow-2xl border border-white/30 p-5 ${bgClass} flex flex-col justify-between text-white group cursor-pointer hover:-translate-y-1 transition-transform duration-300`}>
      {/* Inner shadow overlay for 3D metallic feel */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/30 pointer-events-none mix-blend-overlay" />
      
      {/* Abstract shapes mimicking the image */}
      <div className="absolute -bottom-24 -right-10 w-72 h-72 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -top-20 -left-10 w-56 h-56 bg-gradient-to-br from-black/20 to-transparent rounded-full blur-2xl pointer-events-none" />
      
      {/* Left vertical text */}
      <div className="absolute left-2.5 bottom-0 -rotate-90 origin-top-left text-[8px] tracking-[0.25em] uppercase text-white/70 font-semibold pointer-events-none whitespace-nowrap">
        {type === 'DEBIT' ? 'Debit Card' : 'Credit Card'}
      </div>

      {/* Top Row: Logo & Variant */}
      <div className="relative z-10 flex justify-between items-start pl-3">
        <div className="flex items-center gap-2.5">
          {getBankLogo(bankName) && (
            <img 
              src={getBankLogo(bankName)!.local} 
              alt="" 
              className="h-5 w-auto object-contain drop-shadow-md bg-white/90 rounded-sm p-0.5"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src = getBankLogo(bankName)!.fallback;
                }
              }}
            />
          )}
          <span className="text-[13px] font-bold tracking-widest uppercase leading-none text-white drop-shadow-md">{bankName}</span>
        </div>
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white drop-shadow-md mt-0.5">
          {variant}
        </div>
      </div>

      {/* Middle Row: Chip & Contactless */}
      <div className="relative z-10 flex justify-between items-center pl-3 mt-6">
        <GoldChip />
        <Contactless />
      </div>

      {/* Card Number */}
      <div 
        className="relative z-10 pl-3 mt-auto mb-4 text-[18px] sm:text-[20px] tracking-[0.15em] font-mono text-white flex justify-between w-full"
        style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.6), 0px -1px 1px rgba(255,255,255,0.2)' }}
      >
        <span>••••</span>
        <span>••••</span>
        <span>••••</span>
        <span>{last4 || '0000'}</span>
      </div>

      {/* Bottom Details */}
      <div className="relative z-10 pl-3 flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[5px] uppercase tracking-widest text-white/80 leading-tight">Valid<br/>From</span>
              <span className="text-[10px] font-mono tracking-wider mt-0.5 drop-shadow-sm">12/18</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[5px] uppercase tracking-widest text-white/80 leading-tight">Valid<br/>Thru</span>
              <span className="text-[10px] font-mono tracking-wider mt-0.5 drop-shadow-sm">12/22</span>
            </div>
          </div>
          <span className="text-[12px] uppercase tracking-widest font-semibold mt-0.5 truncate max-w-[150px]" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>
            MARCUS STERLING
          </span>
        </div>
        <div className="flex flex-col items-end mr-1">
          <VisaLogo />
          <span className="text-[7px] italic tracking-widest mt-1 opacity-90 drop-shadow-sm">Platinum</span>
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

  const getCardStyle = (institutionName: string) => {
    const n = (institutionName || '').toLowerCase();
    if (n.includes('hdfc')) return 'from-[#004b87] via-[#003b6b] to-[#002244]';
    if (n.includes('sbi') || n.includes('state bank')) return 'from-[#007cc3] via-[#005c99] to-[#003b66]';
    if (n.includes('icici')) return 'from-[#f15a22] via-[#d94a18] to-[#993411]';
    if (n.includes('axis')) return 'from-[#97144d] via-[#7a0f3d] to-[#4d0a26]';
    if (n.includes('kotak')) return 'from-[#ed1c24] via-[#c4151b] to-[#8a0f13]';
    if (n.includes('yes')) return 'from-[#00529b] via-[#004080] to-[#00264d]';
    if (n.includes('indusind')) return 'from-[#802a2a] via-[#662222] to-[#401515]';
    if (n.includes('pnb') || n.includes('punjab')) return 'from-[#fbb034] via-[#d9962a] to-[#996a1e]';
    if (n.includes('goldman')) return 'from-emerald-700 via-emerald-800 to-teal-900';
    if (n.includes('hsbc')) return 'from-indigo-800 via-indigo-900 to-rose-900';
    return 'from-zinc-800 via-zinc-900 to-black';
  };

  const bankGradient = getCardStyle(asset?.institutionName || '');

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

  const formatMonthLabel = (m: string) => {
    const parts = m.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return m;
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-[#efeeea] flex items-center justify-center font-sans text-black/60 font-medium">
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
    <div className="h-screen bg-[#efeeea] flex flex-col font-sans text-black selection:bg-[#a3e635] selection:text-black overflow-hidden">
      <nav className="bg-[#efeeea]/80 backdrop-blur-xl border-b border-black/10 px-6 py-4 flex-shrink-0 z-40">
        <div className="max-w-[1600px] mx-auto flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')} className="flex items-center justify-center size-8 rounded-full bg-white text-black border border-black hover:bg-black hover:text-white transition-colors">
            <ArrowLeft className="size-4" />
          </button>
          <span className="font-medium text-black">Back to Dashboard</span>
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
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-black/20 flex-shrink-0">
              <h3 className="text-lg font-bold tracking-tight text-black mb-4">Linked Cards</h3>
              <div className="grid grid-cols-2 gap-4">
                <RealisticCard type="DEBIT" bankName={asset.institutionName} last4="4444" variant="DELIGHT" bgClass={`bg-gradient-to-br ${bankGradient}`} />
                <RealisticCard type="CREDIT" bankName={asset.institutionName} last4="9211" variant="REWARDS" bgClass={`bg-gradient-to-tl ${bankGradient}`} />
              </div>
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-3 bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-black/20 flex flex-col min-h-0 overflow-hidden">
          <div className="p-5 pb-3 border-b border-black/10 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-bold tracking-tight text-black">Transactions</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className={`flex items-center gap-1.5 text-[11px] font-bold border border-black px-3 py-1 rounded-full transition-colors uppercase tracking-wider ${dateFilter !== 'ALL' && dateFilter.includes('-') ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-black/5'}`}
                    >
                      <CalendarIcon className="size-3" /> {dateFilter !== 'ALL' && dateFilter.includes('-') ? formatMonthLabel(dateFilter) : 'Date'}
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
                className={`text-[11px] font-bold border border-black px-3 py-1 rounded-full transition-colors uppercase tracking-wider ${dateFilter === 'ALL' ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-black/5'}`}
              >
                All
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-hide">
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
                  <h4 className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-2 px-2">{group.label}</h4>
                  <div className="space-y-1">
                    {group.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-black/5 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 border border-black ${tx.type === 'CREDIT' ? 'text-black' : 'bg-white text-black'}`} style={tx.type === 'CREDIT' ? { backgroundColor: ACCENT } : undefined}>
                            {tx.type === 'CREDIT' ? <TrendingUp className="size-3.5" /> : <Wallet className="size-3.5" />}
                          </div>
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-[13px] text-black truncate">{tx.desc}</p>
                            <p className="text-[10px] text-black/60 font-semibold">{tx.date}</p>
                          </div>
                        </div>
                        <div className={`font-bold text-[13px] tracking-tight whitespace-nowrap flex-shrink-0 text-black`}>
                          {tx.type === 'CREDIT' ? '+' : ''}₹{Math.abs(tx.amt).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
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

function DetailRow({ label, value, icon }: { label: string; value: string; isCode?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-black/10 last:border-0 gap-2">
      <span className="text-[11px] font-bold text-black/60 whitespace-nowrap">{label}</span>
      <span className="text-[11px] flex items-center text-right font-bold text-black">
        {icon}
        <span className="truncate max-w-[140px]" title={value}>{value}</span>
      </span>
    </div>
  );
}
