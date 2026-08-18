// The single biggest reason ancestral property searches fail:
// the name in land records differs from the name the family
// remembers. Patwaris wrote names phonetically in their own
// language/script. Transliterations varied. Common patterns:
//
// Ramesh Kumar Sharma → R.K. Sharma / Ramesh K. Sharma
// Patel → Patil (Marathi vs Gujarati) 
// Singh → Sinh / Sing / Sinha
// Subramaniam → Subramanian / Subramanyan
// Mohammed → Mohammad / Mohd / Muhammad
// Venkataraman → Venkatarama / Venkat Raman

export interface NameVariants {
  original:        string
  variants:        string[]
  firstNameOnly:   string
  lastNameOnly:    string
  initials:        string
  commonMisspellings: string[]
}

// Common Indian surname transliteration variants
const SURNAME_VARIANTS: Record<string, string[]> = {
  'sharma':   ['sharme', 'sarma', 'sharma'],
  'patel':    ['patil', 'patidar', 'patel'],
  'singh':    ['sinha', 'sinh', 'sing', 'singhh'],
  'kumar':    ['kumaar', 'kumar', 'kumari'],
  'reddy':    ['redy', 'reddi', 'reddie'],
  'naidu':    ['naidu', 'naidy', 'naydu'],
  'iyer':     ['ayyar', 'aiyer', 'aiyar', 'iyer'],
  'nair':     ['nayar', 'nair', 'naire'],
  'rao':      ['rau', 'rao', 'roa'],
  'gupta':    ['guptha', 'gupta', 'gupte'],
  'joshi':    ['josi', 'joshy', 'joshi'],
  'mehta':    ['mehta', 'mehtha', 'metha'],
  'desai':    ['desai', 'desaai', 'desay'],
  'khan':     ['khan', 'kahn', 'kan'],
  'ali':      ['ali', 'aali', 'aly'],
  'mishra':   ['misra', 'mishra', 'mishra'],
  'pandey':   ['pandey', 'pandey', 'pande'],
  'chaudhary':['chaudhuri', 'chaudhary', 'choudhary', 'choudhury'],
  'mukherjee':['mukerjee', 'mukherjee', 'mukharji', 'mukherjea'],
  'chatterjee':['chaterjee', 'chatterjee', 'chattopadhyay'],
}

// Common first name variants
const FIRST_NAME_VARIANTS: Record<string, string[]> = {
  'ramesh':       ['ramesh', 'ramesha', 'ramesa'],
  'suresh':       ['suresh', 'suresha', 'sursh'],
  'mahesh':       ['mahesh', 'mahesa'],
  'rajesh':       ['rajesh', 'rajesa'],
  'mukesh':       ['mukesh', 'mukesa'],
  'venkataraman': ['venkatarama', 'venkat raman', 'venkatraman',
                   'venkataramaiah', 'venkat'],
  'subramaniam':  ['subramanian', 'subramanyan', 'subramanya'],
  'mohammed':     ['mohammad', 'mohd', 'muhammad', 'md'],
  'krishnamurthy':['krishnamoorthy', 'krishnamurti', 'krishna murthy'],
  'narasimhan':   ['narasimha', 'narasimhaiah', 'narasimhalu'],
}

export function generateNameVariants(fullName: string): NameVariants {
  const clean   = fullName.trim().toLowerCase()
  const parts   = clean.split(/\s+/).filter(Boolean)
  const variants = new Set<string>([clean])

  // 1. Original name and basic permutations
  if (parts.length >= 2) {
    // Reverse order: Kumar Ramesh → Ramesh Kumar
    variants.add(parts.slice().reverse().join(' '))
    // First + Last only (drop middle)
    variants.add(`${parts[0]} ${parts[parts.length - 1]}`)
    // Initials + Last
    const initials = parts.slice(0, -1).map(p => p[0] + '.').join('')
    variants.add(`${initials} ${parts[parts.length - 1]}`)
  }

  // 2. Surname variants
  const lastName = parts[parts.length - 1]
  if (SURNAME_VARIANTS[lastName]) {
    for (const variant of SURNAME_VARIANTS[lastName]) {
      const rest = parts.slice(0, -1).join(' ')
      variants.add(`${rest} ${variant}`.trim())
      variants.add(`${variant} ${rest}`.trim())
    }
  }

  // 3. First name variants
  const firstName = parts[0]
  if (FIRST_NAME_VARIANTS[firstName]) {
    for (const variant of FIRST_NAME_VARIANTS[firstName]) {
      const rest = parts.slice(1).join(' ')
      variants.add(`${variant} ${rest}`.trim())
    }
  }

  // 4. Common character substitutions in Indian romanisation
  const substitutions: [RegExp, string][] = [
    [/ph/g, 'f'],      // Phadke → Fadke
    [/sh/g, 's'],      // Shinde → Sinde  
    [/aa/g, 'a'],      // Raama → Rama
    [/ee/g, 'i'],      // Veeresh → Viresh
    [/oo/g, 'u'],      // Noopur → Nupur
    [/th/g, 't'],      // Kothawale → Kotawale
    [/kh/g, 'k'],      // Khot → Kot
    [/gh/g, 'g'],      // Ghosh → Gosh
    [/bh/g, 'b'],      // Bhatt → Batt
  ]

  for (const [pattern, replacement] of substitutions) {
    if (pattern.test(clean)) {
      variants.add(clean.replace(pattern, replacement))
    }
  }

  // 5. S/Sh at start variants
  if (clean.startsWith('s') && !clean.startsWith('sh')) {
    variants.add('sh' + clean.slice(1))
  }
  if (clean.startsWith('sh')) {
    variants.add('s' + clean.slice(2))
  }

  return {
    original:        clean,
    variants:        [...variants].filter(v => v !== clean).slice(0, 20),
    firstNameOnly:   parts[0],
    lastNameOnly:    parts[parts.length - 1],
    initials:        parts.map(p => p[0].toUpperCase()).join('.') + '.',
    commonMisspellings: [...variants].slice(0, 5),
  }
}
