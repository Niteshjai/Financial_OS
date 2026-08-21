import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly if needed
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  MOCK_MODE: z.enum(['true', 'false']).default('false'),
  REDIS_URL: z.string().optional(),
  
  // Secrets
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters long'),
  JWT_PRIVATE_KEY: z.string().min(100, 'JWT_PRIVATE_KEY must be provided'),
  JWT_PUBLIC_KEY: z.string().min(100, 'JWT_PUBLIC_KEY must be provided'),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  AADHAAR_SALT: z.string().min(16, 'AADHAAR_SALT must be at least 16 characters'),

  // External APIs
  TWILIO_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  SETU_CLIENT_ID: z.string().optional(),
  SETU_CLIENT_SECRET: z.string().optional(),
  
  RESEND_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  TERM_AFFILIATE_URL: z.string().optional(),
  HEALTH_AFFILIATE_URL: z.string().optional(),
  ZOHO_SIGN_TOKEN: z.string().optional(),
  UMANG_API_KEY: z.string().optional(),
  
  // Allowed Origins
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  UIDAI_PUBLIC_CERT: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:\n', _env.error.format());
  process.exit(1);
}

export const env = _env.data;
