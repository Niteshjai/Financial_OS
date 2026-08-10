import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PlanCard } from './PlanCard';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const [plansRes, statusRes] = await Promise.all([
          api.get('/plans'),
          api.get('/plans/status')
        ]);

        const plansData = plansRes.data.data.map((p: any) => ({
          id: p.slug,
          name: p.name,
          tagline: p.tagline,
          priceMonthly: p.price_monthly_paise,
          priceYearly: p.price_yearly_paise,
          isPopular: p.is_popular,
          color: p.slug === 'free' ? '#888780' : p.slug === 'plus' ? '#185FA5' : p.slug === 'pro' ? '#534AB7' : '#0F6E56',
          highlights: getHighlightsForPlan(p.slug),
          notIncluded: getNotIncludedForPlan(p.slug)
        }));

        setPlans(plansData);
        setCurrentPlan(statusRes.data.data.planId || 'free');
      } catch (err) {
        console.error('Failed to fetch plans', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const getHighlightsForPlan = (slug: string) => {
    if (slug === 'free') return ['Asset discovery dashboard', 'Land records (up to 3 parcels)', 'Net worth tracker (3 months)', '1 unclaimed asset search/year', 'Success-fee recovery', '1 PDF report/month'];
    if (slug === 'plus') return ['Everything in Free', 'Unlimited land records', 'SMS + push alerts', 'Insurance gap finder', 'DigiLocker document vault', 'Digital will builder (5)', 'Spend analyser', 'Unlimited unclaimed searches'];
    if (slug === 'pro') return ['Everything in Plus', 'Family vault (4 members)', 'NRI cross-border view', 'AI financial advisor', 'Monthly credit score pull', 'Tax filing assistant', 'Property valuation reports'];
    if (slug === 'b2b') return ['Everything in Pro', 'B2B API access', 'White-label embeddable SDK', 'Multi-client dashboard', 'Bulk user management', 'Dedicated account manager'];
    return [];
  }

  const getNotIncludedForPlan = (slug: string) => {
    if (slug === 'free') return ['SMS and push alerts', 'Digital will builder', 'Family vault', 'AI financial advisor'];
    if (slug === 'plus') return ['Family vault', 'NRI cross-border view', 'AI financial advisor'];
    return [];
  }

  const handleSubscribe = async (planId: string, cycle: 'monthly' | 'yearly') => {
    if (planId === 'b2b') {
      window.location.href = 'mailto:sales@assetmap.com';
      return;
    }

    try {
      const isUpgrade = currentPlan && currentPlan !== 'free';
      const endpoint = isUpgrade ? '/plans/upgrade' : '/plans/subscribe';
      const payload = isUpgrade ? { newPlanId: planId, billingCycle: cycle } : { planId, billingCycle: cycle };
      const res = await api.post(endpoint, payload);

      const subId = res.data.data.razorpaySubId;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_xxxxxx',
        subscription_id: subId,
        name: 'AssetMap',
        description: `Upgrade to ${planId.toUpperCase()}`,
        handler: function () {
          navigate('/dashboard');
          window.location.reload();
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error?.message || 'Failed to initiate subscription');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-zinc-900 font-sans flex items-center justify-center" style={{ contain: 'layout style', background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
        <div className="flex flex-col items-center">
          <div className="relative flex h-12 w-12 mb-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-12 w-12 bg-lime-500"></span>
          </div>
          <p className="text-xl font-semibold text-gray-800">Loading your plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative text-zinc-900 font-sans" style={{ contain: 'layout style', background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      <button
        onClick={() => navigate(-1)}
        className="absolute top-8 left-4 md:left-8 flex items-center gap-2 text-gray-700 bg-white/50 hover:bg-white backdrop-blur-sm px-4 py-2 rounded-full font-semibold transition-all shadow-sm z-10"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Take control of your financial life with the right plan for you.
          </p>

          <div className="mt-8 flex justify-center">
            <div className="relative flex items-center p-1 bg-gray-100 rounded-full border border-gray-200">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative rounded-full py-2.5 px-8 text-sm font-semibold whitespace-nowrap transition-colors ${billingCycle === 'monthly' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'
                  }`}
              >
                Monthly billing
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`relative rounded-full py-2.5 px-8 text-sm font-semibold whitespace-nowrap transition-colors ${billingCycle === 'yearly' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'
                  }`}
              >
                Yearly billing <span className="ml-1.5 text-lime-600 font-bold">Save 25%</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlan === plan.id}
              onSubscribe={handleSubscribe}
              billingCycle={billingCycle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
