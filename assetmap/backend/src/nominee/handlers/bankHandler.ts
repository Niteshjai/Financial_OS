/**
 * Bank Handler — Guided OTP Session
 * 
 * RBI prohibits third-party credential usage for banking portals.
 * We provide bank-specific deep links + step-by-step instructions.
 * For banks without online nominee update, we flag as manual_branch.
 */

export interface GuidedSessionResult {
  sessionUrl:   string;
  instructions: string[];
}

// Banks that support online nominee update
const ONLINE_BANKS = [
  'hdfc', 'sbi', 'icici', 'axis', 'kotak', 'bob', 'canara',
  'pnb', 'union', 'federal', 'yes', 'idfc', 'bandhan', 'rbl',
];

// Bank-specific net banking / mobile app deep links
const BANK_URLS: Record<string, string> = {
  hdfc:  'https://netbanking.hdfcbank.com/netbanking/',
  sbi:   'https://retail.onlinesbi.sbi/retail/login.htm',
  icici: 'https://www.icicibank.com/online/iMobile',
  axis:  'https://www.axisbank.com/axis-mobile',
  kotak: 'https://netbanking.kotak.com',
  bob:   'https://www.barodaetrade.com/BankofBaroda/',
  canara:'https://netbanking.canarabank.in/',
  pnb:   'https://netbanking.netpnb.com/',
  union: 'https://www.unionbankonline.co.in/',
  yes:   'https://netbanking.yesbank.in/',
  idfc:  'https://my.idfcfirstbank.com/',
  bandhan: 'https://www.bandhanbank.com/personal-banking/internet-banking',
  rbl:   'https://www.rblbank.com/personal-banking/internet-banking',
};

export const bankHandler = {

  /** Check if a bank supports online nominee update */
  isOnlineSupported(institutionName: string): boolean {
    const name = institutionName.toLowerCase();
    return ONLINE_BANKS.some(b => name.includes(b));
  },

  /** Get the update method for a bank */
  getUpdateMethod(institutionName: string): 'guided_otp' | 'manual_branch' {
    return this.isOnlineSupported(institutionName) ? 'guided_otp' : 'manual_branch';
  },

  prepareSession(institutionName: string): GuidedSessionResult {
    const name = institutionName.toLowerCase();

    // Find matching bank URL
    let sessionUrl = '';
    for (const [key, url] of Object.entries(BANK_URLS)) {
      if (name.includes(key)) {
        sessionUrl = url;
        break;
      }
    }

    // Fallback — search for the bank's nominee update page
    if (!sessionUrl) {
      sessionUrl = `https://www.google.com/search?q=${encodeURIComponent(
        institutionName + ' net banking nominee update'
      )}`;
    }

    return {
      sessionUrl,
      instructions: [
        'Log in to your net banking or mobile app',
        'Go to "Services" or "Account Services"',
        'Find "Nominee Management" or "Add/Update Nominee"',
        'Enter nominee details — we have them ready for you below',
        'Verify with OTP sent to your registered mobile',
        'Save the confirmation SMS or screenshot',
      ],
    };
  },
};
