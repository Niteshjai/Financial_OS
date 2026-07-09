export const JWT_CONFIG = {
  algorithm: 'RS256' as const,
  access: { expiresIn: '15m' },
  refresh: { expiresIn: '7d' },
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/'
  }
}
