// ═══════════════════════════════════════════════════════════════
// AssetMap — Manual Asset AI Enricher
// Uses Claude to classify risk, liquidity, and generate suggestions
// Fire-and-forget — does not block asset creation
// ═══════════════════════════════════════════════════════════════

import { pool } from '../db/connection'
import { ASSET_CATEGORIES } from './assetCategories'
import { logger } from '../utils/logger'

export const manualAIEnricher = {

  async enrich(
    userId:  string,
    assetId: string
  ): Promise<void> {
    const asset = await pool.query(
      'SELECT * FROM manual_assets WHERE id = $1 AND user_id = $2',
      [assetId, userId]
    )
    if (!asset.rows[0]) return

    const a      = asset.rows[0]
    const config = ASSET_CATEGORIES[a.asset_category]

    // Skip if no API key configured
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.info('[ManualAIEnricher] Skipped — no ANTHROPIC_API_KEY configured')
      return
    }

    const prompt = `
You are a financial advisor analysing a manually entered asset for an Indian user.

Asset details:
Category:      ${config?.label ?? a.asset_category}
Name:          ${a.asset_name}
Description:   ${a.description ?? 'Not provided'}
Current value: ₹${Math.round(a.current_value_paise / 100).toLocaleString('en-IN')}
Purchase value:₹${Math.round((a.purchase_value_paise ?? 0) / 100).toLocaleString('en-IN')}
Extra details: ${JSON.stringify(a.extra_fields)}
Valuation:     ${a.valuation_method}

Return ONLY a JSON object:
{
  "ai_category_label": "<emoji + descriptive label, e.g. '🥇 22K Gold Jewellery — 50g'>",
  "ai_risk_level": "<very_low|low|medium|high|very_high>",
  "ai_liquidity_score": <0-100>,
  "ai_summary": "<one sentence plain English description>",
  "ai_suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>"]
}

No preamble. Pure JSON only.
`.trim()

    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const response = await anthropic.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages:   [{ role: 'user', content: prompt }],
      })

      const text = response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('')
        .replace(/```json|```/g, '')
        .trim()

      const enrichment = JSON.parse(text)

      await pool.query(`
        UPDATE manual_assets SET
          ai_category_label  = $2,
          ai_risk_level      = $3,
          ai_liquidity_score = $4,
          ai_summary         = $5,
          ai_suggestions     = $6,
          ai_enriched_at     = NOW()
        WHERE id = $1
      `, [
        assetId,
        enrichment.ai_category_label,
        enrichment.ai_risk_level,
        enrichment.ai_liquidity_score,
        enrichment.ai_summary,
        enrichment.ai_suggestions ?? [],
      ])

      logger.info('[ManualAIEnricher] Enriched asset', { assetId })
    } catch (err) {
      logger.error('[ManualAIEnricher] Failed', { error: (err as Error).message })
      // Don't throw — enrichment failure should not block asset creation
    }
  },
}
