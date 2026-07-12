

const SERVICES = [
  {
    id: 'identity',
    title: 'Identity verification',
    price: 'Free',
    priceColor: 'bg-[#e6f4ea] text-[#137333]',
    description: 'Aadhaar OKYC login — scan QR or enter mobile, OTP confirms identity in under 30 seconds. No paperwork.',
    icon: 'badge',
    iconColor: 'text-[#3b82f6]',
    iconBg: 'bg-[#eff6ff]',
    chips: []
  },
  {
    id: 'dashboard',
    title: 'Unified asset dashboard',
    price: 'Free',
    priceColor: 'bg-[#e6f4ea] text-[#137333]',
    description: 'One visual view of bank accounts, mutual funds, stocks, insurance, NPS, and pension — pulled via Account Aggregator consent in real time.',
    icon: 'pie_chart',
    iconColor: 'text-[#10b981]',
    iconBg: 'bg-[#ecfdf5]',
    chips: ['Net worth summary', 'Category breakdown', 'Per-account detail']
  },
  {
    id: 'property',
    title: 'Land and property discovery',
    price: 'Free',
    priceColor: 'bg-[#e6f4ea] text-[#137333]',
    description: 'Search land parcels by name across linked states. Shows survey number, area, registration date, ownership status.',
    icon: 'location_on',
    iconColor: 'text-[#ea580c]',
    iconBg: 'bg-[#fff7ed]',
    chips: []
  },
  {
    id: 'estate',
    title: 'Deceased estate discovery',
    price: '₹2,000-4,000/case',
    priceColor: 'bg-[#feefe3] text-[#b06000]',
    description: 'Legal heir uploads death certificate + heir proof, platform discovers and maps all of the deceased\'s Aadhaar-linked financial and land assets.',
    icon: 'favorite',
    iconColor: 'text-[#db2777]',
    iconBg: 'bg-[#fdf2f8]',
    chips: ['Death cert upload', 'Heir verification', 'Asset discovery']
  },
  {
    id: 'report',
    title: 'PDF asset report export',
    price: '₹500-1,500',
    priceColor: 'bg-[#feefe3] text-[#b06000]',
    description: 'Lawyer or bank-ready PDF summarising net worth, all linked accounts, land holdings — used for probate filing or loan applications.',
    icon: 'description',
    iconColor: 'text-[#ca8a04]',
    iconBg: 'bg-[#fefce8]',
    chips: []
  }
];

export default function CoreServices() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm animate-[fade-in_0.3s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <h2 className="text-[#1a73e8] text-[13px] font-bold tracking-[0.05em] uppercase">
          Core Consumer Services — What an individual user gets
        </h2>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <span className="material-symbols-outlined text-[24px]">more_horiz</span>
        </button>
      </div>

      {/* Services List */}
      <div className="divide-y divide-gray-100">
        {SERVICES.map((svc) => (
          <div key={svc.id} className="py-6 flex items-start gap-5 hover:bg-gray-50/50 transition-colors -mx-4 px-4 rounded-xl">
            {/* Icon */}
            <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0 ${svc.iconBg}`}>
              <span className={`material-symbols-outlined text-[26px] ${svc.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {svc.icon}
              </span>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-3 mb-1.5">
                <h3 className="text-[17px] font-semibold text-gray-900">{svc.title}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-semibold tracking-wide ${svc.priceColor}`}>
                  {svc.price}
                </span>
              </div>
              
              <p className="text-[15px] text-gray-600 leading-relaxed mb-3">
                {svc.description}
              </p>
              
              {svc.chips.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {svc.chips.map((chip, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-[6px] border border-gray-200 text-gray-500 text-[12px] font-medium bg-white">
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
