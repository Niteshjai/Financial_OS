import { createHash } from 'crypto'
import { randomUUID } from 'crypto';
import { sessionStore } from './sessionStore'
import { JWT_CONFIG } from '../config/jwt'

export async function issueTokenPair(
  fastify: any,
  userId: string,
  role: string,
  reply: any
): Promise<void> {
  const sessionId = randomUUID()

  const accessToken = fastify.jwt.sign(
    { sub: userId, role, sessionId, type: 'access' },
    { expiresIn: JWT_CONFIG.access.expiresIn }
  )

  const refreshToken = fastify.jwt.sign(
    { sub: userId, sessionId, type: 'refresh' },
    { expiresIn: JWT_CONFIG.refresh.expiresIn }
  )

  // Store session + refresh token hash in Redis
  const refreshHash = createHash('sha256').update(refreshToken).digest('hex')
  await sessionStore.create(userId, sessionId, role)
  await sessionStore.storeRefreshToken(sessionId, refreshHash)

  // Set cookies — never expose tokens in body
  reply
    .setCookie('access_token', accessToken, { ...JWT_CONFIG.cookie, maxAge: 60 * 15 })
    .setCookie('refresh_token', refreshToken, { ...JWT_CONFIG.cookie, maxAge: 60 * 60 * 24 * 7, path: '/api/auth/refresh' })
}
