// @ts-nocheck
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssetStore } from '../store/assetStore';
import { getAssetSummary, getFinancialAssets, getLandRecords, getConsents, refreshAssets, getAuditLog } from '../services/assets';
import { logout } from '../services/auth';
import CoreServices from '../components/CoreServices';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import LandPropertyMap, { mockParcels } from '../components/land/LandPropertyMap';
import AlertsBell from '../components/alerts/AlertsBell';
import NomineeChecker from '../components/nominee/NomineeChecker';
import DormantAccounts from '../components/dormant/DormantAccounts';
import NetWorthContainer from '../components/networth/NetWorthContainer';
import UnclaimedAssets from './UnclaimedAssets';
import {
  Search, SlidersHorizontal, Plus, Archive,
  LayoutGrid, Wallet, Shield, PieChart, LineChart, Layers,
  Bell, ChevronDown, Settings, LogOut, UserRound, HelpCircle,
  TrendingUp, Building2, History, Store, Calendar, Menu, Eye, EyeOff, TrendingDown, Crown, X
} from 'lucide-react';
import { FeatureGate } from '../components/ui/FeatureGate';
import advisor1 from '../assets/advisor-1.jpg';

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

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatAbbreviated(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user, summary, assets, landRecords,
    isLoadingAssets, setLoadingAssets, dataConsents
  } = useAssetStore();

  const tabParam = searchParams.get('tab') as 'overview' | 'land' | 'unclaimed' | 'audit' | 'services' | 'analytics';
  const isValidTab = ['overview', 'land', 'unclaimed', 'audit', 'services', 'analytics'].includes(tabParam);
  const activeTab = isValidTab ? tabParam : 'overview';

  const setActiveTab = (tab: typeof activeTab) => {
    setSearchParams({ tab });
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<'searching' | 'blocked' | 'complete'>('searching');

  const hasFetched = useRef(false);
  const hasStoreData = useRef(assets.length > 0);

  const loadData = useCallback(async () => {
    // Only show loading skeleton on first visit (no cached data)
    if (!hasStoreData.current) setLoadingAssets(true);
    try {
      const [s, a, l, c] = await Promise.all([
        getAssetSummary(), getFinancialAssets(), getLandRecords(), getConsents(),
      ]);
      useAssetStore.setState({ summary: s, assets: a, landRecords: l, consents: c });

      // If no active consent is found and the user hasn't seen the consent flow yet, redirect to the consent flow
      const consentKey = `hasSeenConsent_${useAssetStore.getState().user?.id}`;
      if (!c.some(consent => consent.status === 'ACTIVE') && !localStorage.getItem(consentKey) && window.location.pathname !== '/consent') {
        localStorage.setItem(consentKey, 'true');
        navigate('/consent');
        return;
      }

      try { const audit = await getAuditLog(); setAuditLogs(audit.logs); } catch { /* ok */ }
    } catch (err) { console.error('Load failed', err); }
    finally { setLoadingAssets(false); }
  }, [setLoadingAssets, navigate]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadData();
  }, [loadData]);



  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState('');

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshAssets();
      await loadData();
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.error?.message?.includes('Premium')) {
        navigate('/pricing');
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    try { await logout(); } catch { }
    useAssetStore.getState().logout();
    navigate('/');
  }

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <LayoutGrid className="size-4" strokeWidth={1.75} />, featureKey: 'asset_dashboard' },
    { key: 'land' as const, label: `Property (${landRecords.length})`, icon: <Building2 className="size-4" strokeWidth={1.75} />, featureKey: 'land_records' },
    { key: 'unclaimed' as const, label: 'Unclaimed', icon: <Archive className="size-4" strokeWidth={1.75} />, featureKey: 'unclaimed_search' },
    { key: 'analytics' as const, label: 'Analytics', icon: <TrendingUp className="size-4" strokeWidth={1.75} />, featureKey: 'asset_dashboard' },
    { key: 'audit' as const, label: 'Activity', icon: <History className="size-4" strokeWidth={1.75} />, featureKey: 'asset_dashboard' },
    { key: 'services' as const, label: 'Services', icon: <Store className="size-4" strokeWidth={1.75} /> },
  ];

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const firstName = (user?.name || 'User').split(' ')[0];

  // Search & filter
  const q = query.trim().toLowerCase();
  const displayAssets = useMemo(() => assets, [assets]);

  const filteredAssets = useMemo(() => displayAssets.filter(a => {
    const matchesType = filter === 'all' || a.fiType === filter;
    const matchesQuery = !q || `${a.institutionName} ${a.accountRef} ${a.fiType}`.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  }), [displayAssets, filter, q]);

  // Group by fi_type
  const grouped = useMemo(() => {
    const g: Record<string, typeof assets> = {};
    for (const a of filteredAssets) {
      (g[a.fiType] ||= []).push(a);
    }
    return g;
  }, [filteredAssets]);

  return (
    <div className="min-h-screen text-zinc-900 font-sans" style={{ contain: 'layout style', background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      <div className="flex">
        <aside className={`sticky top-0 h-screen hidden md:flex flex-col items-center pt-32 pb-6 gap-2 transition-all duration-300 shrink-0 ${isSidebarOpen ? 'w-48' : 'w-20'}`}>
          {/* Stylish vertical line */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-[75%] bg-gradient-to-b from-transparent via-zinc-400/60 to-transparent"></div>
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
              className="p-2 rounded-md bg-white shadow-sm hover:bg-zinc-100 transition-colors text-zinc-900 active:scale-95"
              aria-label="Toggle Sidebar"
            >
              <Menu className="size-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className={`h-px bg-zinc-300/60 transition-all duration-500 ease-out mt-6 ${isSidebarOpen ? 'w-36' : 'w-8'}`} />

          <nav className="flex flex-col gap-1 mt-6 w-full px-3">
            {tabs.map(t => {
              const button = (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  aria-label={t.label}
                  title={!isSidebarOpen ? t.label : undefined}
                  className={
                    `flex items-center transition-all duration-300 ease-in-out active:scale-95 rounded-xl ${isSidebarOpen ? 'w-full px-3 py-2.5' : 'w-12 h-12 justify-center mx-auto'} ` +
                    (activeTab === t.key
                      ? "bg-zinc-900 text-white font-semibold"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 font-medium")
                  }
                >
                  <div className="shrink-0">{t.icon}</div>
                  <span
                    className={`text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'max-w-[100px] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'
                      }`}
                  >
                    {t.label.split(' ')[0]}
                  </span>
                </button>
              );
              return t.featureKey ? (
                <FeatureGate key={t.key} featureKey={t.featureKey} hideCompletely>
                  {button}
                </FeatureGate>
              ) : button;
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto mx-3 mb-4 w-[calc(100%-24px)] flex flex-col gap-2 p-2 bg-white/40 shadow-sm ring-1 ring-black/5 backdrop-blur-md rounded-2xl">
            {user?.subscriptionTier !== 'premium' && (
              <button
                onClick={() => navigate('/pricing')}
                title={!isSidebarOpen ? "Upgrade to Premium" : undefined}
                className={`flex items-center gap-2 justify-center bg-lime-300 hover:bg-lime-400 text-black rounded-xl text-sm font-bold shadow-[0_0_12px_rgba(190,242,100,0.3)] transition-all active:scale-95 ${isSidebarOpen ? 'w-full px-3 py-2.5' : 'w-10 h-10 mx-auto p-0'}`}
              >
                <Crown className="size-5 shrink-0" />
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'max-w-[100px] opacity-100 ml-1' : 'max-w-0 opacity-0 ml-0'}`}>
                  Upgrade
                </span>
              </button>
            )}

            <button
              onClick={handleLogout}
              title={!isSidebarOpen ? "Log out" : undefined}
              className={`flex items-center gap-2 justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl text-sm font-medium transition-all active:scale-95 ${isSidebarOpen ? 'w-full px-3 py-2.5' : 'w-10 h-10 mx-auto p-0'}`}
            >
              <LogOut className="size-4 shrink-0" />
              <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'max-w-[100px] opacity-100 ml-1' : 'max-w-0 opacity-0 ml-0'}`}>
                Log out
              </span>
            </button>
          </div>
        </aside>

        {/* ════════ MAIN ════════ */}
        <main className="flex-1 min-w-0 px-6 md:px-10 pt-2 pb-8 md:pt-4 md:pb-10">

          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 mb-8 sm:mb-10" style={{ minHeight: '56px' }}>
            <div className="flex min-w-0 items-center gap-3 w-full sm:w-auto">
              <div className={`min-w-0 flex items-center bg-[#0a0a0b] text-white rounded-full transition-all duration-500 ease-out shadow-xl border border-white/5 ring-1 ring-white/10 w-full sm:w-auto justify-between ${isSidebarOpen ? 'px-4 sm:px-6 py-1.5 gap-2' : 'px-5 sm:px-8 py-2 sm:py-2.5 gap-4'}`}>

                {/* LEFT - AssetMap */}
                <div className="flex-1 flex items-center justify-start">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="size-3 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.8)] animate-pulse"></span>
                    <span className="text-base font-semibold tracking-wide whitespace-nowrap">AssetMap</span>
                  </div>
                </div>

                {/* CENTER - Calendar */}
                <div className="hidden sm:flex flex-1 items-center justify-center px-4">
                  <span className={`flex items-center gap-3 bg-white/5 rounded-full transition-all duration-500 ease-out ${isSidebarOpen ? 'px-4 py-1' : 'px-6 py-1.5'} text-white/90 border border-white/5`}>
                    <Calendar className="size-4 text-white" strokeWidth={2} />
                    <span className="text-sm font-medium whitespace-nowrap">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</span>
                  </span>
                </div>

                {/* RIGHT - Synced */}
                <div className="flex-1 flex items-center justify-end">
                  {summary?.lastFetchedAt && (
                    <span className={`flex items-center gap-2 sm:gap-3 bg-lime-300 text-black rounded-full transition-all duration-500 ease-out ${isSidebarOpen ? 'px-4 py-1' : 'px-5 py-1.5'} shadow-[0_0_12px_rgba(190,242,100,0.3)]`}>
                      <span className="text-xs sm:text-sm font-bold whitespace-nowrap tracking-tight">
                        Synced {new Date(summary.lastFetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                  )}
                </div>

              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex items-center gap-4 mr-2">
                <AnimatedNetWorthKpi summary={summary} isPrivacyMode={isPrivacyMode} delta={`+${summary?.incrementPercentage || '8.8'}%`} />
                <div className="hidden sm:block h-10 w-px bg-zinc-300/70" />
                <div className="hidden sm:block">
                  <Kpi label="Accounts" value={String(assets.length)} delta={`${landRecords.length} prop.`} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NotificationsMenu logs={auditLogs} />
                <ProfileMenu initials={initials} name={user?.name || 'User'} onLogout={handleLogout} />
              </div>
            </div>
          </div>

          {/* Heading + CTA */}
          {activeTab === 'overview' && (
            <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-6 mb-16">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[4rem] leading-[0.9] tracking-tighter text-zinc-900 truncate font-light min-w-[200px] flex-1">Welcome, {firstName}</h1>
            </div>
          )}

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

              {/* Stats Cards Row */}
              {!isLoadingAssets ? (
                <>
                  {(() => {
                    const bankInstCount = new Set(assets.filter(a => a.fiType === 'DEPOSIT').map(a => a.institutionName)).size;
                    const mfInstCount = new Set(assets.filter(a => a.fiType === 'MUTUAL_FUND').map(a => a.institutionName)).size;
                    const equityInstCount = new Set(assets.filter(a => a.fiType === 'EQUITY').map(a => a.institutionName)).size;
                    const insuranceInstCount = new Set(assets.filter(a => a.fiType === 'INSURANCE_POLICIES').map(a => a.institutionName)).size;
                    const npsInstCount = new Set(assets.filter(a => a.fiType === 'NPS').map(a => a.institutionName)).size;
                    const gstnInstCount = new Set(assets.filter(a => a.fiType === 'GSTN').map(a => a.institutionName)).size;
                    const altInstCount = new Set(displayAssets.filter(a => a.fiType === 'ALTERNATIVE').map(a => a.institutionName)).size;
                    const landInstCount = landRecords.length;

                    const totalInstitutions = bankInstCount + mfInstCount + equityInstCount + insuranceInstCount + npsInstCount + gstnInstCount + altInstCount + landInstCount;

                    const totalDiscovered = summary?.totalWithLand || summary?.totalNetWorth || 0;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6 items-start">
                        {/* Card 1: TOTAL ASSETS DISCOVERED */}
                        <div className="bg-gradient-to-br from-zinc-200/90 via-zinc-100/90 to-zinc-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-xl rounded-[24px] p-6 border border-zinc-300 flex flex-col justify-between min-h-[220px]">
                          <div className="flex justify-between items-start">
                            <span className="text-[13px] font-medium text-slate-500 uppercase tracking-wide">
                              Total Assets Discovered
                            </span>
                            <button
                              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                              className="size-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
                            >
                              {isPrivacyMode ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
                            </button>
                          </div>
                          <div className="mt-6 flex flex-col gap-1.5">
                            <div className="text-3xl sm:text-4xl md:text-3xl lg:text-4xl font-sans font-normal text-zinc-900 tracking-tight">
                              {isPrivacyMode ? '****' : fmt(totalDiscovered)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[#00A86B] text-[13px] font-medium">
                              <TrendingUp className="size-4" strokeWidth={2} />
                              <span>{summary?.lastFetchedAt ? `Updated ${new Date(summary.lastFetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Up to date'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card 2: ASSETS DISCOVERED */}
                        <div className="bg-gradient-to-br from-zinc-200/90 via-zinc-100/90 to-zinc-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-xl rounded-[24px] p-6 border border-zinc-300 flex flex-col justify-between min-h-[220px]">
                          <div className="flex justify-between items-start">
                            <span className="text-[13px] font-medium text-slate-500 uppercase tracking-wide">
                              Institutions Found
                            </span>
                            <div className="size-8 rounded-full bg-lime-100/60 flex items-center justify-center text-emerald-600">
                              <Building2 className="size-4" strokeWidth={1.5} />
                            </div>
                          </div>
                          <div className="mt-4 flex flex-col gap-3">
                            <div className="text-4xl sm:text-5xl font-sans font-normal text-zinc-900 tracking-tight">
                              {totalInstitutions}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {bankInstCount > 0 && (
                                <span className="bg-white shadow-sm text-zinc-700 text-[11px] font-medium px-3 py-1 rounded-full">
                                  {bankInstCount} Bank{bankInstCount !== 1 ? 's' : ''}
                                </span>
                              )}
                              {mfInstCount > 0 && (
                                <span className="bg-white shadow-sm text-zinc-700 text-[11px] font-medium px-3 py-1 rounded-full">
                                  {mfInstCount} Mutual Fund{mfInstCount !== 1 ? 's' : ''}
                                </span>
                              )}
                              {equityInstCount > 0 && (
                                <span className="bg-white shadow-sm text-zinc-700 text-[11px] font-medium px-3 py-1 rounded-full">
                                  {equityInstCount} Stock{equityInstCount !== 1 ? 's' : ''}
                                </span>
                              )}
                              {insuranceInstCount > 0 && (
                                <span className="bg-white shadow-sm text-zinc-700 text-[11px] font-medium px-3 py-1 rounded-full">
                                  {insuranceInstCount} Insurance
                                </span>
                              )}
                              {npsInstCount > 0 && (
                                <span className="bg-white shadow-sm text-zinc-700 text-[11px] font-medium px-3 py-1 rounded-full">
                                  {npsInstCount} NPS
                                </span>
                              )}
                              {gstnInstCount > 0 && (
                                <span className="bg-white shadow-sm text-zinc-700 text-[11px] font-medium px-3 py-1 rounded-full">
                                  {gstnInstCount} GSTN
                                </span>
                              )}
                              {altInstCount > 0 && (
                                <span className="bg-white shadow-sm text-zinc-700 text-[11px] font-medium px-3 py-1 rounded-full">
                                  {altInstCount} Alts
                                </span>
                              )}
                              {landInstCount > 0 && (
                                <span className="bg-white shadow-sm text-zinc-700 text-[11px] font-medium px-3 py-1 rounded-full">
                                  {landInstCount} Land Registr{landInstCount !== 1 ? 'ies' : 'y'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Net Worth Container */}
                        <div className="md:col-span-2 lg:col-span-1 lg:row-span-2 h-full">
                          <NetWorthContainer />
                        </div>

                        {/* Consumer Engagement Suite */}
                        {dataConsents.engagement && (
                          <>
                            <div className="flex flex-col gap-5 h-full">
                              <div className="bg-[#18181b] text-white rounded-[24px] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.4)] border border-zinc-800/80 flex flex-col justify-between flex-1 min-h-[140px]">
                                <div className="flex justify-between items-start">
                                  <span className="text-[13px] font-medium text-zinc-400 uppercase tracking-wide">
                                    Liabilities / Debts
                                  </span>
                                  <div className="size-8 rounded-full bg-rose-950/40 flex items-center justify-center text-rose-500">
                                    <TrendingDown className="size-4" strokeWidth={1.5} />
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-col gap-1.5">
                                  <div className="text-3xl sm:text-4xl md:text-3xl lg:text-4xl font-sans font-normal text-rose-100 tracking-tight">
                                    {isPrivacyMode ? '****' : fmt(assets.reduce((sum, a) => sum + (a.balance < 0 ? Math.abs(a.balance) : 0), 0))}
                                  </div>
                                  <div className="text-zinc-400 text-[13px]">
                                    Must be settled before distribution
                                  </div>
                                </div>
                              </div>
                              <DormantAccounts />
                            </div>

                            <div className="h-full min-h-[220px]">
                              <NomineeChecker />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="animate-pulse mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6 items-start">
                    <div className="bg-zinc-200/50 rounded-[24px] h-[220px]"></div>
                    <div className="bg-zinc-200/50 rounded-[24px] h-[220px]"></div>
                    <div className="bg-zinc-200/50 rounded-[24px] h-[480px] md:col-span-2 lg:col-span-1 lg:row-span-2"></div>
                    <div className="flex flex-col gap-5 h-full">
                      <div className="bg-zinc-200/50 rounded-[24px] h-[140px]"></div>
                      <div className="bg-zinc-200/50 rounded-[24px] h-[80px]"></div>
                    </div>
                    <div className="bg-zinc-200/50 rounded-[24px] h-full min-h-[220px]"></div>
                  </div>
                </div>
              )}

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

              {/* Search and Filters moved here */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-24 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 bg-white rounded-full pl-3 pr-2 py-1.5 shadow-sm w-full sm:w-72 shrink-0 border border-zinc-200/50">
                    <Search className="size-3.5 text-zinc-500" strokeWidth={1.75} />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search assets, institutions…"
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-zinc-400" />
                    {query && <button onClick={() => setQuery('')} className="text-[10px] text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded-full hover:bg-zinc-100">Clear</button>}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                    <button aria-label="Filters" className="shrink-0 size-9 rounded-full bg-white grid place-items-center shadow-sm hover:bg-zinc-100 transition border border-zinc-200/50">
                      <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
                    </button>
                    {(Object.keys(FILTER_META) as FilterKey[]).map(key => (
                      <FilterChip key={key} active={filter === key} onClick={() => setFilter(key)}>
                        {FILTER_META[key].icon}{FILTER_META[key].label}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <button onClick={() => alert('Manual asset addition coming soon')}
                  className="shrink-0 flex justify-center items-center gap-2 rounded-full bg-zinc-900 text-white pl-2 pr-5 py-2 text-sm font-medium hover:bg-zinc-800 active:scale-95 transition">
                  <span className="size-7 rounded-full bg-lime-300 text-zinc-900 grid place-items-center"><Plus className="size-4" strokeWidth={2.5} /></span>
                  Add Asset
                </button>
              </div>

              {/* Asset sections by category */}
              {!isLoadingAssets && Object.keys(grouped).length > 0 && (
                <div className="mb-8 mt-6">
                  <h2 className="font-display text-3xl md:text-4xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500 font-medium relative inline-block pb-2">
                    Assets Discovered
                    <span className="absolute bottom-0 left-0 w-3/4 h-[3px] bg-gradient-to-r from-zinc-900 to-transparent rounded-full"></span>
                  </h2>
                </div>
              )}
              {!isLoadingAssets && Object.entries(grouped).map(([fiType, items]) => (
                <div key={fiType}>
                  <SectionHeader title={FILTER_META[fiType as FilterKey]?.label || fiType.replace('_', ' ')} count={String(items.length)} label="Accounts" totalValue={items.reduce((sum, a) => sum + (a.balance || 0), 0)} />
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 mb-10" style={{ contain: 'layout', minHeight: '200px' }}>
                    {items.map(asset => <AssetCard key={asset.id} asset={asset} fmt={fmt} />)}
                  </div>
                </div>
              ))}


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
          {activeTab === 'land' && dataConsents.land && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <SectionHeader title="Property Records" count={String((landRecords.length > 0 ? landRecords : mockParcels).length)} label="Properties" totalValue={(landRecords.length > 0 ? landRecords : mockParcels).reduce((sum, p) => sum + (p.estimatedValue || 0), 0)} />
              </div>
              <LandPropertyMap parcels={landRecords.length > 0 ? landRecords : mockParcels} />
            </div>
          )}
          {activeTab === 'land' && !dataConsents.land && (
            <div className="py-20 text-center text-zinc-500 bg-white rounded-2xl shadow-sm">
              <Building2 className="size-8 mx-auto text-zinc-300 mb-3" />
              <p>Land & Property syncing is disabled in your consent settings.</p>
            </div>
          )}

          {/* ════════ UNCLAIMED TAB ════════ */}
          {activeTab === 'unclaimed' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
              <UnclaimedAssets />
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
        </main>
      </div>

      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#161b22] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 text-amber-500">
                <Crown className="size-6" />
                <h2 className="text-xl font-medium text-white">Premium Feature</h2>
              </div>
              <button onClick={() => setShowPremiumModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-slate-300 mb-6 text-sm leading-relaxed">
              {premiumMessage}
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              Upgrade to Premium
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

function NotificationsMenu({ logs }: { logs: any[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const getAccountMessage = (action: string) => {
    switch (action) {
      case 'DATA_FETCHED': return 'Your financial accounts and assets have been synced successfully.';
      case 'DATA_REFRESHED': return 'Your account balances have been refreshed with the latest data.';
      case 'CONSENT_APPROVED': return 'You approved account linking via the Account Aggregator.';
      case 'CONSENT_CREATED': return 'A new account linking request was initiated.';
      case 'LAND_SEARCH': return 'Your profile was used to discover land & property records.';
      case 'REPORT_GENERATED': return 'A comprehensive asset report was generated for your account.';
      default: return null;
    }
  };

  const accountNotifications = logs
    .map(log => ({ ...log, message: getAccountMessage(log.action) }))
    .filter(log => log.message !== null)
    .slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} aria-label="Notifications" aria-expanded={open}
        className="relative size-10 rounded-full bg-white grid place-items-center shadow-sm hover:bg-zinc-100 active:scale-95 transition">
        <Bell className="size-4" strokeWidth={1.75} />
        {accountNotifications.length > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-white" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-lg ring-1 ring-black/5 py-2 z-30 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-zinc-100"><p className="text-sm font-semibold">Account Notifications</p></div>
          {accountNotifications.length > 0 ? (
            <div className="flex flex-col">
              {accountNotifications.map((log, i) => (
                <div key={log.id || i} className="px-4 py-3 hover:bg-zinc-50 transition border-b border-zinc-50 last:border-0">
                  <p className="text-sm text-zinc-800 break-words">{log.message}</p>
                  <p className="text-xs text-zinc-500 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-zinc-500 text-sm">
              No new account notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const isTrend = delta.includes('%');
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-3xl md:text-4xl lg:text-5xl font-sans leading-[0.8] font-normal text-zinc-900 tracking-tight">{value}</span>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</span>
        <span className={`text-xs font-medium inline-flex items-center gap-0.5 ${isTrend ? 'text-emerald-600' : 'text-zinc-500'}`}>
          {isTrend && <TrendingUp className="size-3" strokeWidth={2} />}
          {delta}
        </span>
      </div>
    </div>
  );
}

function AnimatedNetWorthKpi({ summary, isPrivacyMode, delta }: { summary: any; isPrivacyMode: boolean; delta: string }) {
  const [animatedWorth, setAnimatedWorth] = useState(0);

  useEffect(() => {
    if (!summary) return;
    const target = summary.totalWithLand || summary.totalNetWorth;
    const dur = 1800, start = performance.now();
    let rafId: number;
    const anim = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setAnimatedWorth(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) rafId = requestAnimationFrame(anim);
    };
    rafId = requestAnimationFrame(anim);
    return () => cancelAnimationFrame(rafId);
  }, [summary]);

  return <Kpi label="Net Worth" value={isPrivacyMode ? '****' : formatAbbreviated(animatedWorth)} delta={delta} />;
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

function SectionHeader({ title, count, label, totalValue }: { title: string; count: string; label: string; totalValue?: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-5 w-full">
      <h2 className="text-[26px] font-sans text-zinc-900">{title}</h2>
      <span className="text-sm text-zinc-500 flex items-baseline gap-1.5">
        {totalValue !== undefined && (
          <span className="text-sm font-medium text-emerald-600">
            ({fmt(totalValue)})
          </span>
        )}
        <span><span className="text-zinc-800 font-medium">{count}</span>{' '}<span className="underline underline-offset-4 decoration-zinc-300">{label}</span></span>
      </span>
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
  // Stable "monthly change" value derived from asset id (no flicker on re-render)
  const monthlyChange = useMemo(() => {
    const hash = (asset.id || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
    return ((hash * 7 + 1234) % 5000) + 500;
  }, [asset.id]);
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
            <p className="text-[19px] font-sans font-normal text-zinc-900 tracking-tight">{fmt(asset.balance)}</p>
          </div>
          <div className="text-right">
            <div className="flex justify-end gap-0.5 mb-1">
              <span className="size-[6px] rounded-full bg-cyan-400" />
              <span className="size-[6px] rounded-full bg-emerald-400" />
              <span className="size-[6px] rounded-full bg-amber-400" />
            </div>
            <p className="text-[11px] text-emerald-600 font-medium">+₹{monthlyChange} this mo.</p>
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
      <p className="mt-3 text-[19px] font-sans font-normal text-zinc-900 tracking-tight">{fmt(asset.balance)}</p>
      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex -space-x-0.5"><span className="size-2 rounded-full bg-sky-400" /><span className="size-2 rounded-full bg-emerald-400" /><span className="size-2 rounded-full bg-amber-400" /></div>
        <span className="text-xs font-medium text-zinc-400">{new Date(asset.fetchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>
    </article>
  );
}



