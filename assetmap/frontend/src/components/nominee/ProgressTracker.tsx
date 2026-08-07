import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, AlertCircle, Zap, ExternalLink, RotateCw, ChevronRight } from 'lucide-react';
import type { BatchStatus, BatchTask } from '../../services/nominee';
import { getBatchStatus } from '../../services/nominee';

interface ProgressTrackerProps {
  batchId:        string;
  onOpenSession:  (taskId: string) => void;
  onAllComplete:  () => void;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pending:         { icon: Clock,        color: 'text-zinc-400',  bg: 'bg-zinc-100',  label: 'Pending' },
  auto_submitted:  { icon: Zap,          color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Auto-submitted' },
  session_opened:  { icon: ExternalLink, color: 'text-blue-600',  bg: 'bg-blue-50',   label: 'Session opened' },
  user_completed:  { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Completed' },
  form_sent:       { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Form emailed' },
  verified:        { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Verified ✓' },
  failed:          { icon: AlertCircle,  color: 'text-red-500',   bg: 'bg-red-50',    label: 'Failed' },
  skipped:         { icon: Clock,        color: 'text-zinc-400',  bg: 'bg-zinc-50',   label: 'Skipped' },
};

const TYPE_ICONS: Record<string, string> = {
  mutual_fund: '📊',
  epfo:        '🏛️',
  nps:         '🏦',
  bank:        '🏧',
  insurance:   '🛡️',
  demat:       '📈',
};

export default function ProgressTracker({ batchId, onOpenSession, onAllComplete }: ProgressTrackerProps) {
  const [batch, setBatch] = useState<BatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getBatchStatus(batchId);
      setBatch(data);

      // Check if all tasks are done
      const allDone = data.tasks.every(t => t.isCompleted || t.isFailed || t.status === 'skipped');
      if (allDone && data.tasks.length > 0) {
        onAllComplete();
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [batchId, onAllComplete]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <AlertCircle className="size-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={fetchStatus} className="mt-3 text-sm text-red-600 underline">Retry</button>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="size-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Group tasks by method for visual organization
  const autoTasks   = batch.tasks.filter(t => t.method === 'full_auto');
  const guidedTasks = batch.tasks.filter(t => t.method === 'guided_otp');
  const formTasks   = batch.tasks.filter(t => t.method === 'form_email');
  const manualTasks = batch.tasks.filter(t => t.method === 'manual_branch');

  return (
    <div className="space-y-6">
      {/* Overall progress bar */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-zinc-900">Overall Progress</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-zinc-900">{batch.progressPct}%</span>
            <button onClick={fetchStatus} className="p-1 rounded-lg hover:bg-zinc-100 transition-colors">
              <RotateCw className="size-4 text-zinc-400" />
            </button>
          </div>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${batch.progressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" /> {batch.completedAccounts} completed
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-zinc-300" /> {batch.pendingAccounts} pending
          </span>
          {batch.failedAccounts > 0 && (
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-400" /> {batch.failedAccounts} failed
            </span>
          )}
        </div>
      </div>

      {/* Auto-processed (CAMS) */}
      {autoTasks.length > 0 && (
        <TaskGroup title="⚡ Automated (Mutual Funds)" subtitle="Updated automatically via CAMS API" tasks={autoTasks} onOpenSession={onOpenSession} />
      )}

      {/* Guided OTP sessions */}
      {guidedTasks.length > 0 && (
        <TaskGroup title="🔑 Needs Your OTP" subtitle="Complete a quick OTP step inside our app" tasks={guidedTasks} onOpenSession={onOpenSession} />
      )}

      {/* Form + email (Insurance) */}
      {formTasks.length > 0 && (
        <TaskGroup title="📧 Form Emailed" subtitle="Pre-filled form sent to insurer" tasks={formTasks} onOpenSession={onOpenSession} />
      )}

      {/* Manual branch */}
      {manualTasks.length > 0 && (
        <TaskGroup title="🏢 Branch Visit Required" subtitle="Please visit the nearest branch" tasks={manualTasks} onOpenSession={onOpenSession} />
      )}
    </div>
  );
}

function TaskGroup({ title, subtitle, tasks, onOpenSession }: {
  title:         string;
  subtitle:      string;
  tasks:         BatchTask[];
  onOpenSession: (taskId: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100">
        <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="divide-y divide-zinc-50">
        {tasks.map(task => {
          const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
          const Icon   = config.icon;

          return (
            <div key={task.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-50/50 transition-colors">
              {/* Icon */}
              <span className="text-lg shrink-0">{TYPE_ICONS[task.type] ?? '📄'}</span>

              {/* Institution */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{task.institution}</p>
                <p className="text-xs text-zinc-500">{task.methodLabel}</p>
              </div>

              {/* Status badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                <Icon className="size-3.5" />
                {config.label}
              </div>

              {/* Action button for guided tasks */}
              {task.isActionRequired && (
                <button onClick={() => onOpenSession(task.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm">
                  Start <ChevronRight className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
