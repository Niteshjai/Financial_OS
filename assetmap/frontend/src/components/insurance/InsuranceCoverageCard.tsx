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
    <Card className="bg-black border-neutral-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{formatCurrency(current)}</div>
        <p className="text-xs text-neutral-500 mt-1">Recommended: {formatCurrency(recommended)}</p>
        
        <div className="w-full bg-neutral-800 h-2 mt-4 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progress >= 100 ? 'bg-green-500' : progress > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {gap > 0 && (
          <p className="text-xs text-red-400 font-medium mt-2">
            Gap: {formatCurrency(gap)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
