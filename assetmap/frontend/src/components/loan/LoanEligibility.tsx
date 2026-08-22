import React, { useState, useEffect } from 'react';
import { Landmark, TrendingUp, Home, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import LenderCard from './LenderCard';
import { useAssetStore } from '../../store/assetStore';
import { toast } from 'sonner';

export default function LoanEligibility() {
  const { summary } = useAssetStore();

  const [inputs, setInputs] = useState({
    monthlyIncomePaise: 15000000, // ₹1.5L
    monthlyObligationsPaise: 4000000, // ₹40K
    totalAssetsPaise: summary ? (Number(summary.totalNetWorth) * 100 || 500000000) : 500000000,
    totalLandValuePaise: summary ? (Number(summary.estimatedLandValue) * 100 || 0) : 0,
    existingLoansPaise: 0,
    creditScoreApprox: 760
  });

  useEffect(() => {
    if (summary) {
      setInputs(prev => ({
        ...prev,
        totalAssetsPaise: Number(summary.totalNetWorth) * 100 || 500000000,
        totalLandValuePaise: Number(summary.estimatedLandValue) * 100 || 0
      }));
    }
  }, [summary]);

  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAssess = async () => {
    setLoading(true);
    try {
      // Ensure all fields are clean numbers (no NaN or null) before sending
      const cleanInputs = {
        monthlyIncomePaise: Number(inputs.monthlyIncomePaise) || 0,
        monthlyObligationsPaise: Number(inputs.monthlyObligationsPaise) || 0,
        totalAssetsPaise: Number(inputs.totalAssetsPaise) || 0,
        totalLandValuePaise: Number(inputs.totalLandValuePaise) || 0,
        existingLoansPaise: Number(inputs.existingLoansPaise) || 0,
        creditScoreApprox: Number(inputs.creditScoreApprox) || 760
      };

      const response = await api.post('/loan/assess', cleanInputs);
      const data = response.data;
      if (data && (data.success !== false)) {
        setAssessment(data.data || data);
      } else {
        const errorMsg = (data as any)?.error?.message || (data as any)?.message || 'Failed to calculate eligibility';
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error('Loan assessment error:', err);
      const serverMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to calculate loan eligibility';
      toast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isPaiseField = e.target.name.includes('Paise');
    const val = parseInt(e.target.value) || 0;
    setInputs({
      ...inputs,
      [e.target.name]: isPaiseField ? val * 100 : val
    });
  };

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
  };

  const fields = [
    { name: 'monthlyIncomePaise', label: 'Monthly Income (₹)', isPaise: true },
    { name: 'monthlyObligationsPaise', label: 'Current Monthly EMIs (₹)', isPaise: true },
    { name: 'totalLandValuePaise', label: 'Total Value of Land/Property (₹)', isPaise: true },
    { name: 'creditScoreApprox', label: 'Estimated Credit Score', isPaise: false },
  ];

  return (
    <div className="flex flex-col max-h-[calc(100vh-120px)] justify-center w-full max-w-6xl mx-auto p-4 md:px-8 mt-6 lg:mt-10 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
          <Landmark className="h-7 w-7 text-lime-500" />
          Loan Eligibility Estimator
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
          Find out your borrowing capacity based on your assets and income.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full flex-1 min-h-0">
        {/* Left: Input Form */}
        <div className="lg:col-span-4 h-full flex flex-col min-h-0">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col h-full">
            <div className="px-5 pt-5 pb-3 shrink-0 border-b border-zinc-100 dark:border-zinc-800/50">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Financial Profile</h2>
            </div>
            <div className="px-5 py-4 space-y-4 flex-1">
              {fields.map((field) => (
                <div key={field.name} className="space-y-1.5 flex flex-col w-full">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                    {field.label}
                  </label>
                  <input
                    name={field.name}
                    type="number"
                    value={field.isPaise ? (inputs as any)[field.name] / 100 : (inputs as any)[field.name]}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                  />
                </div>
              ))}

              <button
                className="w-full mt-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-900 font-semibold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
                onClick={handleAssess}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                    Calculating...
                  </span>
                ) : 'Calculate Eligibility'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-8 h-full flex flex-col min-h-0 overflow-y-auto rounded-2xl pb-4 pr-2 custom-scrollbar">
          {!assessment ? (
            <div className="h-full min-h-[400px] w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 sm:p-12">
              <div className="w-full h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5 mx-auto">
                  <TrendingUp className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Unlock your borrowing power</h2>
                <div className="w-full" style={{ maxWidth: '400px' }}>
                  <p className="text-zinc-500 dark:text-zinc-500 text-sm leading-relaxed">
                    Enter your financial details on the left to see how much you can borrow for a home loan, loan against property, or personal loan.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* Loan amounts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Max Home Loan', amount: assessment.homeLoanMaxPaise, emi: assessment.homeLoanEMI, gradient: 'from-sky-50 to-white dark:from-sky-950/30 dark:to-zinc-900', border: 'border-sky-200 dark:border-sky-900/50', accent: 'text-sky-600 dark:text-sky-400' },
                  { label: 'Loan Against Property', amount: assessment.lapMaxPaise, emi: assessment.lapEMI, gradient: 'from-indigo-50 to-white dark:from-indigo-950/30 dark:to-zinc-900', border: 'border-indigo-200 dark:border-indigo-900/50', accent: 'text-indigo-600 dark:text-indigo-400' },
                  { label: 'Personal Loan', amount: assessment.personalLoanMaxPaise, emi: assessment.personalLoanEMI, gradient: 'from-violet-50 to-white dark:from-violet-950/30 dark:to-zinc-900', border: 'border-violet-200 dark:border-violet-900/50', accent: 'text-violet-600 dark:text-violet-400' },
                ].map((item) => (
                  <div key={item.label} className={`bg-gradient-to-br ${item.gradient} border ${item.border} rounded-2xl p-6 text-center`}>
                    <p className={`text-xs font-semibold ${item.accent} uppercase tracking-wider mb-2`}>{item.label}</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(item.amount)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">~ {formatCurrency(item.emi)} / mo EMI</p>
                  </div>
                ))}
              </div>

              {/* Eligibility band */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${assessment.eligibilityBand === 'high'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                }`}>
                {assessment.eligibilityBand === 'high' ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                )}
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 flex-wrap">
                    {assessment.eligibilityBand === 'high' ? 'Excellent Eligibility' : 'Moderate Eligibility'}
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                      FOIR: {(assessment.foir * 100).toFixed(1)}%
                    </span>
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Based on your income and existing obligations, you have {formatCurrency(assessment.availableEMIPaise)} of available EMI capacity.
                  </p>
                </div>
              </div>

              {/* Lenders */}
              {assessment.lendersShown && assessment.lendersShown.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Home className="h-5 w-5 text-lime-500" />
                    Recommended Lenders
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assessment.lendersShown.map((lender: any, idx: number) => (
                      <LenderCard key={idx} lender={lender} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
