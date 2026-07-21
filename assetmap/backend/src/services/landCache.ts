import { kvStore } from '../db/connection'
import { logger } from '../utils/logger'

const LAND_RECORDS_TTL  = 60 * 60 * 24      // 24 hours
const LAND_SUMMARY_TTL  = 60 * 60 * 6       // 6 hours
const SUREPASS_RAW_TTL  = 60 * 60 * 24 * 7  // 7 days — raw API costs money

const keys = {
  userRecords:  (userId: string) => `land:records:${userId}`,
  userSummary:  (userId: string) => `land:summary:${userId}`,
  singleRecord: (recordId: string) => `land:record:${recordId}`,
  surepassRaw:  (name: string, state: string, district: string) =>
    `surepass:raw:${state}:${district}:${name.toLowerCase().replace(/\s+/g,'-')}`,
  staleFlag:    (userId: string) => `land:stale:${userId}`,
}

export const landCache = {

  async getUserRecords(userId: string): Promise<any[] | null> {
    try {
      const cached = await kvStore.get(keys.userRecords(userId))
      return cached ? JSON.parse(cached) : null
    } catch (err) { logger.debug('landCache.getUserRecords failed', { error: (err as Error).message }); return null }
  },

  async setUserRecords(userId: string, records: any[]): Promise<void> {
    try {
      await kvStore.setex(
        keys.userRecords(userId),
        LAND_RECORDS_TTL,
        JSON.stringify(records)
      )
    } catch (err) { logger.debug('landCache.setUserRecords failed', { error: (err as Error).message }) }
  },

  async invalidateUserRecords(userId: string): Promise<void> {
    try {
      await kvStore.del(keys.userRecords(userId))
      await kvStore.del(keys.userSummary(userId))
    } catch (err) { logger.debug('landCache.invalidateUserRecords failed', { error: (err as Error).message }) }
  },

  async getSurepassRaw(
    name: string, state: string, district: string
  ): Promise<any | null> {
    try {
      const cached = await kvStore.get(
        keys.surepassRaw(name, state, district)
      )
      return cached ? JSON.parse(cached) : null
    } catch (err) { logger.debug('landCache.getSurepassRaw failed', { error: (err as Error).message }); return null }
  },

  async setSurepassRaw(
    name: string, state: string, district: string, data: any
  ): Promise<void> {
    try {
      await kvStore.setex(
        keys.surepassRaw(name, state, district),
        SUREPASS_RAW_TTL,
        JSON.stringify(data)
      )
    } catch (err) { logger.debug('landCache.setSurepassRaw failed', { error: (err as Error).message }) }
  },

  async getSingleRecord(recordId: string): Promise<any | null> {
    try {
      const cached = await kvStore.get(keys.singleRecord(recordId))
      return cached ? JSON.parse(cached) : null
    } catch (err) { logger.debug('landCache.getSingleRecord failed', { error: (err as Error).message }); return null }
  },

  async setSingleRecord(recordId: string, record: any): Promise<void> {
    try {
      await kvStore.setex(
        keys.singleRecord(recordId),
        LAND_RECORDS_TTL,
        JSON.stringify(record)
      )
    } catch (err) { logger.debug('landCache.setSingleRecord failed', { error: (err as Error).message }) }
  },

  async invalidateSingleRecord(recordId: string): Promise<void> {
    try {
      await kvStore.del(keys.singleRecord(recordId))
    } catch (err) { logger.debug('landCache.invalidateSingleRecord failed', { error: (err as Error).message }) }
  },

  async markStale(userId: string): Promise<void> {
    try {
      await kvStore.setex(keys.staleFlag(userId), 60, '1')
    } catch (err) { logger.debug('landCache.markStale failed', { error: (err as Error).message }) }
  },

  async isStale(userId: string): Promise<boolean> {
    try {
      return !!(await kvStore.get(keys.staleFlag(userId)))
    } catch (err) { logger.debug('landCache.isStale failed', { error: (err as Error).message }); return false }
  }
}
