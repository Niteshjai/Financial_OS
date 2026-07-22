import React from 'react';
import { Check, X } from 'lucide-react';

interface PlanCardProps {
  plan: any; // We'll type this properly later, but it matches PlanDefinition
  isCurrentPlan: boolean;
  onSubscribe: (planId: string, billingCycle: 'monthly'|'yearly') => void;
  billingCycle: 'monthly' | 'yearly';
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, isCurrentPlan, onSubscribe, billingCycle }) => {
  const isB2b = plan.id === 'b2b';
  const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  const displayPrice = isB2b ? 'Custom' : `₹${price / 100}`;
  
  return (
    <div className={`relative flex flex-col p-6 bg-white rounded-2xl shadow-xl border-2 ${plan.isPopular ? 'border-lime-500' : 'border-gray-100'} transition-transform hover:-translate-y-1`}>
      {plan.isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-lime-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
          Most Popular
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-xl font-bold" style={{ color: plan.color }}>{plan.name}</h3>
        <p className="text-gray-500 text-sm mt-1">{plan.tagline}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-extrabold">{displayPrice}</span>
        {!isB2b && <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>}
      </div>

      <button
        onClick={() => !isCurrentPlan && onSubscribe(plan.id, billingCycle)}
        disabled={isCurrentPlan}
        className={`w-full py-3 px-4 rounded-xl font-bold mb-8 transition-colors ${
          isCurrentPlan
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : plan.isPopular
            ? 'bg-lime-500 text-black hover:bg-lime-600'
            : 'bg-black text-white hover:bg-gray-800'
        }`}
      >
        {isCurrentPlan ? 'Current Plan' : isB2b ? 'Contact Sales' : 'Upgrade'}
      </button>

      <div className="flex-1">
        <p className="font-semibold text-sm mb-4">What's included:</p>
        <ul className="space-y-3 mb-6">
          {plan.highlights.map((highlight: string, idx: number) => (
            <li key={idx} className="flex items-start gap-3 text-sm">
              <Check className="w-5 h-5 text-lime-600 shrink-0" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        {plan.notIncluded?.length > 0 && (
          <>
            <p className="font-semibold text-sm mb-4 text-gray-400">Not included:</p>
            <ul className="space-y-3">
              {plan.notIncluded.map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-400">
                  <X className="w-5 h-5 text-gray-300 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
