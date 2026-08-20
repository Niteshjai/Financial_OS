import speakeasy from 'speakeasy';
import { encryptPII, decryptPII } from '../utils/encryption';
import * as QRCode from 'qrcode';

export const totpService = {
  /**
   * Generates a new TOTP secret for a user and returns the raw secret (for QR code)
   * and the encrypted secret (to store in DB).
   */
  generateSecret(email: string): { secret: string; encryptedSecret: string; qrCodeUrl: string } {
    const secretObj = speakeasy.generateSecret({ length: 20, name: `AssetMap (${email})` });
    const secret = secretObj.base32;
    const qrCodeUrl = secretObj.otpauth_url || '';
    const encryptedSecret = encryptPII(secret);
    return { secret, encryptedSecret, qrCodeUrl };
  },

  /**
   * Generates a base64 QR code image string from the otpauth URL.
   */
  async generateQRCode(qrCodeUrl: string): Promise<string> {
    return QRCode.toDataURL(qrCodeUrl);
  },

  /**
   * Verifies a TOTP token against the encrypted secret.
   */
  verifyToken(encryptedSecret: string, token: string): { valid: boolean } {
    try {
      const secret = decryptPII(encryptedSecret);
      const valid = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
      return { valid };
    } catch (e) {
      return { valid: false };
    }
  }
};
