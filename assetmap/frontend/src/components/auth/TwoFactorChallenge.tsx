import { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { getSession } from '../../services/auth';

interface TwoFactorChallengeProps {
  pendingSessionToken: string;
  defaultMethod: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

const OTP_LENGTH = 6;
const OTP_TIMER_SECONDS = 60;

export default function TwoFactorChallenge({
  pendingSessionToken,
  defaultMethod,
  onSuccess,
  onCancel,
}: TwoFactorChallengeProps) {
  const [method, setMethod] = useState(defaultMethod);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(OTP_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(method !== 'totp');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Attempt to request OTP immediately if SMS/Email
    if (method === 'sms' || method === 'email') {
      handleRequestOTP();
    }
  }, [method]);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timeLeft <= 0) setTimerActive(false);
      return;
    }
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  async function handleRequestOTP() {
    setError('');
    setLoading(true);
    try {
      await api.post('/2fa/challenge/send-otp', { pendingSessionToken, method });
      setTimeLeft(OTP_TIMER_SECONDS);
      setTimerActive(true);
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    const code = otpDigits.join('');
    if (code.length !== OTP_LENGTH) return;

    setError('');
    setLoading(true);
    try {
      const endpoint = '/2fa/challenge/verify';
      const payload = { pendingSessionToken, code, method };

      const res = await api.post(endpoint, payload);
      if (res.data.success) {
        const { user } = await getSession();
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed.');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === 0) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="w-full max-w-[380px] space-y-lg animate-fade-in">
      <div className="space-y-xs">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Two-Factor Authentication</h2>
        <p className="font-body-md text-on-surface-variant">
          {method === 'totp' && 'Enter the 6-digit code from your authenticator app.'}
          {method === 'sms' && 'Enter the 6-digit code sent via SMS.'}
          {method === 'email' && 'Enter the 6-digit code sent to your email.'}
        </p>
      </div>

      <div className="space-y-md">
        <div className="flex gap-2 justify-between mt-1" onPaste={handleOtpPaste}>
          {otpDigits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { otpRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className={`w-[40px] h-[48px] md:w-[46px] md:h-[54px] text-center text-xl font-bold rounded-lg border outline-none transition-all ${
                digit ? 'border-brand-secondary bg-brand-secondary/5 text-brand-secondary' : 'border-outline-variant bg-white text-on-surface'
              } focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20`}
            />
          ))}
        </div>

        {(method === 'sms' || method === 'email') && (
          <div className="flex items-center justify-between">
            {timerActive && timeLeft > 0 ? (
              <span className="font-label-md text-on-surface-variant">
                Code expires in <span className="font-bold text-brand-secondary">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestOTP}
                disabled={loading}
                className="text-sm font-semibold text-brand-secondary hover:brightness-110 disabled:opacity-50 transition-colors"
              >
                Resend Code
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mt-2 rounded-xl bg-red-50/80 border border-red-100 text-red-600 text-sm font-medium">
          <span className="material-symbols-outlined text-base mt-0.5">error</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleVerify}
        disabled={loading || otpDigits.some((d) => d === '')}
        className="w-full bg-brand-secondary text-on-brand-secondary font-headline-md py-md rounded-3xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 mt-6"
      >
        {loading ? 'Verifying...' : 'Verify'}
      </button>

      <div className="flex flex-col items-center gap-3 pt-6 border-t border-outline-variant/30 mt-6">
        <p className="text-sm text-on-surface-variant">Having trouble?</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {method !== 'totp' && (
            <button
              onClick={() => setMethod('totp')}
              className="text-sm font-medium text-brand-secondary px-3 py-1.5 rounded-lg hover:bg-brand-secondary/5 transition-colors"
            >
              Use Authenticator App
            </button>
          )}
          {method !== 'sms' && (
            <button
              onClick={() => setMethod('sms')}
              className="text-sm font-medium text-brand-secondary px-3 py-1.5 rounded-lg hover:bg-brand-secondary/5 transition-colors"
            >
              Send SMS
            </button>
          )}
          {method !== 'email' && (
            <button
              onClick={() => setMethod('email')}
              className="text-sm font-medium text-brand-secondary px-3 py-1.5 rounded-lg hover:bg-brand-secondary/5 transition-colors"
            >
              Send Email
            </button>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-sm font-medium text-on-surface-variant px-3 py-1.5 mt-2 rounded-lg hover:bg-black/5 transition-colors"
        >
          Cancel Login
        </button>
      </div>
    </div>
  );
}
