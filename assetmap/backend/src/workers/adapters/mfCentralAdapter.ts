import { NomineeJobPayload } from '../nomineeQueue';
import { logger } from '../../utils/logger';
import { pool } from '../../db/connection';
import axios from 'axios';

export async function processMFCentralNomination(payload: NomineeJobPayload) {
  logger.info(`[Adapter A] Processing MFCentral nomination for ${payload.assetRef}`);
  
  // 1. In a real scenario, fetch User PAN and AMC Codes
  const userRes = await pool.query('SELECT name_encrypted FROM users WHERE id = $1', [payload.userId]);
  
  // 2. Map Unified JSON to MFCentral B2B Schema
  const mfCentralPayload = {
    FolioNo: payload.assetRef,
    InvestorName: userRes.rows[0]?.name_encrypted || 'Unknown', // Ideally decrypted PAN
    Nominees: payload.nominees.map((n: any, index: number) => ({
      NomineeNumber: index + 1,
      NomineeName: n.name,
      NomineeDOB: n.dob,
      NomineeRelationship: n.relationship,
      NomineePercentage: n.allocationPercentage,
      GuardianName: n.guardianName || null,
    }))
  };

  logger.info(`[Adapter A] Transformed payload for MFCentral: ${JSON.stringify(mfCentralPayload)}`);

  // 3. Mock Axios POST to MFCentral
  try {
    // We mock this because MFCentral B2B API requires actual certs/credentials.
    // await axios.post('https://mock-mfcentral.api/v1/nominee/update', mfCentralPayload, { headers: { 'Idempotency-Key': payload.requestId } });
    
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 1000));
    
    // Assume MFCentral returns a 200 with an async reference number
    const rtaRefNumber = `MFC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    logger.info(`[Adapter A] MFCentral accepted the request. Tracking Ref: ${rtaRefNumber}`);

    // Update DB to PENDING_RTA (Waiting for Webhook callback)
    await pool.query('UPDATE nomination_requests SET status = $1, tracking_id = $2, updated_at = NOW() WHERE id = $3', ['PENDING_RTA', rtaRefNumber, payload.requestId]);

  } catch (error) {
    logger.error(`[Adapter A] Failed to send to MFCentral`, { error });
    throw error;
  }
}
