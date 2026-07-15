import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; role: string; sessionId: string };
  }
}

// Simplified auth middleware for B2B gateway
export async function verifyAccessToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (process.env.MOCK_MODE === 'true') {
    request.user = { id: 'mock-user-1234', role: 'admin', sessionId: 'mock-session' };
    return;
  }
  
  try {
    const payload = await request.jwtVerify<{ sub: string; role: string; sessionId: string; type: string }>({
      onlyCookie: true,
    });

    if (payload.type !== 'access') {
      reply.status(401).send({ success: false, error: { code: 'WRONG_TOKEN_TYPE', message: 'Invalid token type' } });
      return;
    }

    request.user = { id: payload.sub, role: payload.role, sessionId: payload.sessionId };
  } catch (err) {
    reply.status(401).send({ success: false, error: { code: 'TOKEN_INVALID', message: 'Invalid or expired token' } });
    return;
  }
}

export function requireRole(...allowedRoles: string[]) {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED' } });
      return;
    }
    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }
  }
}
