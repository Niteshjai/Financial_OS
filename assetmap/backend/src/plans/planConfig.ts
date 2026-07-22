export type PlanId = 'free' | 'plus' | 'pro' | 'b2b'
export type FeatureKey =
  | 'asset_dashboard'
  | 'land_records'
  | 'nominee_checker'
  | 'dormant_finder'
  | 'networth_tracker'
  | 'email_alerts'
  | 'sms_alerts'
  | 'push_alerts'
  | 'unclaimed_search'
  | 'success_fee_recovery'
  | 'pdf_report'
  | 'insurance_gap'
  | 'loan_eligibility'
  | 'digilocker_vault'
  | 'will_builder'
  | 'spend_analyser'
  | 'subscription_detector'
  | 'family_vault'
  | 'nri_cross_border'
  | 'ai_advisor'
  | 'credit_score'
  | 'tax_filing'
  | 'property_valuation'
  | 'loan_scoring'
  | 'api_access'
  | 'b2b_api'
  | 'white_label_sdk'
  | 'multi_client'

export interface PlanLimit {
  landParcels?:            number | null  // null = unlimited
  networthMonths?:         number | null
  pdfReportsPerMonth?:     number | null
  unclaimedSearchesPerYear?:number | null
  familyMembers?:          number | null
  willAllocations?:        number | null
  propertyValuationsPerMonth?: number | null
  aiMessagesPerMonth?:     number | null
  apiCallsPerMonth?:       number | null
}

export interface PlanDefinition {
  id:           PlanId
  name:         string
  tagline:      string
  priceMonthly: number    // paise
  priceYearly:  number    // paise
  savingsPct:   number
  isPopular:    boolean
  color:        string
  features:     FeatureKey[]
  limits:       PlanLimit
  highlights:   string[]  // bullet points shown on pricing page
  notIncluded:  string[]  // shown as X on pricing page
}

