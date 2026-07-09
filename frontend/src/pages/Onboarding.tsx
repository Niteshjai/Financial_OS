import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initiatePhone, verifyPhone, devLogin } from '../services/auth';
import { useAssetStore } from '../store/assetStore';

// ═══════════════════════════════════════════════════════════════
// Country Data
// ═══════════════════════════════════════════════════════════════
const COUNTRIES = [
  { code: '+91',  iso: 'in', name: 'India',          localName: 'भारत',               maxLen: 10 },
  { code: '+1',   iso: 'us', name: 'United States',  localName: 'United States',      maxLen: 10 },
  { code: '+44',  iso: 'gb', name: 'United Kingdom', localName: 'United Kingdom',     maxLen: 11 },
  { code: '+971', iso: 'ae', name: 'UAE',            localName: 'الإمارات العربية المتحدة', maxLen: 9  },
  { code: '+65',  iso: 'sg', name: 'Singapore',      localName: 'Singapore',          maxLen: 8  },
  { code: '+61',  iso: 'au', name: 'Australia',      localName: 'Australia',          maxLen: 9  },
  { code: '+81',  iso: 'jp', name: 'Japan',          localName: '日本',               maxLen: 11 },
  { code: '+49',  iso: 'de', name: 'Germany',        localName: 'Deutschland',        maxLen: 11 },
  { code: '+33',  iso: 'fr', name: 'France',         localName: 'France',             maxLen: 9  },
  { code: '+86',  iso: 'cn', name: 'China',          localName: '中国',               maxLen: 11 },
  { code: '+82',  iso: 'kr', name: 'South Korea',    localName: '대한민국',             maxLen: 11 },
  { code: '+55',  iso: 'br', name: 'Brazil',         localName: 'Brasil',             maxLen: 11 },
  { code: '+7',   iso: 'ru', name: 'Russia',         localName: 'Россия',             maxLen: 10 },
  { code: '+234', iso: 'ng', name: 'Nigeria',        localName: 'Nigeria',            maxLen: 10 },
  { code: '+977', iso: 'np', name: 'Nepal',          localName: 'नेपाल',              maxLen: 10 },
  { code: '+31',  iso: 'nl', name: 'Netherlands',    localName: 'Nederland',          maxLen: 9  },
  { code: '+687', iso: 'nc', name: 'New Caledonia',  localName: 'Nouvelle-Calédonie', maxLen: 6  },
  { code: '+64',  iso: 'nz', name: 'New Zealand',    localName: 'New Zealand',        maxLen: 9  },
  { code: '+505', iso: 'ni', name: 'Nicaragua',      localName: 'Nicaragua',          maxLen: 8  },
];

const OTP_LENGTH = 6;
const OTP_TIMER_SECONDS = 60;
const MAX_RESENDS = 3;

