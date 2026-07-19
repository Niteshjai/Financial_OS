import { pool } from '../db/connection';
import { UnclaimedAsset, UnclaimedAssetModel } from './unclaimedAsset';

export interface RecoveryRequest {
  id: string;
  userId: string;
  unclaimedAssetId: string;
  feePercentage: number;
  estimatedFee: number;
  status: 'Pending' | 'In Progress' | 'Successful' | 'Failed' | 'Paid';
  signedAgreement: boolean;
  createdAt?: string;
  assetDetails?: UnclaimedAsset;
}

export const RecoveryRequestModel = {
  // In-memory store for mocks
  mockStore: [] as RecoveryRequest[],

  async create(data: { userId: string, unclaimedAssetId: string, feePercentage: number, signedAgreement: boolean }): Promise<RecoveryRequest> {
    
    // Always mock for now as per user instruction
    const asset = await UnclaimedAssetModel.findById(data.unclaimedAssetId);
    if (!asset) {
        throw new Error("Asset not found");
    }

    const estimatedFee = asset.estimatedValue * (data.feePercentage / 100);

    const newRequest: RecoveryRequest = {
        id: `mock-req-${Date.now()}`,
        userId: data.userId,
        unclaimedAssetId: data.unclaimedAssetId,
        feePercentage: data.feePercentage,
        estimatedFee: estimatedFee,
        status: 'In Progress', // Start directly in progress for demo
        signedAgreement: data.signedAgreement,
        createdAt: new Date().toISOString()
    };
    
    this.mockStore.push(newRequest);
    return newRequest;
  },

  async findByUserId(userId: string): Promise<RecoveryRequest[]> {
    if (process.env.MOCK_MODE === 'true' || true) {
        const requests = this.mockStore.filter(req => req.userId === userId);
        
        // Populate asset details for convenience
        const populated = await Promise.all(requests.map(async req => {
            const asset = await UnclaimedAssetModel.findById(req.unclaimedAssetId);
            return { ...req, assetDetails: asset || undefined };
        }));
        
        return populated;
    }

    // Real DB implementation would go here
    return [];
  }
};