export const PLANS: Record<PlanId, PlanDefinition> = {

  free: {
    id:           'free',
    name:         'Free',
    tagline:      'Discover everything you own',
    priceMonthly: 0,
    priceYearly:  0,
    savingsPct:   0,
    isPopular:    false,
    color:        '#888780',
    features: [
      'asset_dashboard', 'land_records', 'nominee_checker',
      'dormant_finder', 'networth_tracker', 'email_alerts',
      'unclaimed_search', 'success_fee_recovery', 'pdf_report'
    ],
    limits: {
      landParcels:              3,
      networthMonths:           3,
      pdfReportsPerMonth:       1,
      unclaimedSearchesPerYear: 1,
      familyMembers:            1,
      willAllocations:          0,
      propertyValuationsPerMonth: 0,
      aiMessagesPerMonth:       0,
      apiCallsPerMonth:         0,
    },
    highlights: [
      'Asset discovery dashboard',
      'Land records (up to 3 parcels)',
      'Nominee checker',
      'Dormant account finder',
      'Net worth tracker (3 months)',
      '1 unclaimed asset search/year',
      'Success-fee recovery (free to start)',
      '1 PDF report/month',
    ],
    notIncluded: [
      'SMS and push alerts',
      'Insurance gap analysis',
      'Digital will builder',
      'Family vault',
      'AI financial advisor',
    ]
  },

  plus: {
    id:           'plus',
    name:         'Plus',
    tagline:      'For serious financial health',
    priceMonthly: 19900,
    priceYearly:  179900,
    savingsPct:   25,
    isPopular:    true,
    color:        '#185FA5',
    features: [
      'asset_dashboard', 'land_records', 'nominee_checker',
      'dormant_finder', 'networth_tracker', 'email_alerts',
      'sms_alerts', 'push_alerts', 'unclaimed_search',
      'success_fee_recovery', 'pdf_report', 'insurance_gap',
      'loan_eligibility', 'digilocker_vault', 'will_builder',
      'spend_analyser', 'subscription_detector'
    ],
    limits: {
      landParcels:              null,
      networthMonths:           24,
      pdfReportsPerMonth:       null,
      unclaimedSearchesPerYear: null,
      familyMembers:            1,
      willAllocations:          5,
      propertyValuationsPerMonth: 0,
      aiMessagesPerMonth:       0,
      apiCallsPerMonth:         0,
    },
    highlights: [
      'Everything in Free',
      'Unlimited land records',
      'SMS + push alerts',
      'Insurance gap finder',
      'Loan eligibility estimator',
      'DigiLocker document vault',
      'Digital will builder (5 allocations)',
      'Spend analyser + subscription detector',
      'Unlimited unclaimed searches',
      'Unlimited PDF reports',
    ],
    notIncluded: [
      'Family vault',
      'NRI cross-border view',
      'AI financial advisor',
      'Credit score monitoring',
      'Tax filing assistant',
    ]
  },

  pro: {
    id:           'pro',
    name:         'Pro',
    tagline:      'Complete financial control',
    priceMonthly: 49900,
    priceYearly:  449900,
    savingsPct:   25,
    isPopular:    false,
    color:        '#534AB7',
    features: [
      'asset_dashboard', 'land_records', 'nominee_checker',
      'dormant_finder', 'networth_tracker', 'email_alerts',
      'sms_alerts', 'push_alerts', 'unclaimed_search',
      'success_fee_recovery', 'pdf_report', 'insurance_gap',
      'loan_eligibility', 'digilocker_vault', 'will_builder',
      'spend_analyser', 'subscription_detector',
      'family_vault', 'nri_cross_border', 'ai_advisor',
      'credit_score', 'tax_filing', 'property_valuation',
      'loan_scoring', 'api_access'
    ],
    limits: {
      landParcels:              null,
      networthMonths:           null,
      pdfReportsPerMonth:       null,
      unclaimedSearchesPerYear: null,
      familyMembers:            4,
      willAllocations:          null,
      propertyValuationsPerMonth: 3,
      aiMessagesPerMonth:       50,
      apiCallsPerMonth:         100,
    },
    highlights: [
      'Everything in Plus',
      'Family vault (4 members)',
      'NRI cross-border view (India + UAE + SG)',
      'AI financial advisor (50 messages/month)',
      'Monthly credit score pull',
      'Tax filing assistant',
      'Property valuation reports (3/month)',
      'Advanced loan scoring matrix',
      'Unlimited will allocations + e-sign',
      'Personal API access (100 calls/month)',
      'White-glove onboarding call',
    ],
    notIncluded: [
      'B2B API access',
      'White-label SDK',
      'Multi-client dashboard',
    ]
  },

  b2b: {
    id:           'b2b',
    name:         'Business',
    tagline:      'For law firms, NBFCs and wealth managers',
    priceMonthly: 0,
    priceYearly:  0,
    savingsPct:   0,
    isPopular:    false,
    color:        '#0F6E56',
    features: [
      'asset_dashboard', 'land_records', 'nominee_checker',
      'dormant_finder', 'networth_tracker', 'email_alerts',
      'sms_alerts', 'push_alerts', 'unclaimed_search',
      'success_fee_recovery', 'pdf_report', 'insurance_gap',
      'loan_eligibility', 'digilocker_vault', 'will_builder',
      'spend_analyser', 'subscription_detector',
      'family_vault', 'nri_cross_border', 'ai_advisor',
      'credit_score', 'tax_filing', 'property_valuation',
      'loan_scoring', 'api_access',
      'b2b_api', 'white_label_sdk', 'multi_client'
    ],
    limits: {
      landParcels:              null,
      networthMonths:           null,
      pdfReportsPerMonth:       null,
      unclaimedSearchesPerYear: null,
      familyMembers:            null,
      willAllocations:          null,
      propertyValuationsPerMonth: null,
      aiMessagesPerMonth:       null,
      apiCallsPerMonth:         null,
    },
    highlights: [
      'Everything in Pro',
      'B2B API access (commercial)',
      'White-label embeddable SDK',
      'Multi-client dashboard',
      'Bulk user management',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom onboarding',
    ],
    notIncluded: []
  }
}

// Feature display names for UI
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  asset_dashboard:       'Asset discovery dashboard',
  land_records:          'Land & property records',
  nominee_checker:       'Nominee checker',
  dormant_finder:        'Dormant account finder',
  networth_tracker:      'Net worth tracker',
  email_alerts:          'Email alerts',
  sms_alerts:            'SMS alerts',
  push_alerts:           'Push notifications',
  unclaimed_search:      'Unclaimed asset search',
  success_fee_recovery:  'Success-fee recovery service',
  pdf_report:            'PDF asset reports',
  insurance_gap:         'Insurance gap analysis',
  loan_eligibility:      'Loan eligibility estimator',
  digilocker_vault:      'DigiLocker document vault',
  will_builder:          'Digital will builder',
  spend_analyser:        'Spend analyser',
  subscription_detector: 'Subscription detector',
  family_vault:          'Family vault',
  nri_cross_border:      'NRI cross-border view',
  ai_advisor:            'AI financial advisor',
  credit_score:          'Credit score monitoring',
  tax_filing:            'Tax filing assistant',
  property_valuation:    'Property valuation reports',
  loan_scoring:          'Loan scoring matrix',
  api_access:            'Personal API access',
  b2b_api:               'B2B API access (commercial)',
  white_label_sdk:       'White-label SDK',
  multi_client:          'Multi-client dashboard',
}
