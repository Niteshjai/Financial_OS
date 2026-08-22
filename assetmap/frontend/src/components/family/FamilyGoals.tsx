import { useFamilyStore } from '../../store/familyStore';
import { formatCurrency } from '../../utils/formatters';
import { Target, Plus } from 'lucide-react';

export default function FamilyGoals() {
  const { goals } = useFamilyStore();

  return (
    <div className="rounded-2xl bg-white dark:bg-[#1A1D27] border border-zinc-200/70 dark:border-[#2E3148] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Target className="size-4 text-lime-500" />
          Shared Family Goals
        </h3>
        <button 
          onClick={() => {}}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:text-lime-600 dark:hover:text-lime-400 bg-zinc-100 dark:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Add Goal</span>
        </button>
      </div>

      {!goals || goals.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center bg-zinc-50/50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="size-10 rounded-full bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-400 grid place-items-center mb-2">
            <Target className="size-5" />
          </div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No active goals yet</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
            Create a collaborative goal for your family (e.g. Vacation fund, Home down payment, Education).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const current = (goal.current_amount_paise || 0) / 100;
            const target = (goal.target_amount_paise || 1) / 100;
            const pct = Math.min(100, Math.round((current / target) * 100));

            return (
              <div 
                key={goal.id} 
                className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goal.emoji || '🎯'}</span>
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{goal.name}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{(goal.goal_type || 'Savings').replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{formatCurrency(current)}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">target: {formatCurrency(target)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-200 dark:bg-zinc-700/80 rounded-full h-2 overflow-hidden mb-2">
                  <div 
                    className="bg-gradient-to-r from-lime-400 to-emerald-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${pct}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <span className="text-lime-600 dark:text-lime-400 font-semibold">{pct}% reached</span>
                  <span>{goal.contributions?.length || 0} contributions</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
