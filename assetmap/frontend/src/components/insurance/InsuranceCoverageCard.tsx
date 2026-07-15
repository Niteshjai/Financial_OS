import { api } from '../../services/api';

interface Recommendation {
  type: string;
  title: string;
  description: string;
  minCover: number;
  estimatedPremiumPaise: number;
  affiliateUrl?: string;
}

export function InsuranceCoverageCard({ recommendation }: { recommendation: Recommendation }) {
  
  const handleTrackClick = () => {
    if (recommendation.affiliateUrl) {
      api.post('/insurance/affiliate-click', { partner: 'partner_network', productType: recommendation.type }).catch(console.error);
      window.open(recommendation.affiliateUrl, '_blank');
    }
  };

  return (
    <div className="border border-zinc-200 rounded-2xl p-5 flex flex-col justify-between hover:border-black transition-colors cursor-pointer" onClick={handleTrackClick}>
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-zinc-900">{recommendation.title}</h3>
          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">{recommendation.type}</span>
        </div>
        <p className="text-sm text-zinc-500 mb-4">{recommendation.description}</p>
      </div>
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-100">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-400">Est. Premium</span>
          <span className="font-medium text-zinc-900">₹{(recommendation.estimatedPremiumPaise / 100).toLocaleString('en-IN')}/yr</span>
        </div>
        <div className="bg-black text-white text-xs px-4 py-2 rounded-full font-medium">Explore</div>
      </div>
    </div>
  );
}
