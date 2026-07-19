// ═══════════════════════════════════════════════════════════════
// Recovery Dashboard — All active recovery cases
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { getRecoveryCases, getRecoveryCaseDetail, formatPaise, type RecoveryCaseResponse, type RecoveryCaseDetail } from '../../services/recovery'
import RecoveryCard from './RecoveryCard'
import DocumentUploader from './DocumentUploader'
import TimelineTracker from './TimelineTracker'
import RecoverySuccess from './RecoverySuccess'
import { ArrowLeft, Scale, Briefcase, TrendingUp, Clock, CheckCircle2, Loader2 } from 'lucide-react'

const LEGAL_DISCLAIMER =
  'AssetMap Recovery Services assists with document preparation and ' +
  'submission tracking. We do not provide legal advice. Recovery is ' +
  'subject to government processing timelines outside our control. ' +
  'Success fee is charged only on confirmed credit to your account.'

export default function RecoveryDashboard() {
  const [cases, setCases] = useState<RecoveryCaseResponse[]>([])
  const [selectedCase, setSelectedCase] = useState<RecoveryCaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchCases = async () => {
    setLoading(true)
    try {
      const data = await getRecoveryCases()
      setCases(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load recovery cases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [])

  const handleCaseClick = async (caseId: string) => {
    setDetailLoading(true)
    try {
      const detail = await getRecoveryCaseDetail(caseId)
      setSelectedCase(detail)
    } catch (err: any) {
      setError(err.message || 'Failed to load case details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedCase(null)
    fetchCases()
  }

  const handleDocumentUploaded = async () => {
    if (selectedCase) {
      const detail = await getRecoveryCaseDetail(selectedCase.id)
      setSelectedCase(detail)
    }
  }

  // ─── Case Detail View ───
  if (selectedCase) {
    const isCompleted = selectedCase.status === 'completed'

    if (isCompleted) {
      return (
        <div className="pb-12 font-sans">
          <div className="max-w-2xl px-2 mt-4">
            <button onClick={handleBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 transition mb-6 text-sm">
              <ArrowLeft className="size-4" /> Back to recoveries
            </button>
            <RecoverySuccess
              recoveredAmount={selectedCase.recovered_value_paise || selectedCase.estimated_value_paise}
              feeAmount={selectedCase.feeDetails.totalPaise}
              assetDescription={selectedCase.asset_description}
              onDismiss={handleBack}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="pb-12 font-sans text-zinc-900">
        <div className="max-w-2xl px-2 mt-4">
          {/* Back button */}
          <button onClick={handleBack} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 transition mb-6 text-sm">
            <ArrowLeft className="size-4" /> Back to recoveries
          </button>

          {/* Case header */}
          <div className="mb-8">
            <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">
              {selectedCase.asset_description}
            </h1>
            <p className="text-zinc-500 text-[15px] mt-1">
              {selectedCase.institution_name} · {selectedCase.config.label}
            </p>
          </div>

          {/* Value card */}
          <div className="bg-white border border-zinc-200/80 rounded-[20px] p-5 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Estimated Value</p>
                <p className="text-2xl font-bold text-[#10b981] tracking-tight mt-1">
                  {formatPaise(selectedCase.estimated_value_paise)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Success Fee</p>
                <p className="text-lg font-semibold text-amber-700 mt-1">
                  {selectedCase.fee_pct}% = {formatPaise(selectedCase.feeDetails.feeAmountPaise)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-zinc-500">Overall Progress</span>
                <span className="text-[12px] font-semibold text-zinc-700">{selectedCase.progress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${selectedCase.progress}%` }}
                />
              </div>
            </div>

            {selectedCase.estimate.daysRemaining != null && (
              <p className="text-[12px] text-zinc-500 mt-2 flex items-center gap-1">
                <Clock className="size-3" />
                Estimated {selectedCase.estimate.daysRemaining} days remaining
              </p>
            )}
          </div>

          {/* Documents section */}
          {['documents_collecting', 'additional_docs_needed'].includes(selectedCase.status) && (
            <div className="bg-white border border-zinc-200/80 rounded-[20px] p-5 mb-5">
              <DocumentUploader
                caseId={selectedCase.id}
                documents={selectedCase.documents}
                onDocumentUploaded={handleDocumentUploaded}
              />
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white border border-zinc-200/80 rounded-[20px] p-5 mb-5">
            <h3 className="text-[15px] font-semibold text-zinc-800 mb-4">Recovery Timeline</h3>
            <TimelineTracker
              entries={selectedCase.timeline}
              progress={selectedCase.progress}
            />
          </div>

          {/* Process steps */}
          <div className="bg-white border border-zinc-200/80 rounded-[20px] p-5 mb-5">
            <h3 className="text-[15px] font-semibold text-zinc-800 mb-3">Recovery Process</h3>
            <div className="space-y-2">
              {selectedCase.config.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-zinc-500">{i + 1}</span>
                  </div>
                  <p className="text-[13px] text-zinc-600 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legal disclaimer */}
          <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-4 flex items-start gap-3">
            <Scale className="size-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.75} />
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              {LEGAL_DISCLAIMER}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Cases List View ───
  const activeCases    = cases.filter(c => !['completed', 'rejected', 'withdrawn'].includes(c.status))
  const completedCases = cases.filter(c => c.status === 'completed')
  const totalEstimated = cases.reduce((sum, c) => sum + c.estimated_value_paise, 0)

  return (
    <div className="pb-12 text-zinc-900 font-sans">
      <div className="max-w-4xl px-2 mt-4">
        {/* Header */}
        <div className="flex flex-col mb-8 gap-1">
          <h1 className="text-[26px] font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
            <Briefcase className="size-6 text-zinc-800" strokeWidth={1.5} />
            Recovery Dashboard
          </h1>
          <p className="text-zinc-600 text-[15px]">
            Track all your active asset recovery cases.
          </p>
        </div>

        {/* Stats */}
        {cases.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="size-4 text-amber-600" strokeWidth={2} />
                <span className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">Active</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900">{activeCases.length}</p>
            </div>
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="size-4 text-emerald-600" strokeWidth={2} />
                <span className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">Done</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900">{completedCases.length}</p>
            </div>
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="size-4 text-[#10b981]" strokeWidth={2} />
                <span className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">Value</span>
              </div>
              <p className="text-2xl font-bold text-[#10b981]">{formatPaise(totalEstimated)}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm">
            {error}
          </div>
        )}

        {loading || detailLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="size-8 text-zinc-400 animate-spin" />
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-white border border-zinc-200/80 rounded-[24px] p-10 text-center">
            <Briefcase className="size-12 text-zinc-300 mx-auto mb-4" strokeWidth={1.25} />
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">No recovery cases yet</h3>
            <p className="text-zinc-500 text-[15px] max-w-sm mx-auto">
              Go to <span className="font-medium text-zinc-700">Unclaimed Wealth</span> to discover and start recovering your unclaimed assets.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map(c => (
              <RecoveryCard
                key={c.id}
                caseData={c}
                onClick={() => handleCaseClick(c.id)}
              />
            ))}
          </div>
        )}

        {/* Legal disclaimer */}
        <div className="mt-8 bg-zinc-50 border border-zinc-200/60 rounded-xl p-4 flex items-start gap-3">
          <Scale className="size-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.75} />
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            {LEGAL_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  )
}
