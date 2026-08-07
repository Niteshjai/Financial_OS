import { useState, useEffect } from 'react';
import { ExternalLink, Copy, Check, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { prepareGuidedSession, completeSession } from '../../services/nominee';
import type { GuidedSession } from '../../services/nominee';

interface GuidedOTPSessionProps {
  taskId:   string;
  onClose:  () => void;
  onDone:   () => void;
}

export default function GuidedOTPSession({ taskId, onClose, onDone }: GuidedOTPSessionProps) {
  const [session, setSession]     = useState<GuidedSession | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [currentStep, setStep]    = useState(0);
  const [copied, setCopied]       = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    prepareGuidedSession(taskId)
      .then(setSession)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeSession(taskId);
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-[512px] w-full text-center">
          <div className="size-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-600 text-sm">Preparing guided session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-[512px] w-full text-center">
          <AlertTriangle className="size-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-600 text-sm mb-4">{error || 'Failed to load session'}</p>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 text-sm font-medium">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-[672px] w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 rounded-t-3xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{session.institution}</h2>
            <p className="text-sm text-zinc-500 capitalize">{session.institutionType.replace('_', ' ')} • Guided Update</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 transition-colors">
            <X className="size-5 text-zinc-500" />
          </button>
        </div>

        {/* Nominee details to copy */}
        <div className="px-6 py-4 bg-lime-50 border-b border-lime-100">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">📋 Nominee Details — Copy & Paste</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Name',         value: session.nominee.name },
              { label: 'DOB',          value: session.nominee.dob },
              { label: 'Relationship', value: session.nominee.relationLabel || session.nominee.relationship },
              { label: 'Mobile',       value: session.nominee.mobile },
              { label: 'Allocation',   value: `${session.nominee.allocationPct}%` },
              ...(session.nominee.guardianName ? [{ label: 'Guardian', value: session.nominee.guardianName }] : []),
            ].filter(item => item.value).map(item => (
              <button key={item.label}
                onClick={() => copyToClipboard(item.value, item.label)}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-lime-200 text-left hover:bg-lime-50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm text-zinc-900 font-medium truncate">{item.value}</p>
                </div>
                {copied === item.label ? (
                  <Check className="size-4 text-emerald-500 shrink-0" />
                ) : (
                  <Copy className="size-3.5 text-zinc-300 group-hover:text-zinc-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="px-6 py-5">
          <h3 className="text-sm font-semibold text-zinc-800 mb-4">Step-by-Step Instructions</h3>
          <div className="space-y-3">
            {session.instructions.map((instruction, i) => (
              <div key={i}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                  i === currentStep
                    ? 'bg-zinc-900 text-white shadow-lg'
                    : i < currentStep
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-zinc-50 text-zinc-600 border border-zinc-100'
                }`}
                onClick={() => setStep(i)}
              >
                <span className={`size-6 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  i === currentStep ? 'bg-lime-300 text-black'
                  : i < currentStep ? 'bg-emerald-200 text-emerald-800'
                  : 'bg-zinc-200 text-zinc-500'
                }`}>
                  {i < currentStep ? '✓' : i + 1}
                </span>
                <p className="text-sm leading-snug">{instruction}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="sticky bottom-0 bg-white border-t border-zinc-100 px-6 py-4 rounded-b-3xl flex items-center gap-3">
          <a href={session.sessionUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors shadow-md">
            <ExternalLink className="size-4" /> Open {session.institutionType === 'epfo' ? 'EPFO Portal' : session.institutionType === 'nps' ? 'NPS Portal' : 'Portal'}
          </a>
          <button onClick={handleComplete} disabled={completing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-md disabled:opacity-50">
            {completing ? (
              <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>I've Completed It <ChevronRight className="size-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
