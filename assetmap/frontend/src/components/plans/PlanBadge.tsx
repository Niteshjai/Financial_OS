import React from 'react';

interface PlanBadgeProps {
  planId?: string;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ planId = 'free' }) => {
  if (planId === 'free') return null;

  const getStyle = () => {
    switch (planId) {
      case 'plus': return 'bg-lime-500 text-black border-lime-600';
      case 'pro': return 'bg-[#534AB7] text-white border-[#3d3686]';
      case 'b2b': return 'bg-[#0F6E56] text-white border-[#0a4d3c]';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${getStyle()} ml-2`}>
      {planId}
    </span>
  );
};
