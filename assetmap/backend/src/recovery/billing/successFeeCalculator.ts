// ═══════════════════════════════════════════════════════════════
// Success Fee Calculator — Exposed as a standalone module
// Wraps the core calculateFee() with additional display helpers
// ═══════════════════════════════════════════════════════════════

import { calculateFee, RecoveryType, RECOVERY_CONFIGS, FeeCalculation } from '../types/recoveryTypes'

export const successFeeCalculator = {

  /**
   * Calculate fee with display-friendly breakdown.
   */
  calculate(
    estimatedValuePaise: number,
    recoveryType:        RecoveryType
  ): FeeCalculation & {
    display: {
      estimatedValue:  string
      feePercentage:   string
      feeAmount:       string
      gstAmount:       string
      totalAmount:     string
      netToUser:       string
    }
  } {
    const fee = calculateFee(estimatedValuePaise, recoveryType)

    return {
      ...fee,
      display: {
        estimatedValue: formatINR(estimatedValuePaise),
        feePercentage:  `${fee.feePct}%`,
        feeAmount:      formatINR(fee.feeAmountPaise),
        gstAmount:      formatINR(fee.gstPaise),
        totalAmount:    formatINR(fee.totalPaise),
        netToUser:      formatINR(estimatedValuePaise - fee.totalPaise),
      }
    }
  },

  /**
   * Get fee range for a recovery type (for display before calculation).
   */
  getFeeRange(recoveryType: RecoveryType): {
    minPct: number
    maxPct: number
    label:  string
  } {
    const config = RECOVERY_CONFIGS[recoveryType]
    return {
      minPct: config.feeMin,
      maxPct: config.feeMax,
      label:  config.feeMin === config.feeMax
        ? `${config.feeMin}%`
        : `${config.feeMin}–${config.feeMax}%`,
    }
  }
}

function formatINR(paise: number): string {
  const rupees = paise / 100
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)} Cr`
  if (rupees >= 100000)   return `₹${(rupees / 100000).toFixed(2)} L`
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
