import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetStore } from '../store/assetStore';
import { getAssetSummary, getFinancialAssets, getLandRecords, getConsents, refreshAssets, getAuditLog } from '../services/assets';
import { logout } from '../services/auth';
import CoreServices from '../components/CoreServices';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import {
  ArrowUpRight, Search, SlidersHorizontal, Plus, RefreshCw,
  LayoutGrid, Wallet, Shield, PieChart, LineChart, Layers,
  Bell, ChevronDown, ChevronLeft, ChevronRight, Settings, LogOut, UserRound, HelpCircle,
  TrendingUp, Building2, History, Store, Calendar, Menu, Eye, TrendingDown,
} from 'lucide-react';
import advisor1 from '../assets/advisor-1.jpg';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip } from 'recharts';

/* ═══════════════════════════════════════════════════
   AssetMap Dashboard — Lovable-inspired Design
   Backed by real API data from the AssetMap backend
   ═══════════════════════════════════════════════════ */

type FilterKey = 'all' | 'DEPOSIT' | 'INSURANCE_POLICIES' | 'MUTUAL_FUND' | 'EQUITY' | 'NPS' | 'GSTN' | 'ALTERNATIVE';

const FILTER_META: Record<FilterKey, { label: string; icon: React.ReactNode }> = {
  all: { label: 'All', icon: null },
  DEPOSIT: { label: 'Bank Accounts', icon: <Wallet className="size-3" strokeWidth={2} /> },
  INSURANCE_POLICIES: { label: 'Insurance', icon: <Shield className="size-3" strokeWidth={2} /> },
  MUTUAL_FUND: { label: 'Mutual Funds', icon: <PieChart className="size-3" strokeWidth={2} /> },
  EQUITY: { label: 'Stocks', icon: <LineChart className="size-3" strokeWidth={2} /> },
  NPS: { label: 'NPS', icon: <Layers className="size-3" strokeWidth={2} /> },
  GSTN: { label: 'GSTN', icon: <Layers className="size-3" strokeWidth={2} /> },
  ALTERNATIVE: { label: 'Alternative Funds', icon: <Layers className="size-3" strokeWidth={2} /> },
};

const FI_ICONS: Record<string, React.ReactNode> = {
  DEPOSIT: <Wallet className="size-4" strokeWidth={1.75} />,
  EQUITY: <LineChart className="size-4" strokeWidth={1.75} />,
  MUTUAL_FUND: <PieChart className="size-4" strokeWidth={1.75} />,
  INSURANCE_POLICIES: <Shield className="size-4" strokeWidth={1.75} />,
  NPS: <Layers className="size-4" strokeWidth={1.75} />,
  GSTN: <Layers className="size-4" strokeWidth={1.75} />,
  ALTERNATIVE: <Layers className="size-4" strokeWidth={1.75} />,
};

