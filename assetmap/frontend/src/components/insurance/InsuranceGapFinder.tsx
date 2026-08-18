import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, ShieldCheck, Umbrella, Activity, HeartPulse, Loader2, IndianRupee, Users, CalendarClock, Landmark, Sparkles, ArrowLeft } from 'lucide-react';
import InsuranceCoverageCard from './InsuranceCoverageCard';

export default function InsuranceGapFinder() {
  const [profile, setProfile] = useState({
    annualIncomePaise: 120000000,
    age: 30,
    dependentsCount: 2,
    outstandingLoansPaise: 50000000,
    monthlyExpensesPaise: 4000000
  });

  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/insurance/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ profile })
      });
      const data = await response.json();
      if (data.success) {
        setAnalysis(data.data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: parseInt(e.target.value) || 0
    });
  };

  const handlePaiseInputChange = (name: 'annualIncomePaise' | 'outstandingLoansPaise' | 'monthlyExpensesPaise') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value) || 0;
    setProfile((prev) => ({
      ...prev,
      [name]: value * 100
    }));
  };

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
  };

  const annualIncome = profile.annualIncomePaise / 100;
  const monthlyExpenses = profile.monthlyExpensesPaise / 100;
  const outstandingLoans = profile.outstandingLoansPaise / 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8 relative">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-6">
            {analysis && (
              <Button variant="ghost" onClick={() => setAnalysis(null)} className="mt-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-2 px-0 hover:bg-transparent h-auto py-0">
                <ArrowLeft className="size-5" />
                <span className="text-base font-medium">Back</span>
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Umbrella className="h-8 w-8 text-lime-500" />
                Insurance Gap Finder
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2">Discover critical gaps in your family's protection.</p>
            </div>
          </div>
        </div>
      </div>

      {!analysis ? (
        <Card className="bg-white/80 dark:bg-[#1A1D27]/80 backdrop-blur-xl border border-zinc-200/50 dark:border-[#2E3148] shadow-sm rounded-2xl">
          <CardHeader className="pb-4 border-b border-zinc-200/50 dark:border-[#2E3148]">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Your Profile Details</CardTitle>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-500/10 px-2.5 py-1 text-xs font-medium text-lime-700 dark:text-lime-400">
                <Sparkles className="size-3.5" />
                Smart inputs
              </div>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Fill these details to generate a personalized insurance gap analysis.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <IndianRupee className="size-4 text-lime-500" />Annual Income
                </Label>
                <Input
                  name="annualIncomePaise"
                  type="number"
                  value={annualIncome}
                  onChange={handlePaiseInputChange('annualIncomePaise')}
                  className="w-full px-3 py-2 h-11 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 bg-white/50 dark:bg-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <CalendarClock className="size-4 text-lime-500" />Age
                </Label>
                <Input
                  name="age"
                  type="number"
                  value={profile.age}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 h-11 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 bg-white/50 dark:bg-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Users className="size-4 text-lime-500" />Number of Dependents
                </Label>
                <Input
                  name="dependentsCount"
                  type="number"
                  value={profile.dependentsCount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 h-11 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 bg-white/50 dark:bg-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Landmark className="size-4 text-lime-500" />Outstanding Loans
                </Label>
                <Input
                  name="outstandingLoansPaise"
                  type="number"
                  value={outstandingLoans}
                  onChange={handlePaiseInputChange('outstandingLoansPaise')}
                  className="w-full px-3 py-2 h-11 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 bg-white/50 dark:bg-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <IndianRupee className="size-4 text-lime-500" />Monthly Expenses
                </Label>
                <Input
                  name="monthlyExpensesPaise"
                  type="number"
                  value={monthlyExpenses}
                  onChange={handlePaiseInputChange('monthlyExpensesPaise')}
                  className="w-full px-3 py-2 h-11 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 bg-white/50 dark:bg-black/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 transition-all"
                />
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 bg-white/40 dark:bg-black/20 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 shadow-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Income</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatCurrency(profile.annualIncomePaise)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Loans</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatCurrency(profile.outstandingLoansPaise)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Monthly burn</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{formatCurrency(profile.monthlyExpensesPaise)}</p>
              </div>
            </div>

            <Button
              className="w-full mt-2 h-11 rounded-xl bg-lime-400 hover:bg-lime-500 text-zinc-900 font-semibold shadow-[0_10px_20px_rgba(163,230,53,0.2)] hover:shadow-[0_14px_25px_rgba(163,230,53,0.3)] transition-all active:scale-[0.98]"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-zinc-900" />
                  Analyzing...
                </span>
              ) : 'Run Gap Analysis'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InsuranceCoverageCard
              title="Life & Term Cover"
              current={analysis.totalLifeCoverPaise + analysis.totalTermCoverPaise}
              recommended={analysis.recommendedLifePaise + analysis.recommendedTermPaise}
              gap={analysis.lifeGapPaise + analysis.termGapPaise}
              icon={<ShieldAlert className="h-6 w-6 text-purple-500 dark:text-purple-400" />}
            />
            <InsuranceCoverageCard
              title="Health Cover"
              current={analysis.totalHealthCoverPaise}
              recommended={analysis.recommendedHealthPaise}
              gap={analysis.healthGapPaise}
              icon={<HeartPulse className="h-6 w-6 text-rose-500 dark:text-rose-400" />}
            />
            <Card className="bg-white/80 dark:bg-[#1A1D27]/80 backdrop-blur-xl border border-zinc-200/50 dark:border-[#2E3148] shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Protection Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`text-4xl font-bold ${analysis.gapScore > 80 ? 'text-emerald-500' : analysis.gapScore > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {analysis.gapScore}/100
                  </div>
                  <Activity className="h-8 w-8 text-zinc-300 dark:text-zinc-600 opacity-50" />
                </div>
                <p className="text-sm mt-2 text-zinc-500 dark:text-zinc-400">Severity: <span className="uppercase font-semibold text-zinc-900 dark:text-white">{analysis.gapSeverity}</span></p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/80 dark:bg-[#1A1D27]/80 backdrop-blur-xl border border-zinc-200/50 dark:border-[#2E3148] shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-zinc-900 dark:text-white">Identified Gaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.gaps.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                  <ShieldCheck className="h-6 w-6" />
                  <span>Your insurance coverage looks solid. No major gaps found!</span>
                </div>
              ) : (
                analysis.gaps.map((gap: any, i: number) => (
                  <div key={i} className="p-4 bg-white dark:bg-zinc-950 rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-sm flex flex-col gap-2">
                    <h3 className="font-semibold text-rose-600 dark:text-rose-400">{gap.title}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{gap.description}</p>
                    <p className="text-sm font-medium mt-1 text-zinc-900 dark:text-zinc-200">Shortfall: {formatCurrency(gap.shortfall)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {analysis.recommendations?.length > 0 && (
            <Card className="bg-lime-50/80 dark:bg-lime-950/20 backdrop-blur-xl border border-lime-200 dark:border-lime-900/50 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-zinc-900 dark:text-white">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.recommendations.map((rec: any, i: number) => (
                  <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white/80 dark:bg-black/40 rounded-xl border border-lime-100 dark:border-lime-900/30 shadow-sm">
                    <div>
                      <h3 className="font-semibold text-lime-700 dark:text-lime-400">{rec.title}</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{rec.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4 md:mt-0 border-lime-200 dark:border-lime-800 text-lime-700 dark:text-lime-400 hover:bg-lime-50 dark:hover:bg-lime-900/30 bg-white/50 dark:bg-transparent backdrop-blur-sm"
                      onClick={async () => {
                        try {
                          await fetch('/api/insurance/affiliate-click', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                            },
                            body: JSON.stringify({ partner: 'policybazaar', productType: rec.type })
                          });
                        } catch (err) {
                          console.error('Failed to track click', err);
                        }
                        window.open(rec.affiliateUrl || 'https://www.policybazaar.com/', '_blank');
                      }}
                    >
                      View Plans
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
