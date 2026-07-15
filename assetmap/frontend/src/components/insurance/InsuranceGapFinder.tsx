import { useState } from 'react';
import { InsuranceCoverageCard } from './InsuranceCoverageCard';
import { api } from '../../services/api';

export function InsuranceGapFinder() {
  const [profile] = useState({
    annualIncomePaise: 120000000, // 12 Lakh
    age: 30,
    dependentsCount: 2,
    outstandingLoansPaise: 50000000, // 5 Lakh
    monthlyExpensesPaise: 5000000, // 50k
  });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await api.post('/insurance/analyze', { profile });
      setAnalysis(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/50">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900">Insurance Gap Finder</h2>
      <p className="text-sm text-zinc-500 mb-6">Discover gaps in your coverage based on IRDAI guidelines.</p>
      
      {!analysis ? (
        <div className="flex flex-col gap-4">
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-xl font-medium w-fit hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-display text-zinc-900">Score: {analysis.gapScore}/100</div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
              analysis.gapSeverity === 'critical' ? 'bg-red-100 text-red-700' :
              analysis.gapSeverity === 'high' ? 'bg-orange-100 text-orange-700' :
              analysis.gapSeverity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {analysis.gapSeverity} Gap
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.recommendations?.map((rec: any, idx: number) => (
              <InsuranceCoverageCard key={idx} recommendation={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