export default function Onboarding() {
  const navigate = useNavigate();
  const setUser = useAssetStore((s) => s.setUser);
  const isAuthenticated = useAssetStore((s) => s.isAuthenticated);

  // ── State ──
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>(
    isAuthenticated ? 'success' : 'phone'
  );
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Country dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // OTP timer
  const [timeLeft, setTimeLeft] = useState(OTP_TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const [resendCount, setResendCount] = useState(0);

  // OTP input refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Derived ──
  const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= Math.min(selectedCountry.maxLen, 7);
  const isOtpComplete = otpDigits.every((d) => d !== '');
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.includes(countrySearch)
  );

  // ── Close dropdown on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── OTP Countdown Timer ──
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) {
      if (timeLeft <= 0) setTimerActive(false);
      return;
    }
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // ── Redirect if already authenticated ──
  useEffect(() => {
    if (isAuthenticated && step !== 'success') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, step, navigate]);

  // ── Handlers ──
  async function handleSendOtp(e?: React.FormEvent, channel: 'sms' | 'whatsapp' = 'sms') {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const digits = phoneNumber.replace(/\D/g, '');
      const result = await initiatePhone(selectedCountry.code, digits, channel);
      setTransactionId(result.transactionId);
      setMessage(result.message);
      setStep('otp');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeLeft(OTP_TIMER_SECONDS);
      setTimerActive(true);
      // Focus first OTP box after transition
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!isOtpComplete) return;
    setError('');
    setLoading(true);

    try {
      const otp = otpDigits.join('');
      const result = await verifyPhone(transactionId, otp);
      setUser(result.user);
      setTimerActive(false);
      setStep('success');
      setTimeout(() => {
        navigate(result.user.isNewUser ? '/consent' : '/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'OTP verification failed.');
      // Clear OTP on failure
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCount >= MAX_RESENDS) {
      setError('Maximum resend attempts reached. Please try again later.');
      return;
    }
    setResendCount((c) => c + 1);
    setError('');
    await handleSendOtp();
  }

  async function handleDevMode() {
    setLoading(true);
    try {
      const result = await devLogin();
      setUser(result.user);
      setStep('success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err: any) {
      setError('Dev login failed');
    } finally {
      setLoading(false);
    }
  }

  // ── OTP Input Handlers ──
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && index === OTP_LENGTH - 1 && newDigits.every((d) => d !== '')) {
      setTimeout(() => handleVerifyOtp(), 150);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = '';
      setOtpDigits(newDigits);
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length > 0) {
      const newDigits = Array(OTP_LENGTH).fill('');
      pasted.split('').forEach((d, i) => (newDigits[i] = d));
      setOtpDigits(newDigits);
      const nextEmpty = newDigits.findIndex((d) => d === '');
      otpRefs.current[nextEmpty >= 0 ? nextEmpty : OTP_LENGTH - 1]?.focus();
      if (pasted.length === OTP_LENGTH) {
        setTimeout(() => handleVerifyOtp(), 150);
      }
    }
  }

  function formatTimer(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="onboarding-card">
      {/* LEFT: form */}
      <div className="onboarding-left">
        <div className="onboarding-brand">
          <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 8H2v2h20V8h-2L12 2z" />
            <rect x="4" y="11" width="3" height="7" />
            <rect x="10.5" y="11" width="3" height="7" />
            <rect x="17" y="11" width="3" height="7" />
            <rect x="2" y="19" width="20" height="2" />
          </svg>
          <span>FinTrust</span>
        </div>

        {step === 'phone' && (
          <>
            <h1 className="onboarding-headline">Welcome Back</h1>
            <p className="onboarding-subtext">Securely manage your assets and track your growth.</p>

            <form id="signinForm" noValidate onSubmit={handleSendOtp} className="onboarding-form">
              <label htmlFor="phone" className="onboarding-label">Phone Number</label>
              <div className="onboarding-phone-row relative" ref={dropdownRef}>
                <div 
                  className="onboarding-country-select" 
                  tabIndex={0} 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span>{selectedCountry.code}</span>
                  <svg viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                
                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-[340px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 py-4 border border-gray-100">
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-full px-4 py-3">
                        <span className="material-symbols-outlined text-[#191c1e] text-[20px]">search</span>
                        <input
                          type="text"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="bg-transparent text-[15px] text-[#191c1e] outline-none w-full placeholder:text-[#76777d]"
                          autoFocus
                          placeholder="Search country..."
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[340px] px-2 py-1">
                      {filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => { setSelectedCountry(c); setDropdownOpen(false); setCountrySearch(''); setPhoneNumber(''); }}
                          className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left hover:bg-[#f7f9fb] transition-colors ${selectedCountry.code === c.code ? 'bg-[#f7f9fb]' : ''}`}
                        >
                          <img 
                            src={`https://flagcdn.com/w40/${c.iso}.png`} 
                            alt={c.name} 
                            className="w-7 h-[20px] shadow-sm rounded-[2px] object-cover border border-black/5 flex-shrink-0" 
                          />
                          <div className="flex flex-col flex-1 min-w-0 justify-center">
                            <span className={`text-[16px] leading-[1.2] font-medium text-[#191c1e] truncate ${c.localName !== c.name ? 'mb-1' : ''}`}>{c.name}</span>
                            {c.localName !== c.name && (
                              <span className="text-[13px] leading-[1] text-[#76777d] truncate">{c.localName}</span>
                            )}
                          </div>
                          <span className="text-[14px] text-[#76777d] font-medium mr-5 flex-shrink-0">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <input 
                  type="tel" 
                  id="phone" 
                  placeholder="(555) 000-0000" 
                  autoComplete="tel"
                  className="onboarding-input-tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, selectedCountry.maxLen))}
                />
              </div>
              <div className="onboarding-error" id="phoneError">{error}</div>

              <button type="submit" className="onboarding-signin-btn" id="signinBtn" disabled={loading || !isPhoneValid}>
                {loading ? 'Sending...' : 'Sign In'}
              </button>
              
              {import.meta.env.DEV && (
                <button 
                  type="button" 
                  onClick={handleDevMode}
                  className="w-full py-3 mt-2 rounded-2xl bg-gray-100 text-gray-500 font-medium text-[14px] hover:bg-gray-200 transition-colors"
                >
                  Quick Login (Dev Mode)
                </button>
              )}
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h1 className="onboarding-headline">Security Check</h1>
            <p className="onboarding-subtext">{message || 'Enter the 6-digit code sent to your phone'}</p>

            <div className="flex gap-2 mt-2 mb-4 justify-between" onPaste={handleOtpPaste}>
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
                  className={`w-[50px] h-[60px] text-center text-[22px] font-bold rounded-xl border outline-none transition-all ${
                    digit ? 'border-[var(--green-700)] bg-[var(--green-700)]/5 text-[var(--green-700)]' : 'border-[var(--border)] bg-white text-[var(--ink)]'
                  } focus:border-[var(--green-700)] focus:ring-2 focus:ring-[var(--green-700)]/20`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mb-4 mt-2">
              {timerActive && timeLeft > 0 ? (
                <span className="font-['Inter'] text-[13px] text-[var(--muted)]">Code expires in <span className="font-bold text-[var(--green-700)]">{formatTimer(timeLeft)}</span></span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading || resendCount >= MAX_RESENDS}
                  className="text-[13px] font-semibold text-[var(--green-700)] hover:brightness-110 disabled:opacity-50 transition-colors"
                >
                  Resend Code {resendCount > 0 && `(${MAX_RESENDS - resendCount})`}
                </button>
              )}
            </div>
            
            {error && <div className="onboarding-error">{error}</div>}

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading || !isOtpComplete}
              className="onboarding-signin-btn w-full"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setError(''); setTimerActive(false); setOtpDigits(Array(OTP_LENGTH).fill('')); }}
              className="w-full mt-4 py-3 rounded-xl text-[13px] font-medium text-[var(--muted)] hover:bg-[#f7f9fb] transition-colors"
            >
              Change phone number
            </button>
            <button
              type="button"
              onClick={() => handleSendOtp(undefined, 'whatsapp')}
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl border border-[#25D366] text-[#25D366] font-bold text-[13px] flex items-center justify-center hover:bg-[#25D366]/5 transition-colors disabled:opacity-50"
            >
              Send through WhatsApp
            </button>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[var(--green-700)]/10 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[48px] text-[var(--green-700)]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <h2 className="onboarding-headline mb-2">Verified</h2>
            <p className="onboarding-subtext">Entering FinTrust Global...</p>
          </div>
        )}
      </div>

      {/* RIGHT: illustration */}
      <div className="onboarding-right">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/login-bg-house.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f3d2e]/80 via-[#0f3d2e]/20 to-transparent pointer-events-none" />

        <div className="onboarding-quote-box">
          <h3>Strength in Every Move</h3>
          <p>Experience the stability and precision of institutional-grade asset management.</p>
        </div>

        <div className="onboarding-footer">
          <span>© 2024 FinTrust Global. All rights reserved.</span>
          <span className="links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </span>
        </div>
      </div>
    </div>
  );
}