const FI_COLORS: Record<string, { iconBg: string; tag: string }> = {
  DEPOSIT: { iconBg: 'bg-zinc-900 text-lime-300', tag: 'Primary' },
  EQUITY: { iconBg: 'bg-lime-100 text-lime-800', tag: 'Equity' },
  MUTUAL_FUND: { iconBg: 'bg-lime-100 text-lime-800', tag: 'MF' },
  INSURANCE_POLICIES: { iconBg: 'bg-zinc-100 text-zinc-700', tag: 'Insurance' },
  NPS: { iconBg: 'bg-teal-100 text-teal-800', tag: 'NPS' },
  GSTN: { iconBg: 'bg-red-100 text-red-800', tag: 'GSTN' },
  ALTERNATIVE: { iconBg: 'bg-lime-400 text-lime-900', tag: 'Alts' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    user, summary, assets, landRecords,
    setSummary, setAssets, setLandRecords, setConsents,
    isLoadingAssets, setLoadingAssets,
  } = useAssetStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'land' | 'audit' | 'services' | 'analytics'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [animatedWorth, setAnimatedWorth] = useState(0);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const [s, a, l, c] = await Promise.all([
        getAssetSummary(), getFinancialAssets(), getLandRecords(), getConsents(),
      ]);
      setSummary(s); setAssets(a); setLandRecords(l); setConsents(c);
      try { const audit = await getAuditLog(); setAuditLogs(audit.logs); } catch { /* ok */ }
    } catch (err) { console.error('Load failed', err); }
    finally { setLoadingAssets(false); }
  }, [setSummary, setAssets, setLandRecords, setConsents, setLoadingAssets]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!summary) return;
    const target = summary.totalWithLand || summary.totalNetWorth;
    const dur = 1800, start = performance.now();
    const anim = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setAnimatedWorth(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }, [summary]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await refreshAssets(); await loadData(); } catch { }
    finally { setRefreshing(false); }
  }

  async function handleLogout() {
    try { await logout(); } catch { }
    useAssetStore.getState().logout();
    navigate('/');
  }

  function fmt(n: number) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
  }

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <LayoutGrid className="size-4" strokeWidth={1.75} /> },
    { key: 'analytics' as const, label: 'Analytics', icon: <TrendingUp className="size-4" strokeWidth={1.75} /> },
    { key: 'land' as const, label: `Property (${landRecords.length})`, icon: <Building2 className="size-4" strokeWidth={1.75} /> },
    { key: 'audit' as const, label: 'Activity', icon: <History className="size-4" strokeWidth={1.75} /> },
    { key: 'services' as const, label: 'Services', icon: <Store className="size-4" strokeWidth={1.75} /> },
  ];

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const firstName = (user?.name || 'User').split(' ')[0];

  // Search & filter
  const q = query.trim().toLowerCase();
  const matchText = (text: string) => !q || text.toLowerCase().includes(q);
  const showType = (key: FilterKey) => filter === 'all' || filter === key;

  let displayAssets = assets;
  if (!isLoadingAssets && !assets.some(a => a.fiType === 'ALTERNATIVE')) {
    displayAssets = [
      ...assets,
      {
        id: 'alt-1',
        fiType: 'ALTERNATIVE',
        institutionName: 'Blackstone Private Credit',
        accountRef: 'Private Credit',
        balance: 320000,
        currentValue: 11.4,
        fetchedAt: new Date().toISOString()
      },
      {
        id: 'alt-2',
        fiType: 'ALTERNATIVE',
        institutionName: 'Apollo Real Estate II',
        accountRef: 'Real Estate',
        balance: 185000,
        currentValue: 8.9,
        fetchedAt: new Date().toISOString()
      },
      {
        id: 'alt-3',
        fiType: 'ALTERNATIVE',
        institutionName: 'KKR Infrastructure',
        accountRef: 'Infra',
        balance: 210000,
        currentValue: 10.2,
        fetchedAt: new Date().toISOString()
      }
    ];
  }

  const filteredAssets = displayAssets.filter(a =>
    showType(a.fiType as FilterKey) && matchText(`${a.institutionName} ${a.accountRef} ${a.fiType}`)
  );

  // Group by fi_type
  const grouped: Record<string, typeof assets> = {};
  for (const a of filteredAssets) {
    (grouped[a.fiType] ||= []).push(a);
  }

  return (
    <div className="min-h-screen bg-[#efeeea] text-zinc-900 font-sans">
      <div className="flex">
        <aside className={`hidden md:flex flex-col items-center pt-32 pb-6 gap-2 transition-all duration-300 relative shrink-0 ${isSidebarOpen ? 'w-48' : 'w-20'}`}>
          <div className={`absolute top-6 ${isSidebarOpen ? 'left-6 items-center' : 'left-1/2 -translate-x-1/2 items-center'} flex flex-col gap-1.5 transition-all duration-300`}>
            <div className="size-10 rounded-full bg-zinc-900 grid place-items-center shrink-0">
              <span className="text-lime-300 font-display text-xl leading-none font-bold">A</span>
            </div>
            {isSidebarOpen && (
              <span className="text-zinc-900 font-display text-[11px] font-bold tracking-widest uppercase">
                AssetMap
              </span>
            )}
          </div>
          <div className={`flex items-center w-full ${isSidebarOpen ? 'px-5 justify-start' : 'justify-center'} h-12`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl bg-zinc-200/50 hover:bg-zinc-200 transition-colors text-zinc-700 active:scale-95"
              aria-label="Toggle Sidebar"
            >
              <Menu className="size-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className={`h-px bg-zinc-300/60 transition-all duration-500 ease-out mt-6 ${isSidebarOpen ? 'w-36' : 'w-8'}`} />

          <nav className="flex flex-col gap-1 mt-6 w-full px-3">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                aria-label={t.label}
                title={!isSidebarOpen ? t.label : undefined}
                className={
                  `flex items-center transition active:scale-95 w-full rounded-xl ${isSidebarOpen ? 'px-3 py-2.5 gap-3 justify-start' : 'justify-center size-12'} ` +
                  (activeTab === t.key
                    ? "bg-zinc-900 text-white font-semibold"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 font-medium")
                }
              >
                <div className="shrink-0">{t.icon}</div>
                {isSidebarOpen && <span className="text-sm whitespace-nowrap">{t.label.split(' ')[0]}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* ════════ MAIN ════════ */}
        <main className="flex-1 min-w-0 px-6 md:px-10 pt-2 pb-8 md:pt-4 md:pb-10">

          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-12 mb-10">
            <div className="flex min-w-0 items-center gap-3 w-full sm:w-auto">
              <div className={`min-w-0 flex items-center bg-[#0a0a0b] text-white rounded-full transition-all duration-500 ease-out shadow-xl border border-white/5 ring-1 ring-white/10 w-full sm:w-auto justify-between sm:justify-start ${isSidebarOpen ? 'px-6 py-2 gap-4 sm:gap-6' : 'pr-12 pl-16 py-4 gap-16 sm:gap-32'}`}>
                <div className="flex items-center gap-4">
                  <span className="size-3 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.8)] animate-pulse"></span>
                  <span className="text-base font-semibold tracking-wide whitespace-nowrap">AssetMap</span>
                </div>

                <div className={`flex items-center transition-all duration-500 ease-out ${isSidebarOpen ? 'gap-4' : 'gap-10'}`}>
                  <span className={`hidden sm:flex items-center gap-3 bg-white/5 rounded-full transition-all duration-500 ease-out ${isSidebarOpen ? 'px-4 py-1.5' : 'px-8 py-2'} text-white/90 border border-white/5`}>
                    <Calendar className="size-5 text-white" strokeWidth={2} />
                    <span className="text-sm font-medium whitespace-nowrap">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</span>
                  </span>

                  {summary?.lastFetchedAt && (
                    <span className={`flex items-center gap-3 bg-lime-300 text-black rounded-full transition-all duration-500 ease-out ${isSidebarOpen ? 'px-4 py-1.5' : 'px-8 py-2'} shadow-[0_0_12px_rgba(190,242,100,0.3)]`}>
                      <span className="text-sm font-bold whitespace-nowrap tracking-tight">
                        Synced {new Date(summary.lastFetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-4 mr-2">
                <Kpi label="Net Worth" value={fmt(animatedWorth)} delta={`${assets.length} assets`} />
                <div className="h-10 w-px bg-zinc-300/70" />
                <Kpi label="Accounts" value={String(assets.length)} delta={`${landRecords.length} prop.`} />
              </div>
              <button aria-label="Notifications"
                className="relative size-10 rounded-full bg-white grid place-items-center shadow-sm hover:bg-zinc-100 active:scale-95 transition">
                <Bell className="size-4" strokeWidth={1.75} />
                {auditLogs.length > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-white" />}
              </button>
              <ProfileMenu initials={initials} name={user?.name || 'User'} onLogout={handleLogout} />
            </div>
          </div>

          {/* Heading + CTA */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-6">
            <h1 className="font-display text-[10vw] sm:text-[6vw] lg:text-[4rem] leading-[0.9] tracking-tighter text-zinc-900 truncate font-light">Welcome, {firstName}</h1>
            {activeTab === 'overview' && (
              <button onClick={() => navigate('/consent')}
                className="shrink-0 flex items-center gap-2 rounded-full bg-zinc-900 text-white pl-2 pr-5 py-2 text-sm font-medium hover:bg-zinc-800 active:scale-95 transition">
                <span className="size-7 rounded-full bg-lime-300 text-zinc-900 grid place-items-center"><Plus className="size-4" strokeWidth={2.5} /></span>
                Add Asset
              </button>
            )}
          </div>

          {/* Mobile tab bar */}
          <div className="flex md:hidden items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={"shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition active:scale-95 " +
                  (activeTab === t.key ? "bg-zinc-900 text-white shadow-sm" : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200")}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ════════ OVERVIEW TAB ════════ */}
          {activeTab === 'overview' && (
            <>

              {/* Search + filters */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 mt-4">
                <div className="flex items-center gap-2 bg-white rounded-full pl-3 pr-2 py-1.5 shadow-sm w-full sm:w-72">
                  <Search className="size-3.5 text-zinc-500" strokeWidth={1.75} />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search assets, institutions…"
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-400" />
                  {query && <button onClick={() => setQuery('')} className="text-[10px] text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded-full hover:bg-zinc-100">Clear</button>}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                  <button aria-label="Filters" className="shrink-0 size-9 rounded-full bg-white grid place-items-center shadow-sm hover:bg-zinc-100 transition">
                    <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                  </button>
                  {(Object.keys(FILTER_META) as FilterKey[]).map(key => (
                    <FilterChip key={key} active={filter === key} onClick={() => setFilter(key)}>
                      {FILTER_META[key].icon}{FILTER_META[key].label}
                    </FilterChip>
                  ))}
                </div>
              </div>

              {/* Stats Cards Row */}
              {(() => {
                const depositAssets = assets.filter(a => a.fiType === 'DEPOSIT');
                const mfAssets = assets.filter(a => a.fiType === 'MUTUAL_FUND');
                
                const bankInstCount = new Set(depositAssets.map(a => a.institutionName)).size || 4;
                const mfInstCount = new Set(mfAssets.map(a => a.institutionName)).size || 2;
                const landInstCount = landRecords.length || 1;
                const totalInstitutions = bankInstCount + mfInstCount + landInstCount;

                const totalDiscovered = summary?.totalWithLand || summary?.totalNetWorth || 4520000;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                    {/* Card 1: TOTAL ASSETS DISCOVERED */}
                    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-zinc-100/80 flex flex-col justify-between min-h-[140px] relative">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Total Assets Discovered
                        </span>
                        <div className="size-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500">
                          <Eye className="size-4" strokeWidth={2} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-3xl font-display font-extrabold tracking-tight text-zinc-900">
                          ₹{totalDiscovered.toLocaleString('en-IN')}
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold mt-1">
                          <TrendingUp className="size-3.5" strokeWidth={2.5} />
                          <span>Updated 2 min ago</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: INSTITUTIONS FOUND */}
                    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-zinc-100/80 flex flex-col justify-between min-h-[140px] relative">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Institutions Found
                        </span>
                        <div className="size-8 rounded-full bg-lime-100 flex items-center justify-center text-emerald-600">
                          <Building2 className="size-4" strokeWidth={2} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-3xl font-display font-extrabold tracking-tight text-zinc-900">
                          {totalInstitutions}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                          <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            {bankInstCount} Bank{bankInstCount !== 1 ? 's' : ''}
                          </span>
                          <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            {mfInstCount} Mutual Fund{mfInstCount !== 1 ? 's' : ''}
                          </span>
                          <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            {landInstCount} Land Registry
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: LIABILITIES / DEBTS */}
                    <div className="bg-[#18181b] text-white rounded-[24px] p-6 shadow-sm border border-zinc-800 flex flex-col justify-between min-h-[140px] relative">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Liabilities / Debts
                        </span>
                        <div className="size-8 rounded-full bg-rose-950/40 flex items-center justify-center text-rose-400">
                          <TrendingDown className="size-4" strokeWidth={2} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-3xl font-display font-extrabold tracking-tight text-rose-200">
                          ₹2,10,000
                        </div>
                        <div className="text-zinc-400 text-xs font-semibold mt-1">
                          Must be settled before distribution
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Loading */}
              {isLoadingAssets && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 mb-10">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                      <div className="flex items-start justify-between mb-4"><div className="size-10 rounded-xl bg-zinc-100" /><div className="h-4 w-16 bg-zinc-100 rounded-full" /></div>
                      <div className="h-3 w-24 bg-zinc-100 rounded mb-2" /><div className="h-4 w-32 bg-zinc-100 rounded mb-4" /><div className="h-7 w-28 bg-zinc-100 rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* Asset sections by category */}
              {!isLoadingAssets && Object.entries(grouped).map(([fiType, items]) => (
                <div key={fiType}>
                  <SectionHeader title={FILTER_META[fiType as FilterKey]?.label || fiType.replace('_', ' ')} count={String(items.length)} label="Accounts" />
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 mb-10">
                    {items.map(asset => <AssetCard key={asset.id} asset={asset} fmt={fmt} />)}
                  </div>
                </div>
              ))}

              {/* Category breakdown */}
              {!isLoadingAssets && summary && summary.categoryBreakdown.length > 0 && (
                <>
                  <SectionHeader title="Portfolio Breakdown" count={String(summary.categoryBreakdown.length)} label="Categories" />
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 mb-10">
                    {summary.categoryBreakdown.map(cat => {
                      const colors = FI_COLORS[cat.fiType] || FI_COLORS.DEPOSIT;
                      const pct = summary.totalNetWorth > 0 ? ((cat.totalValue / summary.totalNetWorth) * 100).toFixed(1) : '0';
                      return (
                        <article key={cat.fiType} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`size-10 rounded-xl ${colors.iconBg} grid place-items-center`}>
                              {FI_ICONS[cat.fiType] || <Wallet className="size-4" strokeWidth={1.75} />}
                            </div>
                            <span className="text-[10px] font-semibold bg-lime-300 text-zinc-900 rounded-full px-2 py-0.5">{pct}%</span>
                          </div>
                          <h3 className="text-base font-display font-semibold leading-tight">{cat.label}</h3>
                          <p className="text-xs text-zinc-500 mt-1">{cat.count} account{cat.count > 1 ? 's' : ''}</p>
                          <p className="mt-3 text-2xl font-display font-bold">{fmt(cat.totalValue)}</p>
                          <div className="mt-3"><div className="h-1 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-zinc-900 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} /></div></div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Empty state */}
              {!isLoadingAssets && filteredAssets.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                  <p className="text-sm text-zinc-500">{query || filter !== 'all' ? 'No assets match your search.' : 'No financial assets found.'}</p>
                  {(query || filter !== 'all') ? (
                    <button onClick={() => { setQuery(''); setFilter('all'); }} className="mt-3 text-xs font-medium text-zinc-900 underline underline-offset-4">Reset filters</button>
                  ) : (
                    <button onClick={() => navigate('/consent')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 text-white pl-2 pr-5 py-2 text-sm font-medium hover:bg-zinc-800 active:scale-95 transition">
                      <span className="size-7 rounded-full bg-lime-300 text-zinc-900 grid place-items-center"><Plus className="size-4" strokeWidth={2.5} /></span>
                      Grant Consent to Fetch Data
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════ LAND TAB ════════ */}
          {activeTab === 'land' && (
            <div>
              {landRecords.length > 0 ? (
                <>
                  <SectionHeader title="Property Records" count={String(landRecords.length)} label="Properties" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {landRecords.map(r => (
                      <article key={r.id} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-3">
                          <div className="size-10 rounded-xl bg-amber-100 text-amber-800 grid place-items-center"><Building2 className="size-4" strokeWidth={1.75} /></div>
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 uppercase">{r.source}</span>
                        </div>
                        <h3 className="text-base font-display font-semibold leading-tight">{r.ownerName}</h3>
                        <p className="text-xs text-zinc-500 mt-1">{r.district}, {r.state}</p>
                        <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-4">
                          <div><p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">Survey No.</p><p className="text-sm font-display font-semibold">{r.surveyNumber || 'N/A'}</p></div>
                          <div className="text-right"><p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">Area</p><p className="text-sm font-display font-semibold">{r.areaSqft.toLocaleString()} sqft</p></div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl p-10 text-center shadow-sm"><p className="text-sm text-zinc-500">No property records found</p></div>
              )}
            </div>
          )}

          {/* ════════ AUDIT TAB ════════ */}
          {activeTab === 'audit' && (
            <div>
              <SectionHeader title="Activity Log" count={String(auditLogs.length)} label="Events" />
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {auditLogs.length > 0 ? (
                  <div className="divide-y divide-zinc-50">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50 transition-colors">
                        <div className="size-9 rounded-full bg-zinc-100 grid place-items-center flex-shrink-0"><History className="size-4 text-zinc-500" strokeWidth={1.75} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-700 truncate">{log.actionDescription}</p>
                          <p className="text-xs text-zinc-400">{new Date(log.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {log.ipAddress && <span className="text-[10px] font-mono text-zinc-300 hidden sm:block">{log.ipAddress}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center text-zinc-400 text-sm">No activity yet</div>
                )}
              </div>
            </div>
          )}

          {/* ════════ SERVICES TAB ════════ */}
          {activeTab === 'services' && <CoreServices />}

          {/* ════════ ANALYTICS TAB ════════ */}
          {activeTab === 'analytics' && <AnalyticsDashboard />}

          {activeTab === 'overview' && <AssetDistributionChart groupedAssets={grouped} />}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

function ProfileMenu({ initials, name, onLogout }: { initials: string; name: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} aria-label="Profile menu" aria-expanded={open}
        className="flex items-center gap-2 bg-white rounded-full pl-1 pr-3 py-1 shadow-sm hover:bg-zinc-100 active:scale-[0.98] transition">
        <img src={advisor1} alt={name} width={32} height={32} className="size-8 rounded-full object-cover" />
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs font-semibold">{name}</span>
          <span className="text-[10px] text-zinc-500">AssetMap</span>
        </span>
        <ChevronDown className={"size-3.5 text-zinc-500 transition " + (open ? "rotate-180" : "")} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-lg ring-1 ring-black/5 py-2 z-30">
          <div className="px-4 py-3 border-b border-zinc-100"><p className="text-sm font-semibold">{name}</p><p className="text-xs text-zinc-500">AssetMap User</p></div>
          <MenuItem onClick={() => { setOpen(false); navigate('/profile'); }} icon={<UserRound className="size-4" strokeWidth={1.75} />}>My Profile</MenuItem>
          <MenuItem onClick={() => { setOpen(false); navigate('/settings'); }} icon={<Settings className="size-4" strokeWidth={1.75} />}>Account Settings</MenuItem>
          <MenuItem onClick={() => { setOpen(false); navigate('/help'); }} icon={<HelpCircle className="size-4" strokeWidth={1.75} />}>Help & Support</MenuItem>
          <div className="my-1 border-t border-zinc-100" />
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-zinc-50 transition text-rose-600">
            <span className="text-rose-500"><LogOut className="size-4" strokeWidth={1.75} /></span>Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, icon, onClick }: { children: React.ReactNode; icon: React.ReactNode; onClick?: () => void }) {
  return (<button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-zinc-50 transition text-zinc-800"><span className="text-zinc-500">{icon}</span>{children}</button>);
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-4xl md:text-5xl lg:text-[3.2rem] font-display leading-[0.8] font-light text-zinc-900 tracking-tight">{value}</span>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</span>
        <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-0.5"><TrendingUp className="size-3" strokeWidth={2} />{delta}</span>
      </div>
    </div>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={!!active}
      className={"shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition active:scale-95 " +
        (active ? "bg-zinc-900 text-white shadow-sm" : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-zinc-200")}>
      {children}
    </button>
  );
}

function SectionHeader({ title, count, label }: { title: string; count: string; label: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <h2 className="text-[26px] font-sans text-zinc-900">{title}</h2>
      <span className="text-sm text-zinc-500"><span className="text-zinc-800 font-medium">{count}</span>{' '}<span className="underline underline-offset-4 decoration-zinc-300">{label}</span></span>
    </div>
  );
}

function getCardStyle(institutionName: string) {
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

  const hashCode = n.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  if (Math.abs(hashCode) % 3 === 0) return 'from-emerald-700 via-emerald-800 to-teal-900';
  if (Math.abs(hashCode) % 3 === 1) return 'from-indigo-800 via-indigo-900 to-rose-900';

  return 'from-zinc-800 via-zinc-900 to-black';
}

const SVG_LOGOS = new Set(['hdfc', 'sbi', 'axis', 'kotak', 'zerodha', 'goldman']);

function getBankLogo(name: string) {
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
}

function AssetCard({ asset, fmt }: { asset: any; fmt: (n: number) => string }) {
  const navigate = useNavigate();
  if (asset.fiType === 'DEPOSIT') {
    const last4 = asset.accountRef ? asset.accountRef.slice(-4) : '0000';
    const cardGradient = getCardStyle(asset.institutionName);

    return (
      <article onClick={() => navigate(`/asset/${asset.id}`)} className="group relative cursor-pointer">
        {/* Physical Card Representation */}
        <div className={`relative w-full aspect-[1.586/1] rounded-[22px] bg-gradient-to-br ${cardGradient} p-5 flex flex-col justify-between text-white overflow-hidden group-hover:-translate-y-1 transition-all duration-300`}>
          {/* Sharp diagonal light reflection */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-80"
            style={{ background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.1) 50%, transparent 70%)' }}
          ></div>

          {/* Top row */}
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[9px] tracking-[0.25em] text-white/50 font-medium uppercase mb-1.5">DEBIT</span>
              <div className="flex items-center gap-2.5">
                {getBankLogo(asset.institutionName) && (
                  <img
                    src={getBankLogo(asset.institutionName)!.local}
                    alt=""
                    className="size-6 rounded-md bg-white p-1 object-contain shadow-sm shrink-0"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = 'true';
                        target.src = getBankLogo(asset.institutionName)!.fallback;
                      }
                    }}
                  />
                )}
                <h3 className="font-semibold text-[17px] leading-tight tracking-wide drop-shadow-sm line-clamp-2">{asset.institutionName}</h3>
              </div>
            </div>
            <span className="text-[10px] font-medium bg-white/10 border border-white/5 text-white rounded-full px-3 py-1 backdrop-blur-md shadow-sm">
              Primary
            </span>
          </div>

          {/* Bottom Area */}
          <div className="relative z-10 mt-auto">
            {/* Card Number */}
            <div className="flex items-center gap-4 mb-5 text-white/90">
              <span className="text-[13px] leading-none tracking-[0.25em] mb-0.5">••••</span>
              <span className="text-[13px] leading-none tracking-[0.25em] mb-0.5">••••</span>
              <span className="text-[13px] leading-none tracking-[0.25em] mb-0.5">••••</span>
              <span className="font-mono text-[15px] tracking-[0.2em] leading-none">{last4}</span>
            </div>

            {/* Cardholder */}
            <div className="-mb-1">
              <p className="text-[7px] tracking-[0.25em] text-white/50 font-bold uppercase mb-1">Account Holder</p>
              <p className="text-[10px] font-bold tracking-widest uppercase text-white/90 drop-shadow-sm truncate">MARCUS STERLING</p>
            </div>
          </div>
        </div>

        {/* Balance section below the card */}
        <div className="px-3 pt-3 pb-2 flex justify-between items-end">
          <div>
            <p className="text-[22px] font-display font-semibold text-zinc-800">{fmt(asset.balance)}</p>
          </div>
          <div className="text-right">
            <div className="flex justify-end gap-0.5 mb-1">
              <span className="size-[6px] rounded-full bg-cyan-400" />
              <span className="size-[6px] rounded-full bg-emerald-400" />
              <span className="size-[6px] rounded-full bg-amber-400" />
            </div>
            <p className="text-[11px] text-emerald-600 font-medium">+₹{(Math.random() * 5000).toFixed(0)} this mo.</p>
          </div>
        </div>
      </article>
    );
  } else if (asset.fiType === 'ALTERNATIVE') {
    return (
      <article className="bg-[#18181b] rounded-xl p-5 flex flex-col justify-between text-white shadow-lg cursor-pointer hover:-translate-y-1 transition-transform border border-white/5 h-[160px]">
        <div className="flex justify-between items-start mb-2">
          <div className="size-10 rounded-lg bg-[#bef264] grid place-items-center text-lime-950">
            <Layers className="size-5" />
          </div>
          <span className="text-[10px] font-semibold bg-white/10 text-white/80 rounded-full px-2.5 py-1">
            {asset.accountRef || 'Fund'}
          </span>
        </div>

        <h3 className="font-semibold text-sm leading-tight tracking-wide mb-3">{asset.institutionName}</h3>

        <div className="pt-3 border-t border-white/10 flex items-end justify-between">
          <div>
            <p className="text-[8px] tracking-[0.1em] text-white/40 font-semibold uppercase mb-0.5">COMMITTED</p>
            <p className="text-[14px] font-medium text-white">${(asset.balance || 0).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] tracking-[0.1em] text-white/40 font-semibold uppercase mb-0.5">RETURN</p>
            <p className="text-[12px] font-medium text-lime-400 tracking-wide">IRR {asset.currentValue || 0}%</p>
          </div>
        </div>
      </article>
    );
  }

  // Fallback for non-DEPOSIT assets
  const colors = FI_COLORS[asset.fiType] || FI_COLORS.DEPOSIT;
  const icon = FI_ICONS[asset.fiType] || <Wallet className="size-4" strokeWidth={1.75} />;
  return (
    <article onClick={() => navigate(asset.fiType === 'EQUITY' ? `/broker/${asset.id}` : `/asset/${asset.id}`)} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className={`size-12 rounded-xl ${colors.iconBg} grid place-items-center overflow-hidden shrink-0`}>
          {getBankLogo(asset.institutionName) ? (
            <img
              src={getBankLogo(asset.institutionName)!.local}
              alt=""
              className="w-full h-full object-contain bg-white p-2"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src = getBankLogo(asset.institutionName)!.fallback;
                }
              }}
            />
          ) : icon}
        </div>
        <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5">{colors.tag}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-1 font-mono">{asset.accountRef}</p>
      <h3 className="text-base font-display font-semibold leading-tight"></h3>
      <p className="mt-3 text-2xl font-display font-medium text-zinc-800">{fmt(asset.balance)}</p>
      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex -space-x-0.5"><span className="size-2 rounded-full bg-sky-400" /><span className="size-2 rounded-full bg-emerald-400" /><span className="size-2 rounded-full bg-amber-400" /></div>
        <span className="text-xs font-medium text-zinc-400">{new Date(asset.fetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>
    </article>
  );
}



function AssetDistributionChart({ groupedAssets }: { groupedAssets: Record<string, any[]> }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault(); // Prevents disruptive text selection during drag
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const data = Object.entries(groupedAssets).map(([fiType, list]) => {
    const total = list.reduce((sum, a) => sum + (a.currentValue || a.balance || 0), 0);
    const label = fiType === 'DEPOSIT' ? 'Bank' :
      fiType === 'MUTUAL_FUND' ? 'Mutual Funds' :
        fiType === 'EQUITY' ? 'Stocks' :
          fiType === 'INSURANCE_POLICIES' ? 'Insurance' : fiType;
    return {
      name: label,
      value: total,
      color: fiType === 'DEPOSIT' ? '#00c6ff' :
        fiType === 'MUTUAL_FUND' ? '#0072ff' :
          fiType === 'EQUITY' ? '#ff4b2b' :
            fiType === 'INSURANCE_POLICIES' ? '#ff416c' : '#7b2ff7'
    };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  if (isMinimized) {
    return (
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden 2xl:block pointer-events-auto" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-[#1a1a1c]/90 backdrop-blur-xl border border-white/10 rounded-full p-4 shadow-2xl hover:bg-[#1a1a1c] transition-colors flex items-center justify-center gap-2 group cursor-pointer"
          title="Expand Overview"
        >
          <PieChart className="size-5 text-white/80 group-hover:text-white" strokeWidth={1.75} />
          <ChevronLeft className="size-4 text-white/50 group-hover:text-white/80" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden 2xl:block w-[300px] pointer-events-none">
      <div
        className={`bg-[#1a1a1c]/90 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 shadow-2xl overflow-hidden pointer-events-auto relative group scale-[0.85] origin-right transition-transform select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(0.85)` }}
        onMouseDown={handleMouseDown}
      >

        <button
          onClick={() => setIsMinimized(true)}
          className="absolute top-6 right-6 size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Minimize"
        >
          <ChevronRight className="size-4 text-white/70" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-3 mb-6 pr-8">
          <div className="size-10 rounded-full bg-white/10 grid place-items-center shrink-0">
            <PieChart className="size-5 text-white/80" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-white font-medium text-lg leading-tight">Overview</h3>
            <p className="text-white/50 text-xs">Asset distribution</p>
          </div>
        </div>

        <div className="h-24 w-full relative flex items-center justify-center -ml-4 mt-1 mb-2">
          <RechartsPieChart width={120} height={90}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={22}
              outerRadius={35}
              paddingAngle={3}
              minAngle={15}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: number) => `₹${(val / 100000).toFixed(2)}L`}
              contentStyle={{ backgroundColor: '#1a1a1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
              itemStyle={{ color: '#fff', fontSize: '12px' }}
            />
          </RechartsPieChart>
        </div>

        <div className="mt-2 flex flex-col gap-2.5">
          {data.map(d => (
            <div key={d.name} className="flex justify-between items-center text-[13px]">
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></span>
                <span className="text-white/70">{d.name}</span>
              </div>
              <span className="text-white/90 font-medium">₹{(d.value / 100000).toFixed(1)}L</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
