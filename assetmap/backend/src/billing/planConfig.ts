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
  | 'api_access';

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  asset_dashboard: 'Asset Discovery Dashboard',
  land_records: 'Land Records',
  nominee_checker: 'Nominee Checker',
  dormant_finder: 'Dormant Asset Finder',
  networth_tracker: 'Net Worth Tracker',
  email_alerts: 'Email Alerts',
  sms_alerts: 'SMS Alerts',
  push_alerts: 'Push Notifications',
  unclaimed_search: 'Unclaimed Search',
  success_fee_recovery: 'Success-fee Recovery',
  pdf_report: 'PDF Reports',
  insurance_gap: 'Insurance Gap Finder',
  loan_eligibility: 'Loan Eligibility Checking',
  digilocker_vault: 'DigiLocker Vault',
  will_builder: 'Digital Will Builder',
  spend_analyser: 'Spend Analyser',
  subscription_detector: 'Subscription Detector',
  family_vault: 'Family Vault',
  nri_cross_border: 'NRI Cross-border View',
  ai_advisor: 'AI Financial Advisor',
  credit_score: 'Credit Score Tracking',
  tax_filing: 'Tax Filing Assistant',
  property_valuation: 'Property Valuation Reports',
  loan_scoring: 'Custom Loan Scoring',
  api_access: 'B2B API Access',
};

export type LimitKey =
  | 'limit_land_parcels'
  | 'limit_networth_months'
  | 'limit_pdf_reports_pm'
  | 'limit_unclaimed_searches_py'
  | 'limit_family_members'
  | 'limit_will_allocations'
  | 'limit_property_valuations_pm'
  | 'limit_ai_messages_pm'
  | 'limit_api_calls_pm';
