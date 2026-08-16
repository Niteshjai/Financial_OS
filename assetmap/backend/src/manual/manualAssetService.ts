// ═══════════════════════════════════════════════════════════════
// AssetMap — Manual Asset Service
// Core CRUD for manually entered assets
// ═══════════════════════════════════════════════════════════════

import { pool } from '../db/connection'
import { ASSET_CATEGORIES } from './assetCategories'
import { logger } from '../utils/logger'

export const manualAssetService = {

  async createAsset(
    userId: string,
    data: {
      assetCategory:            string
      assetName:                string
      description?:             string
      currentValuePaise:        number
      purchaseValuePaise?:      number
      purchaseDate?:            string
      currency?:                string
      foreignCurrency?:         string
      foreignAmount?:           number
      extraFields:              Record<string, any>
      valuationMethod?:         string
      tags?:                    string[]
      notes?:                   string
      includeInNetworth?:       boolean
      isEncumbered?:            boolean
      encumbranceAmountPaise?:  number
    }
  ): Promise<{ assetId: string }> {
    const config = ASSET_CATEGORIES[data.assetCategory]
    if (!config) throw new Error(`Unknown asset category: ${data.assetCategory}`)

    const result = await pool.query(`
      INSERT INTO manual_assets (
        user_id, asset_category, asset_name, description,
        current_value_paise, purchase_value_paise, purchase_date,
        currency, foreign_currency, foreign_amount,
        extra_fields, valuation_method, valuation_date,
        next_valuation_date,
        tags, notes,
        include_in_networth, is_encumbered,
        encumbrance_amount_paise,
        is_collateral_eligible, collateral_ltv_pct,
        ai_risk_level, ai_liquidity_score
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, CURRENT_DATE,
        CURRENT_DATE + 90,
        $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING id
    `, [
      userId,
      data.assetCategory,
      data.assetName,
      data.description ?? null,
      data.currentValuePaise,
      data.purchaseValuePaise ?? null,
      data.purchaseDate ?? null,
      data.currency ?? 'INR',
      data.foreignCurrency ?? null,
      data.foreignAmount ?? null,
      JSON.stringify(data.extraFields),
      data.valuationMethod ?? 'self_assessed',
      data.tags ?? [],
      data.notes ?? null,
      data.includeInNetworth ?? true,
      data.isEncumbered ?? false,
      data.encumbranceAmountPaise ?? null,
      config.isCollateralEligible,
      config.defaultLTV ?? null,
      config.defaultRiskLevel,
      config.defaultLiquidityScore,
    ])

    const assetId = result.rows[0].id

    logger.info('Manual asset created', {
      userId, assetId,
      category: data.assetCategory,
      valuePaise: data.currentValuePaise,
    })

    return { assetId }
  },

  async updateValue(
    userId:          string,
    assetId:         string,
    newValuePaise:   number,
    valuationMethod: string = 'self_assessed',
    _reason?:        string
  ): Promise<void> {
    const result = await pool.query(`
      UPDATE manual_assets SET
        current_value_paise     = $2,
        valuation_method        = $3,
        valuation_date          = CURRENT_DATE,
        next_valuation_date     = CURRENT_DATE + 90,
        valuation_reminder_sent = false
      WHERE id = $1 AND user_id = $4 AND is_active = true
    `, [assetId, newValuePaise, valuationMethod, userId])

    if (result.rowCount === 0) throw new Error('Asset not found')
  },

  async updateAsset(
    userId:  string,
    assetId: string,
    updates: Partial<{
      assetName:              string
      description:            string
      currentValuePaise:      number
      purchaseValuePaise:     number
      purchaseDate:           string
      extraFields:            Record<string, any>
      valuationMethod:        string
      tags:                   string[]
      notes:                  string
      includeInNetworth:      boolean
      isEncumbered:           boolean
      encumbranceAmountPaise: number
    }>
  ): Promise<void> {
    const sets:   string[] = []
    const params: any[]    = [assetId, userId]
    let idx = 3

    if (updates.assetName !== undefined) {
      sets.push(`asset_name = $${idx++}`)
      params.push(updates.assetName)
    }
    if (updates.description !== undefined) {
      sets.push(`description = $${idx++}`)
      params.push(updates.description)
    }
    if (updates.currentValuePaise !== undefined) {
      sets.push(`current_value_paise = $${idx++}`)
      params.push(updates.currentValuePaise)
      sets.push(`valuation_date = CURRENT_DATE`)
      sets.push(`next_valuation_date = CURRENT_DATE + 90`)
      sets.push(`valuation_reminder_sent = false`)
    }
    if (updates.purchaseValuePaise !== undefined) {
      sets.push(`purchase_value_paise = $${idx++}`)
      params.push(updates.purchaseValuePaise)
    }
    if (updates.purchaseDate !== undefined) {
      sets.push(`purchase_date = $${idx++}`)
      params.push(updates.purchaseDate)
    }
    if (updates.extraFields !== undefined) {
      sets.push(`extra_fields = $${idx++}`)
      params.push(JSON.stringify(updates.extraFields))
    }
    if (updates.valuationMethod !== undefined) {
      sets.push(`valuation_method = $${idx++}`)
      params.push(updates.valuationMethod)
    }
    if (updates.tags !== undefined) {
      sets.push(`tags = $${idx++}`)
      params.push(updates.tags)
    }
    if (updates.notes !== undefined) {
      sets.push(`notes = $${idx++}`)
      params.push(updates.notes)
    }
    if (updates.includeInNetworth !== undefined) {
      sets.push(`include_in_networth = $${idx++}`)
      params.push(updates.includeInNetworth)
    }
    if (updates.isEncumbered !== undefined) {
      sets.push(`is_encumbered = $${idx++}`)
      params.push(updates.isEncumbered)
    }
    if (updates.encumbranceAmountPaise !== undefined) {
      sets.push(`encumbrance_amount_paise = $${idx++}`)
      params.push(updates.encumbranceAmountPaise)
    }

    if (sets.length === 0) return

    await pool.query(
      `UPDATE manual_assets SET ${sets.join(', ')}
       WHERE id = $1 AND user_id = $2 AND is_active = true`,
      params
    )
  },

  async deleteAsset(
    userId:  string,
    assetId: string
  ): Promise<void> {
    await pool.query(`
      UPDATE manual_assets
      SET is_active = false
      WHERE id = $1 AND user_id = $2
    `, [assetId, userId])
  },

  async getUserAssets(
    userId:    string,
    category?: string
  ): Promise<{
    assets:     any[]
    summary:    Record<string, number>
    totalPaise: number
  }> {
    const conditions = ['user_id = $1', 'is_active = true']
    const params: any[] = [userId]
    let idx = 2

    if (category) {
      conditions.push(`asset_category = $${idx++}`)
      params.push(category)
    }

    const result = await pool.query(`
      SELECT
        id, asset_category, asset_name, description,
        current_value_paise, purchase_value_paise,
        purchase_date, valuation_date, next_valuation_date,
        valuation_method, extra_fields,
        is_encumbered, encumbrance_amount_paise,
        is_collateral_eligible, collateral_ltv_pct,
        include_in_networth,
        ai_risk_level, ai_liquidity_score,
        ai_category_label, ai_summary, ai_suggestions,
        tags, notes, document_s3_key, document_name,
        created_at, updated_at
      FROM manual_assets
      WHERE ${conditions.join(' AND ')}
      ORDER BY current_value_paise DESC
    `, params)

    const assets = result.rows

    // Summary by category
    const summary: Record<string, number> = {}
    let totalPaise = 0

    for (const asset of assets) {
      if (!asset.include_in_networth) continue
      const net = asset.current_value_paise -
                  (asset.is_encumbered
                    ? (asset.encumbrance_amount_paise ?? 0)
                    : 0)
      const val = Math.max(0, net)
      summary[asset.asset_category] =
        (summary[asset.asset_category] ?? 0) + val
      totalPaise += val
    }

    return { assets, summary, totalPaise }
  },

  async getAssetById(
    userId:  string,
    assetId: string
  ): Promise<any | null> {
    const result = await pool.query(
      'SELECT * FROM manual_assets WHERE id = $1 AND user_id = $2 AND is_active = true',
      [assetId, userId]
    )
    return result.rows[0] ?? null
  },

  async getValueHistory(
    userId:  string,
    assetId: string
  ): Promise<any[]> {
    const result = await pool.query(`
      SELECT * FROM manual_asset_value_history
      WHERE asset_id = $1 AND user_id = $2
      ORDER BY updated_at DESC
      LIMIT 24
    `, [assetId, userId])
    return result.rows
  },

  async getSummary(userId: string): Promise<{
    byCategory:   any[]
    totalPaise:   number
    overdueCount: number
  }> {
    const catResult = await pool.query(`
      SELECT
        asset_category,
        COUNT(*)::int                       AS count,
        SUM(current_value_paise)::bigint    AS total_value,
        SUM(purchase_value_paise)::bigint   AS total_invested,
        SUM(CASE WHEN is_encumbered
          THEN encumbrance_amount_paise ELSE 0 END)::bigint
                                            AS total_encumbrance
      FROM manual_assets
      WHERE user_id = $1
      AND is_active = true
      AND include_in_networth = true
      GROUP BY asset_category
      ORDER BY SUM(current_value_paise) DESC
    `, [userId])

    const totalPaise = catResult.rows.reduce(
      (s: number, r: any) => s + parseInt(r.total_value || '0'), 0
    )

    const overdueResult = await pool.query(`
      SELECT COUNT(*)::int AS count FROM manual_assets
      WHERE user_id = $1
      AND is_active = true
      AND next_valuation_date < CURRENT_DATE
    `, [userId])

    return {
      byCategory:   catResult.rows,
      totalPaise,
      overdueCount: overdueResult.rows[0].count,
    }
  },
}
