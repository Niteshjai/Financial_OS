import { revokeConsent as revokeConsentApi } from '../services/assets';
import type { Consent } from '../services/assets';
import { useState } from 'react';

interface Props {
  consents: Consent[];
  onRevoke: () => void;
}

export default function ConsentBanner({ consents, onRevoke }: Props) {
  const [revoking, setRevoking] = useState<string | null>(null);

  const activeConsents = consents.filter((c) => c.status === 'ACTIVE');

  if (activeConsents.length === 0 && consents.length === 0) return null;

  async function handleRevoke(consentId: string) {
    if (!confirm('Are you sure you want to revoke this consent? AssetMap will no longer be able to fetch your financial data.')) return;
    setRevoking(consentId);
    try {
      await revokeConsentApi(consentId);
      onRevoke();
    } catch {
      alert('Failed to revoke consent');
    } finally {
      setRevoking(null);
    }
  }

  const FI_LABELS: Record<string, string> = {
    DEPOSIT: 'Bank Deposits', EQUITY: 'Stocks', MUTUAL_FUND: 'Mutual Funds',
    INSURANCE_POLICIES: 'Insurance', NPS: 'NPS', GSTN: 'GST',
  };

  return (
    <div className="space-y-2">
      {consents.slice(0, 3).map((consent) => {
        const isActive = consent.status === 'ACTIVE';
        const isRevoked = consent.status === 'REVOKED';

        const daysRemaining = isActive
          ? Math.max(0, Math.ceil((new Date(consent.dateRangeEnd).getTime() - Date.now()) / (86400000)))
          : 0;

        return (
          <div
            key={consent.id}
            className={`glass-card p-4 flex items-center justify-between ${
              isActive ? 'border-green-500/20' : isRevoked ? 'border-red-500/20 opacity-60' : 'border-amber-500/20 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                isActive ? 'bg-green-400 animate-pulse' : isRevoked ? 'bg-red-400' : 'bg-amber-400'
              }`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${isActive ? 'badge-active' : isRevoked ? 'badge-revoked' : 'badge-pending'}`}>
                    {consent.status}
                  </span>
                  <span className="text-xs text-surface-100/40">
                    Granted {new Date(consent.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {consent.fiTypes.map((type: string) => (
                    <span key={type} className="text-xs px-2 py-0.5 rounded bg-surface-700/50 text-surface-100/60">
                      {FI_LABELS[type] || type}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isActive && daysRemaining > 0 && (
                <span className="text-xs text-surface-100/40">
                  {daysRemaining} days remaining
                </span>
              )}
              {isActive && (
                <button
                  onClick={() => handleRevoke(consent.consentId)}
                  disabled={revoking === consent.consentId}
                  className="btn-danger text-xs py-1.5 px-3"
                >
                  {revoking === consent.consentId ? '...' : 'Revoke'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
