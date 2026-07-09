interface LandRecord {
  id: string;
  state: string;
  district: string;
  surveyNumber: string | null;
  ownerName: string;
  areaSqft: number;
  registrationDate: string | null;
  source: string;
}

interface Props {
  records: LandRecord[];
}

const STATE_COLORS: Record<string, string> = {
  Karnataka: '#f97316', Maharashtra: '#8b5cf6', 'Tamil Nadu': '#10b981',
  'Andhra Pradesh': '#3b82f6', Telangana: '#ef4444', 'Uttar Pradesh': '#f59e0b',
  Rajasthan: '#14b8a6', Gujarat: '#ec4899', Kerala: '#6366f1', Delhi: '#a855f7',
};

export default function LandMapWidget({ records }: Props) {
  if (records.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏠</span>
        </div>
        <h3 className="text-lg font-semibold text-surface-50 mb-2">No Property Records</h3>
        <p className="text-surface-100/50 text-sm max-w-md mx-auto">
          No land or property records have been discovered yet. You can search using your name or PAN number.
        </p>
      </div>
    );
  }

  const totalArea = records.reduce((sum, r) => sum + r.areaSqft, 0);
  const stateGroups = records.reduce((acc, r) => {
    acc[r.state] = acc[r.state] || [];
    acc[r.state].push(r);
    return acc;
  }, {} as Record<string, LandRecord[]>);

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-surface-100/50">Total Properties</p>
          <p className="text-2xl font-bold text-orange-400">{records.length}</p>
        </div>
        <div>
          <p className="text-sm text-surface-100/50">Total Area</p>
          <p className="text-2xl font-bold text-surface-50">{totalArea.toLocaleString()} sq ft</p>
        </div>
        <div>
          <p className="text-sm text-surface-100/50">States</p>
          <p className="text-2xl font-bold text-surface-50">{Object.keys(stateGroups).length}</p>
        </div>
      </div>

      {/* State-grouped records */}
      {Object.entries(stateGroups).map(([state, stateRecords]) => (
        <div key={state}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATE_COLORS[state] || '#6366f1' }} />
            <h3 className="text-sm font-semibold text-surface-50">{state}</h3>
            <span className="text-xs text-surface-100/40">({stateRecords.length} records)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stateRecords.map((record) => (
              <div key={record.id} className="glass-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-50">
                      {record.district}
                    </p>
                    {record.surveyNumber && (
                      <p className="text-xs text-surface-100/50 mt-0.5">
                        Survey: {record.surveyNumber}
                      </p>
                    )}
                  </div>
                  <span className={`badge ${record.source === 'SUREPASS' ? 'badge-active' : 'badge-pending'}`}>
                    {record.source}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-surface-100/40">Area</p>
                    <p className="text-sm font-medium text-surface-50">
                      {record.areaSqft.toLocaleString()} sq ft
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-surface-100/40">Registered</p>
                    <p className="text-sm font-medium text-surface-50">
                      {record.registrationDate || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
