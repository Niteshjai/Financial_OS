import { useFamilyStore } from '../../store/familyStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { TrendingUp, Users } from 'lucide-react';

export default function FamilyNetWorth() {
  const { netWorth, history } = useFamilyStore();

  if (!netWorth) return null;

  // Format data for Recharts
  const chartData = (history || []).map(h => ({
    name: new Date(h.month).toLocaleDateString('en-IN', { month: 'short' }),
    value: (h.totalPaise || 0) / 100
  }));

  const totalRupees = (netWorth.totalPaise || 0) / 100;
  const activeMembersCount = netWorth.members?.length || 1;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1A1D27] border border-zinc-200/70 dark:border-[#2E3148] p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-lime-500" />
            Combined Net Worth
          </span>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(totalRupees)}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Users className="size-3.5" />
          {activeMembersCount} {activeMembersCount === 1 ? 'Member' : 'Members'} Active
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="familyNetWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#84cc16" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-100 dark:text-zinc-800/80" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12 }}
                className="text-zinc-400 dark:text-zinc-500"
                dy={8}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12 }}
                className="text-zinc-400 dark:text-zinc-500"
                tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-zinc-900 dark:bg-zinc-800 text-white p-3 border border-white/10 shadow-xl rounded-xl">
                        <p className="text-xs text-zinc-400 mb-1">{payload[0].payload.name}</p>
                        <p className="text-sm font-bold text-lime-400">
                          {formatCurrency(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#84cc16"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#familyNetWorthGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
            No historical trend data yet. Balances will record monthly.
          </div>
        )}
      </div>
    </div>
  );
}
