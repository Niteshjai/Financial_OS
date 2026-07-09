import { api, type ApiResponse } from './api';

export interface AuthUser {
  id: string;
  name: string;
  isNewUser: boolean;
}

export async function initiateAadhaar(aadhaarNumber: string) {
  const res = await api.post<ApiResponse<{ transactionId: string; message: string }>>(
    '/auth/aadhaar/initiate',
    { aadhaarNumber }
  );
  return res.data.data!;
}

export async function verifyAadhaar(transactionId: string, otp: string) {
  const res = await api.post<ApiResponse<{ user: AuthUser }>>(
    '/auth/aadhaar/verify',
    { transactionId, otp }
  );
  return res.data.data!;
}

export async function initiatePhone(countryCode: string, phoneNumber: string, channel: 'sms' | 'whatsapp' = 'sms') {
  const res = await api.post<ApiResponse<{ transactionId: string; message: string; expiresInSeconds: number }>>(
    '/auth/phone/initiate',
    { countryCode, phoneNumber, channel }
  );
  return res.data.data!;
}

export async function verifyPhone(transactionId: string, otp: string) {
  const res = await api.post<ApiResponse<{ isRegistered: boolean; user?: AuthUser; registrationToken?: string; message?: string }>>(
    '/auth/phone/verify',
    { transactionId, otp }
  );
  return res.data.data!;
}

export async function devLogin() {
  const res = await api.post<ApiResponse<{ user: AuthUser }>>('/auth/dev-login', {});
  return res.data.data!;
}

export interface IdentityData {
  name: string;
  dob: string;
  fathersName: string;
  nationality: string;
  aadhaarLast4: string;
}

export async function registerAadhaar(registrationToken: string, aadhaarNumber: string) {
  const res = await api.post<ApiResponse<{ identity: IdentityData; message: string }>>(
    '/auth/register',
    { registrationToken, aadhaarNumber }
  );
  return res.data.data!;
}

export async function confirmRegistration(registrationToken: string) {
  const res = await api.post<ApiResponse<{ user: AuthUser }>>(
    '/auth/register/confirm',
    { registrationToken }
  );
  return res.data.data!;
}

export async function getSession() {
  const res = await api.get<ApiResponse<{ user: AuthUser }>>('/auth/me');
  return res.data.data!;
}

export async function refreshToken() {
  const res = await api.post<ApiResponse<{ message: string }>>('/auth/refresh');
  return res.data.data!;
}

export async function logout() {
  await api.delete('/auth/logout');
}

export async function deleteAccount(confirmPhrase: string) {
  const res = await api.post<ApiResponse<{ message: string }>>('/auth/user/delete', { confirmPhrase });
  return res.data.data!;
}
