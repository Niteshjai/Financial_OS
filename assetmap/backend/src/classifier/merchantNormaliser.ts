// Clean raw bank narrations into readable merchant names
// Indian bank narrations are notoriously messy:
// "UPI/123456789/SWIGGY/SWIGGYORDER" → "Swiggy"
// "NACH/HDFCBANK/EMI/0001234" → "HDFC Bank EMI"
// "POS AMAZON.IN 23456 DT 011224" → "Amazon"
// "NEFT/PAYROLL/TATA CONS/DEC24" → "Tata Consultancy"

export function normaliseMerchant(narration: string): string {
  let cleaned = narration
    .toUpperCase()
    .replace(/[^A-Z0-9\s\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove common prefixes
  const prefixesToRemove = [
    /^UPI[\/-][0-9]+[\/-]/,          // UPI transaction IDs
    /^NEFT[\/-][A-Z0-9]+[\/-]/,      // NEFT reference
    /^IMPS[\/-][0-9]+[\/-]/,         // IMPS reference
    /^POS\s+/,                        // POS prefix
    /^ACH[\/-][A-Z]+[\/-]/,          // ACH prefix
    /^NACH[\/-][A-Z]+[\/-]/,         // NACH prefix
    /^ECS\s+/,                        // ECS prefix
    /^INB\s+/,                        // Internet banking prefix
    /^BIL[\/-]/,                      // Bill payment prefix
    /^CLG\s+/,                        // Clearing prefix
    /^MMT[\/-]/,                      // Mobile money transfer
  ]

  for (const prefix of prefixesToRemove) {
    cleaned = cleaned.replace(prefix, '')
  }

  // Remove trailing transaction IDs (numbers at end)
  cleaned = cleaned
    .replace(/\s+[0-9]{6,}(\s|$)/g, ' ')  // remove long number sequences
    .replace(/\s+DT\s+[0-9]+/g, '')         // remove "DT 011224"
    .replace(/\/[A-Z0-9]{6,}$/g, '')        // remove trailing reference codes
    .trim()

  // Take first meaningful segment if still too long
  const words = cleaned.split(/[\s\/\-]+/).filter(w => w.length > 2)

  // Known merchant expansions
  const KNOWN_EXPANSIONS: Record<string, string> = {
    'SWIGGY':        'Swiggy',
    'ZOMATO':        'Zomato',
    'AMZN':          'Amazon',
    'AMAZON':        'Amazon',
    'FLIPKART':      'Flipkart',
    'BBDL':          'BigBasket',
    'BIGBASKET':     'BigBasket',
    'IRCTC':         'IRCTC',
    'NETFLIX':       'Netflix',
    'SPOTIF':        'Spotify',
    'NFLX':          'Netflix',
    'HOTSTAR':       'Hotstar',
    'AIRTEL':        'Airtel',
    'JIO':           'Jio',
    'JIOMART':       'JioMart',
    'UBER':          'Uber',
    'OLA':           'Ola',
    'RAPIDO':        'Rapido',
    'OYO':           'OYO',
    'ZERODHA':       'Zerodha',
    'GROWW':         'Groww',
    'KUVERA':        'Kuvera',
    'CAMS':          'CAMS',
    'HDFC':          'HDFC Bank',
    'ICICI':         'ICICI Bank',
    'SBI':           'SBI',
    'AXIS':          'Axis Bank',
  }

  for (const word of words) {
    if (KNOWN_EXPANSIONS[word]) {
      return KNOWN_EXPANSIONS[word]
    }
  }

  // Return first 2-3 meaningful words as merchant name
  return words.slice(0, 3).join(' ')
    .split(' ')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}
