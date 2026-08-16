import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AssetSummary, AssetSnapshot, LandRecord, Consent, AuditLogEntry } from '../services/assets';
import type { UnclaimedAsset } from '../services/unclaimed';
import type { RecoveryCaseResponse } from '../services/recovery';

// ═══════════════════════════════════════════════════════════════
// AssetMap — Zustand Global Store
// ═══════════════════════════════════════════════════════════════

interface User {
  id: string;
  name: string;
  isNewUser: boolean;
  subscriptionTier?: 'free' | 'premium';
}

const SESSION_USER_KEY = 'authUser';

function loadStoredUser(): User | null {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface AssetStore {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  setUser: (user: User | null) => void;
  setAuthChecked: (checked: boolean) => void;
  logout: () => void;

  // Assets
  summary: AssetSummary | null;
  assets: AssetSnapshot[];
  landRecords: LandRecord[];
  isLoadingAssets: boolean;
  setSummary: (summary: AssetSummary) => void;
  setAssets: (assets: AssetSnapshot[]) => void;
  setLandRecords: (records: LandRecord[]) => void;
  setLoadingAssets: (loading: boolean) => void;
  
  // Manual Assets
  manualAssets: any[];
  setManualAssets: (assets: any[]) => void;

  // Consents
  consents: Consent[];
  setConsents: (consents: Consent[]) => void;
  activeConsent: Consent | null;
  hasConsent: boolean;
  setHasConsent: (consent: boolean) => void;

  // Audit
  auditLogs: AuditLogEntry[];
  setAuditLogs: (logs: AuditLogEntry[]) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  dashboardFilter: string;
  setDashboardFilter: (filter: string) => void;
  dashboardQuery: string;
  setDashboardQuery: (query: string) => void;
  
  // Unclaimed / Recovery
  unclaimedAssets: UnclaimedAsset[] | null;
  recoveryCases: RecoveryCaseResponse[] | null;
  setUnclaimedAssets: (assets: UnclaimedAsset[]) => void;
  setRecoveryCases: (cases: RecoveryCaseResponse[]) => void;
  
  // Engagement Data
  netWorthData: any | null;
  dormantData: any | null;
  nomineeData: any | null;
  setNetWorthData: (data: any) => void;
  setDormantData: (data: any) => void;
  setNomineeData: (data: any) => void;
  
  // Data Consents
  dataConsents: {
    banking: boolean;
    investments: boolean;
    land: boolean;
    engagement: boolean;
  };
  toggleDataConsent: (key: 'banking' | 'investments' | 'land' | 'engagement') => void;
}

export const useAssetStore = create<AssetStore>()(
  persist(
    (set, get) => ({
      // ── Auth ──
      user: loadStoredUser(),
      isAuthenticated: !!loadStoredUser(),
      authChecked: false,
      setUser: (user) => {
        if (user) {
          sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
        } else {
          sessionStorage.removeItem(SESSION_USER_KEY);
        }
        set({ user, isAuthenticated: !!user });
      },
      setAuthChecked: (checked) => set({ authChecked: checked }),
      logout: () => {
        sessionStorage.removeItem(SESSION_USER_KEY);
        set({
          user: null,
          isAuthenticated: false,
          summary: null,
          assets: [],
          manualAssets: [],
          landRecords: [],
          consents: [],
          auditLogs: [],
          hasConsent: false,
        });
      },

      // 🔹 Assets 🔹
      summary: null,
      assets: [],
      manualAssets: [],
      landRecords: [],
      isLoadingAssets: false,
      setSummary: (summary) => set({ summary }),
      setAssets: (assets) => set({ assets }),
      setManualAssets: (assets) => set({ manualAssets: assets }),
      setLandRecords: (records) => set({ landRecords: records }),
      setLoadingAssets: (loading) => set({ isLoadingAssets: loading }),

      // ── Consents ──
      consents: [],
      setConsents: (consents) => set({ consents }),
      get activeConsent() {
        const consents = get().consents;
        return consents.find((c) => c.status === 'ACTIVE') || null;
      },
      hasConsent: false,
      setHasConsent: (consent) => set({ hasConsent: consent }),

      // ── Audit ──
      auditLogs: [],
      setAuditLogs: (logs) => set({ auditLogs: logs }),

      // ── UI State ──
      sidebarOpen: true,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      dashboardFilter: 'all',
      setDashboardFilter: (f) => set({ dashboardFilter: f }),
      dashboardQuery: '',
      setDashboardQuery: (q) => set({ dashboardQuery: q }),

      unclaimedAssets: null,
      recoveryCases: null,
      setUnclaimedAssets: (assets) => set({ unclaimedAssets: assets }),
      setRecoveryCases: (cases) => set({ recoveryCases: cases }),

      netWorthData: null,
      dormantData: null,
      nomineeData: null,
      setNetWorthData: (data) => set({ netWorthData: data }),
      setDormantData: (data) => set({ dormantData: data }),
      setNomineeData: (data) => set({ nomineeData: data }),

      // ── Data Consents ──
      dataConsents: {
        banking: true,
        investments: true,
        land: true,
        engagement: true,
      },
      toggleDataConsent: (key) => set((state) => ({
        dataConsents: { ...state.dataConsents, [key]: !state.dataConsents[key] }
      })),
    }),
    {
      name: 'assetmap-store', // key in storage
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
