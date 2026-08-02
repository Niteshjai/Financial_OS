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
  async create(data: { userId: string, unclaimedAssetId: string, feePercentage: number, signedAgreement: boolean }): Promise<RecoveryRequest> {
    const asset = await UnclaimedAssetModel.findById(data.unclaimedAssetId);
    if (!asset) {
        throw new Error("Asset not found");
    }

    const estimatedFee = asset.estimatedValue * (data.feePercentage / 100);

    const result = await pool.query(`
      INSERT INTO recovery_requests (user_id, unclaimed_asset_id, fee_percentage, estimated_fee, status, signed_agreement)
      VALUES ($1, $2, $3, $4, 'In Progress', $5)
      RETURNING id, created_at
    `, [data.userId, data.unclaimedAssetId, data.feePercentage, estimatedFee, data.signedAgreement]);

    const newReq = result.rows[0];

    return {
        id: newReq.id,
        userId: data.userId,
        unclaimedAssetId: data.unclaimedAssetId,
        feePercentage: data.feePercentage,
        estimatedFee: estimatedFee,
        status: 'In Progress',
        signedAgreement: data.signedAgreement,
        createdAt: newReq.created_at,
        assetDetails: asset
    };
  },

  async findByUserId(userId: string): Promise<RecoveryRequest[]> {
    const result = await pool.query(`
      SELECT id, user_id, unclaimed_asset_id, fee_percentage, estimated_fee, status, signed_agreement, created_at
      FROM recovery_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    const requests = result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      unclaimedAssetId: row.unclaimed_asset_id,
      feePercentage: parseFloat(row.fee_percentage),
      estimatedFee: parseFloat(row.estimated_fee),
      status: row.status,
      signedAgreement: row.signed_agreement,
      createdAt: row.created_at
    }));

    const populated = await Promise.all(requests.map(async req => {
        const asset = await UnclaimedAssetModel.findById(req.unclaimedAssetId);
        return { ...req, assetDetails: asset || undefined };
    }));
    
    return populated;
  }
};
