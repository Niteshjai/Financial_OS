import { Pool }        from 'pg'
import { StateConfig } from './stateSearchRouter'

// Tahsildar office data — in production, pull from a maintained DB
// For now, generate a guide based on state + district
const TAHSILDAR_INFO: Record<string, string> = {
  'Bihar':     'Office of the Anchaladhikari (Circle Officer)',
  'Jharkhand': 'Office of the Anchaladhikari (Circle Officer)',
  'Odisha':    'Office of the Tahasildar',
}

export const offlineGuideGenerator = {

  async generate(
    pool:        Pool,
    searchId:    string,
    userId:      string,
    stateConfig: StateConfig,
    input:       any
  ): Promise<void> {
    const steps = this.buildSteps(stateConfig, input)

    await pool.query(`
      INSERT INTO ancestral_offline_guides (
        search_id, user_id, state, district,
        tahsildar_office, forms_required, steps
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [
      searchId, userId,
      stateConfig.state,
      input.district ?? null,
      TAHSILDAR_INFO[stateConfig.state] ?? `${stateConfig.state} Tahsildar Office`,
      stateConfig.formatsRequired,
      JSON.stringify(steps)
    ])
  },

  buildSteps(stateConfig: StateConfig, input: any): object[] {
    return [
      {
        step:        1,
        title:       `Go to ${stateConfig.state} Tahsildar office`,
        description: `Visit the Tahsildar office for ${input.district ?? 'the district'} where the property is located.`,
        tip:         stateConfig.tahsildarTip
      },
      {
        step:        2,
        title:       'Request Form 8-A (Village Record)',
        description: `Ask for the computer record of Village Form 8-A for "${input.village ?? 'the village'}". This shows all properties in the village and their owners.`,
        form:        'Village Form 8-A'
      },
      {
        step:        3,
        title:       'Search by ancestor name',
        description: `Ask the clerk to search for "${input.ancestorName}" in the village records. Bring multiple spelling variants of the name.`,
        nameVariants:input.ancestorName
      },
      {
        step:        4,
        title:       'Get survey number if found',
        description: 'If a matching record is found, note the survey/khasra number. This is the key to all further searches.',
        form:        'Note down: Survey No., Khata No., Area, Land Type'
      },
      {
        step:        5,
        title:       'Request Forms VII-XII and VI-XII',
        description: 'With the survey number, request these forms to see the full ownership history and mutation records.',
        legalBasis:  `Section 327 of MLR Code (Maharashtra) or equivalent state provision`
      },
      {
        step:        6,
        title:       'Consult a property lawyer',
        description: 'If the property is found and you wish to claim it, engage a local property lawyer who knows the state land laws.',
        tip:         'AssetMap can connect you to our success-fee recovery service if legal help is needed.'
      }
    ]
  }
}
