import { pool } from '../db/connection';
import { encryptPII, decryptPII, hashAadhaar } from '../utils/encryption';
import { logger } from '../utils/logger';
import { auditLogger } from '../services/auditLogger';
import { camsHandler } from './handlers/camsHandler';
import { epfoHandler } from './handlers/epfoHandler';
import { npsHandler } from './handlers/npsHandler';
import { bankHandler } from './handlers/bankHandler';
import { insuranceHandler } from './handlers/insuranceHandler';
import { dematHandler } from './handlers/dematHandler';
import { nomineeNotifier } from './notifications/nomineeNotifier';

// ═══════════════════════════════════════════════════════════════
// Nominee Orchestrator — "Fill Once, Update Everywhere"
//
// Main coordinator for the nominee update system.
// User fills ONE form → system handles 6+ institutions.
// ═══════════════════════════════════════════════════════════════

export interface NomineeInput {
  nomineeName:       string;
  nomineeDob:        string; // YYYY-MM-DD
  relationship:      string;
  relationshipLabel?: string;
  nomineeMobile?:    string;
  nomineeEmail?:     string;
  nomineeAddress?:   string;
  nomineeAadhaar?:   string; // optional — only hash stored
  isMinor:           boolean;
  guardianName?:     string;
  guardianRelation?: string;
  guardianMobile?:   string;
  allocationPct:     number;
  priorityOrder:     number;
}

// Map AA asset class → institution type
const ASSET_CLASS_TO_TYPE: Record<string, string> = {
  BANK_ACCOUNT:     'bank',
  FIXED_DEPOSIT:    'bank',
  MUTUAL_FUND:      'mutual_fund',
  EQUITY:           'demat',
  NPS:              'nps',
  EPF:              'epfo',
  PPF:              'bank',
  INSURANCE_LIFE:   'insurance',
  INSURANCE_HEALTH: 'insurance',
};

/** Determine update method per institution type */
function getUpdateMethod(
  institutionType: string,
  institutionName: string
): 'full_auto' | 'guided_otp' | 'form_email' | 'manual_branch' {
  if (institutionType === 'mutual_fund') return 'full_auto';
  if (institutionType === 'epfo')        return 'guided_otp';
  if (institutionType === 'nps')         return 'guided_otp';
  if (institutionType === 'demat')       return 'guided_otp';
  if (institutionType === 'bank')        return bankHandler.getUpdateMethod(institutionName);
  if (institutionType === 'insurance')   return 'form_email';
  return 'manual_branch';
}

/** Build guided session URL + instructions per institution type */
function buildSession(
  institutionType: string,
  institutionName: string
): { sessionUrl: string; instructions: string[] } {
  switch (institutionType) {
    case 'epfo':  return epfoHandler.prepareSession();
    case 'nps':   return npsHandler.prepareSession();
    case 'bank':  return bankHandler.prepareSession(institutionName);
    case 'demat': return dematHandler.prepareSession(institutionName);
    default:
      return {
        sessionUrl: `https://www.google.com/search?q=${encodeURIComponent(institutionName + ' nominee update')}`,
        instructions: [
          'Log in to the institution portal',
          'Navigate to the nominee update section',
          'Enter the nominee details shown below',
          'Complete OTP verification',
        ],
      };
  }
}

