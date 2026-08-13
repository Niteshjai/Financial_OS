import { useState, useEffect, useCallback } from 'react';
import { getUnclaimedAssets, type UnclaimedAsset } from '../services/unclaimed';
import { getRecoveryCases, type RecoveryCaseResponse } from '../services/recovery';
import SuccessFeeModal from '../components/recovery/SuccessFeeModal';
import RecoveryDashboard from '../components/recovery/RecoveryDashboard';
import { useAssetStore } from '../store/assetStore';
import { Frown, Archive, Scale } from 'lucide-react';

export default function UnclaimedAssets() {
  const storeUnclaimed = useAssetStore(s => s.unclaimedAssets);
  const storeRecovery = useAssetStore(s => s.recoveryCases);
  const setUnclaimedAssets = useAssetStore(s => s.setUnclaimedAssets);
  const setRecoveryCasesStore = useAssetStore(s => s.setRecoveryCases);

  const [assets, setAssets] = useState<UnclaimedAsset[]>(storeUnclaimed || []);
  const [recoveryCases, setRecoveryCases] = useState<RecoveryCaseResponse[]>(storeRecovery || []);
  const [loading, setLoading] = useState(!storeUnclaimed || !storeRecovery);
  const [error, setError] = useState('');

  const [selectedAsset, setSelectedAsset] = useState<UnclaimedAsset | null>(null);
  const [selectedActiveCaseId, setSelectedActiveCaseId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [fetchedAssets, fetchedCases] = await Promise.all([
        getUnclaimedAssets(),
        getRecoveryCases()
      ]);
      setAssets(fetchedAssets);
      setRecoveryCases(fetchedCases);
      setUnclaimedAssets(fetchedAssets);
      setRecoveryCasesStore(fetchedCases);
    } catch {
      setError('Failed to load unclaimed assets data.');
    }
  }, [setUnclaimedAssets, setRecoveryCasesStore]);

  useEffect(() => {
    if (storeUnclaimed && storeRecovery) {
      setAssets(storeUnclaimed);
      setRecoveryCases(storeRecovery);
      return;
    }
    
    setLoading(true);
    setError('');
    loadData().finally(() => setLoading(false));
  }, [storeUnclaimed, storeRecovery, setUnclaimedAssets, setRecoveryCasesStore]);

  const handleRecoverySuccess = (caseId: string) => {
    setSelectedAsset(null);
    setSelectedActiveCaseId(caseId); // Immediately show the dashboard view for this case
    loadData(); // Refresh list to show updated status in background
  };

  const getActiveCaseForAsset = (asset: UnclaimedAsset) => {
    return recoveryCases.find(c => c.asset_description === asset.type && c.institution_name === asset.sourceInstitution);
  };

  if (selectedActiveCaseId) {
    return <RecoveryDashboard initialCaseId={selectedActiveCaseId} onBack={() => setSelectedActiveCaseId(null)} />;
  }

  return (
    <div className="pb-12 text-zinc-900 font-sans">
      <div className="max-w-4xl px-2 mt-4">
        <div className="flex flex-col mb-10 gap-1">
          <h1 className="text-[26px] font-sans font-semibold text-zinc-900 mb-1 flex items-center gap-2 tracking-tight">
            <Frown className="size-6 text-zinc-800" strokeWidth={1.5} />
            Unclaimed Wealth
          </h1>
          <p className="text-zinc-700 text-[15px]">
            We've identified potential assets linked to your details. Discovery is free — you only pay when we recover.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="p-10 text-center text-zinc-500">
            No unclaimed assets found.
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-[fade-in_0.4s_ease]">
            {assets.map((asset) => {
              const activeCase = getActiveCaseForAsset(asset);

              return (
                <div key={asset.id} className="bg-white hover:bg-zinc-100/80 border border-zinc-200/80 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all rounded-[24px] p-5 sm:p-6 flex flex-col group cursor-default gap-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                      <div className="size-12 rounded-full bg-zinc-100 border border-zinc-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Archive className="size-5 text-zinc-600" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 text-[16px]">{asset.type}</h3>
                        <p className="text-[14px] text-zinc-500 mt-0.5">{asset.sourceInstitution}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 lg:gap-10 ml-[4.5rem] sm:ml-0 w-full sm:w-auto">
                      <div className="flex flex-col items-start min-w-[130px]">
                        <p className="text-[13px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Estimated Value</p>
                        <p className="text-xl sm:text-2xl font-bold text-[#10b981] tracking-tight">₹{asset.estimatedValue.toLocaleString('en-IN')}</p>
                      </div>

                      <div className="hidden sm:block w-px h-10 bg-zinc-200"></div>

                      <div className="w-full sm:w-auto flex shrink-0">
                        {activeCase ? (
                          <button
                            onClick={() => setSelectedActiveCaseId(activeCase.id)}
                            className="flex items-center justify-center w-full sm:w-auto px-5 py-2.5 rounded-full bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200/50 cursor-pointer"
                          >
                              <span className="text-[14px] font-semibold text-amber-700 uppercase tracking-wide">
                              Recovery {activeCase.status}
                              </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedAsset(asset)}
                            className="w-full sm:w-auto bg-zinc-900 text-white hover:bg-zinc-800 rounded-full px-6 py-2.5 text-[14px] font-medium transition-colors shadow-sm active:scale-95 text-center"
                          >
                            Recover Asset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar Row */}
                  {activeCase && (
                    <div className="mt-2 pt-4 border-t border-zinc-200/60 w-full">
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="text-[12px] font-medium text-zinc-500">Recovery Progress</span>
                        <span className="text-[12px] font-bold text-emerald-600">{activeCase.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${activeCase.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Legal disclaimer */}
        <div className="mt-8 bg-zinc-50 border border-zinc-200/60 rounded-xl p-4 flex items-start gap-3">
          <Scale className="size-4 text-zinc-400 mt-0.5 shrink-0" strokeWidth={1.75} />
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            AssetMap Recovery Services assists with document preparation and submission tracking. We do not provide legal advice. Recovery is subject to government processing timelines outside our control. Success fee is charged only on confirmed credit to your account.
          </p>
        </div>
      </div>

      {selectedAsset && (
        <SuccessFeeModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onSuccess={handleRecoverySuccess}
        />
      )}
    </div>
  );
}
