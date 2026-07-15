import { useState } from 'react';
import { api } from '../../services/api';

export function LoanEligibility() {
  const [params] = useState({
    monthlyIncomePaise: 10000000,
    monthlyObligationsPaise: 2000000,
    totalAssetsPaise: 500000000,
    totalLandValuePaise: 1000000000,
    existingLoansPaise: 0,
    creditScoreApprox: 750
  });
  const [result, setResult] = useState<any>(null);

  const handleAssess = async () => {
    try {
      const res = await api.post('/loan/assess', params);
      setResult(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/50">
      <h2 className="text-xl font-semibold mb-2">Loan Eligibility Estimator</h2>
      <p className="text-sm text-zinc-500 mb-6">Discover how much you can borrow based on your AA data.</p>
      
      {!result ? (
        <button onClick={handleAssess} className="bg-black text-white px-4 py-2 rounded-xl font-medium">Check Eligibility</button>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border p-4 rounded-xl">
              <div className="text-sm text-zinc-500">Home Loan Max</div>
              <div className="text-xl font-semibold">₹{(result.homeLoanMaxPaise/100).toLocaleString('en-IN')}</div>
            </div>
            <div className="border p-4 rounded-xl">
              <div className="text-sm text-zinc-500">Loan Against Property</div>
              <div className="text-xl font-semibold">₹{(result.lapMaxPaise/100).toLocaleString('en-IN')}</div>
            </div>
            <div className="border p-4 rounded-xl">
              <div className="text-sm text-zinc-500">Personal Loan Max</div>
              <div className="text-xl font-semibold">₹{(result.personalLoanMaxPaise/100).toLocaleString('en-IN')}</div>
            </div>
          </div>

          <h3 className="font-semibold mt-4">Recommended Partners</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.lendersShown?.map((lender: any, idx: number) => (
              <div key={idx} className="border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{lender.name}</h4>
                  <div className="text-sm text-zinc-500">From {lender.min_rate_pct}% p.a.</div>
                </div>
                <button className="bg-zinc-100 px-3 py-1 text-sm rounded-lg hover:bg-zinc-200">Apply</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
