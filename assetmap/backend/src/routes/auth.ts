import { FastifyPluginAsync } from 'fastify';
import { randomUUID, randomInt } from 'crypto';
import { initiateOKYC, verifyOKYC } from '../services/aadhaar';
import { AadhaarInitiateSchema, AadhaarVerifySchema, UserDeleteSchema, PhoneInitiateSchema, PhoneVerifySchema, RegisterAadhaarInitiateSchema, RegisterAadhaarVerifySchema, EmailInitiateSchema, EmailVerifySchema, RegisterConfirmSchema, FcmTokenSchema } from '../utils/validators';
import { successResponse, errorResponse, ERROR_CODES } from '../utils/constants';
import { auditLogger } from '../services/auditLogger';
import { logger } from '../utils/logger';
import { issueTokenPair } from '../services/tokenService';
import { sessionStore } from '../services/sessionStore';
import { otpGuard } from '../services/otpGuard';
import { verifyAccessToken } from '../middleware/auth';
import { pool } from '../db/connection';
import { UserModel } from '../models/user';
import { createHash } from 'crypto';
import twilio from 'twilio';
import { otpStore } from '../services/otpStore';

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
      let { user, isNewUser } = await UserModel.findOrCreateByPhone(testPhone);

      if (!user.id) {
        user = await UserModel.registerWithAadhaar(testPhone, 'US', {
          aadhaarHash: 'dev-mock-hash',
          name: 'Developer User',
          dob: '01/01/1990',
          fathersName: 'Dev Father',
          nationality: 'US'
        });
      }

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
      logger.error('Dev login failed', { error: e ? e.stack || e.message || String(e) : 'Unknown error' });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'DEV_LOGIN_FAILED_SEE_LOG'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/aadhaar/initiate
  // ─────────────────────────────────────────────
  fastify.post('/aadhaar/initiate', {
    schema: { body: AadhaarInitiateSchema },
    config: { rateLimit: { max: 50, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { aadhaarNumber } = request.body as Record<string, any>;
      const ipAddress = request.ip || request.socket.remoteAddress || '';

      const result = await initiateOKYC(aadhaarNumber, ipAddress);

      await auditLogger.log(null, 'AADHAAR_INITIATED', 'auth', undefined, ipAddress, request.headers['user-agent']);

      return reply.send(successResponse(result));
    } catch (error) {
      logger.error('Aadhaar initiate failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/aadhaar/verify
  // ─────────────────────────────────────────────
  fastify.post('/aadhaar/verify', {
    schema: { body: AadhaarVerifySchema },
    config: { rateLimit: { max: 50, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { transactionId, otp, mobile } = request.body as Record<string, any>;
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
        return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
      }
    }
  });

  // ─────────────────────────────────────────────
  // Phone OTP — Redis store for transactions
  // ─────────────────────────────────────────────

  // ─────────────────────────────────────────────
  // POST /api/auth/phone/initiate
  // ─────────────────────────────────────────────
  fastify.post('/phone/initiate', {
    schema: { body: PhoneInitiateSchema },
    config: { rateLimit: { max: 50, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { countryCode, phoneNumber, channel = 'sms' } = request.body as Record<string, any>;
      const fullPhone = `${countryCode}${phoneNumber}`;
      const ipAddress = request.ip || '';

      const isLocked = await otpGuard.isLocked(fullPhone);
      if (isLocked) {
        return reply.status(429).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'Too many attempts. Please try again in 30 minutes.'));
      }

      const transactionId = randomUUID();
      const otp = String(randomInt(100000, 999999));

      await otpStore.setPhoneOtp(transactionId, {
        phone: fullPhone,
        countryCode,
        otp
      });

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
          logger.error('Twilio SMS failed. (Error hidden from frontend per user request)', { error: smsError.message });
          // We intentionally do NOT throw the error here so the frontend can proceed.
          if (process.env.NODE_ENV !== 'production') {
            logger.info(`[DEV BYPASS] Twilio failed. Use this OTP to login: ${otp}`);
          }
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
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/phone/verify
  // ─────────────────────────────────────────────
  fastify.post('/phone/verify', {
    schema: { body: PhoneVerifySchema },
    config: { rateLimit: { max: 100, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { transactionId, otp } = request.body as Record<string, any>;
      const ipAddress = request.ip || '';
      const userAgent = request.headers['user-agent'] || '';

      const txn = await otpStore.getPhoneOtp(transactionId);

      if (!txn) {
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP has expired. Please request a new one.'));
      }

      if (txn.used) {
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP has already been used.'));
      }

      if (Date.now() > txn.expiresAt) {
        await otpStore.deletePhoneOtp(transactionId);
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP has expired. Please request a new one.'));
      }

      const otpValid = txn.otp === otp || (process.env.MOCK_MODE === 'true' && otp === '123456');

      if (!otpValid) {
        await otpGuard.recordFailure(txn.phone);
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_INVALID, 'Invalid OTP. Please try again.'));
      }

      txn.used = true;
      await otpGuard.clearOnSuccess(txn.phone);

      // Check if user is already registered
      const existingUser = await UserModel.findByPhone(txn.phone);

      if (existingUser) {
        // ── REGISTERED USER — Issue tokens and login ──
        const userId = existingUser.id;
        const userName = existingUser.name || 'User';
        const role = 'user';
        await issueTokenPair(fastify, userId, role, reply);
        await auditLogger.log(userId, 'PHONE_VERIFIED', 'auth', undefined, ipAddress, userAgent);
        await otpStore.deletePhoneOtp(transactionId);

        return reply.send(successResponse({
          isRegistered: true,
          user: { id: userId, name: userName, isNewUser: false },
        }));
      } else {
        // ── NEW USER — Issue a short-lived registration token ──
        const registrationToken = randomUUID();
        await otpStore.setPendingRegistration(registrationToken, {
          phone: txn.phone,
          countryCode: txn.countryCode || '+91',
          createdAt: Date.now(),
          expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        });
        await otpStore.deletePhoneOtp(transactionId);

        return reply.send(successResponse({
          isRegistered: false,
          registrationToken,
          message: 'Phone verified. Please complete Aadhaar verification to register.',
        }));
      }
    } catch (error) {
      logger.error('Phone verify failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/register/aadhaar/initiate
  // Accepts aadhaar number, initiates OKYC OTP
  // ─────────────────────────────────────────────
  fastify.post('/register/aadhaar/initiate', {
    schema: { body: RegisterAadhaarInitiateSchema },
    config: { rateLimit: { max: 10, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { registrationToken, aadhaarNumber } = request.body as Record<string, any>;

      if (!registrationToken || !aadhaarNumber) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Registration token and Aadhaar number are required.'));
      }

      const regData = await otpStore.getPendingRegistration(registrationToken);
      if (!regData || Date.now() > regData.expiresAt) {
        await otpStore.deletePendingRegistration(registrationToken);
        return reply.status(400).send(errorResponse(ERROR_CODES.TOKEN_INVALID, 'Registration token expired. Please start over.'));
      }

      const cleanAadhaar = aadhaarNumber.replace(/\s/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Invalid Aadhaar number. Must be 12 digits.'));
      }

      const sandboxApiKey = process.env.KYC_SANDBOX_API_KEY;
      const sandboxApiSecret = process.env.KYC_SANDBOX_API_SECRET;

      if (sandboxApiKey && sandboxApiSecret && cleanAadhaar !== '111111111111') {
        try {
          const axios = require('axios');
          const authResponse = await axios.post(
            'https://api.sandbox.co.in/authenticate',
            {},
            {
              headers: {
                'x-api-key': sandboxApiKey,
                'x-api-secret': sandboxApiSecret,
                'x-api-version': '1.0.0',
                'Content-Type': 'application/json'
              },
              timeout: 10000,
            }
          );
          const accessToken = authResponse.data?.access_token || authResponse.data?.data?.access_token;

          const sandboxApiUrl = process.env.KYC_SANDBOX_API_URL || 'https://api.sandbox.co.in/kyc/aadhaar';
          const otpResponse = await axios.post(
            `${sandboxApiUrl}/okyc/otp`,
            { aadhaar_number: cleanAadhaar, consent: "Y", reason: "For KYC" },
            {
              headers: {
                'authorization': accessToken,
                'x-api-key': sandboxApiKey,
                'x-api-version': '1.0.0',
                'Content-Type': 'application/json'
              },
              timeout: 10000,
            }
          );
          
          const data = otpResponse.data?.data || otpResponse.data;
          const referenceId = data.reference_id;

          // Save aadhaar clean and accessToken for the verify step
          (regData as Record<string, any>).aadhaarTemp = { cleanAadhaar, accessToken };
          await otpStore.updatePendingRegistration(registrationToken, regData);

          return reply.send(successResponse({
            referenceId,
            message: 'OTP sent to Aadhaar registered mobile.',
          }));
        } catch (error: any) {
          logger.error('Sandbox API OTP initiate failed', { error: error.message, data: error.response?.data });
          return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Sandbox API OTP initiate failed'));
        }
      } else {
        // Fallback if no keys provided or mock aadhaar used
        const mockOtp = String(Math.floor(100000 + Math.random() * 900000));
        logger.info(`[MOCK] Aadhaar OTP for ${cleanAadhaar}: ${mockOtp}`);
        (regData as Record<string, any>).aadhaarTemp = { cleanAadhaar, accessToken: 'mock', mockOtp };
        await otpStore.updatePendingRegistration(registrationToken, regData);
        return reply.send(successResponse({
          referenceId: 'mock_ref_123',
          message: 'Mock OTP sent.',
        }));
      }
    } catch (error) {
      logger.error('Registration KYC initiate failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/register/aadhaar/verify
  // ─────────────────────────────────────────────
  fastify.post('/register/aadhaar/verify', {
    schema: { body: RegisterAadhaarVerifySchema },
    config: { rateLimit: { max: 10, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { registrationToken, referenceId, otp } = request.body as Record<string, any>;

      if (!registrationToken || !referenceId || !otp) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Missing required fields for verification.'));
      }

      const regData = await otpStore.getPendingRegistration(registrationToken);
      if (!regData || Date.now() > regData.expiresAt || !(regData as Record<string, any>).aadhaarTemp) {
        return reply.status(400).send(errorResponse(ERROR_CODES.TOKEN_INVALID, 'Registration session expired or invalid.'));
      }

      const { cleanAadhaar, accessToken } = (regData as Record<string, any>).aadhaarTemp;
      const { hashAadhaar: hashAadhaarFn } = await import('../utils/encryption');
      const aadhaarHash = hashAadhaarFn(cleanAadhaar);

      const sandboxApiKey = process.env.KYC_SANDBOX_API_KEY;
      
      let identityData;

      if (sandboxApiKey && accessToken !== 'mock') {
        try {
          const axios = require('axios');
          const sandboxApiUrl = process.env.KYC_SANDBOX_API_URL || 'https://api.sandbox.co.in/kyc/aadhaar';
          const verifyResponse = await axios.post(
            `${sandboxApiUrl}/okyc/otp/verify`,
            { reference_id: referenceId, otp },
            {
              headers: {
                'authorization': accessToken,
                'x-api-key': sandboxApiKey,
                'x-api-version': '1.0.0',
                'Content-Type': 'application/json'
              },
              timeout: 10000,
            }
          );
          
          const data = verifyResponse.data?.data || verifyResponse.data;
          identityData = {
            name: data.full_name || data.name || 'Sandbox Verified User',
            dob: data.dob || '1990-01-01',
            fathersName: data.care_of || data.father_name || 'Sandbox Father',
            nationality: 'Indian',
            aadhaarLast4: cleanAadhaar.slice(-4),
          };
        } catch (error: any) {
          logger.error('Sandbox API verify failed', { error: error.message, data: error.response?.data });
          return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'Sandbox API verify failed'));
        }
      } else {
        // Fallback for mock verify
        const { mockOtp } = (regData as Record<string, any>).aadhaarTemp;
        if (mockOtp && otp !== mockOtp) {
          return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Invalid OTP.'));
        }
        identityData = {
          name: 'Verified User',
          dob: '1990-01-01',
          fathersName: 'Verified Father',
          nationality: 'Indian',
          aadhaarLast4: cleanAadhaar.slice(-4),
        };
      }

      regData.kycData = {
        aadhaarHash,
        ...identityData,
      };
      
      delete (regData as Record<string, any>).aadhaarTemp; // cleanup
      await otpStore.updatePendingRegistration(registrationToken, regData);

      return reply.send(successResponse({
        identity: identityData,
        message: 'Identity verified successfully.',
      }));

    } catch (error) {
      logger.error('Registration KYC verify failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/email/initiate
  // ─────────────────────────────────────────────
  fastify.post('/email/initiate', {
    schema: { body: EmailInitiateSchema },
    config: { rateLimit: { max: 20, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { registrationToken, email } = request.body as Record<string, any>;
      if (!registrationToken || !email) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Token and email are required.'));
      }

      const regData = await otpStore.getPendingRegistration(registrationToken);
      if (!regData || Date.now() > regData.expiresAt) {
        return reply.status(400).send(errorResponse(ERROR_CODES.TOKEN_INVALID, 'Registration token expired. Please start over.'));
      }

      const otp = String(randomInt(100000, 999999));
      await otpStore.setEmailOtp(registrationToken, {
        email,
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        used: false,
      });

      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[MOCK] Email OTP for ${email}: ${otp}`);
      }

      return reply.send(successResponse({
        message: `OTP sent to ${email}`,
        expiresInSeconds: 300,
      }));
    } catch (error) {
      logger.error('Email initiate failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/email/verify
  // ─────────────────────────────────────────────
  fastify.post('/email/verify', {
    schema: { body: EmailVerifySchema },
    config: { rateLimit: { max: 20, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { registrationToken, otp } = request.body as Record<string, any>;
      if (!registrationToken || !otp) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Token and OTP are required.'));
      }

      const regData = await otpStore.getPendingRegistration(registrationToken);
      if (!regData || Date.now() > regData.expiresAt) {
        return reply.status(400).send(errorResponse(ERROR_CODES.TOKEN_INVALID, 'Registration token expired. Please start over.'));
      }

      const txn = await otpStore.getEmailOtp(registrationToken);
      if (!txn) {
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP has expired. Please request a new one.'));
      }
      if (txn.used) {
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP has already been used.'));
      }
      if (Date.now() > txn.expiresAt) {
        await otpStore.deleteEmailOtp(registrationToken);
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_EXPIRED, 'OTP has expired.'));
      }

      const isMock = process.env.MOCK_MODE === 'true';
      const isValid = isMock ? (otp === '123456' || otp === txn.otp) : otp === txn.otp;

      if (!isValid) {
        return reply.status(400).send(errorResponse(ERROR_CODES.OTP_INVALID, 'Invalid OTP.'));
      }

      txn.used = true;
      await otpStore.deleteEmailOtp(registrationToken);

      // Attach verified email to registration store
      regData.email = txn.email;

      return reply.send(successResponse({ message: 'Email verified successfully.' }));
    } catch (error) {
      logger.error('Email verify failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/register/confirm — Finalize registration
  // ─────────────────────────────────────────────
  fastify.post('/register/confirm', {
    schema: { body: RegisterConfirmSchema },
    config: { rateLimit: { max: 50, timeWindow: '3 seconds' } }
  }, async (request, reply) => {
    try {
      const { registrationToken } = request.body as Record<string, any>;

      if (!registrationToken) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Registration token is required.'));
      }

      const regData = await otpStore.getPendingRegistration(registrationToken);
      if (!regData || Date.now() > regData.expiresAt) {
        await otpStore.deletePendingRegistration(registrationToken);
        return reply.status(400).send(errorResponse(ERROR_CODES.TOKEN_INVALID, 'Registration token expired. Please start over.'));
      }

      if (!regData.kycData) {
        return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Aadhaar verification not completed yet.'));
      }

      // Create the user in the database
      const user = await UserModel.registerWithAadhaar(regData.phone, regData.countryCode, {
        aadhaarHash: regData.kycData.aadhaarHash,
        name: regData.kycData.name,
        dob: regData.kycData.dob,
        fathersName: regData.kycData.fathersName,
        nationality: regData.kycData.nationality,
        email: regData.email,
      });

      // Issue JWT tokens
      const role = 'user';
      await issueTokenPair(fastify, user.id, role, reply);

      const ipAddress = request.ip || '';
      const userAgent = request.headers['user-agent'] || '';
      await auditLogger.log(user.id, 'AADHAAR_VERIFIED', 'auth', undefined, ipAddress, userAgent);

      // Cleanup
      await otpStore.deletePendingRegistration(registrationToken);

      return reply.send(successResponse({
        user: { id: user.id, name: user.name, isNewUser: true },
      }));

    } catch (error) {
      logger.error('Registration confirm failed', { error: (error as Error).message });
      return reply.status(500).send(errorResponse(ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred'));
    }
  });

  // ─────────────────────────────────────────────
  // POST /api/auth/refresh
  // ─────────────────────────────────────────────
  fastify.post('/refresh', {
    config: { rateLimit: { max: 100, timeWindow: '3 seconds' } }
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

  // Update FCM token
  fastify.patch('/fcm-token', {
    schema: { body: FcmTokenSchema },
    preHandler: [verifyAccessToken]
  }, async (request, reply) => {
    const { token } = request.body as { token: string };
    if (!token) return reply.status(400).send(errorResponse(ERROR_CODES.VALIDATION_ERROR, 'Token is required'));

    await pool.query('UPDATE users SET fcm_token = $1 WHERE id = $2', [token, request.user!.id]);
    return reply.send(successResponse({ message: 'FCM token updated' }));
  });
};

export default authRoutes;
