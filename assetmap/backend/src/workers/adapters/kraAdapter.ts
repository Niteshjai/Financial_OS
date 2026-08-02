import { NomineeJobPayload } from '../nomineeQueue';
import { logger } from '../../utils/logger';
import { pool } from '../../db/connection';
import axios from 'axios';

export async function processKRANomination(payload: NomineeJobPayload) {
  logger.info(`[Adapter B] Processing Demat/KRA nomination for ${payload.assetRef}`);
  
  // 1. Map Unified JSON to CVL/NDML KRA Schema
  const kraPayload = {
    dematAccountId: payload.assetRef,
    kycUpdates: {
      nominationDetails: payload.nominees.map((n: any) => ({
        fullName: n.name,
        dateOfBirth: n.dob,
        relation: n.relationship,
        share: n.allocationPercentage,
        guardianInfo: n.guardianName ? { name: n.guardianName, relation: n.guardianRelationship } : null
      }))
    }
  };

  logger.info(`[Adapter B] Transformed payload for KRA: ${JSON.stringify(kraPayload)}`);

  // 3. Mock Axios POST to KRA API
  try {
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));
    
    // Assume KRA returns a 200 with an async reference number
    const kraRefNumber = `KRA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    logger.info(`[Adapter B] KRA accepted the request. Tracking Ref: ${kraRefNumber}`);

    // Update DB to PENDING_RTA (Waiting for Webhook callback)
    await pool.query('UPDATE nomination_requests SET status = $1, tracking_id = $2, updated_at = NOW() WHERE id = $3', ['PENDING_RTA', kraRefNumber, payload.requestId]);

  } catch (error) {
    logger.error(`[Adapter B] Failed to send to KRA`, { error });
    throw error;
  }
}
