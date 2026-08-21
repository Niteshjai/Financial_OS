import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

const OTP_LENGTH = 6;

export default function EmailSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'provide-email' | 'verify'>('intro');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSendOTP() {
    setLoading(true);
    try {
      await api.post('/2fa/email/begin-setup', step === 'provide-email' ? { email } : undefined);
      setStep('verify');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'NO_EMAIL') {
        setStep('provide-email');
      } else {
        toast.error(err.response?.data?.error?.message || 'Failed to send OTP.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    const code = otpDigits.join('');
    if (code.length !== OTP_LENGTH) return;
    
    setVerifying(true);
    try {
      await api.post('/2fa/email/confirm-setup', { code });
      // Redirect to backup codes display
      navigate('/settings/2fa/backup', { state: { fromSetup: true } });
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Invalid code. Please try again.');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen text-zinc-900 font-sans pb-20" style={{ background: 'linear-gradient(145deg, #e4e4e7 0%, #d4d4d8 30%, #a1a1aa 60%, #d4d4d8 80%, #71717a 100%)' }}>
      <header className="sticky top-0 z-20 pt-4">
        <div className="w-full px-6 md:px-10 py-2 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => navigate('/settings/2fa')}
            className="flex items-center gap-2.5 text-zinc-700 hover:text-zinc-900 bg-white/70 hover:bg-white border border-zinc-300 shadow-sm px-5 py-2.5 rounded-full transition-all font-medium text-base backdrop-blur-sm"
          >
            <ArrowLeft className="size-5" />
            Back to 2FA Settings
          </button>
        </div>
      </header>

      <main className="max-w-[576px] mx-auto px-6 mt-0">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-display font-light tracking-tight text-zinc-900">Set Up Email OTP</h1>
          <p className="text-zinc-600 mt-2">We'll send a 6-digit code to your registered email address.</p>
        </div>

        {step === 'intro' && (
          <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/50 p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-lime-100 text-lime-700 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-8 h-8" />
            </div>
            
            <h3 className="font-semibold text-lg mb-2 text-center">Verify Your Email</h3>
            <p className="text-zinc-600 mb-8 text-center px-4 w-full">
              Click below to send a verification code to your email. You'll need to enter it on the next screen.
            </p>
            
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        )}

        {step === 'provide-email' && (
          <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/50 p-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-lime-100 text-lime-700 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-8 h-8" />
            </div>
            
            <h3 className="font-semibold text-lg mb-2 text-center">Add Your Email</h3>
            <p className="text-zinc-600 mb-8 text-center px-4 w-full">
              We need an email address to send your verification code.
            </p>
            
            <input
              type="email"
              placeholder="Enter your email address"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl mb-6 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              onClick={handleSendOTP}
              disabled={loading || !email.includes('@')}
              className="w-full py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Save & Send OTP'}
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="bg-white rounded-[24px] shadow-sm border border-zinc-200/50 p-8 flex flex-col items-center">
            <h3 className="font-semibold text-lg mb-2 text-center">Enter the 6-digit code</h3>
            <p className="text-sm text-zinc-500 mb-6 text-center">Check your email inbox for the code.</p>
            
            <div className="flex gap-2 justify-center mb-6">
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(-1);
                    const newDigits = [...otpDigits];
                    newDigits[i] = val;
                    setOtpDigits(newDigits);
                    if (val && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
                      const newDigits = [...otpDigits];
                      newDigits[i - 1] = '';
                      setOtpDigits(newDigits);
                      otpRefs.current[i - 1]?.focus();
                    }
                  }}
                  className={`w-[46px] h-[54px] text-center text-xl font-bold rounded-lg border outline-none transition-all ${digit ? 'border-zinc-900 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-900'} focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/20`}
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={verifying || otpDigits.some(d => !d)}
              className="w-full py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify & Enable'}
            </button>
            
            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="mt-4 text-sm font-medium text-brand-secondary hover:underline"
            >
              Resend Code
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
