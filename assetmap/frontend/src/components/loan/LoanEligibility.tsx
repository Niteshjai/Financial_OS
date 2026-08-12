import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Landmark, TrendingUp, Home, CheckCircle2, AlertCircle } from 'lucide-react';
import LenderCard from './LenderCard';

export default function LoanEligibility() {
  const [inputs, setInputs] = useState({
    monthlyIncomePaise: 15000000, // ₹1.5L
    monthlyObligationsPaise: 4000000, // ₹40K
    totalAssetsPaise: 500000000, // ₹50L
    totalLandValuePaise: 800000000, // ₹80L
    existingLoansPaise: 0,
    creditScoreApprox: 760
  });

  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAssess = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/loan/assess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(inputs)
      });
      const data = await response.json();
      if (data.success) {
        setAssessment(data.data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Landmark className="h-8 w-8 text-sky-500" />
            Loan Eligibility Estimator
          </h1>
          <p className="text-muted-foreground mt-2">Find out your borrowing capacity based on your assets and income.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-black border-neutral-800 shadow-xl sticky top-8">
            <CardHeader>
              <CardTitle>Financial Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Monthly Income (₹)</Label>
                <Input name="monthlyIncomePaise" type="number" value={inputs.monthlyIncomePaise / 100} onChange={handleInputChange} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="space-y-2">
                <Label>Current Monthly EMIs (₹)</Label>
                <Input name="monthlyObligationsPaise" type="number" value={inputs.monthlyObligationsPaise / 100} onChange={handleInputChange} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="space-y-2">
                <Label>Total Value of Land/Property (₹)</Label>
                <Input name="totalLandValuePaise" type="number" value={inputs.totalLandValuePaise / 100} onChange={handleInputChange} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="space-y-2">
                <Label>Estimated Credit Score</Label>
                <Input name="creditScoreApprox" type="number" value={inputs.creditScoreApprox} onChange={handleInputChange} className="bg-neutral-900 border-neutral-800" />
              </div>

              <Button className="w-full mt-4 bg-sky-600 hover:bg-sky-700 text-white" onClick={handleAssess} disabled={loading}>
                {loading ? 'Calculating...' : 'Calculate Eligibility'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          {!assessment ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-black/40 border border-neutral-800 border-dashed rounded-xl p-8 text-center">
              <TrendingUp className="h-16 w-16 text-neutral-700 mb-4" />
              <h2 className="text-xl font-semibold text-neutral-300">Unlock your borrowing power</h2>
              <p className="text-neutral-500 max-w-md mt-2">Enter your financial details on the left to see how much you can borrow for a home loan, loan against property, or personal loan.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-sky-950/40 to-black border-sky-900/50">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm font-medium text-sky-400 mb-2">Max Home Loan</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(assessment.homeLoanMaxPaise)}</p>
                    <p className="text-xs text-neutral-400 mt-2">~ {formatCurrency(assessment.homeLoanEMI)} / mo EMI</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-950/40 to-black border-indigo-900/50">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm font-medium text-indigo-400 mb-2">Loan Against Property</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(assessment.lapMaxPaise)}</p>
                    <p className="text-xs text-neutral-400 mt-2">~ {formatCurrency(assessment.lapEMI)} / mo EMI</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-violet-950/40 to-black border-violet-900/50">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm font-medium text-violet-400 mb-2">Personal Loan</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(assessment.personalLoanMaxPaise)}</p>
                    <p className="text-xs text-neutral-400 mt-2">~ {formatCurrency(assessment.personalLoanEMI)} / mo EMI</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-3 p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
                {assessment.eligibilityBand === 'high' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-500" />
                )}
                <div>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    {assessment.eligibilityBand === 'high' ? 'Excellent Eligibility' : 'Moderate Eligibility'}
                    <span className="text-xs font-normal text-neutral-400 bg-black px-2 py-1 rounded-md border border-neutral-800">FOIR: {(assessment.foir * 100).toFixed(1)}%</span>
                  </h3>
                  <p className="text-sm text-neutral-400">Based on your income and existing obligations, you have {formatCurrency(assessment.availableEMIPaise)} of available EMI capacity.</p>
                </div>
              </div>

              {assessment.lendersShown && assessment.lendersShown.length > 0 && (
                <div className="space-y-4 pt-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Home className="h-5 w-5 text-sky-500" />
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