// ─────────────────────────────────────────────
// Timeline helper
// ─────────────────────────────────────────────
async function logTaskEvent(
  taskId:      string,
  userId:      string,
  event:       string,
  description: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO nominee_task_timeline (task_id, user_id, event, description)
       VALUES ($1, $2, $3, $4)`,
      [taskId, userId, event, description]
    );
  } catch (err) {
    logger.error('Failed to log task event', { taskId, event, error: (err as Error).message });
  }
}

// ─────────────────────────────────────────────
// Batch count updater
// ─────────────────────────────────────────────
async function updateBatchCounts(batchId: string): Promise<void> {
  await pool.query(`
    UPDATE nominee_update_batches SET
      completed_accounts = (
        SELECT COUNT(*) FROM nominee_update_tasks
        WHERE batch_id = $1
        AND status IN ('auto_submitted','user_completed','form_sent','verified')
      ),
      failed_accounts = (
        SELECT COUNT(*) FROM nominee_update_tasks
        WHERE batch_id = $1 AND status = 'failed'
      ),
      pending_accounts = (
        SELECT COUNT(*) FROM nominee_update_tasks
        WHERE batch_id = $1
        AND status IN ('pending','session_opened')
      ),
      status = CASE
        WHEN (SELECT COUNT(*) FROM nominee_update_tasks
              WHERE batch_id = $1
              AND status NOT IN ('auto_submitted','user_completed',
                                 'form_sent','verified','failed','skipped')
             ) = 0 THEN 'completed'
        WHEN (SELECT COUNT(*) FROM nominee_update_tasks
              WHERE batch_id = $1
              AND status IN ('auto_submitted','user_completed',
                             'form_sent','verified')
             ) > 0 THEN 'partial'
        ELSE 'processing'
      END,
      completed_at = CASE
        WHEN (SELECT COUNT(*) FROM nominee_update_tasks
              WHERE batch_id = $1
              AND status NOT IN ('auto_submitted','user_completed',
                                 'form_sent','verified','failed','skipped')
             ) = 0 THEN NOW()
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = $1
  `, [batchId]);
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

export const nomineeOrchestrator = {

  // ─────────────────────────────────────────────
  // Step 1: Save nominee profile(s)
  // ─────────────────────────────────────────────
  async saveNomineeProfile(
    userId: string,
    input:  NomineeInput
  ): Promise<string> {
    const aadhaarHash = input.nomineeAadhaar
      ? hashAadhaar(input.nomineeAadhaar)
      : null;

    const result = await pool.query(`
      INSERT INTO nominee_profiles (
        user_id,
        nominee_name_enc, nominee_dob_enc,
        relationship, relationship_label,
        nominee_mobile_enc, nominee_email_enc,
        nominee_address_enc, nominee_aadhaar_hash,
        is_minor, guardian_name_enc,
        guardian_relation, guardian_mobile_enc,
        allocation_pct, priority_order
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )
      RETURNING id
    `, [
      userId,
      encryptPII(input.nomineeName),
      encryptPII(input.nomineeDob),
      input.relationship,
      input.relationshipLabel ?? null,
      input.nomineeMobile  ? encryptPII(input.nomineeMobile)  : null,
      input.nomineeEmail   ? encryptPII(input.nomineeEmail)   : null,
      input.nomineeAddress ? encryptPII(input.nomineeAddress) : null,
      aadhaarHash,
      input.isMinor,
      input.guardianName   ? encryptPII(input.guardianName)   : null,
      input.guardianRelation ?? null,
      input.guardianMobile ? encryptPII(input.guardianMobile) : null,
      input.allocationPct,
      input.priorityOrder,
    ]);

    return result.rows[0].id;
  },

  // ─────────────────────────────────────────────
  // Step 2: Create batch + tasks
  // ─────────────────────────────────────────────
  async createBatch(
    userId:            string,
    nomineeProfileIds: string[],
    assetIds?:         string[]
  ): Promise<{
    batchId:     string;
    tasks:       any[];
    autoCount:   number;
    guidedCount: number;
    formCount:   number;
    manualCount: number;
  }> {
    let query = `
      SELECT
        id, asset_class, institution_name,
        account_ref_enc, folio_number_enc,
        has_nominee, nominee_name_enc
      FROM canonical_assets
      WHERE user_id = $1
      AND is_active = true
      AND (has_nominee = false OR has_nominee IS NULL)
      AND asset_class IN (
        'BANK_ACCOUNT','FIXED_DEPOSIT',
        'MUTUAL_FUND','EQUITY',
        'NPS','INSURANCE_LIFE',
        'INSURANCE_HEALTH','EPF','PPF'
      )
    `;
    const params: any[] = [userId];

    if (assetIds && assetIds.length > 0) {
      query += ` AND id = ANY($2)`;
      params.push(assetIds);
    }

    query += ` ORDER BY asset_class, institution_name`;

    const accounts = await pool.query(query, params);

    if (!accounts.rows.length) {
      throw new Error('No accounts found missing nominees.');
    }

    // Create batch
    const batchResult = await pool.query(`
      INSERT INTO nominee_update_batches (
        user_id, nominee_profile_ids,
        status, total_accounts, pending_accounts
      ) VALUES ($1, $2, 'processing', $3, $3)
      RETURNING id
    `, [userId, nomineeProfileIds, accounts.rows.length]);

    const batchId = batchResult.rows[0].id;
    const tasks: any[]   = [];
    let autoCount   = 0;
    let guidedCount = 0;
    let formCount   = 0;
    let manualCount = 0;

    for (const account of accounts.rows) {
      const institutionType = ASSET_CLASS_TO_TYPE[account.asset_class] ?? 'bank';
      const updateMethod    = getUpdateMethod(institutionType, account.institution_name ?? '');

      if (updateMethod === 'full_auto')       autoCount++;
      else if (updateMethod === 'guided_otp') guidedCount++;
      else if (updateMethod === 'form_email') formCount++;
      else                                    manualCount++;

      const preNominee = account.nominee_name_enc
        ? decryptPII(account.nominee_name_enc)
        : null;

      const taskResult = await pool.query(`
        INSERT INTO nominee_update_tasks (
          batch_id, user_id,
          canonical_asset_id, institution_name,
          institution_type, account_ref_enc,
          folio_number_enc, update_method, status,
          pre_update_nominee
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)
        RETURNING id
      `, [
        batchId, userId,
        account.id,
        account.institution_name,
        institutionType,
        account.account_ref_enc ?? null,
        account.folio_number_enc ?? null,
        updateMethod,
        preNominee,
      ]);

      tasks.push({
        id:              taskResult.rows[0].id,
        institutionName: account.institution_name,
        institutionType,
        updateMethod,
        assetClass:      account.asset_class,
      });
    }

    await auditLogger.log(
      userId, 'NOMINEE_BATCH_CREATED' as any, 'nominee_batch', batchId
    );

    return { batchId, tasks, autoCount, guidedCount, formCount, manualCount };
  },

  // ─────────────────────────────────────────────
  // Step 3: Run all full_auto tasks (CAMS MF)
  // ─────────────────────────────────────────────
  async runAutoTasks(
    batchId: string,
    userId:  string
  ): Promise<{ succeeded: number; failed: number }> {
    const tasks = await pool.query(`
      SELECT * FROM nominee_update_tasks
      WHERE batch_id = $1
      AND update_method = 'full_auto'
      AND status = 'pending'
    `, [batchId]);

    if (!tasks.rows.length) return { succeeded: 0, failed: 0 };

    let succeeded = 0;
    let failed    = 0;

    // Get nominee profile
    const batch = await pool.query(
      'SELECT nominee_profile_ids FROM nominee_update_batches WHERE id = $1',
      [batchId]
    );
    const profileId = batch.rows[0].nominee_profile_ids[0];
    const profile   = await pool.query(
      'SELECT * FROM nominee_profiles WHERE id = $1',
      [profileId]
    );
    const p = profile.rows[0];

    const nominee = {
      name:          decryptPII(p.nominee_name_enc),
      dob:           decryptPII(p.nominee_dob_enc),
      relation:      p.relationship,
      allocationPct: p.allocation_pct,
      isMinor:       p.is_minor,
      guardianName:  p.guardian_name_enc ? decryptPII(p.guardian_name_enc) : undefined,
    };

    // Get user PAN
    const userResult = await pool.query(
      'SELECT pan_encrypted FROM users WHERE id = $1',
      [userId]
    );
    const pan = userResult.rows[0]?.pan_encrypted
      ? decryptPII(userResult.rows[0].pan_encrypted)
      : '';

    // Get all folio numbers
    const folios = tasks.rows
      .filter(t => t.folio_number_enc)
      .map(t => decryptPII(t.folio_number_enc))
      .filter(Boolean);

    try {
      const result = await camsHandler.updateNominee(pan, folios, nominee);

      for (const task of tasks.rows) {
        await pool.query(`
          UPDATE nominee_update_tasks
          SET status = 'auto_submitted',
              api_response = $2,
              updated_at = NOW()
          WHERE id = $1
        `, [task.id, JSON.stringify(result)]);

        await logTaskEvent(task.id, userId,
          'AUTO_SUBMITTED',
          `CAMS API nominee update submitted for ${task.institution_name}`
        );
        succeeded++;
      }
    } catch (err: any) {
      for (const task of tasks.rows) {
        await pool.query(`
          UPDATE nominee_update_tasks
          SET status = 'failed',
              error_message = $2,
              updated_at = NOW()
          WHERE id = $1
        `, [task.id, err.message]);

        await logTaskEvent(task.id, userId, 'FAILED', err.message);
        failed++;
      }
    }

    await updateBatchCounts(batchId);
    return { succeeded, failed };
  },

  // ─────────────────────────────────────────────
  // Step 4: Prepare guided OTP session
  // ─────────────────────────────────────────────
  async prepareGuidedSession(
    taskId: string,
    userId: string
  ): Promise<{
    sessionUrl:   string;
    instructions: string[];
    nominee:      any;
    institution:  string;
    institutionType: string;
  }> {
    const task = await pool.query(
      'SELECT * FROM nominee_update_tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (!task.rows[0]) throw new Error('Task not found');
    const t = task.rows[0];

    // Get nominee profile
    const batch = await pool.query(
      'SELECT nominee_profile_ids FROM nominee_update_batches WHERE id = $1',
      [t.batch_id]
    );
    const profileId = batch.rows[0].nominee_profile_ids[0];
    const profile   = await pool.query(
      'SELECT * FROM nominee_profiles WHERE id = $1',
      [profileId]
    );
    const p = profile.rows[0];

    const nominee = {
      name:          decryptPII(p.nominee_name_enc),
      dob:           decryptPII(p.nominee_dob_enc),
      relationship:  p.relationship,
      relationLabel: p.relationship_label,
      mobile:        p.nominee_mobile_enc ? decryptPII(p.nominee_mobile_enc) : null,
      isMinor:       p.is_minor,
      guardianName:  p.guardian_name_enc ? decryptPII(p.guardian_name_enc) : null,
      allocationPct: p.allocation_pct,
    };

    const session = buildSession(t.institution_type, t.institution_name);

    // Mark session as opened
    await pool.query(`
      UPDATE nominee_update_tasks
      SET status = 'session_opened',
          session_url = $2,
          session_expires_at = NOW() + INTERVAL '30 minutes',
          user_opened_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [taskId, session.sessionUrl]);

    await logTaskEvent(taskId, userId,
      'SESSION_OPENED',
      `Guided session opened for ${t.institution_name}`
    );

    return {
      ...session,
      nominee,
      institution:     t.institution_name,
      institutionType: t.institution_type,
    };
  },

  // ─────────────────────────────────────────────
  // Step 5: Mark session completed
  // ─────────────────────────────────────────────
  async markSessionCompleted(
    taskId: string,
    userId: string
  ): Promise<void> {
    await pool.query(`
      UPDATE nominee_update_tasks
      SET status = 'user_completed',
          user_completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [taskId, userId]);

    const task = await pool.query(
      'SELECT batch_id, institution_name FROM nominee_update_tasks WHERE id = $1',
      [taskId]
    );

    await logTaskEvent(taskId, userId,
      'USER_COMPLETED',
      `User confirmed nominee update at ${task.rows[0]?.institution_name}`
    );

    await updateBatchCounts(task.rows[0]?.batch_id);

    await nomineeNotifier.send(userId, {
      channel: 'push',
      title:   'Nominee updated ✓',
      body:    `Nominee updated at ${task.rows[0]?.institution_name}`,
    });
  },

  // ─────────────────────────────────────────────
  // Step 6: Process insurance tasks (form + email)
  // ─────────────────────────────────────────────
  async processInsuranceTasks(
    batchId: string,
    userId:  string
  ): Promise<void> {
    const tasks = await pool.query(`
      SELECT * FROM nominee_update_tasks
      WHERE batch_id = $1
      AND update_method = 'form_email'
      AND status = 'pending'
    `, [batchId]);

    if (!tasks.rows.length) return;

    // Get nominee profile
    const batch = await pool.query(
      'SELECT nominee_profile_ids FROM nominee_update_batches WHERE id = $1',
      [batchId]
    );
    const profileId = batch.rows[0].nominee_profile_ids[0];
    const profile   = await pool.query(
      'SELECT * FROM nominee_profiles WHERE id = $1',
      [profileId]
    );
    const p = profile.rows[0];

    const nominee = {
      name:          decryptPII(p.nominee_name_enc),
      dob:           decryptPII(p.nominee_dob_enc),
      relationship:  p.relationship_label ?? p.relationship,
      allocationPct: p.allocation_pct,
    };

    // Get user details
    const userResult = await pool.query(
      `SELECT name_encrypted, mobile_encrypted, email_encrypted, pan_encrypted
       FROM users WHERE id = $1`,
      [userId]
    );
    const u = userResult.rows[0];
    const user = {
      name:   u.name_encrypted   ? decryptPII(u.name_encrypted)   : 'User',
      mobile: u.mobile_encrypted ? decryptPII(u.mobile_encrypted) : '',
      email:  u.email_encrypted  ? decryptPII(u.email_encrypted)  : '',
      pan:    u.pan_encrypted    ? decryptPII(u.pan_encrypted)    : '',
    };

    for (const task of tasks.rows) {
      try {
        const policyNo = task.account_ref_enc
          ? decryptPII(task.account_ref_enc)
          : 'Please fill in';

        const result = await insuranceHandler.generateAndSendForm(
          user, nominee, policyNo, task.institution_name
        );

        await pool.query(`
          UPDATE nominee_update_tasks
          SET status = 'form_sent',
              email_sent_at = NOW(),
              email_message_id = $2,
              updated_at = NOW()
          WHERE id = $1
        `, [task.id, result.messageId]);

        await logTaskEvent(task.id, userId,
          'FORM_SENT',
          `Nominee change form emailed to ${task.institution_name}`
        );
      } catch (err: any) {
        await pool.query(`
          UPDATE nominee_update_tasks
          SET status = 'failed', error_message = $2, updated_at = NOW()
          WHERE id = $1
        `, [task.id, err.message]);
      }
    }

    await updateBatchCounts(batchId);
  },

  // ─────────────────────────────────────────────
  // Get batch status for frontend
  // ─────────────────────────────────────────────
  async getBatchStatus(
    batchId: string,
    userId:  string
  ): Promise<any> {
    const [batchResult, tasksResult] = await Promise.all([
      pool.query(
        'SELECT * FROM nominee_update_batches WHERE id = $1 AND user_id = $2',
        [batchId, userId]
      ),
      pool.query(`
        SELECT
          id, institution_name, institution_type,
          update_method, status,
          session_url, user_opened_at, user_completed_at,
          email_sent_at, verified_at, error_message,
          created_at, updated_at
        FROM nominee_update_tasks
        WHERE batch_id = $1
        ORDER BY
          CASE update_method
            WHEN 'full_auto'  THEN 1
            WHEN 'guided_otp' THEN 2
            WHEN 'form_email' THEN 3
            ELSE 4
          END,
          institution_name
      `, [batchId]),
    ]);

    if (!batchResult.rows[0]) throw new Error('Batch not found');

    const batch = batchResult.rows[0];
    const tasks = tasksResult.rows;

    return {
      batchId,
      status:            batch.status,
      totalAccounts:     batch.total_accounts,
      completedAccounts: batch.completed_accounts,
      pendingAccounts:   batch.pending_accounts,
      failedAccounts:    batch.failed_accounts,
      progressPct:       batch.total_accounts > 0
        ? Math.round(batch.completed_accounts / batch.total_accounts * 100)
        : 0,
      initiatedAt:       batch.initiated_at,
      completedAt:       batch.completed_at,
      tasks: tasks.map(t => ({
        id:               t.id,
        institution:      t.institution_name,
        type:             t.institution_type,
        method:           t.update_method,
        status:           t.status,
        methodLabel:      t.update_method === 'full_auto'   ? 'Automatic'       :
                          t.update_method === 'guided_otp'  ? 'Needs 1 OTP'     :
                          t.update_method === 'form_email'  ? 'Form emailed'    :
                          'Branch visit needed',
        isActionRequired: t.status === 'pending' && t.update_method === 'guided_otp',
        isCompleted:      ['auto_submitted', 'user_completed', 'form_sent', 'verified'].includes(t.status),
        isFailed:         t.status === 'failed',
        sessionUrl:       t.session_url,
        completedAt:      t.user_completed_at ?? t.email_sent_at,
        verifiedAt:       t.verified_at,
        errorMessage:     t.error_message,
      })),
    };
  },

  // ─────────────────────────────────────────────
  // Get user's batch history
  // ─────────────────────────────────────────────
  async getBatchHistory(userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT id, status, total_accounts, completed_accounts,
             failed_accounts, pending_accounts,
             initiated_at, completed_at
      FROM nominee_update_batches
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);
    return result.rows;
  },
};
