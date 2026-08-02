import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FeatureGate } from '../ui/FeatureGate';
import { UpdateNomineeModal } from './UpdateNomineeModal';

interface NomineeStatus {
  id: string;
  institution_name: string;
  fi_type: string;
  has_nominee: boolean;
  nomineeName: string | null;
}

interface Summary {
  total: number;
  withNominee: number;
  withoutNominee: number;
  completionPct: number;
}

export default function NomineeChecker({ data }: { data: { accounts: NomineeStatus[], summary: Summary } | null }) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isBulkUpdate, setIsBulkUpdate] = useState(false);
  const [updatedAccounts, setUpdatedAccounts] = useState<Set<string>>(new Set());

  if (!data) return <div className="bg-zinc-200/50 animate-pulse rounded-3xl h-[220px]"></div>;

  return (
    <FeatureGate featureKey="nominee_checker">
      <div className="bg-gradient-to-br from-zinc-200/90 via-zinc-100/90 to-zinc-300/90 shadow-[inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-xl rounded-3xl p-4 border border-zinc-300 flex flex-col justify-between h-full">
        <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-0.5">Nominee Checker</h3>
        <div className="text-sm text-zinc-500 mb-2">
          Ensure your family's future is secure by adding nominees.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: `conic-gradient(var(--success) ${data.summary.completionPct}%, var(--surface-3) 0)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
            {data.summary.completionPct}%
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16 }}>{data.summary.withoutNominee} Missing</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{data.summary.withNominee} of {data.summary.total} accounts secured</div>
        </div>
      </div>

      {data.summary.withoutNominee > 0 && (
        <div className="mt-2 pt-2 border-t border-zinc-100 flex-shrink-0">
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <button
                className="text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 w-full text-center transition-colors bg-white py-2 rounded-xl border border-zinc-200/60 shadow-sm"
              >
                Show Missing Nominees
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white rounded-[28px] p-6 sm:p-8 border-0 shadow-2xl" style={{ minWidth: '350px', width: '90vw', maxWidth: '500px' }}>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl font-display font-semibold text-zinc-900">Missing Nominees</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[60vh] pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {data.accounts.filter(a => !a.has_nominee).map(acc => (
                  <div key={acc.id} className="flex justify-between items-center p-4 bg-amber-50/50 rounded-2xl border-l-[4px] border-amber-400 shadow-sm">
                    <div>
                      <div className="font-semibold text-[15px] text-zinc-900">{acc.institution_name || 'Unknown'}</div>
                      <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mt-1.5">{acc.fi_type.replace('_', ' ')}</div>
                    </div>
                    <button 
                      disabled={updatedAccounts.has(acc.id)}
                      onClick={() => {
                        setIsBulkUpdate(false);
                        setSelectedAccount(acc);
                        setShowUpdateModal(true);
                      }}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm border ${
                        updatedAccounts.has(acc.id)
                          ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200/50 cursor-not-allowed'
                          : 'text-amber-700 bg-amber-100/80 hover:bg-amber-200 active:scale-95 cursor-pointer border-amber-200/50'
                      }`}
                    >
                      {updatedAccounts.has(acc.id) ? 'REQUESTED ✓' : 'ACTION REQUIRED'}
                    </button>
                  </div>
                ))}
              </div>
              
              {data.accounts.filter(a => !a.has_nominee && !updatedAccounts.has(a.id)).length > 1 && (
                <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-end">
                  <button
                    onClick={() => {
                      setIsBulkUpdate(true);
                      setSelectedAccount(null);
                      setShowUpdateModal(true);
                    }}
                    className="text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 transition-colors px-4 py-2 rounded-xl shadow-sm"
                  >
                    Apply Same Nominee for All
                  </button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {showUpdateModal && (
            <UpdateNomineeModal
              isOpen={showUpdateModal}
              onClose={() => setShowUpdateModal(false)}
              account={selectedAccount}
              isBulk={isBulkUpdate}
              allMissingAccounts={data.accounts.filter(a => !a.has_nominee && !updatedAccounts.has(a.id))}
              onSuccess={(updatedIds: string[]) => {
                setUpdatedAccounts(prev => {
                  const next = new Set(prev);
                  updatedIds.forEach(id => next.add(id));
                  return next;
                });
                setShowUpdateModal(false);
                // setShowDetails(false); // Don't close parent so they can see the green checkmarks!
              }}
            />
          )}
        </div>
        )}
      </div>
    </FeatureGate>
  );
}
