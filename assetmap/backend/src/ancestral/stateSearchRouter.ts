// Defines capabilities per state and routes searches correctly

export type SearchMethod = 'surepass_api' | 'deep_link' | 'offline_guide'

export interface StateConfig {
  state:            string
  portal:           string
  portalUrl:        string
  searchMethod:     SearchMethod
  surepassEndpoint?: string    // Surepass API endpoint for this state
  supportsNameSearch: boolean
  locationRequired: ('district' | 'taluka' | 'village')[]
  formatsRequired:  string[]   // what docs to bring offline
  notes:            string
  tahsildarTip:     string
}

export const STATE_CONFIGS: Record<string, StateConfig> = {
  'maharashtra': {
    state:              'Maharashtra',
    portal:             'Mahabhulekh',
    portalUrl:          'https://bhulekh.mahabhumi.gov.in',
    searchMethod:       'surepass_api',
    surepassEndpoint:   '/kyc-api/api/v1/official-docs/land-record/maharashtra',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'],
    formatsRequired:    ['7/12 Utara', 'Form 8-A', 'Form VI'],
    notes:              '7/12 (Satbara) is the primary land record in Maharashtra',
    tahsildarTip:       'Ask for 7/12 Utara by owner name — staff can search by name',
  },
  'karnataka': {
    state:              'Karnataka',
    portal:             'Bhoomi',
    portalUrl:          'https://landrecords.karnataka.gov.in',
    searchMethod:       'surepass_api',
    surepassEndpoint:   '/kyc-api/api/v1/official-docs/land-record/karnataka',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'],
    formatsRequired:    ['RTC (Record of Rights, Tenancy and Crops)', 'Form 8-A'],
    notes:              'Bhoomi portal has comprehensive name-based search',
    tahsildarTip:       'Request RTC by owner name at Tahsildar or Hobli office',
  },
  'telangana': {
    state:              'Telangana',
    portal:             'Bhu Bharati',
    portalUrl:          'https://bhubharati.telangana.gov.in',
    searchMethod:       'surepass_api',
    surepassEndpoint:   '/kyc-api/api/v1/official-docs/land-record/telangana',
    supportsNameSearch: true,
    locationRequired:   ['district', 'mandal', 'village'] as any, // using 'taluka' conceptually, but keeping original structure compatible
    formatsRequired:    ['Pahani', 'ROR-1B'],
    notes:              'Dharani portal replaced by Bhu Bharati in April 2025. Use new portal.',
    tahsildarTip:       'MRO (Mandal Revenue Office) for village records',
  },
  'gujarat': {
    state:              'Gujarat',
    portal:             'AnyROR',
    portalUrl:          'https://anyror.gujarat.gov.in',
    searchMethod:       'surepass_api',
    surepassEndpoint:   '/kyc-api/api/v1/official-docs/land-record/gujarat',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'],
    formatsRequired:    ['7/12', 'Form 8-A', 'VF-6'],
    notes:              'AnyROR allows owner name search across all Gujarat districts',
    tahsildarTip:       'Mamlatdar office for taluka-level records',
  },
  'uttar_pradesh': {
    state:              'Uttar Pradesh',
    portal:             'UP Bhulekh',
    portalUrl:          'https://upbhulekh.gov.in',
    searchMethod:       'surepass_api',
    surepassEndpoint:   '/kyc-api/api/v1/official-docs/land-record/uttar-pradesh',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'] as any, // using tehsil mapping to taluka conceptually
    formatsRequired:    ['Khatauni (Form 45)', 'Khasra'],
    notes:              'Search by Gata number or owner name in UP Bhulekh',
    tahsildarTip:       'Lekhpal or Tehsildar office for Khatauni copy',
  },
  'madhya_pradesh': {
    state:              'Madhya Pradesh',
    portal:             'MP Bhulekh',
    portalUrl:          'https://mpbhulekh.gov.in',
    searchMethod:       'surepass_api',
    surepassEndpoint:   '/kyc-api/api/v1/official-docs/land-record/madhya-pradesh',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'] as any, // tehsil
    formatsRequired:    ['B-1 (Khasra)', 'P-II'],
    notes:              'MP Bhulekh has good name search in most districts',
    tahsildarTip:       'Patwari for village-level records, Tehsildar for certified copies',
  },
  'andhra_pradesh': {
    state:              'Andhra Pradesh',
    portal:             'Meebhoomi',
    portalUrl:          'https://meebhoomi.ap.gov.in',
    searchMethod:       'surepass_api',
    surepassEndpoint:   '/kyc-api/api/v1/official-docs/land-record/andhra-pradesh',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'] as any, // mandal
    formatsRequired:    ['Adangal (Form 1-B)', 'ROR-1B'],
    notes:              'Meebhoomi allows Aadhaar-linked searches too',
    tahsildarTip:       'Village Revenue Officer (VRO) for Adangal records',
  },
  'rajasthan': {
    state:              'Rajasthan',
    portal:             'Apna Khata',
    portalUrl:          'https://apnakhata.rajasthan.gov.in',
    searchMethod:       'deep_link',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'] as any, // tehsil
    formatsRequired:    ['Jamabandi (Khasra)', 'Nakal'],
    notes:              'Apna Khata has partial name search — deep link with pre-filled location',
    tahsildarTip:       'Patwari office (Girdawari) for village records',
  },
  'punjab': {
    state:              'Punjab',
    portal:             'Easy Jamabandi',
    portalUrl:          'https://jamabandi.punjab.gov.in',
    searchMethod:       'deep_link',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'] as any, // tehsil
    formatsRequired:    ['Jamabandi', 'Fard'],
    notes:              'Punjab launched Easy Jamabandi in June 2025 — improved name search',
    tahsildarTip:       'Patwari for village Jamabandi, Tehsildar for certified copies',
  },
  'haryana': {
    state:              'Haryana',
    portal:             'Jamabandi Nakal',
    portalUrl:          'https://jamabandi.nic.in',
    searchMethod:       'deep_link',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'] as any, // tehsil
    formatsRequired:    ['Jamabandi', 'Khasra Girdawari'],
    notes:              'Haryana shares Jamabandi portal infrastructure with Punjab',
    tahsildarTip:       'Kanungo or Patwari for village records',
  },
  'tamil_nadu': {
    state:              'Tamil Nadu',
    portal:             'eServices TN',
    portalUrl:          'https://eservices.tn.gov.in',
    searchMethod:       'deep_link',
    supportsNameSearch: false,
    locationRequired:   ['district', 'taluka', 'village'] as any, // taluk
    formatsRequired:    ['Patta', 'Chitta', 'A-Register Extract'],
    notes:              'TN portal requires survey number — name search not directly available',
    tahsildarTip:       'Village Administrative Officer (VAO) for Patta/Chitta',
  },
  'kerala': {
    state:              'Kerala',
    portal:             'Ente Bhoomi',
    portalUrl:          'https://erekha.kerala.gov.in',
    searchMethod:       'deep_link',
    supportsNameSearch: false,
    locationRequired:   ['district', 'taluka', 'village'] as any, // taluk
    formatsRequired:    ['Thandaper', 'Pokkuvaravu'],
    notes:              'Kerala system is survey-number based — family history needed',
    tahsildarTip:       'Village Office (Desam) for Thandaper records',
  },
  'west_bengal': {
    state:              'West Bengal',
    portal:             'Banglarbhumi',
    portalUrl:          'https://banglarbhumi.gov.in',
    searchMethod:       'deep_link',
    supportsNameSearch: true,
    locationRequired:   ['district', 'taluka', 'village'] as any, // block, mouza
    formatsRequired:    ['RS Khatian', 'LR Khatian', 'Plot Information'],
    notes:              'Banglarbhumi has RS and LR Khatian with owner name search',
    tahsildarTip:       'Block Land and Land Reform (BLL&LR) office for records',
  },
  'bihar': {
    state:              'Bihar',
    portal:             'Bhumi Jankari',
    portalUrl:          'https://bhumijankari.bihar.gov.in',
    searchMethod:       'offline_guide',
    supportsNameSearch: false,
    locationRequired:   ['district', 'taluka', 'village'] as any, // anchol
    formatsRequired:    ['Khatiyan', 'Jamabandi'],
    notes:              'Bihar digitisation is incomplete — most records need offline access',
    tahsildarTip:       'Circle Office (Anchaladhikari) for Khatiyan records',
  },
  'jharkhand': {
    state:              'Jharkhand',
    portal:             'Jharbhoomi',
    portalUrl:          'https://jharbhoomi.jharkhand.gov.in',
    searchMethod:       'offline_guide',
    supportsNameSearch: false,
    locationRequired:   ['district', 'taluka', 'village'] as any, // block
    formatsRequired:    ['Khatiyan', 'ROR'],
    notes:              'Partial digitisation — older records need Anchaladhikari visit',
    tahsildarTip:       'Anchaladhikari (Circle Officer) for village land records',
  },
  'odisha': {
    state:              'Odisha',
    portal:             'Bhulekh Odisha',
    portalUrl:          'https://bhulekh.ori.nic.in',
    searchMethod:       'offline_guide',
    supportsNameSearch: false,
    locationRequired:   ['district', 'taluka', 'village'] as any, // tehsil
    formatsRequired:    ['ROR (Record of Rights)', 'Patta'],
    notes:              'Odisha system is plot-number based — offline for name searches',
    tahsildarTip:       'Tahasildar office for certified ROR copies',
  },
}

// Get config for a state (normalise input)
export function getStateConfig(stateName: string): StateConfig | null {
  const key = stateName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z_]/g, '')
  return STATE_CONFIGS[key] ?? null
}

// Get list of all supported states for UI
export function getAllStates(): { value:string; label:string; method:SearchMethod }[] {
  return Object.entries(STATE_CONFIGS).map(([key, config]) => ({
    value:  key,
    label:  config.state,
    method: config.searchMethod
  })).sort((a, b) => a.label.localeCompare(b.label))
}
