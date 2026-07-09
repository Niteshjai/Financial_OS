import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetStore } from '../store/assetStore';
import { getAssetSummary, getFinancialAssets, getLandRecords, getConsents, refreshAssets, getAuditLog } from '../services/assets';
import { logout } from '../services/auth';
import CoreServices from '../components/CoreServices';
import {
  ArrowUpRight, Search, SlidersHorizontal, Plus,
  LayoutGrid, Wallet, Shield, PieChart, LineChart, Layers,
  Bell, ChevronDown, Settings, LogOut, UserRound, HelpCircle,
  TrendingUp, Building2, History, Store,
} from 'lucide-react';
import advisor1 from '../assets/advisor-1.jpg';

/* ═══════════════════════════════════════════════════
   AssetMap Dashboard — Lovable-inspired Design
   Backed by real API data from the AssetMap backend
   ═══════════════════════════════════════════════════ */

type FilterKey = 'all' | 'DEPOSIT' | 'INSURANCE_POLICIES' | 'MUTUAL_FUND' | 'EQUITY' | 'NPS' | 'GSTN';

const FILTER_META: Record<FilterKey, { label: string; icon: React.ReactNode }> = {
  all: { label: 'All', icon: null },
  DEPOSIT: { label: 'Bank', icon: <Wallet className="size-3" strokeWidth={2} /> },
  INSURANCE_POLICIES: { label: 'Insurance', icon: <Shield className="size-3" strokeWidth={2} /> },
  MUTUAL_FUND: { label: 'Mutual Funds', icon: <PieChart className="size-3" strokeWidth={2} /> },
  EQUITY: { label: 'Stocks', icon: <LineChart className="size-3" strokeWidth={2} /> },
  NPS: { label: 'NPS', icon: <Layers className="size-3" strokeWidth={2} /> },
  GSTN: { label: 'GSTN', icon: <Layers className="size-3" strokeWidth={2} /> },
};

const FI_ICONS: Record<string, React.ReactNode> = {
  DEPOSIT: <Wallet className="size-4" strokeWidth={1.75} />,
  EQUITY: <LineChart className="size-4" strokeWidth={1.75} />,
  MUTUAL_FUND: <PieChart className="size-4" strokeWidth={1.75} />,
  INSURANCE_POLICIES: <Shield className="size-4" strokeWidth={1.75} />,
  NPS: <Layers className="size-4" strokeWidth={1.75} />,
  GSTN: <Layers className="size-4" strokeWidth={1.75} />,
};

