import { Pool }             from 'pg'
import { v4 as uuidv4 }    from 'uuid'
import { generateNameVariants } from './nameVariantEngine'
import { getStateConfig }   from './stateSearchRouter'
import { surepassSearcher } from './surepassSearcher'
import { scoreConfidence }  from './confidenceScorer'
import { deepLinkGenerator }from './deepLinkGenerator'
import { offlineGuideGenerator } from './offlineGuideGenerator'
// Assuming an auditLogger exists. If not it will throw an error and we can mock it, but user prompt says it's in `../services/auditLogger`.
import { auditLogger }      from '../services/auditLogger'

export const ancestralSearch = {

  async startSearch(
    pool:   Pool,
    userId: string,
    input: {
      ancestorName:      string
      relationship:      string
      relationshipLabel: string
      state:             string
      district?:         string
      taluka?:           string
      village?:          string
      surveyNumber?:     string
      approximateDecade?:string
      additionalClues?:  string
    }
  ): Promise<string> {

    // Check plan limit (1 per year free, unlimited Plus+)
    const planResult = await pool.query(
      'SELECT plan_id FROM user_current_plan WHERE user_id = $1',
      [userId]
    )
    const planId = planResult.rows[0]?.plan_id ?? 'free'

    if (planId === 'free') {
      const usageResult = await pool.query(`
        SELECT usage_count FROM feature_usage
        WHERE user_id = $1
        AND feature_key = 'ancestral_search'
        AND period = DATE_TRUNC('year', CURRENT_DATE)::DATE
      `, [userId])

      const used = parseInt(usageResult.rows[0]?.usage_count ?? '0')
      if (used >= 1) {
        throw new Error(
          'FREE_PLAN_LIMIT: Free plan allows 1 ancestral property search per year. ' +
          'Upgrade to Plus for unlimited searches.'
        )
      }
    }

    // Generate name variants upfront
    const nameData = generateNameVariants(input.ancestorName)
    const variants = [nameData.original, ...nameData.variants].slice(0, 10)

    // Create search record
    const result = await pool.query(`
      INSERT INTO ancestral_searches (
        user_id, ancestor_name, ancestor_name_variants,
        relationship, relationship_label,
        state, district, taluka, village,
        survey_number, approximate_decade,
        additional_clues, status, plan_at_search
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending',$13)
      RETURNING id
    `, [
      userId,
      input.ancestorName,
      variants,
      input.relationship,
      input.relationshipLabel ?? null,
      input.state,
      input.district  ?? null,
      input.taluka    ?? null,
      input.village   ?? null,
      input.surveyNumber ?? null,
      input.approximateDecade ?? null,
      input.additionalClues ?? null,
      planId
    ])

    const searchId = result.rows[0].id

    // Increment usage counter
    await pool.query(`
      INSERT INTO feature_usage (user_id, feature_key, period, usage_count, last_used_at)
      VALUES ($1,'ancestral_search', DATE_TRUNC('year', CURRENT_DATE)::DATE, 1, NOW())
      ON CONFLICT (user_id, feature_key, period)
      DO UPDATE SET usage_count = feature_usage.usage_count + 1, last_used_at = NOW()
    `, [userId])

    // Queue async search worker
    const { ancestralSearchQueue } = await import('../workers/ancestralSearchWorker')
    await ancestralSearchQueue.add('search', {
      searchId, userId,
      input, variants
    })

    await auditLogger.log(
      userId,
      'LAND_SEARCH' as any,
      'ancestral_search',
      searchId,
      undefined,
      undefined,
      { state: input.state, ancestorName: input.ancestorName }
    )

    return searchId
  },

  // Called by BullMQ worker
  async executeSearch(
    pool:     Pool,
    searchId: string,
    userId:   string,
    input:    any,
    variants: string[]
  ): Promise<void> {
    const start = Date.now()

    await pool.query(
      `UPDATE ancestral_searches SET status='searching', initiated_at=NOW() WHERE id=$1`,
      [searchId]
    )

    const stateConfig = getStateConfig(input.state)
    if (!stateConfig) {
      await pool.query(
        `UPDATE ancestral_searches SET status='failed' WHERE id=$1`,
        [searchId]
      )
      return
    }

    let allResults:    any[] = []
    let variantsTried: string[] = []
    let searchMethod  = stateConfig.searchMethod

    if (stateConfig.searchMethod === 'surepass_api') {
      const { results, variantsTried: tried } =
        await surepassSearcher.searchAllVariants(
          input.ancestorName,
          stateConfig,
          {
            district: input.district,
            taluka:   input.taluka,
            village:  input.village,
          }
        )
      allResults    = results
      variantsTried = tried

    } else if (stateConfig.searchMethod === 'deep_link') {
      // Generate deep links — no API results
      await deepLinkGenerator.generate(pool, searchId, userId, stateConfig, input)

    } else {
      // Offline guide
      await offlineGuideGenerator.generate(pool, searchId, userId, stateConfig, input)
    }

    // Score and store results
    let storedCount = 0
    for (const result of allResults.slice(0, 20)) {
      const score = await scoreConfidence(
        {
          ancestorName:     input.ancestorName,
          relationship:     input.relationship,
          state:            input.state,
          district:         input.district,
          village:          input.village,
          approximateDecade:input.approximateDecade,
        },
        {
          ownerName:      result.ownerName,
          surveyNumber:   result.surveyNumber,
          village:        result.village,
          district:       result.district,
          state:          result.state,
          currentOwner:   result.currentOwner,
          matchedVariant: (result as any).matchedVariant ?? input.ancestorName,
          matchType:      (result as any).matchedVariant === input.ancestorName.toLowerCase()
                          ? 'exact' : 'phonetic',
          areaAcres:      result.areaAcres,
          mutationHistory:result.mutationHistory,
        }
      )

      // Only store results with reasonable confidence
      if (score.overall < 20) continue

      await pool.query(`
        INSERT INTO ancestral_search_results (
          search_id, user_id,
          raw_owner_name, survey_number, khata_number,
          village, taluka, district, state,
          land_area_acres, land_type,
          current_owner_name,
          mutation_history, has_encumbrance,
          confidence_score, confidence_label,
          confidence_reasons, name_match_score,
          location_match_score, time_period_score,
          matched_variant, match_type,
          portal_url, deep_link_url,
          raw_api_response
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25
        )
      `, [
        searchId, userId,
        result.ownerName, result.surveyNumber, result.khataNumber,
        result.village, result.taluka, result.district, result.state,
        result.areaAcres, result.landType,
        result.currentOwner,
        JSON.stringify(result.mutationHistory ?? []),
        result.hasEncumbrance,
        score.overall, score.label,
        score.reasons, score.nameMatchScore,
        score.locationScore, score.timePeriodScore,
        (result as any).matchedVariant,
        (result as any).matchType ?? 'phonetic',
        result.portalUrl,
        stateConfig.portalUrl,
        JSON.stringify(result.rawResponse)
      ])

      storedCount++
      await new Promise(r => setTimeout(r, 200)) // rate limit AI calls
    }

    const duration = Date.now() - start

    await pool.query(`
      UPDATE ancestral_searches SET
        status           = $2,
        search_method    = $3,
        states_searched  = $4,
        variants_tried   = $5,
        results_count    = $6,
        completed_at     = NOW(),
        duration_ms      = $7,
        updated_at       = NOW()
      WHERE id = $1
    `, [
      searchId,
      storedCount > 0 ? 'completed' : 'no_results',
      searchMethod,
      [stateConfig.state],
      variantsTried,
      storedCount,
      duration
    ])
  },

  // User confirms a result is their family's property
  async confirmResult(
    pool:     Pool,
    userId:   string,
    resultId: string,
    notes?:   string
  ): Promise<string> {
    await pool.query(`
      UPDATE ancestral_search_results
      SET user_status = 'confirmed',
          user_notes  = $3,
          confirmed_at= NOW(),
          updated_at  = NOW()
      WHERE id = $1 AND user_id = $2
    `, [resultId, userId, notes ?? null])

    // Fetch result to add to canonical_assets
    const result = await pool.query(
      'SELECT * FROM ancestral_search_results WHERE id=$1', [resultId]
    )
    const r = result.rows[0]

    // Add to canonical_assets as AGRICULTURAL_LAND_MANUAL
    // (user still needs to legally verify — this is a lead, not proof)
    const { encryptPII } = await import('../utils/encryption')
    const { createHash } = await import('crypto')

    const dedupHash = createHash('sha256')
      .update(`ancestral:${userId}:${resultId}`)
      .digest('hex').slice(0, 32)

    const canonicalResult = await pool.query(`
      INSERT INTO canonical_assets (
        user_id, asset_class, primary_source,
        institution_name, asset_name, asset_subtype,
        current_value_paise, currency,
        quantity, unit,
        is_active,
        ai_category_label, ai_risk_level, ai_liquidity_score,
        ai_summary,
        raw_data_enc, dedup_hash,
        last_synced_at
      ) VALUES (
        $1,'AGRICULTURAL_LAND_MANUAL','ancestral_search',
        $2,$3,'ancestral_land',
        0,'INR',
        $4,'acres',
        true,
        $5,'medium',15,
        $6,
        $7,$8,NOW()
      )
      ON CONFLICT (dedup_hash) DO NOTHING
      RETURNING id
    `, [
      userId,
      `${r.village}, ${r.district} (Ancestral)`,
      `${r.raw_owner_name} — ${r.village}`,
      r.land_area_acres,
      `Ancestral land — ${r.village}, ${r.district}, ${r.state}`,
      `Possible ancestral property (${r.confidence_score}% confidence). ` +
      `Survey: ${r.survey_number}. Verify ownership before claiming.`,
      encryptPII(JSON.stringify({
        surveyNumber:     r.survey_number,
        ownerName:        r.raw_owner_name,
        village:          r.village,
        district:         r.district,
        state:            r.state,
        confidence:       r.confidence_score,
        portalUrl:        r.portal_url,
        needsVerification:true,
        ancestralSearchId:r.search_id,
      })),
      dedupHash
    ])

    const canonicalId = canonicalResult.rows[0]?.id

    if (canonicalId) {
      await pool.query(`
        UPDATE ancestral_search_results
        SET canonical_asset_id = $2, added_to_records = true
        WHERE id = $1
      `, [resultId, canonicalId])
    }

    // Update confirmed count
    await pool.query(`
      UPDATE ancestral_searches s SET
        confirmed_count = (
          SELECT COUNT(*) FROM ancestral_search_results
          WHERE search_id = s.id AND user_status = 'confirmed'
        )
      WHERE id = (
        SELECT search_id FROM ancestral_search_results WHERE id = $1
      )
    `, [resultId])

    return canonicalId ?? ''
  },

  async getSearchStatus(
    pool:     Pool,
    userId:   string,
    searchId: string
  ): Promise<any> {
    const [searchResult, resultsResult] = await Promise.all([
      pool.query(
        'SELECT * FROM ancestral_searches WHERE id=$1 AND user_id=$2',
        [searchId, userId]
      ),
      pool.query(`
        SELECT
          id, raw_owner_name, survey_number,
          village, taluka, district, state,
          land_area_acres, land_type,
          current_owner_name, confidence_score,
          confidence_label, confidence_reasons,
          name_match_score, location_match_score,
          matched_variant, match_type,
          user_status, user_notes, confirmed_at,
          portal_url, deep_link_url,
          has_encumbrance, added_to_records,
          created_at
        FROM ancestral_search_results
        WHERE search_id = $1
        ORDER BY confidence_score DESC
      `, [searchId])
    ])

    if (!searchResult.rows[0]) throw new Error('Search not found')

    const search = searchResult.rows[0]

    return {
      ...search,
      results:          resultsResult.rows,
      isComplete:       ['completed','no_results','failed'].includes(search.status),
      hasResults:       resultsResult.rows.length > 0,
      verifiedCount:    resultsResult.rows.filter((r: any) => r.user_status === 'confirmed').length,
    }
  },

  async getUserSearchHistory(
    pool:   Pool,
    userId: string
  ): Promise<any[]> {
    const result = await pool.query(`
      SELECT
        id, ancestor_name, relationship_label,
        state, district, village,
        status, results_count, confirmed_count,
        search_method, created_at, completed_at
      FROM ancestral_searches
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId])
    return result.rows
  }
}
