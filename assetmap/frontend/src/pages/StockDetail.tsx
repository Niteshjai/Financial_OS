import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAssetStore } from '../store/assetStore';
import { getFinancialAssets } from '../services/assets';
import { ArrowLeft } from 'lucide-react';
import AssetTimeline from '../components/AssetTimeline';

export default function StockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { assets, setAssets } = useAssetStore();
  const [isLoading, setIsLoading] = useState(!assets.length);

  useEffect(() => {
    if (!assets.length) {
      getFinancialAssets().then((data) => {
        setAssets(data);
        setIsLoading(false);
      });
    }
  }, [assets.length, setAssets]);

  const asset = assets.find(a => a.id === id);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center font-sans text-black/60 font-medium" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
        Loading stock details...
      </div>
    );
  }

  if (!asset) {
    return <Navigate to="/dashboard" replace />;
  }

  // Stock specifics mock data
  const isPositive = true;
  const currentPrice = 2845.50;
  const changeAmt = 45.20;
  const changePct = 1.58;

  return (
    <div className="min-h-screen flex flex-col font-sans text-zinc-900" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      <nav className="bg-white/30 backdrop-blur-xl border-b border-white/20 shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button onClick={() => {
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            navigate('/dashboard');
          }
        }} className="flex items-center gap-2 text-zinc-800 hover:text-black bg-white/50 hover:bg-white/80 border border-zinc-300/50 shadow-sm px-3 py-1.5 rounded-full transition-all font-medium text-sm backdrop-blur-sm">
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </button>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Left Column: Chart & Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Header */}
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-zinc-900 mb-1 tracking-tight">{asset.institutionName}</h1>
            <p className="text-sm font-mono text-zinc-500 mb-6">{asset.accountRef || 'NSE:RELIANCE'}</p>

            <div className="flex items-end gap-3 mb-2">
              <span className="text-5xl md:text-6xl font-bold tracking-tighter">₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <div className={`flex items-center gap-1 font-semibold text-xl pb-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? '+' : '-'}₹{changeAmt} ({isPositive ? '+' : ''}{changePct}%)
              </div>
            </div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">As of today</p>
          </div>

          {/* Chart */}
          <div className="h-[350px] md:h-[450px] -mx-4 md:mx-0">
            <AssetTimeline color={isPositive ? '#059669' : '#e11d48'} currentValue={asset.balance} />
          </div>

          {/* About */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-zinc-200/50 mt-4">
             <h3 className="text-xl font-bold mb-4 text-zinc-900">About Company</h3>
             <p className="text-zinc-600 leading-relaxed text-sm mb-6">
               A leading multinational conglomerate company, headquartered in Mumbai. It has diverse businesses including energy, petrochemicals, natural gas, retail, telecommunications, mass media, and textiles.
             </p>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Market Cap</p>
                  <p className="font-bold text-zinc-900">₹19.2T</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">P/E Ratio</p>
                  <p className="font-bold text-zinc-900">28.4</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Div Yield</p>
                  <p className="font-bold text-zinc-900">0.35%</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1 font-semibold">52W High</p>
                  <p className="font-bold text-zinc-900">₹3,024.90</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Portfolio & Action */}
        <div className="w-full md:w-80 flex flex-col gap-6 shrink-0 mt-4 md:mt-0">
          <div className="bg-white rounded-[24px] p-6 shadow-xl shadow-zinc-200/50 border border-zinc-200/50 sticky top-24">
            <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-zinc-900">
              Your Position
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-end pb-4 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 font-medium">Investment Value</span>
                <span className="text-xl font-bold text-zinc-900">₹{asset.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 font-medium">Shares</span>
                <span className="font-semibold text-zinc-900">{(asset.balance / currentPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 font-medium">Avg. Cost</span>
                <span className="font-semibold text-zinc-900">₹{(currentPrice * 0.85).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 font-medium">Total Return</span>
                <span className="font-semibold text-emerald-600">+15.00%</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 bg-emerald-500 text-white font-bold py-4 rounded-xl hover:bg-emerald-600 transition active:scale-95 shadow-sm shadow-emerald-500/20">BUY</button>
              <button className="flex-1 bg-rose-500 text-white font-bold py-4 rounded-xl hover:bg-rose-600 transition active:scale-95 shadow-sm shadow-rose-500/20">SELL</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
