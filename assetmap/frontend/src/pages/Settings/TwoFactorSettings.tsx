import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldAlert, Smartphone, Mail, Loader2, X, Power } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

const OTP_LENGTH = 6;

interface TwoFactorStatus {
  active: boolean;
  isEnabled?: boolean;
  method: string | null;
}

export default function TwoFactorSettings() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disableLoading, setDisableLoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableOtpDigits, setDisableOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [disableError, setDisableError] = useState('');

  const disableOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await api.get('/2fa/status');
      const data = res.data.data;
      setStatus({
        active: Boolean(data?.isEnabled ?? data?.active),
        method: data?.method ?? null,
      });
    } catch (err: any) {
      toast.error('Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  }

  function openDisableModal() {
    setDisableOtpDigits(Array(OTP_LENGTH).fill(''));
    setDisableError('');
    setShowDisableModal(true);
    setTimeout(() => disableOtpRefs.current[0]?.focus(), 150);
  }

  function closeDisableModal() {
    if (disableLoading) return;
    setShowDisableModal(false);
    setDisableOtpDigits(Array(OTP_LENGTH).fill(''));
    setDisableError('');
  }

  async function handleConfirmDisable() {
    const code = disableOtpDigits.join('');
    if (code.length !== OTP_LENGTH) return;

    setDisableLoading(true);
    setDisableError('');
    try {
      await api.post('/2fa/disable', { verificationCode: code, method: status?.method });
      toast.success('2FA disabled successfully');
      setShowDisableModal(false);
      await fetchStatus();
    } catch (err: any) {
      setDisableError(err.response?.data?.error?.message || 'Invalid code. Please try again.');
      setDisableOtpDigits(Array(OTP_LENGTH).fill(''));
      disableOtpRefs.current[0]?.focus();
    } finally {
      setDisableLoading(false);
    }
  }

  function handleDisableOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...disableOtpDigits];
    newDigits[index] = digit;
    setDisableOtpDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      disableOtpRefs.current[index + 1]?.focus();
    }
  }

  function handleDisableOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !disableOtpDigits[index] && index > 0) {
      const newDigits = [...disableOtpDigits];
      newDigits[index - 1] = '';
      setDisableOtpDigits(newDigits);
      disableOtpRefs.current[index - 1]?.focus();
    }
  }

  function handleDisableOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length > 0) {
      const newDigits = Array(OTP_LENGTH).fill('');
      pasted.split('').forEach((d, i) => (newDigits[i] = d));
      setDisableOtpDigits(newDigits);
      const nextEmpty = newDigits.findIndex((d) => d === '');
      disableOtpRefs.current[nextEmpty >= 0 ? nextEmpty : OTP_LENGTH - 1]?.focus();
    }
  }

  return (
    <div className="min-h-screen text-zinc-900 font-sans pb-20" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      <header className="sticky top-0 z-20 pt-4">
        <div className="w-full px-6 md:px-10 py-2 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 bg-white/50 hover:bg-white/80 border border-zinc-300/50 shadow-sm px-3 py-1.5 rounded-full transition-all font-medium text-sm backdrop-blur-sm"
          >
            <ArrowLeft className="size-4" />
            Back to Settings
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center mt-32">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <main className="max-w-[560px] mx-auto px-6 mt-2 sm:mt-4">
        <div className="mb-10 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-display font-light tracking-tight text-zinc-900">Two-Factor Authentication</h1>
          <p className="text-zinc-600 mt-2.5 text-sm sm:text-base">Add an extra layer of security to your account.</p>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {/* Status Banner Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-zinc-200/60 p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 ${status?.active ? 'bg-lime-100 text-lime-700' : 'bg-zinc-100 text-zinc-500'}`}>
                <ShieldCheck className="size-5" />
              </div>
              <div className="text-left">
                <h2 className="text-sm sm:text-base font-semibold text-zinc-900">{status?.active ? '2FA is Enabled' : '2FA is Disabled'}</h2>
                <p className="text-xs text-zinc-500">{status?.active ? `Using ${status.method?.toUpperCase()} as primary method.` : 'Secure your account by enabling 2FA.'}</p>
              </div>
            </div>
            {status?.active && (
              <button 
                type="button"
                onClick={openDisableModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-red-200/80 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 font-medium text-xs shadow-xs transition-all active:scale-[0.98] shrink-0"
              >
                <Power className="size-3.5 text-red-500" />
                <span>Turn Off</span>
              </button>
            )}
          </div>

          {/* Authentication Methods */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-3">Authentication Methods</h3>
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden">
              <MethodRow 
                icon={<Smartphone className="size-4" />}
                title="Authenticator App"
                description="Use an app like Google Authenticator or Authy to generate codes."
                active={status?.active && status?.method === 'totp'}
                actionLabel={status?.active && status?.method !== 'totp' ? 'Switch' : 'Setup'}
                onSetup={() => navigate('/settings/2fa/totp')}
              />
              
              <div className="h-px bg-zinc-100 w-full" />
              
              <MethodRow 
                icon={<Mail className="size-4" />}
                title="Email OTP"
                description="Receive a one-time passcode via Email."
                active={status?.active && status?.method === 'email'}
                actionLabel={status?.active && status?.method !== 'email' ? 'Switch' : 'Setup'}
                onSetup={() => navigate('/settings/2fa/email')}
              />
            </div>
          </div>

        </div>
        </main>
      )}

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-[480px] bg-white rounded-[28px] p-7 sm:p-9 shadow-[0_25px_60px_rgba(0,0,0,0.22)] border border-zinc-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <button
              onClick={closeDisableModal}
              disabled={disableLoading}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Icon badge with subtle layered glow */}
              <div className="relative mb-4 flex items-center justify-center">
                <div className="size-16 rounded-2xl bg-gradient-to-b from-rose-50 to-rose-100/80 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-sm">
                  <ShieldAlert className="size-8" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">Disable 2FA</h3>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed max-w-[360px]">
                Enter the 6-digit code from your <span className="font-semibold text-zinc-700">{status?.method === 'totp' ? 'authenticator app' : 'registered email'}</span> to confirm.
              </p>

              {/* 6 Digit Inputs */}
              <div className="flex gap-2.5 sm:gap-3 justify-center my-7" onPaste={handleDisableOtpPaste}>
                {disableOtpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { disableOtpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDisableOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleDisableOtpKeyDown(i, e)}
                    className={`w-12 h-14 sm:w-[54px] sm:h-[62px] text-center text-xl sm:text-2xl font-bold rounded-2xl border outline-none transition-all duration-150 ${
                      digit 
                        ? 'border-zinc-900 bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-900/10' 
                        : 'border-zinc-200 bg-zinc-50/70 text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50'
                    } focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/20`}
                  />
                ))}
              </div>

              {disableError && (
                <div className="mb-6 text-xs sm:text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 py-3 px-4 rounded-xl w-full text-center">
                  {disableError}
                </div>
              )}

              <div className="flex items-center gap-3.5 w-full">
                <button
                  type="button"
                  onClick={closeDisableModal}
                  disabled={disableLoading}
                  className="flex-1 py-3 px-5 rounded-2xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100/80 font-semibold text-sm transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisable}
                  disabled={disableLoading || disableOtpDigits.some(d => !d)}
                  className={`flex-1 py-3 px-5 rounded-2xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] ${
                    disableOtpDigits.some(d => !d) || disableLoading
                      ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed shadow-none'
                      : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20 hover:shadow-md'
                  }`}
                >
                  {disableLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Disabling...</span>
                    </>
                  ) : (
                    <span>Disable 2FA</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MethodRow({ icon, title, description, active, onSetup, disabled, actionLabel = 'Setup' }: any) {
  return (
    <div className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${disabled ? 'opacity-50' : 'hover:bg-zinc-50/80'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600 shrink-0">
          {icon}
        </div>
        <div className="text-left min-w-0">
          <h4 className="font-semibold text-sm text-zinc-900 truncate">{title}</h4>
          <p className="text-xs text-zinc-500 line-clamp-1 sm:line-clamp-none">{description}</p>
        </div>
      </div>
      <div className="shrink-0">
        {active ? (
          <span className="px-2.5 py-0.5 bg-lime-100 text-lime-700 text-xs font-medium rounded-full">Active</span>
        ) : (
          <button 
            onClick={onSetup}
            disabled={disabled}
            className="px-3.5 py-1.5 bg-zinc-900 text-white font-medium text-xs rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
