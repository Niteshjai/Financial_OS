import { Pool } from 'pg'
import { DimensionResult } from './assetStrengthScore'

export async function fraudRiskScore(
  pool: Pool,
  userId: string
): Promise<DimensionResult> {

  // Check anomalies from AI enrichment
  const anomalyResult = await pool.query(`
    SELECT COUNT(*) AS active_anomalies
    FROM canonical_assets
    WHERE user_id = $1
    AND ai_anomaly_flag = true
    AND is_active = true
  `, [userId])

  // Check agent run anomalies
  const agentAnomalies = await pool.query(`
    SELECT COUNT(*) AS unresolved,
           array_agg(anomaly_type) AS types
    FROM asset_anomalies
    WHERE user_id = $1
    AND is_resolved = false
    AND created_at > NOW() - INTERVAL '30 days'
  `, [userId])

  // Check for new accounts (recently linked)
  const newAccounts = await pool.query(`
    SELECT COUNT(*) AS new_count
    FROM canonical_assets
    WHERE user_id = $1
    AND created_at > NOW() - INTERVAL '30 days'
    AND asset_class = 'BANK_ACCOUNT'
  `, [userId])

  // Check for alerts history
  const criticalAlerts = await pool.query(`
    SELECT COUNT(*) AS critical_count
    FROM user_alerts
    WHERE user_id = $1
    AND severity = 'critical'
    AND created_at > NOW() - INTERVAL '90 days'
  `, [userId])

  const activeAnomalies   = parseInt(anomalyResult.rows[0].active_anomalies)  || 0
  const unresolvedAgentAnomalies = parseInt(agentAnomalies.rows[0].unresolved) || 0
  const newAccountCount   = parseInt(newAccounts.rows[0].new_count)            || 0
  const criticalAlertCount= parseInt(criticalAlerts.rows[0].critical_count)    || 0

  let score   = 100  // Start clean, deduct for risks
  const reasons:  string[] = []
  const warnings: string[] = []

  if (activeAnomalies === 0)
    reasons.push('No active anomaly flags on any linked account')
  else {
    score -= activeAnomalies * 20
    warnings.push(`${activeAnomalies} active anomaly flag(s) detected by AI`)
  }

  if (unresolvedAgentAnomalies > 0) {
    score -= unresolvedAgentAnomalies * 15
    warnings.push(`${unresolvedAgentAnomalies} unresolved financial anomaly alert(s)`)
  }

  if (newAccountCount >= 3) {
    score -= 15
    warnings.push(
      `${newAccountCount} new bank accounts linked in last 30 days — ` +
      `manual review recommended`
    )
  }

  if (criticalAlertCount > 0) {
    score -= criticalAlertCount * 10
    warnings.push(`${criticalAlertCount} critical security alert(s) in last 90 days`)
  }

  if (score === 100)
    reasons.push('Clean fraud risk profile — no suspicious activity detected')

  score = Math.max(0, score)

  return {
    score,
    reasons,
    warnings,
    data: {
      activeAnomalies,
      unresolvedAgentAnomalies,
      newAccountCount,
      criticalAlertCount
    }
  }
}