const FI_COLORS: Record<string, { iconBg: string; tag: string }> = {
  DEPOSIT: { iconBg: 'bg-zinc-900 text-lime-300', tag: 'Primary' },
  EQUITY: { iconBg: 'bg-lime-100 text-lime-800', tag: 'Equity' },
  MUTUAL_FUND: { iconBg: 'bg-lime-100 text-lime-800', tag: 'MF' },
  INSURANCE_POLICIES: { iconBg: 'bg-zinc-100 text-zinc-700', tag: 'Insurance' },
  NPS: { iconBg: 'bg-teal-100 text-teal-800', tag: 'NPS' },
  GSTN: { iconBg: 'bg-red-100 text-red-800', tag: 'GSTN' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    user, summary, assets, landRecords,
    setSummary, setAssets, setLandRecords, setConsents,
    isLoadingAssets, setLoadingAssets,
  } = useAssetStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'land' | 'audit' | 'services'>('overview');
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
    { key: 'land' as const, label: `Property (${landRecords.length})`, icon: <Building2 className="size-4" strokeWidth={1.75} /> },
    { key: 'audit' as const, label: 'Activity', icon: <History className="size-4" strokeWidth={1.75} /> },
    { key: 'services' as const, label: 'Services', icon: <Store className="size-4" strokeWidth={1.75} /> },
  ];

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Search & filter
  const q = query.trim().toLowerCase();
  const matchText = (text: string) => !q || text.toLowerCase().includes(q);
  const showType = (key: FilterKey) => filter === 'all' || filter === key;

  const filteredAssets = assets.filter(a =>
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
        {/* ════════ LEFT ICON RAIL ════════ */}
        <aside className="hidden md:flex w-20 shrink-0 flex-col items-center py-8 gap-8">
          <div className="size-10 rounded-full bg-zinc-900 grid place-items-center">
            <span className="text-lime-300 font-display text-xl leading-none font-bold">A</span>
          </div>
          <nav className="flex flex-col gap-3 mt-4">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                aria-label={t.label}
                title={t.label}
                className={
                  "size-10 rounded-full grid place-items-center transition active:scale-95 " +
                  (activeTab === t.key
                    ? "bg-zinc-900 text-white"
                    : "bg-white/60 text-zinc-500 hover:bg-white hover:text-zinc-900")
                }
              >
                {t.icon}
              </button>
            ))}
          </nav>
        </aside>

        {/* ════════ MAIN ════════ */}
        <main className="flex-1 min-w-0 px-6 md:px-10 py-8 md:py-10">

          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={handleRefresh} disabled={refreshing}
                className="shrink-0 size-10 rounded-full bg-white grid place-items-center shadow-sm hover:bg-zinc-100 active:scale-95 transition disabled:opacity-50"
                aria-label="Sync data">
                {refreshing
                  ? <div className="size-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                  : <ArrowUpRight className="size-4" strokeWidth={1.75} />}
              </button>
              <div className="min-w-0 flex items-center bg-zinc-900 text-white rounded-full pr-1 pl-5 py-1 gap-3 shadow-sm">
                <span className="text-xs font-medium whitespace-nowrap">AssetMap</span>
                <span className="hidden sm:flex items-center gap-1.5 bg-zinc-800 rounded-full px-3 py-1">
                  <span className="text-xs whitespace-nowrap">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
                {summary?.lastFetchedAt && (
                  <span className="hidden lg:flex items-center gap-2 bg-lime-300 text-zinc-900 rounded-full px-3 py-1">
                    <span className="text-xs font-semibold whitespace-nowrap">
                      Synced {new Date(summary.lastFetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                )}
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
            <h1 className="font-display text-[10vw] sm:text-[6vw] lg:text-[5rem] leading-[0.9] tracking-wide text-zinc-900 truncate font-light">WEALTH</h1>
            <button onClick={() => navigate('/consent')}
              className="shrink-0 flex items-center gap-2 rounded-full bg-zinc-900 text-white pl-2 pr-5 py-2 text-sm font-medium hover:bg-zinc-800 active:scale-95 transition">
              <span className="size-7 rounded-full bg-lime-300 text-zinc-900 grid place-items-center"><Plus className="size-4" strokeWidth={2.5} /></span>
              Add Asset
            </button>
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8">
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

              {/* Loading */}
              {isLoadingAssets && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
                    {items.map(asset => <AssetCard key={asset.id} asset={asset} fmt={fmt} />)}
                  </div>
                </div>
              ))}

              {/* Category breakdown */}
              {!isLoadingAssets && summary && summary.categoryBreakdown.length > 0 && (
                <>
                  <SectionHeader title="Portfolio Breakdown" count={String(summary.categoryBreakdown.length)} label="Categories" />
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
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
          <MenuItem icon={<UserRound className="size-4" strokeWidth={1.75} />}>My Profile</MenuItem>
          <MenuItem icon={<Settings className="size-4" strokeWidth={1.75} />}>Account Settings</MenuItem>
          <MenuItem icon={<HelpCircle className="size-4" strokeWidth={1.75} />}>Help & Support</MenuItem>
          <div className="my-1 border-t border-zinc-100" />
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-zinc-50 transition text-rose-600">
            <span className="text-rose-500"><LogOut className="size-4" strokeWidth={1.75} /></span>Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (<button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-zinc-50 transition text-zinc-800"><span className="text-zinc-500">{icon}</span>{children}</button>);
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl md:text-3xl font-display leading-none font-bold">{value}</span>
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
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="text-xl md:text-2xl font-display font-bold">{title}</h2>
      <span className="text-sm text-zinc-500"><span className="text-zinc-900 font-medium">{count}</span>{' '}<span className="underline underline-offset-4 decoration-zinc-300">{label}</span></span>
    </div>
  );
}

function AssetCard({ asset, fmt }: { asset: any; fmt: (n: number) => string }) {
  const colors = FI_COLORS[asset.fiType] || FI_COLORS.DEPOSIT;
  const icon = FI_ICONS[asset.fiType] || <Wallet className="size-4" strokeWidth={1.75} />;
  return (
    <article className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div className={`size-10 rounded-xl ${colors.iconBg} grid place-items-center`}>{icon}</div>
        <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5">{colors.tag}</span>
      </div>
      <p className="text-xs text-zinc-500 mb-1 font-mono">{asset.accountRef}</p>
      <h3 className="text-base font-display font-semibold leading-tight">{asset.institutionName}</h3>
      <p className="mt-3 text-2xl font-display font-bold">{fmt(asset.balance)}</p>
      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex -space-x-0.5"><span className="size-2 rounded-full bg-sky-400" /><span className="size-2 rounded-full bg-emerald-400" /><span className="size-2 rounded-full bg-amber-400" /></div>
        <span className="text-xs font-medium text-zinc-400">{new Date(asset.fetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>
    </article>
  );
}
