import winston from 'winston';

// ─────────────────────────────────────────────
// PII Masking — redact Aadhaar, PAN, mobile
// ─────────────────────────────────────────────

function maskPII(message: string): string {
  // Mask Aadhaar numbers (12 digits)
  message = message.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, 'XXXX-XXXX-XXXX');
  // Mask PAN numbers (ABCDE1234F pattern)
  message = message.replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, 'XXXXX****X');
  // Mask mobile numbers (10 digits starting with 6-9)
  message = message.replace(/\b[6-9]\d{9}\b/g, 'XXXXXX****');
  return message;
}

const piiMaskFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = maskPII(info.message);
  }
  // Mask PII in metadata
  if (info.metadata && typeof info.metadata === 'object') {
    const metaStr = JSON.stringify(info.metadata);
    info.metadata = JSON.parse(maskPII(metaStr));
  }
  return info;
});

// ─────────────────────────────────────────────
// Logger Configuration
// ─────────────────────────────────────────────

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    piiMaskFormat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'assetmap-backend',
  },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${level}]: ${message}${metaStr}`;
              })
            ),
    }),
  ],
});
