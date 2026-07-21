import { redis } from '../db/connection';
import { logger } from '../utils/logger';

const OTP_TTL_SECONDS = 90; // 1.5 minutes
const REGISTRATION_TTL_SECONDS = 30 * 60; // 30 minutes

export const otpStore = {
  // Phone OTP
  async setPhoneOtp(transactionId: string, data: { phone: string; countryCode: string; otp: string }) {
    const key = `phone_otp:${transactionId}`;
    await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify({ ...data, used: false }));
    logger.debug(`Saved Phone OTP transaction`, { transactionId });
  },

  async getPhoneOtp(transactionId: string) {
    const key = `phone_otp:${transactionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async markPhoneOtpUsed(transactionId: string) {
    const key = `phone_otp:${transactionId}`;
    const data = await this.getPhoneOtp(transactionId);
    if (data) {
      data.used = true;
      await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify(data));
    }
  },

  async deletePhoneOtp(transactionId: string) {
    const key = `phone_otp:${transactionId}`;
    await redis.del(key);
  },

  // Email OTP
  async setEmailOtp(transactionId: string, data: { email: string; otp: string; expiresAt?: number; used?: boolean }) {
    const key = `email_otp:${transactionId}`;
    await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify({ ...data, used: false }));
    logger.debug(`Saved Email OTP transaction`, { transactionId });
  },

  async getEmailOtp(transactionId: string) {
    const key = `email_otp:${transactionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async markEmailOtpUsed(transactionId: string) {
    const key = `email_otp:${transactionId}`;
    const data = await this.getEmailOtp(transactionId);
    if (data) {
      data.used = true;
      await redis.setex(key, OTP_TTL_SECONDS, JSON.stringify(data));
    }
  },

  async deleteEmailOtp(transactionId: string) {
    const key = `email_otp:${transactionId}`;
    await redis.del(key);
  },

  // Registration Data
  async setPendingRegistration(token: string, data: { phone?: string; countryCode?: string; email?: string; kycData?: any; createdAt?: number; expiresAt?: number; otp?: string }) {
    const key = `registration:${token}`;
    await redis.setex(key, REGISTRATION_TTL_SECONDS, JSON.stringify(data));
    logger.debug(`Saved pending registration`, { token });
  },

  async getPendingRegistration(token: string) {
    const key = `registration:${token}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async updatePendingRegistration(token: string, data: any) {
    const key = `registration:${token}`;
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      await redis.setex(key, ttl, JSON.stringify(data));
    }
  },

  async deletePendingRegistration(token: string) {
    const key = `registration:${token}`;
    await redis.del(key);
  }
};
