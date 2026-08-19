import { useState, useEffect } from 'react';
import { Layers, RotateCw, ChevronDown, PieChart, TrendingUp, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

export default function SpendDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budgets' | 'subscriptions'>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/spend/summary');
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const reclassify = async () => {
    try {
      await api.post('/spend/reclassify');
      alert('Classification queued. Results will update shortly.');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading Spend Analytics...</div>;
  if (!data) return <div className="p-8 text-white">No data found.</div>;

  return (
    <div className="w-full max-w-[1400px] mx-auto pb-20 fade-in">
      
      {/* ════════ HEADER ════════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display text-zinc-900 dark:text-zinc-100 tracking-tight">Spend Analyser</h1>
          <p className="text-sm text-zinc-500 mt-1">AI-powered categorization and insights</p>
        </div>
        <div className="flex gap-3">
          <button onClick={reclassify} className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 dark:border-[#2E3148] text-sm hover:bg-zinc-50 dark:hover:bg-white/5 transition text-zinc-300">
            <RotateCw className="size-4" /> Reclassify
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E5F3FF] dark:bg-[#1A2744] text-[#0066FF] text-sm font-medium hover:bg-blue-100 dark:hover:bg-[#203155] transition">
            This Month <ChevronDown className="size-4" />
          </button>
        </div>
      </div>

      {/* ════════ TABS ════════ */}
      <div className="flex gap-8 border-b border-zinc-200 dark:border-[#2E3148] mb-8">
        {[
          { id: 'overview', label: 'Overview', icon: PieChart },
          { id: 'transactions', label: 'Transactions', icon: Layers },
          { id: 'budgets', label: 'Budgets', icon: TrendingUp },
          { id: 'subscriptions', label: 'Subscriptions', icon: RotateCw },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 pb-4 text-sm font-medium transition-colors relative ${
              activeTab === t.id 
                ? 'text-[#0066FF]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <t.icon className="size-4" />
            {t.label}
            {activeTab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ════════ CONTENT ════════ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1A1D27] rounded-[32px] p-8 border border-zinc-100 dark:border-[#2E3148]">
            <h2 className="text-xl font-display text-white mb-6">Expense Breakdown</h2>
            <div className="flex flex-col gap-4">
              {data.expenses.map((exp: any) => (
                <div key={exp.category} className="flex justify-between items-center p-4 rounded-2xl bg-zinc-50 dark:bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-zinc-200 dark:bg-[#2E3148] flex items-center justify-center">
                      🏷️
                    </div>
                    <div>
                      <div className="text-white font-medium">{exp.category}</div>
                      <div className="text-xs text-zinc-400">{exp.transaction_count} transactions</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">₹{(exp.total_paise / 100).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights Panel */}
          <div className="bg-white dark:bg-[#1A1D27] rounded-[32px] p-8 border border-zinc-100 dark:border-[#2E3148]">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="size-5 text-amber-500" />
              <h2 className="text-xl font-display text-white">AI Insights</h2>
            </div>
            
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
              <h3 className="text-sm font-medium text-amber-500 mb-1">High Spend Detected</h3>
              <p className="text-xs text-amber-500/80">Food & Dining is up 40% compared to last month.</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <h3 className="text-sm font-medium text-blue-400 mb-1">New Subscription</h3>
              <p className="text-xs text-blue-400/80">Spotify Premium was charged for the first time.</p>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'transactions' && (
        <TransactionList />
      )}
      
      {activeTab === 'budgets' && (
        <div className="p-8 text-zinc-400 bg-white/5 rounded-3xl text-center border border-white/10">
          Budgets UI coming soon...
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="p-8 text-zinc-400 bg-white/5 rounded-3xl text-center border border-white/10">
          Subscriptions UI coming soon...
        </div>
      )}

    </div>
  );
}

function TransactionList() {
  const [txs, setTxs] = useState<any[]>([]);
  
  useEffect(() => {
    api.get('/spend/transactions').then(res => setTxs(res.data.data.transactions)).catch(console.error);
  }, []);

  return (
    <div className="bg-white dark:bg-[#1A1D27] rounded-[32px] border border-zinc-100 dark:border-[#2E3148] overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-zinc-50 dark:bg-white/5 text-xs text-zinc-500 uppercase tracking-wider">
          <tr>
            <th className="px-6 py-4 font-medium">Date</th>
            <th className="px-6 py-4 font-medium">Merchant</th>
            <th className="px-6 py-4 font-medium">Category</th>
            <th className="px-6 py-4 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
          {txs.map((tx: any) => (
            <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition">
              <td className="px-6 py-4 text-sm text-zinc-400">
                {new Date(tx.transaction_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-zinc-200">{tx.merchant_name}</div>
                <div className="text-xs text-zinc-500 max-w-[300px] truncate">{tx.narration}</div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#2E3148] text-zinc-300">
                  {tx.category} • {tx.subcategory}
                </span>
                {tx.classified_by === 'claude_ai' && (
                  <span className="ml-2 text-[10px] text-purple-400">AI</span>
                )}
              </td>
              <td className={`px-6 py-4 text-sm font-medium text-right ${tx.transaction_type === 'credit' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                {tx.transaction_type === 'credit' ? '+' : '-'} ₹{(tx.amount_paise / 100).toLocaleString()}
              </td>
            </tr>
          ))}
          {txs.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                No transactions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
