import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ featureKey, children, fallback }) => {
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [requiredPlan, setRequiredPlan] = useState<string>('plus');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await api.get(`/plans/can-access/${featureKey}`);
        setCanAccess(res.data.data.allowed);
        if (!res.data.data.allowed) {
          setRequiredPlan(res.data.data.requiredPlan || 'plus');
        }
      } catch (err) {
        console.error('Feature check failed', err);
        setCanAccess(false);
      }
    };
    checkAccess();
  }, [featureKey]);

  if (canAccess === null) return null; // loading state

  if (canAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center my-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lime-100 text-lime-600 mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Premium Feature</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        This feature requires the <span className="font-semibold capitalize text-gray-900">{requiredPlan}</span> plan. Upgrade to unlock powerful new tools.
      </p>
      <Link
        to="/pricing"
        className="inline-block px-6 py-2 bg-lime-500 text-black font-semibold rounded-lg hover:bg-lime-600 transition-colors"
      >
        View Plans
      </Link>
    </div>
  );
};
