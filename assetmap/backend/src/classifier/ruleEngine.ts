import { Pool }         from 'pg'
import { CATEGORIES }   from './categoryConfig'
import { normaliseMerchant } from './merchantNormaliser'

export interface RuleResult {
  category:      string
  subcategory:   string
  categoryGroup: 'expense'|'revenue'|'transfer'|'ignore'
  confidence:    number
  method:        'merchant_map'|'keyword'|'narration_pattern'|'amount_pattern'
  reason:        string
}

export async function classifyByRules(
  pool:             Pool,
  userId:           string,
  narration:        string,
  amount:           number,
  txType:           'debit'|'credit',
  transactionDate:  Date
): Promise<RuleResult | null> {

  const merchant = normaliseMerchant(narration)
  const upper    = narration.toUpperCase()
  const merUpper = merchant.toUpperCase()

  // 1. Check merchant_category_map (fastest — exact lookup)
  const merchantResult = await pool.query(`
    SELECT category, subcategory, category_group, confidence
    FROM merchant_category_map
    WHERE UPPER(merchant_name) = $1
    AND (user_id = $2 OR user_id IS NULL)
    ORDER BY
      CASE WHEN user_id = $2 THEN 1 ELSE 2 END,
      confidence DESC
    LIMIT 1
  `, [merUpper, userId])

  if (merchantResult.rows[0]) {
    const r = merchantResult.rows[0]
    return {
      category:      r.category,
      subcategory:   r.subcategory,
      categoryGroup: r.category_group,
      confidence:    r.confidence,
      method:        'merchant_map',
      reason:        `Known merchant: ${merchant}`
    }
  }

  // 2. Keyword matching against narration
  for (const cat of CATEGORIES) {
    // Skip categories that don't match transaction direction
    if (txType === 'debit'  && cat.group === 'revenue') continue
    if (txType === 'credit' && cat.group === 'expense') continue

    for (const keyword of cat.keywords) {
      if (upper.includes(keyword.toUpperCase())) {
        return {
          category:      cat.id,
          subcategory:   cat.subcategories[0] ?? '',
          categoryGroup: cat.group as any,
          confidence:    75,
          method:        'keyword',
          reason:        `Keyword match: "${keyword}" in narration`
        }
      }
    }
  }

  // 3. Narration pattern matching
  for (const cat of CATEGORIES) {
    if (txType === 'debit'  && cat.group === 'revenue') continue
    if (txType === 'credit' && cat.group === 'expense') continue

    for (const hint of cat.narrationHints) {
      if (upper.includes(hint.toUpperCase())) {
        return {
          category:      cat.id,
          subcategory:   cat.subcategories[0] ?? '',
          categoryGroup: cat.group as any,
          confidence:    60,
          method:        'narration_pattern',
          reason:        `Pattern match: "${hint}" in narration`
        }
      }
    }
  }

  // 4. Amount + type patterns (heuristics)

  // Large recurring credit early in month → likely salary
  if (txType === 'credit' && amount >= 2000000) {
    const day = transactionDate.getDate()
    if (day <= 10 || day >= 25) {
      return {
        category:      'SALARY',
        subcategory:   'Primary',
        categoryGroup: 'revenue',
        confidence:    55,
        method:        'amount_pattern',
        reason:        `Large credit (₹${Math.round(amount/100).toLocaleString()}) at month start/end — likely salary`
      }
    }
  }

  // ATM withdrawal pattern
  if (txType === 'debit' && (upper.includes('ATM') || upper.includes('CASH WITHDRAWAL'))) {
    return {
      category:      'ATM',
      subcategory:   'ATM',
      categoryGroup: 'expense',
      confidence:    95,
      method:        'narration_pattern',
      reason:        'ATM/cash withdrawal pattern'
    }
  }

  // NACH/ECS/SI → likely EMI or recurring
  if (txType === 'debit' &&
      (upper.includes('NACH') || upper.includes('ECS') ||
       upper.includes('SI DEBIT') || upper.includes('STANDING'))) {
    // Large NACH → likely EMI
    if (amount >= 500000) {
      return {
        category:      'EMI',
        subcategory:   'Loan EMI',
        categoryGroup: 'expense',
        confidence:    70,
        method:        'narration_pattern',
        reason:        'NACH/ECS debit — likely loan EMI'
      }
    }
    // Small NACH → likely insurance or subscription
    return {
      category:      'INSURANCE',
      subcategory:   'Premium',
      categoryGroup: 'expense',
      confidence:    55,
      method:        'narration_pattern',
      reason:        'NACH/ECS debit — likely insurance premium'
    }
  }

  // UPI to a person → transfer
  if (upper.includes('UPI') && txType === 'debit') {
    // If narration contains a name pattern (not a known merchant)
    if (!upper.includes('SWIGGY') && !upper.includes('AMAZON') &&
        !upper.includes('ZOMATO') && !upper.includes('UBER')) {
      return {
        category:      'TRANSFERS',
        subcategory:   'UPI',
        categoryGroup: 'transfer',
        confidence:    65,
        method:        'narration_pattern',
        reason:        'UPI debit to unknown payee — likely P2P transfer'
      }
    }
  }

  return null  // Could not classify by rules — send to Claude
}
