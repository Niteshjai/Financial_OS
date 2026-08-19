import Anthropic    from '@anthropic-ai/sdk'
import { Pool }     from 'pg'
import { CATEGORIES } from './categoryConfig'
import { classifyByRules } from './ruleEngine'
import { normaliseMerchant } from './merchantNormaliser'
import { createHash } from 'crypto'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface Transaction {
  id?:             string
  narration:       string
  amount:          number       // paise
  type:            'debit'|'credit'
  date:            Date
  mode?:           string
  referenceNumber?:string
}

export interface ClassificationResult {
  category:        string
  subcategory:     string
  categoryGroup:   'expense'|'revenue'|'transfer'|'ignore'
  confidence:      number
  merchantName:    string
  classifiedBy:    'rule_engine'|'claude_ai'|'user'|'inherited'
  reason:          string
  isRecurring:     boolean
  isEmi:           boolean
}

export const transactionClassifier = {

  // Classify a single transaction
  async classify(
    pool:    Pool,
    userId:  string,
    tx:      Transaction
  ): Promise<ClassificationResult> {
    const merchant = normaliseMerchant(tx.narration)

    // Step 1: Try rule engine (fast, cheap)
    const ruleResult = await classifyByRules(
      pool, userId,
      tx.narration, tx.amount,
      tx.type, tx.date
    )

    if (ruleResult && ruleResult.confidence >= 70) {
      const cat = CATEGORIES.find(c => c.id === ruleResult.category)
      return {
        category:      ruleResult.category,
        subcategory:   ruleResult.subcategory,
        categoryGroup: ruleResult.categoryGroup,
        confidence:    ruleResult.confidence,
        merchantName:  merchant,
        classifiedBy:  ruleResult.method === 'merchant_map' ? 'inherited' : 'rule_engine',
        reason:        ruleResult.reason,
        isRecurring:   cat?.isRecurring ?? false,
        isEmi:         ruleResult.category === 'EMI',
      }
    }

    // Step 2: Claude AI for anything uncertain
    const claudeResult = await this.classifyWithClaude(tx, merchant)

    // Step 3: Learn — add to merchant_category_map for future
    if (claudeResult.confidence >= 80) {
      await this.learnMerchant(
        pool, userId, merchant, claudeResult
      )
    }

    return {
      ...claudeResult,
      merchantName: merchant,
      classifiedBy: 'claude_ai',
    }
  },

  async classifyWithClaude(
    tx:       Transaction,
    merchant: string
  ): Promise<Omit<ClassificationResult, 'merchantName'|'classifiedBy'>> {
    const catList = CATEGORIES.map(c =>
      `${c.id} (${c.group}): ${c.label} — ${c.subcategories.join(', ')}`
    ).join('\n')

    const amtRupees = Math.round(tx.amount / 100).toLocaleString('en-IN')

    const prompt = `
Classify this Indian bank transaction into exactly one category.

TRANSACTION:
Narration: "${tx.narration}"
Merchant: "${merchant}"
Amount: ₹${amtRupees}
Type: ${tx.type} (${tx.type === 'debit' ? 'money going OUT' : 'money coming IN'})
Date: ${tx.date.toDateString()}
Mode: ${tx.mode ?? 'unknown'}

AVAILABLE CATEGORIES:
${catList}

CLASSIFICATION RULES:
- DEBIT = money going out = expense/transfer
- CREDIT = money coming in = revenue/transfer
- SALARY: Large credit, early/late month, from employer
- EMI: NACH/ECS debit, recurring, large amounts
- INSURANCE: Premium payments, NACH to insurer
- INVESTMENTS: SIP, demat, MF, stock purchases
- TRANSFERS: UPI/NEFT to individual persons (not businesses)
- SUBSCRIPTIONS: Monthly/annual recurring to services
- IGNORE: Bank charges, GST, service tax, stamp duty

Return ONLY JSON:
{
  "category": "<CATEGORY_ID>",
  "subcategory": "<specific subcategory>",
  "categoryGroup": "<expense|revenue|transfer|ignore>",
  "confidence": <0-100>,
  "reason": "<one sentence why>",
  "isRecurring": <true|false>,
  "isEmi": <true|false>
}

No preamble. Pure JSON.
`.trim()

    try {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages:   [{ role:'user', content:prompt }]
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as any).text)
        .join('')
        .replace(/```json|```/g, '')
        .trim()

      const result = JSON.parse(text)

      // Validate category exists
      const validCat = CATEGORIES.find(c => c.id === result.category)
      if (!validCat) {
        return {
          category:      'OTHER_EXPENSE',
          subcategory:   'Other',
          categoryGroup: tx.type === 'credit' ? 'revenue' : 'expense',
          confidence:    20,
          reason:        'Could not determine category',
          isRecurring:   false,
          isEmi:         false,
        }
      }

      return {
        category:      result.category,
        subcategory:   result.subcategory ?? validCat.subcategories[0],
        categoryGroup: result.categoryGroup ?? validCat.group,
        confidence:    result.confidence ?? 70,
        reason:        result.reason ?? '',
        isRecurring:   result.isRecurring ?? validCat.isRecurring,
        isEmi:         result.isEmi ?? false,
      }

    } catch (err) {
      console.error('[Classifier] Claude error:', err)
      return {
        category:      tx.type === 'credit' ? 'OTHER_INCOME' : 'OTHER_EXPENSE',
        subcategory:   'Other',
        categoryGroup: tx.type === 'credit' ? 'revenue' : 'expense',
        confidence:    10,
        reason:        'Classification failed — needs manual review',
        isRecurring:   false,
        isEmi:         false,
      }
    }
  },

  // Batch classify — process many transactions efficiently
  // Groups unknown merchants, calls Claude once per group
  async classifyBatch(
    pool:     Pool,
    userId:   string,
    txs:      Transaction[]
  ): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>()
    const needsAI: Transaction[] = []

    // First pass: rule engine
    for (const tx of txs) {
      const ruleResult = await classifyByRules(
        pool, userId, tx.narration,
        tx.amount, tx.type, tx.date
      )

      if (ruleResult && ruleResult.confidence >= 70) {
        const cat = CATEGORIES.find(c => c.id === ruleResult.category)
        const merchant = normaliseMerchant(tx.narration)
        results.set(tx.narration, {
          category:      ruleResult.category,
          subcategory:   ruleResult.subcategory,
          categoryGroup: ruleResult.categoryGroup,
          confidence:    ruleResult.confidence,
          merchantName:  merchant,
          classifiedBy:  ruleResult.method === 'merchant_map' ? 'inherited' : 'rule_engine',
          reason:        ruleResult.reason,
          isRecurring:   cat?.isRecurring ?? false,
          isEmi:         ruleResult.category === 'EMI',
        })
      } else {
        needsAI.push(tx)
      }
    }

    // Second pass: batch Claude for unknowns
    // Process in batches of 20 to avoid token limits
    const BATCH_SIZE = 20
    for (let i = 0; i < needsAI.length; i += BATCH_SIZE) {
      const batch = needsAI.slice(i, i + BATCH_SIZE)
      const batchResults = await this.classifyBatchWithClaude(batch)

      for (const [narration, result] of batchResults) {
        results.set(narration, result)
        // Learn from batch results
        if (result.confidence >= 80) {
          await this.learnMerchant(
            pool, userId,
            result.merchantName, result
          )
        }
      }

      // Rate limit
      if (i + BATCH_SIZE < needsAI.length) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    return results
  },

  async classifyBatchWithClaude(
    txs: Transaction[]
  ): Promise<Map<string, ClassificationResult>> {
    const catList = CATEGORIES
      .map(c => `${c.id}: ${c.label}`)
      .join(', ')

    const txList = txs.map((tx, i) => ({
      index:    i,
      narration:tx.narration,
      merchant: normaliseMerchant(tx.narration),
      amount:   `₹${Math.round(tx.amount/100).toLocaleString('en-IN')}`,
      type:     tx.type,
    }))

    const prompt = `
Classify these Indian bank transactions. Return a JSON array,
one object per transaction in the same order.

CATEGORIES: ${catList}

TRANSACTIONS:
${JSON.stringify(txList, null, 2)}

Return array of objects:
[{ "index": N, "category": "ID", "subcategory": "...",
   "categoryGroup": "expense|revenue|transfer",
   "confidence": 0-100, "merchantName": "...",
   "isRecurring": bool, "isEmi": bool }]

Pure JSON array only.
`.trim()

    const results = new Map<string, ClassificationResult>()

    try {
      const response = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages:   [{ role:'user', content:prompt }]
      })

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as any).text)
        .join('')
        .replace(/```json|```/g, '')
        .trim()

      const parsed = JSON.parse(text)

      for (const item of parsed) {
        const tx = txs[item.index]
        if (!tx) continue
        results.set(tx.narration, {
          category:      item.category ?? 'OTHER_EXPENSE',
          subcategory:   item.subcategory ?? '',
          categoryGroup: item.categoryGroup ?? 'expense',
          confidence:    item.confidence ?? 60,
          merchantName:  item.merchantName ?? normaliseMerchant(tx.narration),
          classifiedBy:  'claude_ai',
          reason:        'Batch classified by AI',
          isRecurring:   item.isRecurring ?? false,
          isEmi:         item.isEmi ?? false,
        })
      }
    } catch (err) {
      console.error('[Classifier] Batch Claude error:', err)
      // Fallback: mark all as uncategorised
      for (const tx of txs) {
        results.set(tx.narration, {
          category:      'OTHER_EXPENSE',
          subcategory:   'Other',
          categoryGroup: 'expense',
          confidence:    10,
          merchantName:  normaliseMerchant(tx.narration),
          classifiedBy:  'claude_ai',
          reason:        'Batch classification failed',
          isRecurring:   false,
          isEmi:         false,
        })
      }
    }

    return results
  },

  // Learn from classification result
  async learnMerchant(
    pool:    Pool,
    userId:  string,
    merchant:string,
    result:  Partial<ClassificationResult>
  ): Promise<void> {
    if (!merchant || merchant.length < 3) return

    await pool.query(`
      INSERT INTO merchant_category_map (
        user_id, merchant_name, category,
        subcategory, category_group, confidence, times_seen
      ) VALUES ($1,$2,$3,$4,$5,$6,1)
      ON CONFLICT (user_id, merchant_name) DO UPDATE SET
        times_seen   = merchant_category_map.times_seen + 1,
        last_seen_at = NOW(),
        -- Only update category if new confidence is higher
        category     = CASE WHEN $6 > merchant_category_map.confidence
                       THEN $3 ELSE merchant_category_map.category END,
        confidence   = GREATEST($6, merchant_category_map.confidence)
    `, [
      userId,
      merchant.toUpperCase(),
      result.category,
      result.subcategory ?? '',
      result.categoryGroup,
      result.confidence ?? 70
    ])
  },

  // Process all transactions for a user
  async processUserTransactions(
    pool:   Pool,
    userId: string
  ): Promise<{ processed:number; failed:number }> {
    // Get transactions from the transactions table
    const accounts = await pool.query(`
      SELECT DISTINCT account_id, (SELECT institution_name FROM accounts WHERE id = account_id LIMIT 1) as bank_name
      FROM transactions
      WHERE user_id = $1
    `, [userId])

    let processed = 0, failed = 0

    for (const account of accounts.rows) {
      try {
        const txRes = await pool.query(`
          SELECT * FROM transactions
          WHERE user_id = $1 AND account_id = $2
        `, [userId, account.account_id])

        // Build transaction objects
        const txs: Transaction[] = txRes.rows.map((tx: any) => ({
          narration:       tx.narration ?? '',
          amount:          Math.round(parseFloat(tx.amount) * 100), // converting to paise
          type:            (tx.type.toLowerCase() === 'credit' ? 'credit' : 'debit') as 'credit' | 'debit',
          date:            new Date(tx.date),
          mode:            tx.mode,
          referenceNumber: tx.reference,
        })).filter((tx: Transaction) => tx.narration && tx.amount > 0)

        // Batch classify
        const results = await this.classifyBatch(pool, userId, txs)

        // Store results
        for (const [narration, result] of results) {
          const tx = txs.find(t => t.narration === narration)
          if (!tx) continue

          const dedupHash = createHash('sha256')
            .update(`${userId}:${account.id}:${tx.date.toISOString()}:${narration}:${tx.amount}:${tx.type}`)
            .digest('hex').slice(0, 64)

          await pool.query(`
            INSERT INTO classified_transactions (
              user_id, source_account_id, bank_name,
              transaction_date, narration, amount_paise,
              transaction_type, reference_number, mode,
              merchant_name, category, subcategory,
              category_group, confidence, classified_by,
              classification_reason, is_emi, is_recurring,
              dedup_hash
            ) VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
              $11,$12,$13,$14,$15,$16,$17,$18,$19
            )
            ON CONFLICT (dedup_hash) DO NOTHING
          `, [
            userId, null, account.bank_name,
            tx.date, tx.narration, tx.amount,
            tx.type, tx.referenceNumber ?? null, tx.mode ?? null,
            result.merchantName,
            result.category, result.subcategory,
            result.categoryGroup, result.confidence,
            result.classifiedBy, result.reason,
            result.isEmi, result.isRecurring,
            dedupHash
          ])
          processed++
        }

        // Rebuild monthly summary after processing
        await this.rebuildMonthlySummary(pool, userId)
        // Generate insights
        await this.generateInsights(pool, userId)

      } catch (err) {
        console.error(`[Classifier] Account ${account.account_id} failed:`, err)
        failed++
      }
    }

    return { processed, failed }
  },

  // Rebuild monthly_spend_summary table
  async rebuildMonthlySummary(
    pool:   Pool,
    userId: string
  ): Promise<void> {
    await pool.query(`
      INSERT INTO monthly_spend_summary (
        user_id, month, category, category_group,
        total_paise, transaction_count,
        avg_per_tx_paise, largest_tx_paise
      )
      SELECT
        user_id,
        DATE_TRUNC('month', transaction_date)::DATE AS month,
        category,
        category_group,
        SUM(amount_paise)           AS total_paise,
        COUNT(*)                    AS transaction_count,
        AVG(amount_paise)::BIGINT   AS avg_per_tx_paise,
        MAX(amount_paise)           AS largest_tx_paise
      FROM classified_transactions
      WHERE user_id = $1
      AND is_ignored = false
      AND category_group IN ('expense','revenue')
      GROUP BY user_id, DATE_TRUNC('month', transaction_date)::DATE, category, category_group
      ON CONFLICT (user_id, month, category) DO UPDATE SET
        total_paise       = EXCLUDED.total_paise,
        transaction_count = EXCLUDED.transaction_count,
        avg_per_tx_paise  = EXCLUDED.avg_per_tx_paise,
        largest_tx_paise  = EXCLUDED.largest_tx_paise,
        updated_at        = NOW()
    `, [userId])
  },

  // Generate AI insights for the current month
  async generateInsights(
    pool:   Pool,
    userId: string
  ): Promise<void> {
    const currentMonth = new Date()
    currentMonth.setDate(1)

    // Get this month's summary
    const summary = await pool.query(`
      SELECT category, category_group, total_paise, transaction_count
      FROM monthly_spend_summary
      WHERE user_id = $1
      AND month = DATE_TRUNC('month', CURRENT_DATE)::DATE
      ORDER BY total_paise DESC
    `, [userId])

    // Get last month for comparison
    const lastMonth = await pool.query(`
      SELECT category, total_paise
      FROM monthly_spend_summary
      WHERE user_id = $1
      AND month = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE
    `, [userId])

    if (summary.rows.length === 0) return

    const thisMonthMap = new Map(
      summary.rows.map((r: any) => [r.category, parseInt(r.total_paise)])
    )
    const lastMonthMap = new Map(
      lastMonth.rows.map((r: any) => [r.category, parseInt(r.total_paise)])
    )

    const insights: any[] = []

    // Detect overspend vs last month
    for (const [cat, amount] of thisMonthMap) {
      const prev = lastMonthMap.get(cat) ?? 0
      if (prev > 0 && amount > prev * 1.5) {
        insights.push({
          type:         'overspend',
          title:        `${cat} spending up ${Math.round((amount-prev)/prev*100)}%`,
          body:         `You spent ₹${Math.round(amount/100).toLocaleString()} on ${cat} this month vs ₹${Math.round(prev/100).toLocaleString()} last month.`,
          amount_paise: amount - prev,
          category:     cat,
        })
      }
    }

    // Detect new subscriptions (first time seeing this month)
    const newSubs = await pool.query(`
      SELECT merchant_name, amount_paise
      FROM classified_transactions
      WHERE user_id = $1
      AND category = 'SUBSCRIPTIONS'
      AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
      AND merchant_name NOT IN (
        SELECT DISTINCT merchant_name FROM classified_transactions
        WHERE user_id = $1
        AND category = 'SUBSCRIPTIONS'
        AND transaction_date < DATE_TRUNC('month', CURRENT_DATE)
      )
    `, [userId])

    for (const sub of newSubs.rows) {
      insights.push({
        type:         'new_subscription',
        title:        `New subscription: ${sub.merchant_name}`,
        body:         `You have a new ₹${Math.round(sub.amount_paise/100)} subscription to ${sub.merchant_name} this month.`,
        amount_paise: sub.amount_paise,
        category:     'SUBSCRIPTIONS',
      })
    }

    // Store insights
    for (const insight of insights.slice(0, 10)) {
      await pool.query(`
        INSERT INTO spend_insights (
          user_id, month, insight_type, title, body,
          amount_paise, category
        ) VALUES ($1, DATE_TRUNC('month', CURRENT_DATE)::DATE, $2,$3,$4,$5,$6)
        ON CONFLICT (user_id, month, insight_type, category) DO UPDATE SET
          title        = EXCLUDED.title,
          body         = EXCLUDED.body,
          amount_paise = EXCLUDED.amount_paise
      `, [
        userId,
        insight.type, insight.title, insight.body,
        insight.amount_paise, insight.category ?? ''
      ])
    }
  }
}
