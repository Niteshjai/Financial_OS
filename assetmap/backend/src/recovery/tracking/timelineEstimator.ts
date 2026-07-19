// ═══════════════════════════════════════════════════════════════
// Timeline Estimator — Predict completion dates and progress
// ═══════════════════════════════════════════════════════════════

import { RecoveryType, RecoveryStatus, RECOVERY_CONFIGS } from '../types/recoveryTypes'

// Status weight map — how far through the process each status is
const STATUS_PROGRESS: Record<RecoveryStatus, number> = {
  pending_agreement:     0,
  agreement_signed:      5,
  documents_collecting:  10,
  documents_complete:    25,
  submitted:             40,
  under_review:          60,
  additional_docs_needed:50,
  approved:              80,
  amount_credited:       90,
  fee_collected:         95,
  completed:             100,
  rejected:              100,
  withdrawn:             100,
}

export const timelineEstimator = {

  /**
   * Estimate the completion date based on recovery type and current status.
   */
  estimateCompletion(
    recoveryType:  RecoveryType,
    status:        RecoveryStatus,
    submittedAt?:  string | null
  ): {
    estimatedDate:  string | null
    daysRemaining:  number | null
    minDays:        number
    maxDays:        number
  } {
    const config = RECOVERY_CONFIGS[recoveryType]

    if (['completed', 'rejected', 'withdrawn'].includes(status)) {
      return { estimatedDate: null, daysRemaining: 0, minDays: 0, maxDays: 0 }
    }

    const progress = STATUS_PROGRESS[status]
    const remainingPct = (100 - progress) / 100

    // If submitted, calculate from submission date
    if (submittedAt && progress >= 40) {
      const submitted = new Date(submittedAt)
      const avgRemaining = Math.round(config.avgDaysToComplete * remainingPct)
      const estimated = new Date(submitted)
      estimated.setDate(estimated.getDate() + avgRemaining)

      const now = new Date()
      const daysRemaining = Math.max(0, Math.ceil((estimated.getTime() - now.getTime()) / 86400000))

      return {
        estimatedDate:  estimated.toISOString().split('T')[0],
        daysRemaining,
        minDays:        Math.round(config.minDays * remainingPct),
        maxDays:        Math.round(config.maxDays * remainingPct),
      }
    }

    // Not yet submitted — estimate from now
    const avgDays = Math.round(config.avgDaysToComplete * remainingPct)
    const estimated = new Date()
    estimated.setDate(estimated.getDate() + avgDays)

    return {
      estimatedDate:  estimated.toISOString().split('T')[0],
      daysRemaining:  avgDays,
      minDays:        Math.round(config.minDays * remainingPct),
      maxDays:        Math.round(config.maxDays * remainingPct),
    }
  },

  /**
   * Get the progress percentage for visual progress bar.
   */
  getProgressPercentage(status: RecoveryStatus): number {
    return STATUS_PROGRESS[status] ?? 0
  },

  /**
   * Get the number of completed steps for a given status.
   */
  getCompletedSteps(
    recoveryType: RecoveryType,
    status:       RecoveryStatus
  ): { completed: number; total: number } {
    const config = RECOVERY_CONFIGS[recoveryType]
    const progress = STATUS_PROGRESS[status]
    const total = config.steps.length
    const completed = Math.round(total * progress / 100)
    return { completed: Math.min(completed, total), total }
  }
}
