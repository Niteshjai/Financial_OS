import React, { useEffect } from 'react';
import { usePlanStore } from '../../store/planStore';

interface PlanBadgeProps {
  planId?: string; // Optional override
  className?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ planId, className = '' }) => {
  const { planStatus, fetchPlanStatus, isLoading } = usePlanStore();
  const currentPlan = planStatus?.planId;

  useEffect(() => {
    if (!planId) {
      fetchPlanStatus();
    }
  }, [fetchPlanStatus, planId]);

  const activePlan = planId || currentPlan;

  if ((!planId && isLoading) || activePlan === 'free' || !activePlan) return null;

  const getStyle = () => {
    switch (activePlan) {
      case 'plus': return 'bg-lime-500 text-black border-lime-600';
      case 'pro': return 'bg-[#534AB7] text-white border-[#3d3686]';
      case 'b2b': return 'bg-[#0F6E56] text-white border-[#0a4d3c]';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${getStyle()} ml-2 ${className}`}>
      {activePlan}
    </span>
  );
};
