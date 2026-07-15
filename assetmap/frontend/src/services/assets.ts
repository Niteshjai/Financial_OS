import { api, type ApiResponse } from './api';

// ─── Types ───

export interface AssetSnapshot {
  id: string;
  fiType: string;
  institutionName: string;
  accountRef: string;
  balance: number;
  currency: string;
  fetchedAt: string;
}

export interface AssetSummary {
  totalNetWorth: number;
  currency: string;
  categoryBreakdown: { fiType: string; label: string; totalValue: number; count: number }[];
  lastFetchedAt: string | null;
  landRecordCount: number;
  estimatedLandValue: number;
  totalWithLand: number;
}

export interface LandRecord {
  id: string;
  state: string;
  district: string;
  surveyNumber: string | null;
  ownerName: string;
  areaSqft: number;
  registrationDate: string | null;
  source: string;
}

export interface Consent {
  id: string;
  consentId: string;
  fiTypes: string[];
  purpose: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  status: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actionDescription: string;
  entityType: string | null;
  timestamp: string;
  ipAddress: string | null;
}

// ─── API Calls ───

export async function getAssetSummary() {
  const res = await api.get<ApiResponse<AssetSummary>>('/assets/summary');
  return res.data.data!;
}

export async function getFinancialAssets() {
  const res = await api.get<ApiResponse<{ assets: AssetSnapshot[] }>>('/assets/financial');
  return res.data.data!.assets;
}

export async function refreshAssets() {
  const res = await api.post<ApiResponse<{ message: string; summary: AssetSummary }>>('/assets/refresh', {});
  return res.data.data!;
}

export async function getLandRecords() {
  const res = await api.get<ApiResponse<{ records: LandRecord[] }>>('/assets/land');
  return res.data.data!.records;
}

export async function searchLand(params: { name?: string; state: string; district?: string; pan?: string }) {
  const res = await api.post<ApiResponse<{ records: LandRecord[]; manualUploadRequired: boolean; message: string }>>(
    '/assets/land/search',
    params
  );
  return res.data.data!;
}

export async function getConsents() {
  const res = await api.get<ApiResponse<Consent[]>>('/consent');
  return res.data.data!;
}

export async function createConsent(data: {
  fiTypes: string[];
  purpose: string;
  dateRangeStart: string;
  dateRangeEnd: string;
}) {
  const res = await api.post<ApiResponse<{ consentId: string; redirectUrl: string; status: string }>>(
    '/consent/create',
    data
  );
  return res.data.data!;
}

export async function revokeConsent(consentId: string) {
  await api.delete(`/consent/${consentId}`);
}

export async function getAuditLog(page = 1, limit = 20) {
  const res = await api.get<ApiResponse<{ logs: AuditLogEntry[]; total: number; page: number; totalPages: number }>>(
    `/reports/audit-log`,
    { params: { page, limit } }
  );
  return res.data.data!;
}

export async function generateReport() {
  const res = await api.get('/reports/generate', { responseType: 'blob' });
  return res.data;
}

export async function fileEstate(formData: FormData) {
  const res = await api.post<ApiResponse<{ caseId: string; status: string; message: string }>>(
    '/estate/file',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data!;
}
