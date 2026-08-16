// ═══════════════════════════════════════════════════════════════
// AssetMap — Manual Asset Categories
// Complete configuration for every asset category
// Drives both the frontend form and backend validation
// ═══════════════════════════════════════════════════════════════

export interface FieldConfig {
  key:          string
  label:        string
  type:         'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea'
  required:     boolean
  options?:     string[]
  placeholder?: string
  helpText?:    string
  unit?:        string
  min?:         number
  max?:         number
}

export interface AssetCategoryConfig {
  category:              string
  label:                 string
  emoji:                 string
  description:           string
  group:                 'physical' | 'financial' | 'business'
  color:                 string
  defaultLiquidityScore: number
  defaultRiskLevel:      string
  isCollateralEligible:  boolean
  defaultLTV?:           number
  valuationHelpText:     string
  extraFields:           FieldConfig[]
}

export const ASSET_CATEGORIES: Record<string, AssetCategoryConfig> = {

  GOLD_PHYSICAL: {
    category:              'GOLD_PHYSICAL',
    label:                 'Gold',
    emoji:                 '🥇',
    description:           'Jewellery, coins, bars, or any gold you hold physically',
    group:                 'physical',
    color:                 '#B8860B',
    defaultLiquidityScore: 70,
    defaultRiskLevel:      'low',
    isCollateralEligible:  true,
    defaultLTV:            75,
    valuationHelpText:     'Value based on current gold rate × weight. Check MCX for daily gold price.',
    extraFields: [
      { key: 'weight_grams', label: 'Total weight', type: 'number', required: true, placeholder: '50', unit: 'grams', helpText: 'Total gold weight in grams', min: 0.1 },
      { key: 'purity', label: 'Gold purity', type: 'select', required: true, options: ['24K (99.9%)', '22K (91.6%)', '18K (75%)', '14K (58.3%)', 'Other'], helpText: 'Most Indian jewellery is 22K.' },
      { key: 'form', label: 'Form', type: 'select', required: true, options: ['Jewellery', 'Coin', 'Bar', 'Biscuit', 'Other'] },
      { key: 'storage_location', label: 'Where is it stored?', type: 'select', required: false, options: ['Home', 'Bank locker', 'Safe deposit', 'With family', 'Other'] },
      { key: 'is_hallmarked', label: 'BIS Hallmarked?', type: 'boolean', required: false, helpText: 'BIS hallmark confirms purity — hallmarked gold is easier to sell.' },
      { key: 'insured', label: 'Is it insured?', type: 'boolean', required: false },
    ]
  },

  VEHICLE: {
    category:              'VEHICLE',
    label:                 'Vehicle',
    emoji:                 '🚗',
    description:           'Car, bike, truck, tractor, or any other vehicle',
    group:                 'physical',
    color:                 '#4A5568',
    defaultLiquidityScore: 40,
    defaultRiskLevel:      'low',
    isCollateralEligible:  true,
    defaultLTV:            70,
    valuationHelpText:     'Check CarDekho or Spinny for used car market value. Depreciation: ~15%/year.',
    extraFields: [
      { key: 'vehicle_type', label: 'Type of vehicle', type: 'select', required: true, options: ['Car (4-wheeler)', 'Motorcycle / Scooter', 'Truck / Commercial vehicle', 'Tractor / Farm vehicle', 'Auto-rickshaw', 'Electric vehicle', 'Boat / Watercraft', 'Other'] },
      { key: 'make', label: 'Make', type: 'text', required: true, placeholder: 'e.g. Maruti Suzuki, Honda, Tata' },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g. Swift, City, Nexon' },
      { key: 'year', label: 'Year of manufacture', type: 'number', required: true, min: 1980, max: new Date().getFullYear() + 1, placeholder: '2020' },
      { key: 'registration_number', label: 'Registration number', type: 'text', required: false, placeholder: 'MH01AB1234', helpText: 'Not stored publicly — used for insurance reminders only' },
      { key: 'fuel_type', label: 'Fuel type', type: 'select', required: false, options: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'Other'] },
      { key: 'loan_outstanding', label: 'Loan outstanding?', type: 'boolean', required: false, helpText: 'If yes, add the loan as a separate liability entry' },
      { key: 'is_insured', label: 'Is it insured?', type: 'boolean', required: false },
    ]
  },

  RESIDENTIAL_PROPERTY: {
    category:              'RESIDENTIAL_PROPERTY',
    label:                 'Home / Flat',
    emoji:                 '🏠',
    description:           'House, flat, villa, or apartment you own',
    group:                 'physical',
    color:                 '#2D6A4F',
    defaultLiquidityScore: 15,
    defaultRiskLevel:      'medium',
    isCollateralEligible:  true,
    defaultLTV:            75,
    valuationHelpText:     'Use current market rate per sq ft × area. Check PropTiger or 99acres for locality rates.',
    extraFields: [
      { key: 'property_type', label: 'Property type', type: 'select', required: true, options: ['Independent house', 'Flat / Apartment', 'Villa', 'Row house', 'Penthouse', 'Other'] },
      { key: 'area_sqft', label: 'Built-up area', type: 'number', required: true, unit: 'sq ft', placeholder: '1200', min: 100 },
      { key: 'city', label: 'City', type: 'text', required: true, placeholder: 'Mumbai' },
      { key: 'locality', label: 'Locality / Area', type: 'text', required: true, placeholder: 'Bandra West' },
      { key: 'ownership_type', label: 'Ownership type', type: 'select', required: true, options: ['Sole ownership', 'Joint ownership', 'Inherited', 'Co-operative society'] },
      { key: 'is_self_occupied', label: 'Occupancy status', type: 'select', required: false, options: ['Self-occupied', 'Rented out', 'Vacant', 'Under construction'] },
      { key: 'monthly_rent', label: 'Monthly rental income (if rented)', type: 'number', required: false, unit: '₹', placeholder: '25000' },
      { key: 'has_home_loan', label: 'Home loan outstanding?', type: 'boolean', required: false },
    ]
  },

  COMMERCIAL_PROPERTY: {
    category:              'COMMERCIAL_PROPERTY',
    label:                 'Shop / Office',
    emoji:                 '🏢',
    description:           'Shop, office, warehouse, or any commercial space',
    group:                 'physical',
    color:                 '#1A365D',
    defaultLiquidityScore: 12,
    defaultRiskLevel:      'medium',
    isCollateralEligible:  true,
    defaultLTV:            60,
    valuationHelpText:     'Commercial property valued at current market rate per sq ft.',
    extraFields: [
      { key: 'property_type', label: 'Type', type: 'select', required: true, options: ['Shop', 'Office', 'Warehouse / Godown', 'Industrial plot', 'Showroom', 'Other'] },
      { key: 'area_sqft', label: 'Area', type: 'number', required: true, unit: 'sq ft', min: 100 },
      { key: 'city', label: 'City', type: 'text', required: true },
      { key: 'locality', label: 'Locality', type: 'text', required: true },
      { key: 'is_rented', label: 'Currently rented out?', type: 'boolean', required: false },
      { key: 'monthly_rent', label: 'Monthly rent received', type: 'number', required: false, unit: '₹' },
    ]
  },

  AGRICULTURAL_LAND: {
    category:              'AGRICULTURAL_LAND',
    label:                 'Farm / Agricultural land',
    emoji:                 '🌾',
    description:           'Agricultural land not in your Aadhaar land registry data',
    group:                 'physical',
    color:                 '#276221',
    defaultLiquidityScore: 8,
    defaultRiskLevel:      'low',
    isCollateralEligible:  true,
    defaultLTV:            50,
    valuationHelpText:     'Agriculture land value varies widely by state. Use recent local sale prices.',
    extraFields: [
      { key: 'area_acres', label: 'Area', type: 'number', required: true, unit: 'acres', min: 0.01, placeholder: '2.5' },
      { key: 'district', label: 'District', type: 'text', required: true, placeholder: 'Nashik' },
      { key: 'state', label: 'State', type: 'text', required: true, placeholder: 'Maharashtra' },
      { key: 'survey_number', label: 'Survey / Khasra number', type: 'text', required: false, placeholder: '142/B' },
      { key: 'land_type', label: 'Land type', type: 'select', required: false, options: ['Irrigated', 'Rain-fed / Dry land', 'Orchard', 'Fallow', 'Other'] },
      { key: 'title_status', label: 'Title status', type: 'select', required: false, options: ['Clear', 'Under mutation', 'Joint ownership', 'Disputed', 'Unknown'] },
    ]
  },

  ART_COLLECTIBLE: {
    category:              'ART_COLLECTIBLE',
    label:                 'Art / Collectibles',
    emoji:                 '🎨',
    description:           'Paintings, antiques, watches, coins, stamps, or any collectible',
    group:                 'physical',
    color:                 '#6B4226',
    defaultLiquidityScore: 20,
    defaultRiskLevel:      'high',
    isCollateralEligible:  false,
    valuationHelpText:     'Use last auction price, certificate of appraisal, or your own conservative estimate.',
    extraFields: [
      { key: 'item_type', label: 'Type', type: 'select', required: true, options: ['Painting / Artwork', 'Antique furniture', 'Luxury watch', 'Coin / Numismatic', 'Stamp / Philatelic', 'Sculpture', 'Vintage vehicle', 'Wine / Spirits', 'Diamonds / Gems', 'Other'] },
      { key: 'artist_maker', label: 'Artist / Maker', type: 'text', required: false, placeholder: 'M.F. Husain / Rolex' },
      { key: 'year_created', label: 'Year created / manufactured', type: 'number', required: false, min: 1 },
      { key: 'has_certificate', label: 'Certificate of authenticity?', type: 'boolean', required: false },
      { key: 'is_insured', label: 'Insured?', type: 'boolean', required: false, helpText: 'High-value art should be separately insured' },
    ]
  },

  OTHER_PHYSICAL: {
    category:              'OTHER_PHYSICAL',
    label:                 'Other physical asset',
    emoji:                 '📦',
    description:           'Any physical asset not covered by the categories above',
    group:                 'physical',
    color:                 '#4A5568',
    defaultLiquidityScore: 20,
    defaultRiskLevel:      'medium',
    isCollateralEligible:  false,
    valuationHelpText:     'Enter your best estimate of the current market value.',
    extraFields: [
      { key: 'asset_type_description', label: 'Describe the asset', type: 'textarea', required: true, placeholder: 'e.g. Industrial machinery, timber stock, livestock...' },
    ]
  },

  CRYPTO: {
    category:              'CRYPTO',
    label:                 'Cryptocurrency',
    emoji:                 '₿',
    description:           'Bitcoin, Ethereum, or any cryptocurrency',
    group:                 'financial',
    color:                 '#F7931A',
    defaultLiquidityScore: 85,
    defaultRiskLevel:      'very_high',
    isCollateralEligible:  false,
    valuationHelpText:     'Use current exchange rate from CoinGecko or your exchange. Crypto is highly volatile.',
    extraFields: [
      { key: 'token_name', label: 'Cryptocurrency name', type: 'text', required: true, placeholder: 'Bitcoin' },
      { key: 'token_symbol', label: 'Symbol / Ticker', type: 'text', required: true, placeholder: 'BTC' },
      { key: 'quantity', label: 'Quantity held', type: 'number', required: true, placeholder: '0.5', min: 0.000001, helpText: 'Number of tokens/coins you hold' },
      { key: 'storage_type', label: 'Where is it held?', type: 'select', required: true, options: ['Exchange (WazirX, CoinDCX etc.)', 'Hardware wallet (Ledger, Trezor)', 'Software wallet', 'Cold storage (paper wallet)', 'Staked / DeFi protocol'] },
      { key: 'exchange_name', label: 'Exchange name (if on exchange)', type: 'text', required: false, placeholder: 'WazirX, CoinDCX, Binance' },
      { key: 'purchase_price_per_token', label: 'Purchase price per token (₹)', type: 'number', required: false, unit: '₹', helpText: 'Used to calculate gain/loss' },
    ]
  },

  FOREIGN_ASSET: {
    category:              'FOREIGN_ASSET',
    label:                 'Foreign / NRI asset',
    emoji:                 '🌍',
    description:           'Bank accounts, property, or investments outside India',
    group:                 'financial',
    color:                 '#2B6CB0',
    defaultLiquidityScore: 35,
    defaultRiskLevel:      'medium',
    isCollateralEligible:  false,
    valuationHelpText:     'Enter the current market value converted to INR at today\'s rate.',
    extraFields: [
      { key: 'asset_type', label: 'Type of foreign asset', type: 'select', required: true, options: ['Foreign bank account', 'NRE account', 'FCNR deposit', 'Foreign property', 'Foreign stocks / ETFs', 'Foreign pension / 401k', 'Foreign business stake', 'Other'] },
      { key: 'country', label: 'Country', type: 'text', required: true, placeholder: 'United States' },
      { key: 'foreign_currency', label: 'Currency', type: 'select', required: true, options: ['USD', 'GBP', 'EUR', 'AED', 'SGD', 'AUD', 'CAD', 'CHF', 'JPY', 'Other'] },
      { key: 'amount_in_foreign_currency', label: 'Amount in foreign currency', type: 'number', required: false, placeholder: '10000' },
      { key: 'institution_name', label: 'Bank / Institution name', type: 'text', required: false, placeholder: 'Bank of America, Schwab' },
      { key: 'fema_compliant', label: 'FEMA compliant / declared to RBI?', type: 'boolean', required: false, helpText: 'Foreign assets must be declared under FEMA. Consult a CA.' },
    ]
  },

  UNLISTED_EQUITY: {
    category:              'UNLISTED_EQUITY',
    label:                 'Unlisted shares / Startup stake',
    emoji:                 '📊',
    description:           'Shares in a private company, startup equity, or ESOP',
    group:                 'financial',
    color:                 '#553C9A',
    defaultLiquidityScore: 10,
    defaultRiskLevel:      'very_high',
    isCollateralEligible:  false,
    valuationHelpText:     'Use last funding round valuation × your % stake. Be conservative.',
    extraFields: [
      { key: 'company_name', label: 'Company name', type: 'text', required: true, placeholder: 'Acme Technologies Pvt Ltd' },
      { key: 'cin', label: 'CIN (Company Identification Number)', type: 'text', required: false, placeholder: 'U72200MH2020PTC123456', helpText: 'Optional — helps verify on MCA21' },
      { key: 'stake_type', label: 'Type of stake', type: 'select', required: true, options: ['Equity shares', 'Preference shares', 'ESOPs (vested)', 'ESOPs (unvested)', 'Convertible notes', 'Warrants', 'Other'] },
      { key: 'number_of_shares', label: 'Number of shares / units', type: 'number', required: false, min: 1 },
      { key: 'stake_pct', label: 'Ownership percentage', type: 'number', required: false, unit: '%', placeholder: '2.5', min: 0.001, max: 100 },
      { key: 'last_funding_round', label: 'Last funding round', type: 'select', required: false, options: ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Pre-IPO', 'Bootstrapped'] },
      { key: 'vesting_schedule', label: 'Vesting schedule (if ESOP)', type: 'text', required: false, placeholder: '4 years, 1-year cliff' },
    ]
  },

  CHIT_FUND: {
    category:              'CHIT_FUND',
    label:                 'Chit Fund',
    emoji:                 '🏦',
    description:           'Active chit fund membership',
    group:                 'financial',
    color:                 '#285E61',
    defaultLiquidityScore: 30,
    defaultRiskLevel:      'medium',
    isCollateralEligible:  false,
    valuationHelpText:     'Enter total amount you will receive at the end of the chit cycle.',
    extraFields: [
      { key: 'chit_company', label: 'Chit fund company', type: 'text', required: true, placeholder: 'Shriram Chits, Muthoot Chits' },
      { key: 'chit_value', label: 'Total chit value (₹)', type: 'number', required: true, unit: '₹', placeholder: '100000' },
      { key: 'monthly_contribution', label: 'Monthly contribution (₹)', type: 'number', required: true, unit: '₹', placeholder: '5000' },
      { key: 'duration_months', label: 'Total duration', type: 'number', required: true, unit: 'months', placeholder: '20' },
      { key: 'months_completed', label: 'Months completed', type: 'number', required: true, min: 0, placeholder: '8' },
      { key: 'already_received_prize', label: 'Already received the prize?', type: 'boolean', required: true, helpText: 'If yes, asset value = what you still owe.' },
    ]
  },

  MONEY_LENT: {
    category:              'MONEY_LENT',
    label:                 'Money lent to someone',
    emoji:                 '🤝',
    description:           'Personal loans you have given to family, friends, or anyone',
    group:                 'financial',
    color:                 '#744210',
    defaultLiquidityScore: 15,
    defaultRiskLevel:      'high',
    isCollateralEligible:  false,
    valuationHelpText:     'Enter the outstanding amount owed to you. Be realistic about recovery.',
    extraFields: [
      { key: 'borrower_name', label: 'Borrower name', type: 'text', required: true, placeholder: 'Amit Kumar (cousin)', helpText: 'Stored privately' },
      { key: 'relationship', label: 'Relationship', type: 'select', required: false, options: ['Family', 'Friend', 'Colleague', 'Business associate', 'Other'] },
      { key: 'loan_date', label: 'Date loan was given', type: 'date', required: false },
      { key: 'expected_repayment_date', label: 'Expected repayment date', type: 'date', required: false },
      { key: 'interest_rate_pct', label: 'Interest rate (if any)', type: 'number', required: false, unit: '% p.a.', placeholder: '0' },
      { key: 'has_written_agreement', label: 'Written agreement exists?', type: 'boolean', required: false, helpText: 'Strengthens your legal claim' },
      { key: 'recovery_confidence', label: 'Confidence of recovery', type: 'select', required: false, options: ['Very confident', 'Fairly confident', 'Uncertain', 'Unlikely'], helpText: 'Used to calculate risk-adjusted net worth' },
    ]
  },

  CASH: {
    category:              'CASH',
    label:                 'Cash',
    emoji:                 '💵',
    description:           'Physical cash at home, in a safe, or with someone',
    group:                 'financial',
    color:                 '#276749',
    defaultLiquidityScore: 100,
    defaultRiskLevel:      'very_low',
    isCollateralEligible:  false,
    valuationHelpText:     'Enter the total amount in cash. Large holdings may have tax implications.',
    extraFields: [
      { key: 'location', label: 'Where is the cash kept?', type: 'select', required: false, options: ['Home', 'Safe / Locker', 'With family member', 'Other'] },
      { key: 'currency', label: 'Currency', type: 'select', required: false, options: ['INR', 'USD', 'GBP', 'EUR', 'AED', 'SGD', 'Other'] },
    ]
  },

  OTHER_FINANCIAL: {
    category:              'OTHER_FINANCIAL',
    label:                 'Other financial asset',
    emoji:                 '💼',
    description:           'Any financial asset not covered above',
    group:                 'financial',
    color:                 '#2D3748',
    defaultLiquidityScore: 40,
    defaultRiskLevel:      'medium',
    isCollateralEligible:  false,
    valuationHelpText:     'Enter the current value of the asset.',
    extraFields: [
      { key: 'asset_type_description', label: 'Describe the asset', type: 'textarea', required: true, placeholder: 'e.g. NABARD bonds, old employer PF...' },
    ]
  },

  BUSINESS_OWNERSHIP: {
    category:              'BUSINESS_OWNERSHIP',
    label:                 'Business ownership',
    emoji:                 '🏭',
    description:           'Sole proprietorship, partnership share, or company stake',
    group:                 'business',
    color:                 '#1A202C',
    defaultLiquidityScore: 8,
    defaultRiskLevel:      'high',
    isCollateralEligible:  true,
    defaultLTV:            40,
    valuationHelpText:     'Business value = 2–5× annual profit is a common rule of thumb.',
    extraFields: [
      { key: 'business_name', label: 'Business name', type: 'text', required: true, placeholder: 'Sharma Enterprises' },
      { key: 'business_type', label: 'Type', type: 'select', required: true, options: ['Sole proprietorship', 'Partnership firm', 'Private limited company', 'LLP', 'HUF', 'Other'] },
      { key: 'industry', label: 'Industry / Sector', type: 'text', required: false, placeholder: 'Retail / Manufacturing / Services' },
      { key: 'ownership_pct', label: 'Ownership percentage', type: 'number', required: false, unit: '%', min: 0.01, max: 100, placeholder: '100' },
      { key: 'annual_revenue', label: 'Approx annual revenue (₹)', type: 'number', required: false, unit: '₹' },
      { key: 'annual_profit', label: 'Approx annual profit (₹)', type: 'number', required: false, unit: '₹' },
      { key: 'gstin', label: 'GSTIN', type: 'text', required: false, placeholder: '27AAAAA0000A1Z5' },
    ]
  },

  INTELLECTUAL_PROPERTY: {
    category:              'INTELLECTUAL_PROPERTY',
    label:                 'Intellectual Property',
    emoji:                 '💡',
    description:           'Patent, copyright, trademark value',
    group:                 'business',
    color:                 '#6B46C1',
    defaultLiquidityScore: 5,
    defaultRiskLevel:      'high',
    isCollateralEligible:  false,
    valuationHelpText:     'IP valuation is complex. Use last licensing deal or professional estimate.',
    extraFields: [
      { key: 'ip_type', label: 'Type', type: 'select', required: true, options: ['Patent', 'Copyright', 'Trademark', 'Trade secret', 'Other'] },
      { key: 'ip_name', label: 'Name / Title', type: 'text', required: true, placeholder: 'Patent #XYZ / Brand name' },
      { key: 'registration_number', label: 'Registration / Filing number', type: 'text', required: false },
      { key: 'expiry_date', label: 'Expiry date', type: 'date', required: false },
      { key: 'generates_revenue', label: 'Generates revenue?', type: 'boolean', required: false, helpText: 'Licensing income, royalties, etc.' },
    ]
  },

  OTHER_BUSINESS: {
    category:              'OTHER_BUSINESS',
    label:                 'Other business asset',
    emoji:                 '🏗️',
    description:           'Goodwill, brand value, inventory, or other business assets',
    group:                 'business',
    color:                 '#4A5568',
    defaultLiquidityScore: 10,
    defaultRiskLevel:      'medium',
    isCollateralEligible:  false,
    valuationHelpText:     'Enter your best estimate of the current value.',
    extraFields: [
      { key: 'asset_type_description', label: 'Describe the asset', type: 'textarea', required: true, placeholder: 'e.g. Shop inventory, goodwill, brand value...' },
    ]
  },
}

// Category groups for UI display
export const CATEGORY_GROUPS: Record<string, string[]> = {
  physical:  ['GOLD_PHYSICAL', 'VEHICLE', 'RESIDENTIAL_PROPERTY', 'COMMERCIAL_PROPERTY', 'AGRICULTURAL_LAND', 'ART_COLLECTIBLE', 'OTHER_PHYSICAL'],
  financial: ['CRYPTO', 'FOREIGN_ASSET', 'UNLISTED_EQUITY', 'CHIT_FUND', 'MONEY_LENT', 'CASH', 'OTHER_FINANCIAL'],
  business:  ['BUSINESS_OWNERSHIP', 'INTELLECTUAL_PROPERTY', 'OTHER_BUSINESS'],
}
