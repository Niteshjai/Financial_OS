import { kvStore } from '../db/connection'

const OTP_ATTEMPTS_PREFIX = 'otp_attempts:'
const OTP_LOCK_PREFIX = 'otp_lock:'

export const otpGuard = {
  async recordFailure(mobile: string): Promise<number> {
    const key = `${OTP_ATTEMPTS_PREFIX}${mobile}`
    const attempts = await kvStore.incr(key)
    await kvStore.expire(key, 60 * 60)
    if (attempts >= 5) {
      await kvStore.setex(`${OTP_LOCK_PREFIX}${mobile}`, 60 * 30, '1')
    }
    return attempts
  },

  async isLocked(mobile: string): Promise<boolean> {
    return !!(await kvStore.get(`${OTP_LOCK_PREFIX}${mobile}`))
  },

  async clearOnSuccess(mobile: string): Promise<void> {
    await kvStore.del(`${OTP_ATTEMPTS_PREFIX}${mobile}`)
  }
}
