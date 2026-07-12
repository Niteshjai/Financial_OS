import { FastifyRequest, FastifyReply } from 'fastify'
import { sessionStore } from '../services/sessionStore'

export async function verifyAccessToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // In MOCK_MODE, bypass JWT and set a mock user
  if (process.env.MOCK_MODE === 'true') {
    request.user = { id: 'mock-user-1234', role: 'user', sessionId: 'mock-session' }
    return
  }

  try {
    const token = request.cookies['access_token']
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'NO_TOKEN', message: 'Authentication required' } })
      return
    }

    const payload = await request.jwtVerify<{ sub: string; role: string; sessionId: string; type: string }>({
      onlyCookie: true,
    })

    if (payload.type !== 'access') {
      reply.status(401).send({ success: false, error: { code: 'WRONG_TOKEN_TYPE', message: 'Invalid token type' } })
      return
    }

    const [session, blocked] = await Promise.all([
      sessionStore.get(payload.sessionId),
      sessionStore.isBlocked(payload.sessionId)
    ])

    if (!session || blocked) {
      reply.status(401).send({ success: false, error: { code: 'SESSION_INVALID', message: 'Session expired or revoked' } })
      return
    }

    request.user = { id: payload.sub, role: payload.role, sessionId: payload.sessionId }
  } catch (err) {
    reply.status(401).send({ success: false, error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' } })
    return
  }
}

export function requireRole(...allowedRoles: string[]) {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED' } })
      return
    }
    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } })
      return
    }
  }
}

export function requireOwnership(paramName: string = 'userId') {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    const paramUserId = (request.params as any)[paramName]
    if (request.user?.role === 'admin') return // admins bypass
    if (request.user?.id !== paramUserId) {
      reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this resource' } })
      return
    }
  }
}

