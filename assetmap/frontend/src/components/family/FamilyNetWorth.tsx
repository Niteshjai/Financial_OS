import { useFamilyStore } from '../../store/familyStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

export default function FamilyNetWorth() {
  const { netWorth, history } = useFamilyStore();

  if (!netWorth) return null;

  // Format data for Recharts
  const chartData = history.map(h => ({
    name: new Date(h.month).toLocaleDateString('en-IN', { month: 'short' }),
    value: h.totalPaise / 100
  }));

  const totalRupees = netWorth.totalPaise / 100;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-black/[0.03] p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Combined Net Worth</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalRupees)}</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-sm font-medium">
          {netWorth.members?.length || 1} Members
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#6B7280' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">{payload[0].payload.name}</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#111827"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#111827', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            Not enough data for chart yet.
          </div>
        )}
      </div>
    </div>
  );
}

