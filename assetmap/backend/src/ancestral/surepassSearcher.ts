import axios    from 'axios'
import { Pool } from 'pg'
import { StateConfig }     from './stateSearchRouter'
import { generateNameVariants } from './nameVariantEngine'

export interface LandSearchResult {
  ownerName:       string
  surveyNumber:    string
  khataNumber?:    string
  village:         string
  taluka:          string
  district:        string
  state:           string
  areaAcres?:      number
  landType?:       string
  currentOwner?:   string
  mutationHistory?:any[]
  hasEncumbrance?: boolean
  portalUrl?:      string
  rawResponse:     any
}

export const surepassSearcher = {

  async searchByName(
    nameVariant:  string,
    stateConfig:  StateConfig,
    location: {
      district?: string
      taluka?:   string
      village?:  string
    }
  ): Promise<LandSearchResult[]> {

    if (!stateConfig.surepassEndpoint) return []

    const endpoint = `${process.env.SUREPASS_API_URL}${stateConfig.surepassEndpoint}`

    try {
      const response = await axios.post(
        endpoint,
        {
          owner_name: nameVariant,
          district:   location.district ?? '',
          taluka:     location.taluka   ?? '',
          village:    location.village  ?? '',
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.SUREPASS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000
        }
      )

      const data = response.data?.data ?? []
      if (!Array.isArray(data)) return []

      return data.map((record: any) => ({
        ownerName:       record.owner_name ?? record.khatedar_name ?? nameVariant,
        surveyNumber:    record.survey_no  ?? record.khasra_no     ?? record.gata_no ?? '',
        khataNumber:     record.khata_no   ?? record.khatiyan_no   ?? '',
        village:         record.village    ?? location.village     ?? '',
        taluka:          record.taluka     ?? location.taluka      ?? '',
        district:        record.district   ?? location.district    ?? '',
        state:           stateConfig.state,
        areaAcres:       parseFloat(record.area_acres ?? record.area ?? '0') || undefined,
        landType:        record.land_type  ?? record.khasra_type   ?? undefined,
        currentOwner:    record.current_owner ?? undefined,
        mutationHistory: record.mutation_history ?? [],
        hasEncumbrance:  record.has_encumbrance ?? false,
        portalUrl:       record.portal_url ?? stateConfig.portalUrl,
        rawResponse:     record
      }))

    } catch (err: any) {
      // Log but don't throw — partial failures are acceptable
      console.error(`[AncestralSearch] Surepass error for ${stateConfig.state}/${nameVariant}:`, err.message)
      return []
    }
  },

  // Search all name variants for a state
  async searchAllVariants(
    ancestorName: string,
    stateConfig:  StateConfig,
    location: {
      district?: string
      taluka?:   string
      village?:  string
    }
  ): Promise<{ results: LandSearchResult[]; variantsTried: string[] }> {

    const nameData   = generateNameVariants(ancestorName)
    const allVariants= [nameData.original, ...nameData.variants].slice(0, 8)
    const seen       = new Set<string>()
    const results:   LandSearchResult[] = []

    for (const variant of allVariants) {
      // Rate limit — Surepass charges per call
      await new Promise(r => setTimeout(r, 500))

      const variantResults = await this.searchByName(
        variant, stateConfig, location
      )

      for (const result of variantResults) {
        // Deduplicate by survey number + district
        const key = `${result.surveyNumber}:${result.district}:${result.village}`
        if (!seen.has(key)) {
          seen.add(key)
          results.push({ ...result, matchedVariant: variant } as any)
        }
      }

      // If we found results with exact name — no need to try more variants
      if (variant === nameData.original && results.length > 0) {
        break
      }
    }

    return { results, variantsTried: allVariants }
  }
}
