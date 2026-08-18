import { Pool }        from 'pg'
import { StateConfig } from './stateSearchRouter'

export const deepLinkGenerator = {

  async generate(
    pool:        Pool,
    searchId:    string,
    userId:      string,
    stateConfig: StateConfig,
    input:       any
  ): Promise<void> {
    // Build pre-filled portal URLs for states without API
    const urls = this.buildPortalUrls(stateConfig, input)

    // Store as results with user_status = 'pending_review'
    // These are not API results — they're guided links
    for (const url of urls) {
      await pool.query(`
        INSERT INTO ancestral_search_results (
          search_id, user_id,
          raw_owner_name, village, district, state,
          confidence_score, confidence_label,
          confidence_reasons,
          match_type, portal_url, deep_link_url,
          user_status
        ) VALUES ($1,$2,$3,$4,$5,$6,50,'possible',
          ARRAY['Manual search required — click to open portal'],
          'partial',$7,$8,'pending_review')
      `, [
        searchId, userId,
        input.ancestorName,
        input.village ?? '',
        input.district ?? '',
        stateConfig.state,
        stateConfig.portalUrl,
        url
      ])
    }
  },

  buildPortalUrls(stateConfig: StateConfig, input: any): string[] {
    const base    = stateConfig.portalUrl
    const urls:   string[] = [base]
    const params  = new URLSearchParams()

    if (input.district) params.set('district', input.district)
    if (input.taluka)   params.set('taluka',   input.taluka)
    if (input.village)  params.set('village',  input.village)

    const paramStr = params.toString()
    if (paramStr) urls.push(`${base}?${paramStr}`)

    return urls
  }
}
