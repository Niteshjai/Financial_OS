import { api, type ApiResponse } from './api';

export interface UnclaimedAsset {
  id: string;
  userId: string;
  type: string;
  estimatedValue: number;
  sourceInstitution: string;
  status: 'Identified' | 'Recovery in Progress' | 'Recovered' | 'Ignored';
  createdAt?: string;
}

export interface RecoveryRequest {
  id: string;
  userId: string;
  unclaimedAssetId: string;
  feePercentage: number;
  estimatedFee: number;
  status: string;
  signedAgreement: boolean;
  createdAt?: string;
  assetDetails?: UnclaimedAsset;
}

export async function getUnclaimedAssets() {
  const res = await api.get<ApiResponse<UnclaimedAsset[]>>('/unclaimed/assets');
  return res.data.data!;
}

export async function getRecoveryRequests() {
  const res = await api.get<ApiResponse<RecoveryRequest[]>>('/recovery/requests');
  return res.data.data!;
}

export async function initiateRecovery(unclaimedAssetId: string, feePercentage: number, signedAgreement: boolean) {
  const res = await api.post<ApiResponse<RecoveryRequest>>('/recovery/requests', {
    unclaimedAssetId,
    feePercentage,
    signedAgreement
  });
  return res.data.data!;
}
