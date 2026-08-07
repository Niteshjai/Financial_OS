import { api } from './api';

// ═══════════════════════════════════════════════════════════════
// Nominee Update Service — Frontend API Client
// ═══════════════════════════════════════════════════════════════

export interface NomineeInput {
  nomineeName:       string;
  nomineeDob:        string;
  relationship:      string;
  relationshipLabel?: string;
  nomineeMobile?:    string;
  nomineeEmail?:     string;
  nomineeAddress?:   string;
  nomineeAadhaar?:   string;
  isMinor:           boolean;
  guardianName?:     string;
  guardianRelation?: string;
  guardianMobile?:   string;
  allocationPct:     number;
  priorityOrder?:    number;
}

export interface MissingAccount {
  id:                 string;
  asset_class:        string;
  institution_name:   string;
  has_nominee:        boolean;
  current_value_paise: string;
  last_synced_at:     string;
}

export interface MissingSummary {
  total: number;
  byType: {
    bank:       number;
    mutualFund: number;
    equity:     number;
    epf:        number;
    nps:        number;
    insurance:  number;
  };
  totalValueAtRiskPaise: number;
}

export interface BatchTask {
  id:               string;
  institution:      string;
  type:             string;
  method:           string;
  status:           string;
  methodLabel:      string;
  isActionRequired: boolean;
  isCompleted:      boolean;
  isFailed:         boolean;
  sessionUrl:       string | null;
  completedAt:      string | null;
  verifiedAt:       string | null;
  errorMessage:     string | null;
}

export interface BatchStatus {
  batchId:           string;
  status:            string;
  totalAccounts:     number;
  completedAccounts: number;
  pendingAccounts:   number;
  failedAccounts:    number;
  progressPct:       number;
  initiatedAt:       string;
  completedAt:       string | null;
  tasks:             BatchTask[];
}

export interface GuidedSession {
  sessionUrl:      string;
  instructions:    string[];
  nominee:         any;
  institution:     string;
  institutionType: string;
}

/** Fetch accounts missing nominees */
export async function getMissingNominees(): Promise<{
  accounts: MissingAccount[];
  summary:  MissingSummary;
}> {
  const res = await api.get('/nominee/missing');
  return (res.data as any).data;
}

/** Submit nominee form and start the batch */
export async function startNomineeUpdate(nominees: NomineeInput[], assetIds?: string[]): Promise<{
  batchId: string;
  summary: any;
  tasks:   any[];
}> {
  const res = await api.post('/nominee/start', { nominees, assetIds });
  return (res.data as any).data;
}

/** Get real-time batch status */
export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  const res = await api.get(`/nominee/batch/${batchId}`);
  return (res.data as any).data;
}

/** Open a guided OTP session for a task */
export async function prepareGuidedSession(taskId: string): Promise<GuidedSession> {
  const res = await api.post(`/nominee/session/${taskId}/prepare`);
  return (res.data as any).data;
}

/** Mark a guided OTP session as completed */
export async function completeSession(taskId: string): Promise<void> {
  await api.post(`/nominee/session/${taskId}/complete`);
}

/** Get batch history */
export async function getNomineeHistory(): Promise<any[]> {
  const res = await api.get('/nominee/history');
  return (res.data as any).data.batches;
}
