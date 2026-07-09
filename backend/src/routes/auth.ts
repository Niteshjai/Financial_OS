import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { initiateOKYC, verifyOKYC } from '../services/aadhaar';
import { AadhaarInitiateSchema, AadhaarVerifySchema, UserDeleteSchema, PhoneInitiateSchema, PhoneVerifySchema } from '../utils/validators';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants';
import { auditLogger } from '../services/auditLogger';
import { logger } from '../utils/logger';
import { issueTokenPair } from '../services/tokenService';
import { sessionStore } from '../services/sessionStore';
import { otpGuard } from '../services/otpGuard';
import { verifyAccessToken } from '../middleware/auth';
import { UserModel } from '../models/user';
import { createHash } from 'crypto';
import twilio from 'twilio';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const authRoutes: FastifyPluginAsync = async (fastify, opts) => {

  // ─────────────────────────────────────────────
  // GET /api/auth/me — restore session from cookie
  // ─────────────────────────────────────────────
  fastify.get('/me', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    const { id: userId } = request.user!;
    const user = await UserModel.findById(userId);

    if (!user) {
      return reply.status(404).send(errorResponse(ERROR_CODES.NOT_FOUND, 'User not found'));
    }

    return reply.send(successResponse({
      user: {
        id: user.id,
        name: user.name || 'User',
        isNewUser: false,
      },
    }));
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/dev-login — bypass for development
  // ─────────────────────────────────────────────
  fastify.post('/dev-login', async (request, reply) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return reply.status(403).send(errorResponse(ERROR_CODES.UNAUTHORIZED, 'Not allowed in production'));
      }

      const testPhone = '+15550000000';
      const { user, isNewUser } = await UserModel.findOrCreateByPhone(testPhone);

      // issueTokenPair sets the cookies on the reply object automatically
      await issueTokenPair(fastify, user.id, 'consumer', reply);

      return reply.send(successResponse({
        user: {
          id: user.id,
          name: user.name || 'Developer User',
          isNewUser,
        },
      }));
    } catch (e: any) {
      require('fs').writeFileSync('dev-login-error.log', e ? e.stack || e.message || String(e) : 'Unknown error');
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'DEV_LOGIN_FAILED_SEE_LOG'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/aadhaar/initiate
  // ─────────────────────────────────────────────
  fastify.post('/aadhaar/initiate', {
    schema: { body: AadhaarInitiateSchema },
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    try {
      const { aadhaarNumber } = request.body as any;
      const ipAddress = request.ip || request.socket.remoteAddress || '';

      const result = await initiateOKYC(aadhaarNumber, ipAddress);

      await auditLogger.log(null, 'AADHAAR_INITIATED', 'auth', undefined, ipAddress, request.headers['user-agent']);

      return reply.send(successResponse(result));
    } catch (error) {
      logger.error('Aadhaar initiate failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, (error as Error).message));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/aadhaar/verify
  // ─────────────────────────────────────────────
  fastify.post('/aadhaar/verify', {
    schema: { body: AadhaarVerifySchema },
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    try {
      const { transactionId, otp, mobile } = request.body as any;
      const ipAddress = request.ip || request.socket.remoteAddress || '';
      const userAgent = request.headers['user-agent'] || '';

      if (mobile) {
        const isLocked = await otpGuard.isLocked(mobile);
        if (isLocked) {
          return reply.status(429).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'Too many failed attempts. Try again later.'));
        }
      }

      try {
        const result = await verifyOKYC(transactionId, otp, ipAddress, userAgent);
        
        if (mobile) {
          await otpGuard.clearOnSuccess(mobile);
        }

        const role = 'user';
        await issueTokenPair(fastify, result.user.id, role, reply);

        await auditLogger.log(result.user.id, 'AADHAAR_VERIFIED', 'auth', undefined, ipAddress, userAgent);

        return reply.send(successResponse({
          user: result.user
        }));
      } catch (err: any) {
        if (mobile) {
          await otpGuard.recordFailure(mobile);
        }
        throw err;
      }
    } catch (error) {
      logger.error('Aadhaar verify failed', { error: (error as Error).message });
      const message = (error as Error).message;

      if (message.includes('expired') || message.includes('invalid')) {
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, message));
      } else {
        return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, message));
      }
    }
  });

  // ─────────────────────────────────────────────
  // Phone OTP — In-memory store for transactions
  // ─────────────────────────────────────────────
  const phoneOtpStore = new Map<string, { phone: string; otp: string; expiresAt: number; used: boolean }>();

  // ─────────────────────────────────────────────
  // POST /api/auth/phone/initiate
  // ─────────────────────────────────────────────
  fastify.post('/phone/initiate', {
    schema: { body: PhoneInitiateSchema },
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    try {
      const { countryCode, phoneNumber, channel = 'sms' } = request.body as any;
      const fullPhone = `${countryCode}${phoneNumber}`;
      const ipAddress = request.ip || '';

      const isLocked = await otpGuard.isLocked(fullPhone);
      if (isLocked) {
        return reply.status(429).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'Too many attempts. Please try again in 30 minutes.'));
      }

      const transactionId = uuidv4();
      const otp = String(Math.floor(100000 + Math.random() * 900000));

      phoneOtpStore.set(transactionId, {
        phone: fullPhone,
        otp,
        expiresAt: Date.now() + 60 * 1000,
        used: false,
      });

      setTimeout(() => phoneOtpStore.delete(transactionId), 90000);

      logger.info('Phone OTP initiated', { transactionId, phone: `${countryCode}***${phoneNumber.slice(-3)}` });

      const isMock = process.env.MOCK_MODE === 'true';

      if (isMock) {
        logger.info(`[MOCK] OTP for ${fullPhone}: ${otp}`);
      } else {
        if (!twilioClient || (!process.env.TWILIO_PHONE_NUMBER && !process.env.TWILIO_WHATSAPP_NUMBER)) {
          throw new Error('Twilio service is not properly configured on the server. Please check environment variables and restart the backend.');
        }

        try {
          const isWhatsApp = channel === 'whatsapp';
          const fromNumber = isWhatsApp 
            ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER}`
            : process.env.TWILIO_PHONE_NUMBER;
          const toNumber = isWhatsApp ? `whatsapp:${fullPhone}` : fullPhone;

          await twilioClient.messages.create({
            body: `Your AssetMap verification code is: ${otp}. It expires in 60 seconds.`,
            from: fromNumber,
            to: toNumber
          });
          logger.info(`Twilio ${isWhatsApp ? 'WhatsApp' : 'SMS'} message sent to ${fullPhone}`);
        } catch (smsError: any) {
          logger.error('Twilio SMS failed', { error: smsError.message });
          throw new Error(`Failed to send SMS: ${smsError.message}`);
        }
      }

      await auditLogger.log(null, 'PHONE_OTP_INITIATED', 'auth', undefined, ipAddress, request.headers['user-agent']);

      return reply.send(successResponse({
        transactionId,
        message: `OTP sent to ${countryCode} ****${phoneNumber.slice(-4)}`,
        expiresInSeconds: 60,
      }));
    } catch (error) {
      logger.error('Phone initiate failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, (error as Error).message));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/phone/verify
  // ─────────────────────────────────────────────
  fastify.post('/phone/verify', {
    schema: { body: PhoneVerifySchema },
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    try {
      const { transactionId, otp } = request.body as any;
      const ipAddress = request.ip || '';
      const userAgent = request.headers['user-agent'] || '';

      const txn = phoneOtpStore.get(transactionId);

      if (!txn) {
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP expired or invalid. Please request a new one.'));
      }

      if (txn.used) {
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP has already been used.'));
      }

      if (Date.now() > txn.expiresAt) {
        phoneOtpStore.delete(transactionId);
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP has expired. Please request a new one.'));
      }

      const otpValid = txn.otp === otp || (process.env.MOCK_MODE === 'true' && otp === '123456');

      if (!otpValid) {
        await otpGuard.recordFailure(txn.phone);
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_INVALID, 'Incorrect OTP. Please try again.'));
      }

      txn.used = true;
      await otpGuard.clearOnSuccess(txn.phone);

      const { user, isNewUser } = await UserModel.findOrCreateByPhone(txn.phone);
      const userId = user.id;
      const userName = user.name || 'User';

      const role = 'user';
      await issueTokenPair(fastify, userId, role, reply);

      await auditLogger.log(userId, 'PHONE_VERIFIED', 'auth', undefined, ipAddress, userAgent);

      phoneOtpStore.delete(transactionId);

      return reply.send(successResponse({
        user: { id: userId, name: userName, isNewUser },
      }));
    } catch (error) {
      logger.error('Phone verify failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, (error as Error).message));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/refresh
  // ─────────────────────────────────────────────
  fastify.post('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const refreshToken = request.cookies['refresh_token'];
    
    if (!refreshToken) {
      return reply.status(401).send(errorResponse(ERROR_CODES.TOKEN_INVALID, 'Refresh token required'));
    }

    try {
      const payload = fastify.jwt.verify<{ sub: string; sessionId: string; type: string }>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new Error('Wrong type');
      }

      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const valid = await sessionStore.validateRefreshToken(payload.sessionId, tokenHash);
      if (!valid) {
        throw new Error('Token reuse detected');
      }

      const session = await sessionStore.get(payload.sessionId);
      if (!session) {
        throw new Error('Session gone');
      }

      await sessionStore.revoke(payload.sessionId);
      await issueTokenPair(fastify, payload.sub, session.role, reply);
      
      await auditLogger.log(payload.sub, 'TOKEN_REFRESHED', 'auth', undefined, request.ip, request.headers['user-agent']);

      return reply.send(successResponse({ message: 'Token refreshed' }));
    } catch (error) {
      reply
        .clearCookie('access_token')
        .clearCookie('refresh_token', { path: '/api/auth/refresh' })
        .status(401)
        .send(errorResponse(ERROR_CODES.TOKEN_INVALID, 'Refresh failed'));
    }
  });

  // ─────────────────────────────────────────────
  // DELETE /api/auth/logout
  // ─────────────────────────────────────────────
  fastify.delete('/logout', {
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const { id: userId, sessionId } = request.user!;

      await sessionStore.revoke(sessionId);

      reply
        .clearCookie('access_token')
        .clearCookie('refresh_token', { path: '/api/auth/refresh' });

      await auditLogger.log(userId, 'LOGOUT', 'auth', undefined, request.ip, request.headers['user-agent']);

      return reply.send(successResponse({ message: 'Logged out successfully' }));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Logout failed'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/user/delete
  // ─────────────────────────────────────────────
  fastify.post('/user/delete', {
    schema: { body: UserDeleteSchema },
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;

      await UserModel.deleteUserData(userId);
      
      await sessionStore.revokeAllForUser(userId);

      await auditLogger.log(userId, 'USER_DATA_DELETED', 'users', userId, request.ip, request.headers['user-agent']);

      reply
        .clearCookie('access_token')
        .clearCookie('refresh_token', { path: '/api/auth/refresh' });

      return reply.send(successResponse({ message: 'All personal data has been deleted. Audit logs are retained as legally required.' }));
    } catch (error) {
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Data deletion failed'));
    }
  });
};

export default authRoutes;
