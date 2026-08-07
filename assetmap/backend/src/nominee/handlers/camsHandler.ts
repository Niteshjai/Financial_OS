import { logger } from '../../utils/logger';

/**
 * CAMS Handler — Full Automation for Mutual Fund Nominee Updates
 * 
 * CAMS (Computer Age Management Services) is the RTA for most Indian mutual funds.
 * This handler calls the CAMS API to update nominees across all folios in one shot.
 * 
 * Register at: https://www.camsonline.com/Investors/CAMS-API
 * API key provided after AMFI approval.
 */

const CAMS_BASE    = process.env.CAMS_API_URL ?? 'https://api.camsonline.com/v1';
const CAMS_API_KEY = process.env.CAMS_API_KEY ?? '';
const CAMS_SECRET  = process.env.CAMS_API_SECRET ?? '';

export interface CAMSNominee {
  name:          string;
  dob:           string; // DD/MM/YYYY
  relation:      string;
  allocationPct: number;
  isMinor:       boolean;
  guardianName?: string;
}

// Map AssetMap relationship to CAMS relationship codes
function mapRelationshipToCAMS(rel: string): string {
  const map: Record<string, string> = {
    spouse:        'SPOUSE',
    son:           'SON',
    daughter:      'DAUGHTER',
    father:        'FATHER',
    mother:        'MOTHER',
    brother:       'BROTHER',
    sister:        'SISTER',
    grandson:      'GRANDSON',
    granddaughter: 'GRANDDAUGHTER',
    other:         'OTHERS',
  };
  return map[rel.toLowerCase()] ?? 'OTHERS';
}

export const camsHandler = {

  /**
   * Update nominee for all mutual fund folios via CAMS API.
   * This is the ONLY institution where true silent automation is legally possible.
   */
  async updateNominee(
    pan:     string,
    folios:  string[],
    nominee: CAMSNominee
  ): Promise<any> {
    if (!CAMS_API_KEY || !CAMS_SECRET) {
      logger.warn('CAMS API credentials not configured — skipping auto update');
      return { success: false, reason: 'CAMS_NOT_CONFIGURED' };
    }

    // Format DOB for CAMS (DD/MM/YYYY)
    const [yyyy, mm, dd] = nominee.dob.split('-');
    const formattedDob   = `${dd}/${mm}/${yyyy}`;

    const payload = {
      pan,
      folios: folios.length > 0 ? folios : ['ALL'],
      nominees: [{
        name:         nominee.name,
        dob:          formattedDob,
        relationship: mapRelationshipToCAMS(nominee.relation),
        percentage:   nominee.allocationPct,
        is_minor:     nominee.isMinor,
        guardian:     nominee.isMinor ? {
          name:     nominee.guardianName,
          relation: 'Guardian',
        } : undefined,
      }],
    };

    try {
      // Dynamic import to avoid startup failure if axios isn't loaded
      const axios = (await import('axios')).default;

      const response = await axios.post(
        `${CAMS_BASE}/nominee/update`,
        payload,
        {
          headers: {
            'X-API-Key':    CAMS_API_KEY,
            'X-API-Secret': CAMS_SECRET,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      logger.info('CAMS nominee update submitted', {
        folios: folios.length,
        status: response.status,
      });

      return response.data;
    } catch (error: any) {
      logger.error('CAMS nominee update failed', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`CAMS API error: ${error.response?.data?.message ?? error.message}`);
    }
  },
};
