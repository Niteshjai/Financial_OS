import { pool } from '../db/connection';

export interface UnclaimedAsset {
  id: string;
  userId: string;
  type: string;
  estimatedValue: number;
  sourceInstitution: string;
  status: 'Identified' | 'Recovery in Progress' | 'Recovered' | 'Ignored';
  createdAt?: string;
}

export const UnclaimedAssetModel = {
  async findByUserId(userId: string): Promise<UnclaimedAsset[]> {
    if (process.env.MOCK_MODE === 'true' || true) { // Force mock mode for this feature as requested
      return [
        {
          id: 'mock-ua-1',
          userId,
          type: 'Provident Fund (EPFO)',
          estimatedValue: 250000,
          sourceInstitution: 'Previous Employer XYZ Pvt Ltd',
          status: 'Identified',
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock-ua-2',
          userId,
          type: 'Forgotten Mutual Fund',
          estimatedValue: 75000,
          sourceInstitution: 'HDFC AMC',
          status: 'Identified',
          createdAt: new Date().toISOString()
        }
      ];
    }
    
    // Real DB implementation (future)
    const result = await pool.query(
      'SELECT * FROM unclaimed_assets WHERE user_id = $1',
      [userId]
    );
    return result.rows.map(mapRow);
  },
  
  async findById(id: string): Promise<UnclaimedAsset | null> {
      if (process.env.MOCK_MODE === 'true' || true) {
        if (id === 'mock-ua-1') {
            return {
              id: 'mock-ua-1',
              userId: 'mock-user',
              type: 'Provident Fund (EPFO)',
              estimatedValue: 250000,
              sourceInstitution: 'Previous Employer XYZ Pvt Ltd',
              status: 'Identified',
              createdAt: new Date().toISOString()
            }
        }
        if (id === 'mock-ua-2') {
            return {
              id: 'mock-ua-2',
              userId: 'mock-user',
              type: 'Forgotten Mutual Fund',
              estimatedValue: 75000,
              sourceInstitution: 'HDFC AMC',
              status: 'Identified',
              createdAt: new Date().toISOString()
            }
        }
        return null;
      }
      return null;
  }
};

function mapRow(row: any): UnclaimedAsset {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.asset_type,
    estimatedValue: parseFloat(row.estimated_value),
    sourceInstitution: row.source_institution,
    status: row.status,
    createdAt: row.created_at
  };
}
