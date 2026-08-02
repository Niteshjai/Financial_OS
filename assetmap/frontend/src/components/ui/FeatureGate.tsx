import React, { useEffect } from 'react';
import { usePlanStore } from '../../store/planStore';
import { Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideCompletely?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  featureKey, 
  children, 
  fallback,
  hideCompletely = false
}) => {
  const { hasFeature, fetchPlanStatus, isLoading } = usePlanStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlanStatus();
  }, [fetchPlanStatus]);

  if (isLoading) {
    return <div className="animate-pulse bg-gray-100 rounded-md h-full w-full min-h-[40px]"></div>;
  }

  const hasAccess = hasFeature(featureKey);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideCompletely) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback UI if they don't have access
  return (
    <div className="relative group overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 flex flex-col items-center justify-center text-center">
      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 transition-all group-hover:backdrop-blur-0"></div>
      
      <div className="z-20 flex flex-col items-center">
        <div className="size-12 bg-lime-100 rounded-full flex items-center justify-center mb-3">
          <Crown className="size-6 text-lime-600" />
        </div>
        <h4 className="font-semibold text-gray-900 mb-1">Premium Feature</h4>
        <p className="text-sm text-gray-500 mb-4 max-w-[250px]">
          Upgrade your plan to unlock this feature and take full control of your finances.
        </p>
        <button
          onClick={() => navigate('/pricing')}
          className="bg-black hover:bg-gray-800 text-white text-sm font-semibold py-2 px-5 rounded-full transition-colors"
        >
          View Plans
        </button>
      </div>
    </div>
  );
};
