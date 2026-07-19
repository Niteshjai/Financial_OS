// ═══════════════════════════════════════════════════════════════
// Recovery Success — Celebration screen when recovery completes
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { formatPaise } from '../../services/recovery'
import { CheckCircle2, PartyPopper, ArrowRight } from 'lucide-react'

interface RecoverySuccessProps {
  recoveredAmount: number
  feeAmount:       number
  assetDescription:string
  onDismiss:       () => void
}

export default function RecoverySuccess({
  recoveredAmount,
  feeAmount,
  assetDescription,
  onDismiss
}: RecoverySuccessProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(timer)
  }, [])

  const netAmount = recoveredAmount - feeAmount

  return (
    <div className="text-center py-8 px-6">
      {/* Confetti-like animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-bounce"
              style={{
                left:            `${Math.random() * 100}%`,
                top:             `${Math.random() * 60}%`,
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'][i % 5],
                animationDelay:  `${Math.random() * 2}s`,
                animationDuration:`${1 + Math.random() * 2}s`,
                opacity:         0.7,
              }}
            />
          ))}
        </div>
      )}

      {/* Success icon */}
      <div className="size-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 relative">
        <CheckCircle2 className="size-10 text-emerald-600" strokeWidth={1.75} />
        <div className="absolute -top-1 -right-1 size-8 rounded-full bg-amber-100 flex items-center justify-center">
          <PartyPopper className="size-4 text-amber-600" strokeWidth={2} />
        </div>
      </div>

      {/* Headline */}
      <h2 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">
        Recovery Complete! 🎉
      </h2>
      <p className="text-zinc-500 text-[15px] mb-8">
        {assetDescription} has been successfully recovered.
      </p>

      {/* Amount breakdown */}
      <div className="bg-zinc-50 rounded-2xl p-5 mb-6 border border-zinc-200/60 max-w-xs mx-auto">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-600">Recovered</span>
            <span className="font-bold text-emerald-600 text-lg">{formatPaise(recoveredAmount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-zinc-500">Service Fee</span>
            <span className="font-medium text-zinc-600">-{formatPaise(feeAmount)}</span>
          </div>
          <div className="border-t border-zinc-200 pt-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-zinc-800">Net Credited</span>
            <span className="font-bold text-zinc-900 text-lg">{formatPaise(netAmount)}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onDismiss}
        className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition shadow-md"
      >
        Back to Dashboard
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}
