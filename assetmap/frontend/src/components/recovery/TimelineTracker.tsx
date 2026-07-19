// ═══════════════════════════════════════════════════════════════
// Timeline Tracker — Visual vertical progress timeline
// ═══════════════════════════════════════════════════════════════

import { CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react'

interface TimelineEntry {
  title:       string
  description?: string
  to_status:   string
  created_at:  string
}

interface TimelineTrackerProps {
  entries:   TimelineEntry[]
  progress:  number
}

const STATUS_ICONS: Record<string, { icon: typeof CheckCircle2, color: string }> = {
  completed:             { icon: CheckCircle2, color: 'text-emerald-500' },
  amount_credited:       { icon: CheckCircle2, color: 'text-green-500' },
  fee_collected:         { icon: CheckCircle2, color: 'text-green-500' },
  approved:              { icon: CheckCircle2, color: 'text-emerald-500' },
  documents_complete:    { icon: CheckCircle2, color: 'text-blue-500' },
  submitted:             { icon: Clock,        color: 'text-indigo-500' },
  under_review:          { icon: Clock,        color: 'text-purple-500' },
  documents_collecting:  { icon: Clock,        color: 'text-orange-500' },
  additional_docs_needed:{ icon: AlertCircle,  color: 'text-red-500' },
  rejected:              { icon: AlertCircle,  color: 'text-red-500' },
  pending_agreement:     { icon: Circle,       color: 'text-zinc-400' },
  agreement_signed:      { icon: CheckCircle2, color: 'text-blue-500' },
  withdrawn:             { icon: AlertCircle,  color: 'text-zinc-400' },
}

export default function TimelineTracker({ entries, progress }: TimelineTrackerProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center text-zinc-400 py-6 text-sm">
        No timeline events yet.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Progress</span>
          <span className="text-sm font-bold text-zinc-800">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Timeline entries */}
      <div className="space-y-0">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1
          const statusInfo = STATUS_ICONS[entry.to_status] || STATUS_ICONS.pending_agreement
          const Icon = statusInfo.icon

          const date = new Date(entry.created_at)
          const dateStr = date.toLocaleDateString('en-IN', {
            day:   'numeric',
            month: 'short',
            year:  'numeric',
          })
          const timeStr = date.toLocaleTimeString('en-IN', {
            hour:   '2-digit',
            minute: '2-digit',
          })

          return (
            <div key={index} className="flex gap-4">
              {/* Icon + connecting line */}
              <div className="flex flex-col items-center">
                <div className={`size-8 rounded-full flex items-center justify-center ${
                  isLast ? 'bg-white border-2 border-zinc-300 shadow-sm' : 'bg-zinc-50'
                }`}>
                  <Icon className={`size-4 ${statusInfo.color}`} strokeWidth={2.5} />
                </div>
                {!isLast && (
                  <div className="w-px flex-1 min-h-[32px] bg-zinc-200" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 ${isLast ? '' : ''}`}>
                <h4 className="text-[14px] font-semibold text-zinc-800 leading-tight">
                  {entry.title}
                </h4>
                {entry.description && (
                  <p className="text-[13px] text-zinc-500 mt-1 leading-relaxed">
                    {entry.description}
                  </p>
                )}
                <p className="text-[12px] text-zinc-400 mt-1.5">
                  {dateStr} at {timeStr}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
