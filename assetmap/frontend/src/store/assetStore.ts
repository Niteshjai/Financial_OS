import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AssetSummary, AssetSnapshot, LandRecord, Consent, AuditLogEntry } from '../services/assets';

// ═══════════════════════════════════════════════════════════════
// AssetMap — Zustand Global Store
// ═══════════════════════════════════════════════════════════════

interface User {
  id: string;
  name: string;
  isNewUser: boolean;
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
          landRecords: [],
          consents: [],
          auditLogs: [],
          hasConsent: false,
        });
      },

      // ── Assets ──
      summary: null,
      assets: [],
      landRecords: [],
      isLoadingAssets: false,
      setSummary: (summary) => set({ summary }),
      setAssets: (assets) => set({ assets }),
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

      // ── UI ──
      sidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'assetmap-store', // key in storage
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
