import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')

export interface RateLimitResult {
  allowed:        boolean
  remaining:      number
  resetAt:        Date
  retryAfter?:    number
}

export async function checkRateLimit(
  clientId:      string,
  limitPerHour:  number,
  limitPerDay:   number
): Promise<RateLimitResult> {

  const now       = Date.now()
  const hourKey   = `ratelimit:${clientId}:hour:${Math.floor(now/3600000)}`
  const dayKey    = `ratelimit:${clientId}:day:${new Date().toISOString().split('T')[0]}`

  const pipeline  = redis.pipeline()
  pipeline.incr(hourKey)
  pipeline.expire(hourKey, 3600)
  pipeline.incr(dayKey)
  pipeline.expire(dayKey, 86400)

  const results   = await pipeline.exec()
  const hourCount = results![0][1] as number
  const dayCount  = results![2][1] as number

  if (hourCount > limitPerHour) {
    const resetAt = new Date(
      (Math.floor(now/3600000) + 1) * 3600000
    )
    return {
      allowed:     false,
      remaining:   0,
      resetAt,
      retryAfter:  Math.ceil((resetAt.getTime() - now) / 1000)
    }
  }

  if (dayCount > limitPerDay) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return {
      allowed:     false,
      remaining:   0,
      resetAt:     tomorrow,
      retryAfter:  Math.ceil((tomorrow.getTime() - now) / 1000)
    }
  }

  return {
    allowed:   true,
    remaining: Math.min(limitPerHour - hourCount, limitPerDay - dayCount),
    resetAt:   new Date((Math.floor(now/3600000) + 1) * 3600000)
  }
}
