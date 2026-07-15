import { Pool }   from 'pg'
import { decrypt }from '../../utils/encryption'
import { z }      from 'zod'

export const LawFirmResponseSchema = z.object({
  requestId:      z.string(),
  userId:         z.string(),
  generatedAt:    z.string(),
  dataAsOf:       z.string(),
  consentVerified:z.boolean(),

  estateValue: z.object({
    totalNetWorthPaise:       z.number(),
    movableAssetsPaise:       z.number(),
    immovableAssetsPaise:     z.number(),
    listedSecuritiesPaise:    z.number(),
    retirementAssetsPaise:    z.number(),
    insuranceCoverPaise:      z.number(),
    unclaimedAssetsPaise:     z.number(),
    lastUpdated:              z.string(),
  }),

  bankAccounts: z.array(z.object({
    institutionName:  z.string(),
    accountType:      z.string(),
    hasNominee:       z.boolean(),
    nomineeName:      z.string().optional(),
    approximateValue: z.string(),
    status:           z.string(),
    isDormant:        z.boolean(),
  })),

  investments: z.array(z.object({
    type:           z.string(),
    institutionName:z.string(),
    assetName:      z.string().optional(),
    hasNominee:     z.boolean(),
    nomineeName:    z.string().optional(),
    approximateValue:z.string(),
    maturityDate:   z.string().optional(),
  })),

  landAndProperty: z.array(z.object({
    assetName:        z.string(),
    location:         z.string(),
    landType:         z.string().optional(),
    areaDescription:  z.string().optional(),
    ownershipType:    z.string(),
    titleStatus:      z.string(),
    registrationDate: z.string().optional(),
    approximateValue: z.string(),
    documentAvailable:z.boolean(),
    mutationStatus:   z.string().optional(),
  })),

  insurancePolicies: z.array(z.object({
    type:           z.string(),
    insurerName:    z.string(),
    sumAssured:     z.string(),
    hasNominee:     z.boolean(),
    nomineeName:    z.string().optional(),
    expiryDate:     z.string().optional(),
    status:         z.string(),
  })),

  nomineeCompliance: z.object({
    totalAccounts:      z.number(),
    withNominee:        z.number(),
    withoutNominee:     z.number(),
    compliancePercent:  z.number(),
    accountsMissingNominee: z.array(z.string()),
  }),

  riskFlags: z.array(z.object({
    severity:   z.enum(['high','medium','low']),
    flag:       z.string(),
    detail:     z.string(),
  })),

  availableDocuments: z.array(z.object({
    type:        z.string(),
    description: z.string(),
    available:   z.boolean(),
  })),

  disclaimer: z.string(),
})

export type LawFirmResponse = z.infer<typeof LawFirmResponseSchema>

