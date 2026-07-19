// ═══════════════════════════════════════════════════════════════
// Recovery Card — Per-case card for the recovery dashboard
// ═══════════════════════════════════════════════════════════════

import { formatPaise } from '../../services/recovery'
import {
  Clock, CheckCircle2, AlertCircle, FileText, Calendar,
  Wallet, Shield, PieChart, Layers, Building2, ArrowRight
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  pending_agreement:     'Awaiting Agreement',
  agreement_signed:      'Agreement Signed',
  documents_collecting:  'Collecting Documents',
  documents_complete:    'Documents Complete',
  submitted:             'Submitted',
  under_review:          'Under Review',
  additional_docs_needed:'Action Required',
  approved:              'Approved',
  amount_credited:       'Amount Credited',
  fee_collected:         'Fee Collected',
  completed:             'Completed',
  rejected:              'Rejected',
  withdrawn:             'Withdrawn',
}

const STATUS_STYLES: Record<string, string> = {
  pending_agreement:     'bg-amber-100 text-amber-800 border-amber-200',
  documents_collecting:  'bg-orange-100 text-orange-800 border-orange-200',
  documents_complete:    'bg-blue-100 text-blue-800 border-blue-200',
  submitted:             'bg-indigo-100 text-indigo-800 border-indigo-200',
  under_review:          'bg-purple-100 text-purple-800 border-purple-200',
  additional_docs_needed:'bg-red-100 text-red-800 border-red-200',
  approved:              'bg-emerald-100 text-emerald-800 border-emerald-200',
  amount_credited:       'bg-green-100 text-green-800 border-green-200',
  completed:             'bg-green-100 text-green-800 border-green-200',
  rejected:              'bg-red-100 text-red-800 border-red-200',
  withdrawn:             'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const TYPE_ICONS: Record<string, typeof Wallet> = {
  epf_balance:        Wallet,
  epf_pension:        Wallet,
  mutual_fund:        PieChart,
  iepf_shares:        Layers,
  iepf_dividend:      Layers,
  dormant_bank:       Building2,
  insurance_maturity: Shield,
  ppf_balance:        Wallet,
}

interface RecoveryCardProps {
  caseData: {
    id:                    string
    recovery_type:         string
    asset_description:     string
    institution_name:      string
    status:                string
    estimated_value_paise: number
    recovered_value_paise?: number
    fee_pct:               number
    estimated_completion:  string
    docs_total:            number
    docs_received:         number
    progress:              number
    estimate: {
      daysRemaining: number | null
    }
    config: {
      label:          string
      successRatePct: number
    }
  }
  onClick: () => void
}

export default function RecoveryCard({ caseData, onClick }: RecoveryCardProps) {
  const Icon = TYPE_ICONS[caseData.recovery_type] || FileText
  const statusLabel = STATUS_LABELS[caseData.status] || caseData.status
  const statusStyle = STATUS_STYLES[caseData.status] || STATUS_STYLES.pending_agreement
  const isActive = !['completed', 'rejected', 'withdrawn'].includes(caseData.status)
  const needsAction = ['documents_collecting', 'additional_docs_needed', 'pending_agreement'].includes(caseData.status)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white hover:bg-zinc-50 border rounded-[20px] p-5 transition-all hover:shadow-md group ${
        needsAction ? 'border-amber-200/80' : 'border-zinc-200/80'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon + Info */}
        <div className="flex items-start gap-4 min-w-0">
          <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 ${
            caseData.status === 'completed' ? 'bg-emerald-100' : 'bg-zinc-100'
          }`}>
            {caseData.status === 'completed' ? (
              <CheckCircle2 className="size-5 text-emerald-600" strokeWidth={2} />
            ) : (
              <Icon className="size-5 text-zinc-600" strokeWidth={1.75} />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-zinc-900 truncate">
              {caseData.asset_description}
            </p>
            <p className="text-[13px] text-zinc-500 mt-0.5 truncate">
              {caseData.institution_name || caseData.config.label}
            </p>

            {/* Status badge */}
            <div className={`inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusStyle}`}>
              {isActive ? (
                <Clock className="size-3" strokeWidth={2.5} />
              ) : caseData.status === 'completed' ? (
                <CheckCircle2 className="size-3" strokeWidth={2.5} />
              ) : (
                <AlertCircle className="size-3" strokeWidth={2.5} />
              )}
              {statusLabel}
            </div>
          </div>
        </div>

        {/* Right: Value + Progress */}
        <div className="text-right shrink-0">
          <p className="text-[12px] text-zinc-500 uppercase tracking-wider mb-0.5">
            {caseData.status === 'completed' ? 'Recovered' : 'Estimated'}
          </p>
          <p className="text-lg font-bold text-[#10b981] tracking-tight">
            {formatPaise(caseData.recovered_value_paise || caseData.estimated_value_paise)}
          </p>

          {/* Days remaining */}
          {isActive && caseData.estimate.daysRemaining != null && (
            <div className="flex items-center gap-1 mt-2 justify-end">
              <Calendar className="size-3 text-zinc-400" />
              <span className="text-[12px] text-zinc-500">
                ~{caseData.estimate.daysRemaining}d left
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-zinc-500">
              Docs: {caseData.docs_received}/{caseData.docs_total}
            </span>
            <span className="text-[11px] font-medium text-zinc-600">
              {caseData.progress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${caseData.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action hint */}
      {needsAction && (
        <div className="mt-3 flex items-center gap-1.5 text-amber-700">
          <AlertCircle className="size-3.5" strokeWidth={2} />
          <span className="text-[12px] font-medium">Action required — tap to continue</span>
          <ArrowRight className="size-3 ml-auto opacity-0 group-hover:opacity-100 transition" />
        </div>
      )}
    </button>
  )
}
