import { useEffect, useState } from 'react';
import { api } from '../../services/api';

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

export default function NomineeChecker() {
  const [data, setData] = useState<{ accounts: NomineeStatus[], summary: Summary } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    api.get<{ data: { accounts: NomineeStatus[], summary: Summary } }>('/engagement/nominee/status')
      .then(res => setData(res.data.data))
      .catch(console.error);
  }, []);

  if (!data) return <div style={{ padding: 20 }}>Loading Nominee Status...</div>;

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-zinc-200/50 flex flex-col justify-between h-full">
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
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 w-full text-center transition-colors"
          >
            {showDetails ? 'Hide Missing' : 'Show Missing Nominees'}
          </button>

          {showDetails && (
            <div className="mt-4 flex flex-col gap-3 max-h-[200px] overflow-y-auto scrollbar-hide pr-1">
              {data.accounts.filter(a => !a.has_nominee).map(acc => (
                <div key={acc.id} className="flex justify-between items-center p-3 bg-amber-50/50 rounded-xl border-l-[3px] border-amber-400">
                  <div>
                    <div className="font-medium text-sm text-zinc-900">{acc.institution_name || 'Unknown'}</div>
                    <div className="text-[11px] text-zinc-500 uppercase tracking-wide mt-0.5">{acc.fi_type.replace('_', ' ')}</div>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-md">Missing</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