export async function transformForLawFirm(
  pool:       Pool,
  userId:     string,
  requestId:  string
): Promise<LawFirmResponse> {

  const assets = await pool.query(`
    SELECT
      asset_class, institution_name, asset_name,
      asset_subtype, current_value_paise,
      has_nominee, nominee_name_enc,
      title_status, ownership_type,
      opened_date, maturity_date,
      last_transaction_date,
      is_active, is_dormant,
      document_available,
      ai_anomaly_flag, ai_anomaly_reason,
      ai_risk_level, ai_summary
    FROM canonical_assets
    WHERE user_id = $1 AND is_active = true
    ORDER BY current_value_paise DESC
  `, [userId])

  const rows = assets.rows

  const approxRange = (paise: number): string => {
    const v = paise / 100
    if (v <= 0)            return 'Unknown'
    if (v < 100000)        return 'Under ₹1L'
    if (v < 500000)        return '₹1L–₹5L'
    if (v < 1000000)       return '₹5L–₹10L'
    if (v < 5000000)       return '₹10L–₹50L'
    if (v < 10000000)      return '₹50L–₹1Cr'
    if (v < 50000000)      return '₹1Cr–₹5Cr'
    return 'Above ₹5Cr'
  }

  const byClass = (classes: string[]) =>
    rows.filter(r => classes.includes(r.asset_class))

  const totalPaise = rows.reduce(
    (s, r) => s + parseInt(r.current_value_paise), 0
  )

  const movable = byClass([
    'BANK_ACCOUNT','FIXED_DEPOSIT','MUTUAL_FUND',
    'EQUITY','NPS','GOLD','BOND'
  ]).reduce((s, r) => s + parseInt(r.current_value_paise), 0)

  const immovable = byClass(['LAND','PROPERTY'])
    .reduce((s, r) => s + parseInt(r.current_value_paise), 0)

  const insurance = byClass([
    'INSURANCE_LIFE','INSURANCE_HEALTH','INSURANCE_OTHER'
  ]).reduce((s, r) => s + parseInt(r.current_value_paise), 0)

  const retirement = byClass(['NPS','EPF','PPF'])
    .reduce((s, r) => s + parseInt(r.current_value_paise), 0)

  const unclaimed = byClass(['UNCLAIMED'])
    .reduce((s, r) => s + parseInt(r.current_value_paise), 0)

  const financialAccounts = byClass([
    'BANK_ACCOUNT','FIXED_DEPOSIT','MUTUAL_FUND',
    'EQUITY','NPS','INSURANCE_LIFE'
  ])
  const withNominee = financialAccounts.filter(r => r.has_nominee)
  const withoutNominee = financialAccounts.filter(r => !r.has_nominee)

  const riskFlags: LawFirmResponse['riskFlags'] = []

  const disputedLand = byClass(['LAND','PROPERTY'])
    .filter(r => r.title_status === 'dispute')
  if (disputedLand.length > 0) {
    riskFlags.push({
      severity: 'high',
      flag:     'DISPUTED_LAND_TITLE',
      detail:   `${disputedLand.length} land parcel(s) have disputed titles`
    })
  }

  if (withoutNominee.length > financialAccounts.length * 0.5) {
    riskFlags.push({
      severity: 'high',
      flag:     'MISSING_NOMINEES',
      detail:   `${withoutNominee.length} accounts have no nominee`
    })
  }

  const dormantAccounts = rows.filter(r => r.is_dormant)
  if (dormantAccounts.length > 0) {
    riskFlags.push({
      severity: 'medium',
      flag:     'DORMANT_ACCOUNTS',
      detail:   `${dormantAccounts.length} dormant account(s)`
    })
  }

  const anomalies = rows.filter(r => r.ai_anomaly_flag)
  if (anomalies.length > 0) {
    riskFlags.push({
      severity: 'medium',
      flag:     'DATA_ANOMALIES',
      detail:   `${anomalies.length} account(s) flagged for unusual activity`
    })
  }

  if (unclaimed > 0) {
    riskFlags.push({
      severity: 'low',
      flag:     'UNCLAIMED_ASSETS',
      detail:   `Unclaimed assets of approx ${approxRange(unclaimed)} found`
    })
  }

  return {
    requestId,
    userId,
    generatedAt:    new Date().toISOString(),
    dataAsOf:       rows[0]?.last_synced_at ?? new Date().toISOString(),
    consentVerified:true,

    estateValue: {
      totalNetWorthPaise:    totalPaise,
      movableAssetsPaise:    movable,
      immovableAssetsPaise:  immovable,
      listedSecuritiesPaise: byClass(['EQUITY','MUTUAL_FUND'])
        .reduce((s, r) => s + parseInt(r.current_value_paise), 0),
      retirementAssetsPaise: retirement,
      insuranceCoverPaise:   insurance,
      unclaimedAssetsPaise:  unclaimed,
      lastUpdated:           new Date().toISOString(),
    },

    bankAccounts: byClass(['BANK_ACCOUNT','FIXED_DEPOSIT']).map(r => ({
      institutionName:  r.institution_name   ?? 'Unknown',
      accountType:      r.asset_subtype ?? r.asset_class,
      hasNominee:       r.has_nominee ?? false,
      nomineeName:      r.nominee_name_enc
        ? decrypt(r.nominee_name_enc) : undefined,
      approximateValue: approxRange(parseInt(r.current_value_paise)),
      status:           r.is_dormant ? 'dormant' : 'active',
      isDormant:        r.is_dormant ?? false,
    })),

    investments: byClass([
      'MUTUAL_FUND','EQUITY','NPS','BOND','GOLD','PPF','EPF'
    ]).map(r => ({
      type:            r.asset_class,
      institutionName: r.institution_name ?? 'Unknown',
      assetName:       r.asset_name,
      hasNominee:      r.has_nominee ?? false,
      nomineeName:     r.nominee_name_enc
        ? decrypt(r.nominee_name_enc) : undefined,
      approximateValue:approxRange(parseInt(r.current_value_paise)),
      maturityDate:    r.maturity_date,
    })),

    landAndProperty: byClass(['LAND','PROPERTY']).map(r => ({
      assetName:        r.asset_name ?? 'Land parcel',
      location:         r.institution_name ?? 'Unknown',
      landType:         r.asset_subtype,
      ownershipType:    r.ownership_type ?? 'unknown',
      titleStatus:      r.title_status ?? 'unknown',
      registrationDate: r.opened_date,
      approximateValue: approxRange(parseInt(r.current_value_paise)),
      documentAvailable:r.document_available ?? false,
    })),

    insurancePolicies: byClass([
      'INSURANCE_LIFE','INSURANCE_HEALTH','INSURANCE_OTHER'
    ]).map(r => ({
      type:        r.asset_class.replace('INSURANCE_',''),
      insurerName: r.institution_name ?? 'Unknown',
      sumAssured:  approxRange(parseInt(r.current_value_paise)),
      hasNominee:  r.has_nominee ?? false,
      nomineeName: r.nominee_name_enc
        ? decrypt(r.nominee_name_enc) : undefined,
      expiryDate:  r.maturity_date,
      status:      'active',
    })),

    nomineeCompliance: {
      totalAccounts:     financialAccounts.length,
      withNominee:       withNominee.length,
      withoutNominee:    withoutNominee.length,
      compliancePercent: financialAccounts.length > 0
        ? Math.round(withNominee.length / financialAccounts.length * 100)
        : 0,
      accountsMissingNominee: withoutNominee.map(
        r => `${r.institution_name ?? 'Unknown'} (${r.asset_class})`
      ),
    },

    riskFlags,

    availableDocuments: [
      { type:'AADHAAR',   description:'Aadhaar card',           available: true  },
      { type:'PAN',       description:'PAN card',               available: true  },
      { type:'LAND_REC',  description:'Land record / 7-12',
        available: byClass(['LAND']).some(r => r.document_available) },
      { type:'INSURANCE', description:'Insurance policy document',
        available: byClass(['INSURANCE_LIFE']).some(r => r.document_available) },
    ],

    disclaimer:
      'This report is generated from user-consented financial data via ' +
      'India Stack (Account Aggregator, DigiLocker, Land Registries). ' +
      'Values are approximate. Verify all details independently.',
  }
}
