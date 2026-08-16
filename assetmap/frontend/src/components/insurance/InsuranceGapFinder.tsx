import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert, ShieldCheck, Umbrella, Activity, HeartPulse, Loader2, IndianRupee, Users, CalendarClock, Landmark, Sparkles } from 'lucide-react';
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
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.12),transparent_38%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.10),transparent_42%)]" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Umbrella className="h-8 w-8 text-blue-500" />
            Insurance Gap Finder
          </h1>
          <p className="text-zinc-400 mt-2">Discover critical gaps in your family&apos;s protection.</p>
        </div>
      </div>

      {!analysis ? (
        <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <CardHeader className="pb-4 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-xl text-white">Your Profile Details</CardTitle>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-200">
                <Sparkles className="size-3.5" />
                Smart inputs
              </div>
            </div>
            <p className="text-sm text-zinc-400 mt-2">
              Fill these details to generate a personalized insurance gap analysis.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-zinc-200 flex items-center gap-2"><IndianRupee className="size-4 text-blue-300" />Annual Income</Label>
                <Input
                  name="annualIncomePaise"
                  type="number"
                  value={annualIncome}
                  onChange={handlePaiseInputChange('annualIncomePaise')}
                  className="h-11 bg-zinc-900/70 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-200 flex items-center gap-2"><CalendarClock className="size-4 text-blue-300" />Age</Label>
                <Input
                  name="age"
                  type="number"
                  value={profile.age}
                  onChange={handleInputChange}
                  className="h-11 bg-zinc-900/70 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-200 flex items-center gap-2"><Users className="size-4 text-blue-300" />Number of Dependents</Label>
                <Input
                  name="dependentsCount"
                  type="number"
                  value={profile.dependentsCount}
                  onChange={handleInputChange}
                  className="h-11 bg-zinc-900/70 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-200 flex items-center gap-2"><Landmark className="size-4 text-blue-300" />Outstanding Loans</Label>
                <Input
                  name="outstandingLoansPaise"
                  type="number"
                  value={outstandingLoans}
                  onChange={handlePaiseInputChange('outstandingLoansPaise')}
                  className="h-11 bg-zinc-900/70 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-zinc-200 flex items-center gap-2"><IndianRupee className="size-4 text-blue-300" />Monthly Expenses</Label>
                <Input
                  name="monthlyExpensesPaise"
                  type="number"
                  value={monthlyExpenses}
                  onChange={handlePaiseInputChange('monthlyExpensesPaise')}
                  className="h-11 bg-zinc-900/70 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Income</p>
                <p className="text-sm font-semibold text-zinc-100">{formatCurrency(profile.annualIncomePaise)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Loans</p>
                <p className="text-sm font-semibold text-zinc-100">{formatCurrency(profile.outstandingLoansPaise)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Monthly burn</p>
                <p className="text-sm font-semibold text-zinc-100">{formatCurrency(profile.monthlyExpensesPaise)}</p>
              </div>
            </div>

            <Button
              className="w-full mt-2 h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-[0_10px_30px_rgba(37,99,235,0.35)] hover:shadow-[0_14px_35px_rgba(37,99,235,0.45)] transition-all"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing...
                </span>
              ) : 'Run Gap Analysis'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InsuranceCoverageCard 
              title="Life & Term Cover"
              current={analysis.totalLifeCoverPaise + analysis.totalTermCoverPaise}
              recommended={analysis.recommendedLifePaise}
              gap={analysis.lifeGapPaise + analysis.termGapPaise}
              icon={<ShieldAlert className="h-6 w-6 text-purple-400" />}
            />
            <InsuranceCoverageCard 
              title="Health Cover"
              current={analysis.totalHealthCoverPaise}
              recommended={analysis.recommendedHealthPaise}
              gap={analysis.healthGapPaise}
              icon={<HeartPulse className="h-6 w-6 text-rose-400" />}
            />
            <Card className="bg-black border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Protection Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`text-4xl font-bold ${analysis.gapScore > 80 ? 'text-green-500' : analysis.gapScore > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {analysis.gapScore}/100
                  </div>
                  <Activity className="h-8 w-8 text-neutral-500 opacity-50" />
                </div>
                <p className="text-sm mt-2 text-neutral-400">Severity: <span className="uppercase font-semibold text-white">{analysis.gapSeverity}</span></p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-neutral-900/50 border-neutral-800">
            <CardHeader>
              <CardTitle>Identified Gaps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.gaps.length === 0 ? (
                <div className="flex items-center gap-2 text-green-500">
                  <ShieldCheck className="h-6 w-6" />
                  <span>Your insurance coverage looks solid. No major gaps found!</span>
                </div>
              ) : (
                analysis.gaps.map((gap: any, i: number) => (
                  <div key={i} className="p-4 bg-black rounded-lg border border-red-900/50 flex flex-col gap-2">
                    <h3 className="font-semibold text-red-400">{gap.title}</h3>
                    <p className="text-sm text-neutral-400">{gap.description}</p>
                    <p className="text-sm font-medium mt-1">Shortfall: {formatCurrency(gap.shortfall)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {analysis.recommendations?.length > 0 && (
            <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-900/50">
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.recommendations.map((rec: any, i: number) => (
                  <div key={i} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-black/40 rounded-lg border border-neutral-800">
                    <div>
                      <h3 className="font-semibold text-blue-400">{rec.title}</h3>
                      <p className="text-sm text-neutral-400 mt-1">{rec.description}</p>
                    </div>
                    <Button variant="outline" className="mt-4 md:mt-0 border-blue-600 text-blue-400 hover:bg-blue-900/30">
                      View Plans
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          <Button variant="ghost" onClick={() => setAnalysis(null)} className="w-full">
            Recalculate
          </Button>
        </div>
      )}
    </div>
  );
}
