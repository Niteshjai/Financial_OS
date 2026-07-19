// ═══════════════════════════════════════════════════════════════
// Success Fee Modal — Fee agreement with legal disclaimer
// Replaces the old RecoveryModal.tsx
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { initiateRecoveryCase, acceptFeeAgreement, formatRupees } from '../../services/recovery'
import { DollarSign, Shield, Clock, TrendingUp, X, Scale } from 'lucide-react'

interface SuccessFeeModalProps {
  asset: {
    id:                string
    type:              string
    estimatedValue:    number
    sourceInstitution: string
  }
  onClose:   () => void
  onSuccess: (caseId: string) => void
}

const LEGAL_DISCLAIMER =
  'AssetMap Recovery Services assists with document preparation and ' +
  'submission tracking. We do not provide legal advice. Recovery is ' +
  'subject to government processing timelines outside our control. ' +
  'Success fee is charged only on confirmed credit to your account.'

// Map user-facing asset types to recovery engine types
function mapAssetType(type: string): string {
  const lower = type.toLowerCase()
  if (lower.includes('epfo') || lower.includes('provident'))   return 'epf_balance'
  if (lower.includes('pension'))                                return 'epf_pension'
  if (lower.includes('mutual') || lower.includes('mf'))         return 'mutual_fund'
  if (lower.includes('share') || lower.includes('iepf'))        return 'iepf_shares'
  if (lower.includes('dividend'))                               return 'iepf_dividend'
  if (lower.includes('dormant') || lower.includes('bank'))      return 'dormant_bank'
  if (lower.includes('insurance'))                              return 'insurance_maturity'
  if (lower.includes('ppf'))                                    return 'ppf_balance'
  return 'epf_balance' // default
}

// Fee tier calculation (mirrors backend logic)
function calculateFeePreview(estimatedValue: number, recoveryType: string) {
  const configFees: Record<string, { min: number, max: number }> = {
    iepf_shares:        { min: 7, max: 10 },
    iepf_dividend:      { min: 7, max: 10 },
    epf_balance:        { min: 5, max: 7 },
    epf_pension:        { min: 5, max: 7 },
    mutual_fund:        { min: 5, max: 7 },
    dormant_bank:       { min: 5, max: 5 },
    insurance_maturity: { min: 5, max: 7 },
    ppf_balance:        { min: 5, max: 5 },
  }
  const bounds = configFees[recoveryType] || { min: 5, max: 10 }

  let feePct: number
  if (estimatedValue >= 10000000) feePct = 5.0
  else if (estimatedValue >= 1000000)  feePct = 6.0
  else if (estimatedValue >= 100000)   feePct = 7.5
  else if (estimatedValue >= 10000)    feePct = 9.0
  else feePct = 10.0

  feePct = Math.max(bounds.min, Math.min(bounds.max, feePct))

  const feeAmount = Math.round(estimatedValue * feePct / 100)
  const gst       = Math.round(feeAmount * 0.18)
  const total     = feeAmount + gst

  return { feePct, feeAmount, gst, total, netToUser: estimatedValue - total }
}

export default function SuccessFeeModal({ asset, onClose, onSuccess }: SuccessFeeModalProps) {
  const [step, setStep] = useState<'review' | 'agreement' | 'loading'>('review')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  const recoveryType = mapAssetType(asset.type)
  const fee = calculateFeePreview(asset.estimatedValue, recoveryType)

  const handleStartRecovery = async () => {
    if (!agreed) {
      setError('You must agree to the terms.')
      return
    }

    setStep('loading')
    setError('')

    try {
      // Step 1: Initiate case
      const result = await initiateRecoveryCase({
        recoveryType,
        assetDescription:    asset.type,
        institutionName:     asset.sourceInstitution,
        estimatedValuePaise: asset.estimatedValue * 100,
      })

      // Step 2: Auto-accept fee agreement
      await acceptFeeAgreement(result.caseId)

      onSuccess(result.caseId)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to start recovery')
      setStep('review')
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-zinc-200 rounded-[28px] w-full max-w-xl sm:min-w-[500px] md:min-w-[560px] shadow-2xl relative overflow-hidden">

        {/* Header */}
        <div className="p-6 pb-0 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Recover Your Asset</h2>
            <p className="text-sm text-zinc-500 mt-1">Zero upfront cost — pay only on success</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl transition">
            <X className="size-5 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Asset card */}
          <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200/60">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-zinc-900 text-[15px]">{asset.type}</p>
                <p className="text-sm text-zinc-500 mt-0.5">{asset.sourceInstitution}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Estimated Value</p>
                <p className="text-xl font-bold text-[#10b981] tracking-tight">
                  {formatRupees(asset.estimatedValue)}
                </p>
              </div>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/40 border border-amber-200/60 rounded-2xl p-5">
            <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2 text-[15px]">
              <DollarSign className="size-[18px]" strokeWidth={2.5} />
              Success-Fee Breakdown
            </h3>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-800/80">Our Success Fee</span>
                <span className="font-semibold text-amber-900">{fee.feePct}% = {formatRupees(fee.feeAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-800/80">GST (18%)</span>
                <span className="font-medium text-amber-800">{formatRupees(fee.gst)}</span>
              </div>
              <div className="border-t border-amber-200/60 pt-2.5 flex justify-between items-center">
                <span className="text-sm font-semibold text-amber-900">Total Fee</span>
                <span className="font-bold text-amber-900">{formatRupees(fee.total)}</span>
              </div>
              <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-200/50">
                <span className="text-sm font-semibold text-emerald-800">You Receive</span>
                <span className="font-bold text-emerald-700 text-lg">{formatRupees(fee.netToUser)}</span>
              </div>
            </div>

            <p className="text-xs text-amber-700/60 mt-3 text-center italic">
              Deducted only after money reaches your account.
            </p>
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
              <Shield className="size-5 text-emerald-600 mx-auto mb-1.5" strokeWidth={1.75} />
              <p className="text-[12px] font-semibold text-zinc-800">Zero Upfront</p>
              <p className="text-[11px] text-zinc-500">No payment needed</p>
            </div>
            <div className="text-center p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
              <Clock className="size-5 text-blue-600 mx-auto mb-1.5" strokeWidth={1.75} />
              <p className="text-[12px] font-semibold text-zinc-800">We Handle It</p>
              <p className="text-[11px] text-zinc-500">Forms & tracking</p>
            </div>
            <div className="text-center p-3 bg-zinc-50 rounded-xl border border-zinc-200/60">
              <TrendingUp className="size-5 text-amber-600 mx-auto mb-1.5" strokeWidth={1.75} />
              <p className="text-[12px] font-semibold text-zinc-800">Pay on Success</p>
              <p className="text-[11px] text-zinc-500">Only if recovered</p>
            </div>
          </div>

          {/* Legal disclaimer */}
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-4 flex items-start gap-3">
            <Scale className="size-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.75} />
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              {LEGAL_DISCLAIMER}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-[#10b981] focus:ring-[#10b981] cursor-pointer"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="text-[13px] text-zinc-600 leading-snug group-hover:text-zinc-900 transition">
              I agree to the success fee terms. I understand that{' '}
              <span className="font-semibold text-zinc-900">{formatRupees(fee.total)}</span>{' '}
              (incl. GST) will be charged only if the asset is successfully recovered.
            </span>
          </label>
        </div>

        {/* Footer buttons */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            disabled={step === 'loading'}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleStartRecovery}
            disabled={step === 'loading' || !agreed}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2 shadow-md"
          >
            {step === 'loading' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Start Recovery'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
