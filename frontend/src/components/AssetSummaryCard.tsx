import { useNavigate } from 'react-router-dom';

const FI_COLORS: Record<string, string> = {
  DEPOSIT: '#3b82f6', EQUITY: '#10b981', MUTUAL_FUND: '#8b5cf6',
  INSURANCE_POLICIES: '#f59e0b', NPS: '#14b8a6', GSTN: '#ef4444',
};

const FI_ICONS: Record<string, string> = {
  DEPOSIT: '🏦', EQUITY: '📈', MUTUAL_FUND: '💎',
  INSURANCE_POLICIES: '🛡️', NPS: '🏛️', GSTN: '📋',
};

const FI_LABELS: Record<string, string> = {
  DEPOSIT: 'Bank Deposit', EQUITY: 'Stocks', MUTUAL_FUND: 'Mutual Fund',
  INSURANCE_POLICIES: 'Insurance', NPS: 'Pension (NPS)', GSTN: 'GST Record',
};

interface Props {
  asset: {
    id: string;
    fiType: string;
    institutionName: string;
    accountRef: string;
    balance: number;
    currency: string;
  };
}

export default function AssetSummaryCard({ asset }: Props) {
  const navigate = useNavigate();
  const color = FI_COLORS[asset.fiType] || '#6366f1';

  return (
    <div
      onClick={() => navigate(`/asset/${asset.id}`)}
      className="glass-card p-5 cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}20` }}
        >
          {FI_ICONS[asset.fiType] || '💰'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-50 truncate">
            {asset.institutionName}
          </p>
          <p className="text-xs text-surface-100/40 mt-0.5">
            {FI_LABELS[asset.fiType] || asset.fiType} • {asset.accountRef}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-xl font-bold" style={{ color }}>
          ₹{asset.balance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="text-surface-100/30 group-hover:text-primary-400 transition-colors"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}
