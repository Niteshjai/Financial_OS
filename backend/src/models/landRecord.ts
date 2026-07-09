import { pool } from '../db/connection';
import { decryptPII } from '../utils/encryption';

// ═══════════════════════════════════════════════════════════════
// Land Record Model
// ═══════════════════════════════════════════════════════════════

export interface LandRecord {
  id: string;
  userId: string;
  state: string;
  district: string;
  surveyNumber: string | null;
  ownerName: string;
  areaSqft: number;
  registrationDate: string | null;
  source: 'SUREPASS' | 'MANUAL';
  fetchedAt: string;
}

export const LandRecordModel = {
  async findByUserId(userId: string): Promise<LandRecord[]> {
    if (process.env.MOCK_MODE === 'true') {
      return [
        {
          id: 'mock-land-1',
          userId,
          ownerName: 'Arjun Mock User',
          state: 'Karnataka',
          district: 'Bengaluru Urban',
          surveyNumber: 'SY-123/4',
          areaSqft: 2400,
          registrationDate: null,
          source: 'MANUAL',
          fetchedAt: new Date().toISOString()

        }
      ];
    }
    const result = await pool.query(
      'SELECT * FROM land_records WHERE user_id = $1 ORDER BY state, district',
      [userId]
    );
    return result.rows.map(mapRow);
  },

  async deleteByUserId(userId: string): Promise<number> {
    const result = await pool.query('DELETE FROM land_records WHERE user_id = $1', [userId]);
    return result.rowCount || 0;
  },
};

function mapRow(row: any): LandRecord {
  return {
    id: row.id,
    userId: row.user_id,
    state: row.state,
    district: row.district,
    surveyNumber: row.survey_number,
    ownerName: row.owner_name_encrypted ? decryptPII(row.owner_name_encrypted) : 'N/A',
    areaSqft: parseFloat(row.area_sqft || '0'),
    registrationDate: row.registration_date,
    source: row.source,
    fetchedAt: row.fetched_at,
  };
}
