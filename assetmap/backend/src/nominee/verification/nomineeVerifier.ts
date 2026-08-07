import { pool } from '../../db/connection';
import { decryptPII } from '../../utils/encryption';
import { logger } from '../../utils/logger';
import { nomineeNotifier } from '../notifications/nomineeNotifier';

/**
 * Nominee Verifier — 30-Day AA Data Re-check
 * 
 * After a nominee update is completed, we schedule a re-verification
 * by checking if the AA (Account Aggregator) data now shows a nominee
 * registered for that account. Uses exponential backoff.
 */

export const nomineeVerifier = {

  /** Called by nightly cron — checks AA data for completed nominations */
  async verifyPendingTasks(): Promise<{ verified: number; retried: number }> {
    const tasks = await pool.query(`
      SELECT
        t.id, t.batch_id, t.user_id, t.institution_name,
        t.canonical_asset_id, t.verification_attempts,
        t.status,
        ca.has_nominee,
        ca.nominee_name_enc AS current_nominee_enc
      FROM nominee_update_tasks t
      LEFT JOIN canonical_assets ca ON ca.id = t.canonical_asset_id
      WHERE t.status IN ('auto_submitted', 'user_completed', 'form_sent')
      AND t.next_verify_at <= NOW()
      AND t.verification_attempts < 5
      ORDER BY t.next_verify_at ASC
      LIMIT 200
    `);

    let verified = 0;
    let retried  = 0;

    for (const task of tasks.rows) {
      try {
        const result = await this.verifyTask(task);
        if (result) verified++;
        else retried++;

        // Throttle — avoid hammering database
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        logger.error('[NomineeVerifier] Task verification failed', {
          taskId: task.id,
          error: (err as Error).message,
        });
      }
    }

    return { verified, retried };
  },

  async verifyTask(task: any): Promise<boolean> {
    const currentNomineeName = task.current_nominee_enc
      ? decryptPII(task.current_nominee_enc)
      : null;
    const hasNominee = task.has_nominee ?? false;

    if (hasNominee && currentNomineeName) {
      // ✓ Verified — AA data now shows a nominee
      await pool.query(`
        UPDATE nominee_update_tasks SET
          status = 'verified',
          post_update_nominee = $2,
          verified_at = NOW(),
          verification_attempts = verification_attempts + 1,
          updated_at = NOW()
        WHERE id = $1
      `, [task.id, currentNomineeName]);

      // Update canonical_assets
      if (task.canonical_asset_id) {
        await pool.query(`
          UPDATE canonical_assets
          SET has_nominee = true, updated_at = NOW()
          WHERE id = $1
        `, [task.canonical_asset_id]);
      }

      await nomineeNotifier.send(task.user_id, {
        channel: 'push',
        title:   '✓ Nominee confirmed',
        body:    `Nominee update verified at ${task.institution_name}`,
      });

      return true;
    }

    // Not verified yet — schedule next check with exponential backoff
    const attempts = task.verification_attempts + 1;
    const daysMap  = [30, 45, 60, 90, 120];
    const nextDays = daysMap[Math.min(attempts, daysMap.length - 1)];

    await pool.query(`
      UPDATE nominee_update_tasks SET
        verification_attempts = $2,
        next_verify_at = NOW() + INTERVAL '${nextDays} days',
        updated_at = NOW()
      WHERE id = $1
    `, [task.id, attempts]);

    // Send reminder after 2+ failed verifications
    if (attempts >= 2) {
      await nomineeNotifier.send(task.user_id, {
        channel: 'sms',
        title:   'Nominee update not confirmed',
        body:    `AssetMap: Nominee update at ${task.institution_name} not yet confirmed. Please retry or contact the institution.`,
      });
    }

    return false;
  },
};
