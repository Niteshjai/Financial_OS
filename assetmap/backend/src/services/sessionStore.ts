import { kvStore } from '../db/connection'

const SESSION_PREFIX = 'session:'
const REFRESH_PREFIX = 'refresh:'
const BLOCKLIST_PREFIX = 'blocked:'

function getStorage() {
  return kvStore;
}

export const sessionStore = {

  async create(userId: string, sessionId: string, role: string): Promise<void> {
    const storage = getStorage();
    const sessionData = JSON.stringify({
      userId, role,
      createdAt: Date.now(),
      lastSeenAt: Date.now()
    })
    await storage.setex(`${SESSION_PREFIX}${sessionId}`, 60 * 60 * 24 * 7, sessionData)
  },

  async get(sessionId: string): Promise<{ userId: string; role: string } | null> {
    const storage = getStorage();
    const data = await storage.get(`${SESSION_PREFIX}${sessionId}`)
    if (!data) return null
    const parsed = JSON.parse(data)
    await storage.expire(`${SESSION_PREFIX}${sessionId}`, 60 * 60 * 24 * 7)
    return parsed
  },

  async revoke(sessionId: string): Promise<void> {
    const storage = getStorage();
    await storage.del(`${SESSION_PREFIX}${sessionId}`)
    await storage.setex(`${BLOCKLIST_PREFIX}${sessionId}`, 60 * 15, '1')
  },

  async isBlocked(sessionId: string): Promise<boolean> {
    const storage = getStorage();
    const result = await storage.get(`${BLOCKLIST_PREFIX}${sessionId}`)
    return result === '1'
  },

  async revokeAllForUser(userId: string): Promise<void> {
    const storage = getStorage();
    const keys = await storage.keys(`${SESSION_PREFIX}*`)
    for (const key of keys) {
      const data = await storage.get(key)
      if (data && JSON.parse(data).userId === userId) {
        const sessionId = key.replace(SESSION_PREFIX, '')
        await this.revoke(sessionId)
      }
    }
  },

  async storeRefreshToken(sessionId: string, tokenHash: string): Promise<void> {
    const storage = getStorage();
    await storage.setex(`${REFRESH_PREFIX}${sessionId}`, 60 * 60 * 24 * 7, tokenHash)
  },

  async validateRefreshToken(sessionId: string, tokenHash: string): Promise<boolean> {
    const storage = getStorage();
    const stored = await storage.get(`${REFRESH_PREFIX}${sessionId}`)
    return stored === tokenHash
  }
}
