import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'src', 'routes', 'auth.ts');
let content = fs.readFileSync(filePath, 'utf8');

// phoneOtpStore
content = content.replace(/phoneOtpStore\.get\(([^)]+)\)/g, 'await otpStore.getPhoneOtp($1)');
content = content.replace(/phoneOtpStore\.delete\(([^)]+)\)/g, 'await otpStore.deletePhoneOtp($1)');

// emailOtpStore
content = content.replace(/emailOtpStore\.set\(([^,]+),\s*\{([\s\S]*?)\}\)/g, 'await otpStore.setEmailOtp($1, {$2})');
content = content.replace(/emailOtpStore\.get\(([^)]+)\)/g, 'await otpStore.getEmailOtp($1)');
content = content.replace(/emailOtpStore\.delete\(([^)]+)\)/g, 'await otpStore.deleteEmailOtp($1)');

// registrationStore
content = content.replace(/registrationStore\.set\(([^,]+),\s*\{([\s\S]*?)\}\)/g, 'await otpStore.setPendingRegistration($1, {$2})');
content = content.replace(/registrationStore\.get\(([^)]+)\)/g, 'await otpStore.getPendingRegistration($1)');
content = content.replace(/registrationStore\.delete\(([^)]+)\)/g, 'await otpStore.deletePendingRegistration($1)');

fs.writeFileSync(filePath, content, 'utf8');
