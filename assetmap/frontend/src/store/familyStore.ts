import { create } from 'zustand';
import { api } from '../services/api';

interface Member {
  id: string;
  userId: string | null;
  displayName: string;
  relationship: string;
  status: 'invited' | 'active' | 'paused' | 'removed';
  avatarColor: string;
  shareBankAccounts: boolean;
  shareFixedDeposits: boolean;
  shareMutualFunds: boolean;
  shareEquity: boolean;
  shareNps: boolean;
  shareEpf: boolean;
  shareInsurance: boolean;
  shareLand: boolean;
  shareGold: boolean;
  shareTotalNetworth: boolean;
  acceptedAt: string | null;
  invitedAt: string;
  lastSyncedAt: string | null;
}

interface Vault {
  id: string;
  primary_user_id: string;
  vault_name: string;
  max_members: number;
  is_active: boolean;
  members: Member[];
}

interface FamilyStore {
  vault: Vault | null;
  isLoading: boolean;
  netWorth: { totalPaise: number, members: any[], byAssetClass: any } | null;
  history: any[];
  goals: any[];
  estate: any | null;
  activities: any[];
  error: string | null;

  fetchVault: () => Promise<void>;
  createVault: (name: string) => Promise<void>;
  inviteMember: (mobile: string, name: string, relationship: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  leaveVault: () => Promise<void>;
  updateVisibility: (prefs: Partial<Member>) => Promise<void>;
  
  fetchNetWorth: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchGoals: () => Promise<void>;
  fetchEstate: () => Promise<void>;
  fetchActivity: () => Promise<void>;
}

export const useFamilyStore = create<FamilyStore>((set, get) => ({
  vault: null,
  isLoading: false,
  netWorth: null,
  history: [],
  goals: [],
  estate: null,
  activities: [],
  error: null,

  fetchVault: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/family/vault');
      set({ vault: data.data, isLoading: false });
    } catch (err: any) {
      set({ vault: null, isLoading: false, error: err.response?.data?.error?.message || 'Failed to load vault' });
    }
  },

  createVault: async (name) => {
    try {
      await api.post('/family/vault', { vaultName: name });
      await get().fetchVault();
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to create vault');
    }
  },

  inviteMember: async (mobile, name, relationship) => {
    try {
      await api.post('/family/invite', { mobile, name, relationship });
      await get().fetchVault();
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to invite member');
    }
  },

  removeMember: async (memberId) => {
    try {
      await api.delete(`/family/members/${memberId}`);
      await get().fetchVault();
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to remove member');
    }
  },

  leaveVault: async () => {
    try {
      await api.post('/family/leave');
      set({ vault: null });
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to leave vault');
    }
  },

  updateVisibility: async (prefs) => {
    try {
      await api.patch('/family/visibility', prefs);
      await get().fetchVault();
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to update visibility');
    }
  },

  fetchNetWorth: async () => {
    const { vault } = get();
    if (!vault) return;
    try {
      const { data } = await api.get(`/family/vault/${vault.id}/networth`);
      set({ netWorth: data.data });
    } catch (err) {
      console.error(err);
    }
  },

  fetchHistory: async () => {
    const { vault } = get();
    if (!vault) return;
    try {
      const { data } = await api.get(`/family/vault/${vault.id}/history?months=12`);
      set({ history: data.data });
    } catch (err) {
      console.error(err);
    }
  },

  fetchGoals: async () => {
    const { vault } = get();
    if (!vault) return;
    try {
      const { data } = await api.get(`/family/vault/${vault.id}/goals`);
      set({ goals: data.data });
    } catch (err) {
      console.error(err);
    }
  },

  fetchEstate: async () => {
    const { vault } = get();
    if (!vault) return;
    try {
      const { data } = await api.get(`/family/vault/${vault.id}/estate`);
      set({ estate: data.data });
    } catch (err) {
      console.error(err);
    }
  },

  fetchActivity: async () => {
    const { vault } = get();
    if (!vault) return;
    try {
      const { data } = await api.get(`/family/vault/${vault.id}/activity`);
      set({ activities: data.data });
    } catch (err) {
      console.error(err);
    }
  }
}));
