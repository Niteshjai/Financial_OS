import { create } from 'zustand';
import { api } from '../services/api';

export interface PlanStatus {
  planId: string;
  name: string;
  features: string[] | Record<string, boolean>;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
}

interface PlanStore {
  planStatus: PlanStatus | null;
  isLoading: boolean;
  error: string | null;
  fetchPlanStatus: () => Promise<void>;
  invalidate: () => void;
  hasFeature: (featureKey: string) => boolean;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  planStatus: null,
  isLoading: false,
  error: null,

  fetchPlanStatus: async () => {
    // Only fetch if we don't have it already (cache it) and aren't already fetching
    if (get().planStatus || get().isLoading) return;
    
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/plans/status');
      if (res.data?.success) {
        set({ planStatus: res.data.data, isLoading: false });
      } else {
        set({ error: 'Failed to load plan status', isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  // Call this after a plan upgrade/downgrade to force a fresh fetch
  invalidate: () => {
    set({ planStatus: null, isLoading: false, error: null });
  },

  hasFeature: (featureKey: string) => {
    const status = get().planStatus;
    if (!status) return false;
    if (Array.isArray(status.features)) {
      return status.features.includes(featureKey);
    }
    return !!status.features[featureKey];
  }
}));
