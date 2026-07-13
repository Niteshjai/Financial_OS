import { z } from 'zod'

export const LandRecordSchema = z.object({
  id:                       z.string().uuid(),
  userId:                   z.string().uuid(),
  surveyNumber:             z.string().optional(),
  plotNumber:               z.string().optional(),
  khasraNumber:             z.string().optional(),
  ownerName:                z.string().optional(),
  village:                  z.string().optional(),
  taluka:                   z.string().optional(),
  district:                 z.string().optional(),
  state:                    z.string(),
  stateCode:                z.string().max(5),
  pinCode:                  z.string().optional(),
  areaValue:                z.number().positive().optional(),
  areaUnit:                 z.enum(['acres','hectares','sqft','guntha']),
  landType:                 z.enum(['Agricultural','Residential','Commercial',
                                    'Industrial','Forest','Other']).optional(),
  ownershipType:            z.enum(['self','inherited','joint',
                                    'disputed','unknown']),
  titleStatus:              z.enum(['clear','dispute','mutation_pending',
                                    'encumbered','unknown']),
  mutationStatus:           z.enum(['completed','pending','not_required']),
  registrationDate:         z.string().optional(),
  latitude:                 z.number().optional(),
  longitude:                z.number().optional(),
  ulpin:                    z.string().optional(),
  estimatedValuePaise:      z.number().int().optional(),
  circleRatePaise:          z.number().int().optional(),
  digilockerDocAvailable:   z.boolean().default(false),
  source:                   z.enum(['surepass','dilrmp','manual',
                                    'ngdrs','state_portal','igr']),
  isVerified:               z.boolean().default(false),
  fetchedAt:                z.string().datetime(),
  lastSyncedAt:             z.string().datetime(),
  nextSyncAt:               z.string().datetime(),
  isStale:                  z.boolean().default(false),
  isActive:                 z.boolean().default(true),
})

export type LandRecord = z.infer<typeof LandRecordSchema>

export const CreateLandRecordSchema = LandRecordSchema.omit({
  id: true,
  fetchedAt: true,
  lastSyncedAt: true,
  nextSyncAt: true,
  isStale: true,
})

export const ManualLandRecordSchema = z.object({
  surveyNumber:       z.string().min(1),
  plotNumber:         z.string().optional(),
  khasraNumber:       z.string().optional(),
  village:            z.string().min(1),
  taluka:             z.string().min(1),
  district:           z.string().min(1),
  state:              z.string().min(1),
  stateCode:          z.string().max(5),
  areaValue:          z.number().positive(),
  areaUnit:           z.enum(['acres','hectares','sqft','guntha']),
  landType:           z.enum(['Agricultural','Residential','Commercial',
                               'Industrial','Forest','Other']).optional(),
  ownershipType:      z.enum(['self','inherited','joint','disputed','unknown']),
  registrationDate:   z.string().optional(),
  notes:              z.string().max(500).optional(),
})

export type ManualLandRecord = z.infer<typeof ManualLandRecordSchema>
