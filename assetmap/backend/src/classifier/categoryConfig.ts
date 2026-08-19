export type CategoryGroup = 'expense' | 'revenue' | 'transfer' | 'ignore'

export interface Category {
  id:             string
  label:          string
  group:          CategoryGroup
  emoji:          string
  color:          string
  keywords:       string[]   // keyword matches (case-insensitive)
  narrationHints: string[]   // patterns in bank narration
  isRecurring:    boolean    // typically a recurring expense?
  subcategories:  string[]
}

export const CATEGORIES: Category[] = [
  {
    id:    'SUBSCRIPTIONS',
    label: 'Subscriptions',
    group: 'expense',
    emoji: '📺',
    color: '#534AB7',
    isRecurring: true,
    subcategories: ['OTT','Music','Software','Cloud','News'],
    keywords: [
      'netflix','amazon prime','hotstar','disney','spotify',
      'apple music','youtube premium','microsoft 365','adobe',
      'openai','chatgpt','github','notion','zoom','slack',
      'google one','icloud','dropbox','sonyliv','zee5',
      'gaana','hungama','wynk','mxplayer','jiocinema',
      'et prime','livemint','the hindu','udemy','coursera',
      'semrush','canva','figma'
    ],
    narrationHints: ['subscription','recurring','monthly','annual','renewal']
  },
  {
    id:    'FOOD',
    label: 'Food & Dining',
    group: 'expense',
    emoji: '🍽️',
    color: '#E24B4A',
    isRecurring: false,
    subcategories: ['Groceries','Delivery','Restaurant','Cafe'],
    keywords: [
      'swiggy','zomato','bigbasket','blinkit','zepto','dunzo',
      'starbucks','chaayos','dmart','moreretail','reliance fresh',
      'naturals','kwality walls','haldirams','dominos','pizza hut',
      'mcdonalds','burger king','kfc','subway','cafe coffee day',
      'barista','theobroma','wai wai','bb daily','milkbasket',
      'jumbotail','licious','fipola','fresh to home','eatclub'
    ],
    narrationHints: ['food','grocery','restaurant','cafe','dining','swiggy','zomato']
  },
  {
    id:    'RENT',
    label: 'Rent & Housing',
    group: 'expense',
    emoji: '🏠',
    color: '#2D6A4F',
    isRecurring: true,
    subcategories: ['Rent','Society','Electricity','Gas','Water'],
    keywords: [
      'rent','house rent','flat rent','maintenance','society',
      'bescom','msedcl','bses','adani electricity','tata power',
      'torrent power','png','mahanagar gas','indraprastha gas',
      'water board','bbmp','property tax','housing'
    ],
    narrationHints: ['rent','maintenance','society','electricity','gas bill','water']
  },
  {
    id:    'RECHARGE',
    label: 'Recharge & Telecom',
    group: 'expense',
    emoji: '📱',
    color: '#185FA5',
    isRecurring: true,
    subcategories: ['Mobile','DTH','Broadband'],
    keywords: [
      'airtel','jio','vodafone','vi mobile','bsnl','mtnl',
      'tata play','dish tv','airtel dth','sun direct','d2h',
      'act fibernet','hathway','bsnl broadband','tikona',
      'excitel','you broadband'
    ],
    narrationHints: ['recharge','topup','postpaid','prepaid','broadband','dth']
  },
  {
    id:    'EMI',
    label: 'EMIs & Loans',
    group: 'expense',
    emoji: '🏦',
    color: '#854F0B',
    isRecurring: true,
    subcategories: ['Home loan','Car loan','Personal loan','Education loan'],
    keywords: [
      'emi','loan','hdfc hl','sbi home','bajaj finserv',
      'lic housing','pnb housing','axis bank loan','icici home',
      'kotak mahindra loan','tata capital','bajaj auto finance',
      'mahindra finance','tvs credit','muthoot finance',
      'manappuram','gold loan','personal loan','car loan'
    ],
    narrationHints: [
      'emi','loan emi','home loan','car loan','vehicle loan',
      'personal loan','nach','ecs','standing instruction','si debit'
    ]
  },
  {
    id:    'INSURANCE',
    label: 'Insurance',
    group: 'expense',
    emoji: '🛡️',
    color: '#0F6E56',
    isRecurring: true,
    subcategories: ['Life','Health','Vehicle','Term'],
    keywords: [
      'lic','hdfc life','icici pru','sbi life','max life',
      'bajaj allianz life','tata aia','kotak life',
      'star health','niva bupa','care health','manipal cigna',
      'aditya birla health','icici lombard','bajaj allianz general',
      'hdfc ergo','new india','oriental insurance','national insurance',
      'reliance general','go digit','insurance premium','policy premium'
    ],
    narrationHints: ['insurance','premium','policy','life ins','health ins','motor ins']
  },
  {
    id:    'BILLS',
    label: 'Bills & Utilities',
    group: 'expense',
    emoji: '⚡',
    color: '#D85A30',
    isRecurring: true,
    subcategories: ['Electricity','Water','Gas','Property tax'],
    keywords: [
      'electricity','bescom','msedcl','bses','adani electricity',
      'tata power','torrent power','water board','bbmp water',
      'bwssb','mahanagar gas','gujarat gas','indraprastha gas',
      'property tax','house tax','municipal tax'
    ],
    narrationHints: ['bill','utility','electricity bill','water bill','gas bill','property tax']
  },
  {
    id:    'INVESTMENTS',
    label: 'Investments',
    group: 'expense',
    emoji: '📈',
    color: '#185FA5',
    isRecurring: false,
    subcategories: ['Mutual funds','Stocks','FD','NPS','PPF'],
    keywords: [
      'zerodha','groww','upstox','angel one','icicidirect','hdfc securities',
      'motilal oswal','sharekhan','kuvera','paytm money','coin zerodha',
      'cams','karvy','kfintech','nps','nsdl','pfrda',
      'ppf','post office','sukanya','sovereign gold bond','sgb',
      'mutual fund','sip','lumpsum','fd','fixed deposit','rd'
    ],
    narrationHints: ['sip','mutual fund','equity','nse','bse','demat','fd booking','ppf']
  },
  {
    id:    'SHOPPING',
    label: 'Shopping',
    group: 'expense',
    emoji: '🛍️',
    color: '#E24B4A',
    isRecurring: false,
    subcategories: ['Online','Clothing','Electronics','Beauty'],
    keywords: [
      'amazon','flipkart','myntra','nykaa','meesho','ajio',
      'tata cliq','reliance retail','croma','vijay sales',
      'reliance digital','apple store','samsung','oneplus store',
      'snapdeal','shopclues','firstcry','babyoye'
    ],
    narrationHints: ['purchase','order','shopping','ecommerce']
  },
  {
    id:    'TRAVEL',
    label: 'Travel & Transport',
    group: 'expense',
    emoji: '✈️',
    color: '#534AB7',
    isRecurring: false,
    subcategories: ['Flight','Train','Hotel','Cab','Fuel','Metro'],
    keywords: [
      'irctc','indigo','air india','spicejet','go air','vistara',
      'makemytrip','cleartrip','yatra','ease my trip','goibibo',
      'uber','ola','rapido','namma yatri','bluestar','meru',
      'oyo','treebo','airbnb','fab hotels','lemon tree',
      'hpcl','bpcl','iocl','indianoil','hp petrol',
      'metro card','bus pass','paytm metro','dmrc','bmtc'
    ],
    narrationHints: ['flight','train','hotel','cab','fuel','petrol','diesel','metro']
  },
  {
    id:    'HEALTH',
    label: 'Health & Medical',
    group: 'expense',
    emoji: '🏥',
    color: '#E24B4A',
    isRecurring: false,
    subcategories: ['Pharmacy','Hospital','Doctor','Diagnostic'],
    keywords: [
      'apollo','medplus','1mg','pharmeasy','netmeds',
      'practo','lybrate','mfine','tata health','healthkart',
      'thyrocare','dr lal','vijaya diagnostics','metropolis',
      'medanta','fortis','max hospital','aiims','manipal hospital'
    ],
    narrationHints: ['hospital','clinic','pharmacy','medical','medicine','doctor','lab','diagnostic']
  },
  {
    id:    'EDUCATION',
    label: 'Education',
    group: 'expense',
    emoji: '📚',
    color: '#185FA5',
    isRecurring: false,
    subcategories: ['School','College','Online courses','Coaching'],
    keywords: [
      'udemy','coursera','byjus','unacademy','whitehat jr',
      'toppr','vedantu','physicswallah','allen','fiitjee',
      'aakash','resonance','brilliant','duolingo',
      'school fee','college fee','tuition','coaching'
    ],
    narrationHints: ['school fees','college fees','tuition','course fee','coaching','education']
  },
  {
    id:    'PARTY',
    label: 'Party & Entertainment',
    group: 'expense',
    emoji: '🎉',
    color: '#D85A30',
    isRecurring: false,
    subcategories: ['Events','Gifts','Nightlife','Recreation'],
    keywords: [
      'bookmyshow','paytm insider','district','ticketmaster',
      'pvr','inox','cinepolis','carnival cinemas',
      'gifts','amazon gift','shoppers stop gifts',
      'bar','pub','club','lounge','brewery','spirits',
      'sodexo','zingaro','wineholic','toast'
    ],
    narrationHints: ['ticket','movie','event','concert','party','gift','entertainment']
  },
  {
    id:    'TRANSFERS',
    label: 'Transfers',
    group: 'transfer',
    emoji: '↔️',
    color: '#888780',
    isRecurring: false,
    subcategories: ['UPI','NEFT','IMPS','Wallet'],
    keywords: [
      'paytm wallet','phonepe wallet','amazon pay',
      'transfer to','fund transfer','upi transfer'
    ],
    narrationHints: ['upi','neft','imps','rtgs','transfer','sent to','received from']
  },
  {
    id:    'ATM',
    label: 'Cash Withdrawal',
    group: 'expense',
    emoji: '💵',
    color: '#888780',
    isRecurring: false,
    subcategories: ['ATM'],
    keywords: ['atm','cash withdrawal'],
    narrationHints: ['atm withdrawal','cash withdrawal','atm/cdm']
  },
  {
    id:    'CHARITY',
    label: 'Charity & Donations',
    group: 'expense',
    emoji: '🙏',
    color: '#B8860B',
    isRecurring: false,
    subcategories: ['Religious','NGO','Government'],
    keywords: [
      'pm cares','pmcares','give india','milaap','ketto',
      'akshaya patra','temple','donation','charity','ngo'
    ],
    narrationHints: ['donation','charity','temple','religious','ngo']
  },
  // REVENUE CATEGORIES
  {
    id:    'SALARY',
    label: 'Salary',
    group: 'revenue',
    emoji: '💰',
    color: '#1D9E75',
    isRecurring: true,
    subcategories: ['Primary','Freelance','Bonus','Arrears'],
    keywords: ['salary','sal credit','payroll','wages','stipend','consultant payment'],
    narrationHints: [
      'salary','sal cr','payroll','monthly pay',
      'salary credit','neft salary','sal/pay',
      'hr payroll','wages credit'
    ]
  },
  {
    id:    'INVESTMENT_RETURN',
    label: 'Investment Returns',
    group: 'revenue',
    emoji: '📊',
    color: '#185FA5',
    isRecurring: false,
    subcategories: ['Dividend','Interest','Capital gains','Rent received'],
    keywords: [
      'dividend','interest credit','fd interest','rd interest',
      'savings interest','capital gain','redemption',
      'rental income','rent received'
    ],
    narrationHints: [
      'dividend','interest credited','fd maturity',
      'rd maturity','capital gain credit',
      'redemption credit','rental income'
    ]
  },
  {
    id:    'REFUNDS',
    label: 'Refunds',
    group: 'revenue',
    emoji: '↩️',
    color: '#0F6E56',
    isRecurring: false,
    subcategories: ['E-commerce','Insurance','Tax','Reimbursement'],
    keywords: [
      'refund','cashback','reimbursement','it refund',
      'income tax refund','tds refund','gst refund',
      'insurance claim','claim settlement'
    ],
    narrationHints: ['refund','cashback','claim','reimbursement','tax refund','it dept']
  },
  {
    id:    'BUSINESS_INCOME',
    label: 'Business Income',
    group: 'revenue',
    emoji: '🏭',
    color: '#534AB7',
    isRecurring: false,
    subcategories: ['Client','Invoice','GST refund'],
    keywords: ['payment received','client payment','invoice','project payment','gst refund'],
    narrationHints: ['payment received','invoice payment','client credit','business income']
  },
  {
    id:    'OTHER_INCOME',
    label: 'Other Income',
    group: 'revenue',
    emoji: '💹',
    color: '#888780',
    isRecurring: false,
    subcategories: ['Cashback','Incentive','Gift received'],
    keywords: ['cashback','referral','incentive','reward','bonus credit'],
    narrationHints: ['cashback','reward','referral bonus','incentive credit']
  },
]

// Fast lookup maps
export const CATEGORY_BY_ID = new Map(CATEGORIES.map(c => [c.id, c]))
export const EXPENSE_CATS   = CATEGORIES.filter(c => c.group === 'expense')
export const REVENUE_CATS   = CATEGORIES.filter(c => c.group === 'revenue')

export function getCategoryDisplay(catId: string): Category | undefined {
  return CATEGORY_BY_ID.get(catId)
}
