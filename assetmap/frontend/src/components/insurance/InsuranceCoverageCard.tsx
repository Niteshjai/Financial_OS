import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Props {
  title: string;
  current: number;
  recommended: number;
  gap: number;
  icon: React.ReactNode;
}

export default function InsuranceCoverageCard({ title, current, recommended, gap, icon }: Props) {
  const formatCurrency = (paise: number) => {
    const v = paise / 100;
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    return `₹${Math.round(v).toLocaleString('en-IN')}`;
  };

  const progress = recommended > 0 ? Math.min(100, Math.round((current / recommended) * 100)) : 100;

  return (
    <Card className="bg-white/80 dark:bg-[#1A1D27]/80 backdrop-blur-xl border border-zinc-200/50 dark:border-[#2E3148] shadow-sm rounded-2xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(current)}</div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Recommended: {formatCurrency(recommended)}</p>
        
        <div className="w-full bg-zinc-200/60 dark:bg-zinc-800/60 h-2 mt-4 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
          <div 
            className={`h-full ${progress >= 100 ? 'bg-emerald-500' : progress > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {gap > 0 && (
          <p className="text-xs text-rose-500 dark:text-rose-400 font-medium mt-2">
            Gap: {formatCurrency(gap)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
