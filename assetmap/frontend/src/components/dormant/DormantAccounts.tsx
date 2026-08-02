import { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface DormantAccount {
  id: string;
  institution_name: string;
  fi_type: string;
  balance_paise: number;
  months_inactive: number;
  iepf_risk: boolean;
}

interface Summary {
  totalDormant: number;
  totalBalancePaise: number;
  iepfRiskCount: number;
}

function formatINR(paise: number): string {
  const v = paise / 100;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

export default function DormantAccounts({ data }: { data: { accounts: DormantAccount[], summary: Summary } | null }) {
  if (!data) return <div className="bg-zinc-200/50 animate-pulse rounded-3xl h-[80px]"></div>;

  if (data.accounts.length === 0) {
    return (
      <div className="bg-lime-300 rounded-3xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.05)] h-full flex flex-col justify-between flex-1">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-0.5">Dormant Accounts</h3>
          <p className="text-sm text-zinc-800/80">You have no dormant accounts detected.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-lime-300 rounded-3xl p-4 shadow-sm h-full flex flex-col justify-between flex-1">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 mb-1">Dormant Accounts</h3>
        <div className="text-sm text-zinc-800/80 mb-2">
          {data.accounts.length} account{data.accounts.length !== 1 ? 's are' : ' is'} inactive and at risk.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, padding: '12px 16px', background: 'var(--warning-light)', borderRadius: 12, border: '1px solid var(--warning)' }}>
          <div style={{ color: 'var(--warning-dark)', fontSize: 12, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total Value at Risk</div>
          <div style={{ color: 'var(--warning-dark)', fontSize: 24, fontWeight: 'bold' }}>{formatINR(data.summary.totalBalancePaise)}</div>
        </div>
      </div>
    </div>
  );
}
