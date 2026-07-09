import { useParams, useNavigate } from 'react-router-dom';
import { useAssetStore } from '../store/assetStore';
import AssetTimeline from '../components/AssetTimeline';

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const assets = useAssetStore((s) => s.assets);

  const asset = assets.find((a) => a.id === id);

  const FI_COLORS: Record<string, string> = {
    DEPOSIT: '#3b82f6', EQUITY: '#10b981', MUTUAL_FUND: '#8b5cf6',
    INSURANCE_POLICIES: '#f59e0b', NPS: '#14b8a6', GSTN: '#ef4444',
  };

  const FI_LABELS: Record<string, string> = {
    DEPOSIT: 'Bank Deposit', EQUITY: 'Equity', MUTUAL_FUND: 'Mutual Fund',
    INSURANCE_POLICIES: 'Insurance Policy', NPS: 'National Pension', GSTN: 'GST Record',
  };

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <h2 className="text-xl font-semibold text-surface-50 mb-2">Asset not found</h2>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-4">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const color = FI_COLORS[asset.fiType] || '#6366f1';

  return (
    <div className="min-h-screen pb-12">
      {/* Back Navigation */}
      <nav className="sticky top-0 z-40 glass-card rounded-none border-x-0 border-t-0 px-6 py-3">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-surface-100/70 hover:text-surface-100 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 mt-8 space-y-6 animate-[slide-up_0.4s_ease]">
        {/* Asset Header */}
        <div className="glass-card p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${color}20` }}>
              {asset.fiType === 'DEPOSIT' ? '🏦' : asset.fiType === 'EQUITY' ? '📈' :
               asset.fiType === 'MUTUAL_FUND' ? '💎' : asset.fiType === 'INSURANCE_POLICIES' ? '🛡️' :
               asset.fiType === 'NPS' ? '🏛️' : '📋'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-surface-50">{asset.institutionName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="badge badge-active">{FI_LABELS[asset.fiType] || asset.fiType}</span>
                <span className="text-sm text-surface-100/50">Account: {asset.accountRef}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-surface-100/50">Current Value</p>
              <p className="text-3xl font-bold" style={{ color }}>
                ₹{asset.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Value Timeline */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-surface-100/60 mb-4">Value History (Simulated)</h3>
          <AssetTimeline color={color} currentValue={asset.balance} />
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-surface-100/60 mb-4">Account Details</h3>
            <div className="space-y-3">
              <DetailRow label="Institution" value={asset.institutionName} />
              <DetailRow label="Account Reference" value={asset.accountRef} />
              <DetailRow label="Asset Type" value={FI_LABELS[asset.fiType] || asset.fiType} />
              <DetailRow label="Currency" value={asset.currency} />
              <DetailRow label="Last Fetched" value={new Date(asset.fetchedAt).toLocaleString('en-IN')} />
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-medium text-surface-100/60 mb-4">Data Source</h3>
            <div className="space-y-3">
              <DetailRow label="Source" value="Account Aggregator (Setu)" />
              <DetailRow label="Framework" value="ReBIT AA Standard v2.0" />
              <DetailRow label="Encryption" value="AES-256-GCM" />
              <DetailRow label="Consent Status" value="Active" valueColor="#34d399" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-surface-700/30 last:border-0">
      <span className="text-sm text-surface-100/50">{label}</span>
      <span className="text-sm font-medium" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  );
}
