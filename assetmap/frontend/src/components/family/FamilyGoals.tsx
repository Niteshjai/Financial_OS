import { useFamilyStore } from '../../store/familyStore';
import { formatCurrency } from '../../utils/formatters';

export default function FamilyGoals() {
  const { goals } = useFamilyStore();

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-black/[0.03] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Shared Family Goals</h3>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700">Add Goal</button>
      </div>

      {!goals || goals.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-gray-900">No goals set yet</p>
          <p className="text-xs text-gray-500 mt-1">Start tracking shared savings like a vacation or a house downpayment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm">
                    {goal.emoji || '🎯'}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{goal.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">{goal.goal_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(goal.current_amount_paise / 100)}</p>
                  <p className="text-xs text-gray-500">of {formatCurrency(goal.target_amount_paise / 100)}</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-black h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${goal.progressPct}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{goal.progressPct}% complete</span>
                {goal.contributions && goal.contributions.length > 0 && (
                  <span>{goal.contributions.length} contributions</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

