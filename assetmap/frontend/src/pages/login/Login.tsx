import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initiatePhone, verifyPhone, devLogin, registerAadhaar, confirmRegistration, initiateEmail, verifyEmail, type IdentityData } from '../../services/auth';
import { useAssetStore } from '../../store/assetStore';

// ═══════════════════════════════════════════════════════════════
// Country Data
// ═══════════════════════════════════════════════════════════════
const COUNTRIES = [
  { code: '+91', iso: 'in', name: 'India', localName: 'भारत', maxLen: 10 },
  { code: '+1', iso: 'us', name: 'United States', localName: 'United States', maxLen: 10 },
  { code: '+44', iso: 'gb', name: 'United Kingdom', localName: 'United Kingdom', maxLen: 11 },
  { code: '+971', iso: 'ae', name: 'UAE', localName: 'الإمارات العربية المتحدة', maxLen: 9 },
  { code: '+65', iso: 'sg', name: 'Singapore', localName: 'Singapore', maxLen: 8 },
  { code: '+61', iso: 'au', name: 'Australia', localName: 'Australia', maxLen: 9 },
  { code: '+81', iso: 'jp', name: 'Japan', localName: '日本', maxLen: 11 },
  { code: '+49', iso: 'de', name: 'Germany', localName: 'Deutschland', maxLen: 11 },
  { code: '+33', iso: 'fr', name: 'France', localName: 'France', maxLen: 9 },
  { code: '+86', iso: 'cn', name: 'China', localName: '中国', maxLen: 11 },
  { code: '+82', iso: 'kr', name: 'South Korea', localName: '대한민국', maxLen: 11 },
  { code: '+55', iso: 'br', name: 'Brazil', localName: 'Brasil', maxLen: 11 },
  { code: '+7', iso: 'ru', name: 'Russia', localName: 'Россия', maxLen: 10 },
  { code: '+234', iso: 'ng', name: 'Nigeria', localName: 'Nigeria', maxLen: 10 },
  { code: '+977', iso: 'np', name: 'Nepal', localName: 'नेपाल', maxLen: 10 },
  { code: '+31', iso: 'nl', name: 'Netherlands', localName: 'Nederland', maxLen: 9 },
  { code: '+687', iso: 'nc', name: 'New Caledonia', localName: 'Nouvelle-Calédonie', maxLen: 6 },
  { code: '+64', iso: 'nz', name: 'New Zealand', localName: 'New Zealand', maxLen: 9 },
  { code: '+505', iso: 'ni', name: 'Nicaragua', localName: 'Nicaragua', maxLen: 8 },
];

const OTP_LENGTH = 6;
const OTP_TIMER_SECONDS = 60;
const MAX_RESENDS = 3;

export default function Onboarding() {
  const navigate = useNavigate();
  const setUser = useAssetStore((s) => s.setUser);
  const isAuthenticated = useAssetStore((s) => s.isAuthenticated);

  // ── State ──
  const [step, setStep] = useState<'phone' | 'otp' | 'aadhaar' | 'identity' | 'email' | 'success'>(() => {
    if (isAuthenticated) return 'success';
    return (sessionStorage.getItem('login_step') as any) || 'phone';
  });
  const [selectedCountry, setSelectedCountry] = useState(() => {
    const stored = sessionStorage.getItem('login_country');
    return stored ? JSON.parse(stored) : COUNTRIES[0];
  });
  const [phoneNumber, setPhoneNumber] = useState(() => sessionStorage.getItem('login_phone') || '');
  const [authChannel, setAuthChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [transactionId, setTransactionId] = useState(() => sessionStorage.getItem('login_txId') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Registration state
  const [registrationToken, setRegistrationToken] = useState(() => sessionStorage.getItem('login_regToken') || '');
  const [aadhaarNumber, setAadhaarNumber] = useState(() => sessionStorage.getItem('login_aadhaar') || '');
  const [identityData, setIdentityData] = useState<IdentityData | null>(null);

  // Email state
  const [emailAddress, setEmailAddress] = useState(() => sessionStorage.getItem('login_email') || '');
  const [emailOtpActive, setEmailOtpActive] = useState(false);
  const [emailOtpDigits, setEmailOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));

  // Country dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // OTP timer
  const [timeLeft, setTimeLeft] = useState(() => {
    const ts = sessionStorage.getItem('login_otp_timestamp');
    if (ts) {
      const elapsed = Math.floor((Date.now() - parseInt(ts, 10)) / 1000);
      const rem = OTP_TIMER_SECONDS - elapsed;
      return rem > 0 ? rem : 0;
    }
    return OTP_TIMER_SECONDS;
  });
  const [timerActive, setTimerActive] = useState(() => {
    const ts = sessionStorage.getItem('login_otp_timestamp');
    if (ts) {
      const elapsed = Math.floor((Date.now() - parseInt(ts, 10)) / 1000);
      return elapsed < OTP_TIMER_SECONDS;
    }
    return false;
  });
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

  const logout = useAssetStore((s) => s.logout);

  // ── Redirect or Logout if already authenticated ──
  useEffect(() => {
    if (isAuthenticated) {
      if (step === 'success') {
        // They just successfully logged in during this flow, let them through
        const timer = setTimeout(() => navigate('/dashboard'), 1500);
        return () => clearTimeout(timer);
      } else {
        // They were authenticated (e.g. from an old cookie) but they refreshed the login page.
        // Force a logout so they have to go through the OTP flow again.
        logout();
        // Also ensure backend cookie is cleared
        fetch('/api/auth/logout', { method: 'DELETE' }).catch(() => { });
      }
    }
  }, [isAuthenticated, step, navigate, logout]);

  // ── Persist State ──
  useEffect(() => {
    if (step === 'success') {
      sessionStorage.removeItem('login_step');
      sessionStorage.removeItem('login_phone');
      sessionStorage.removeItem('login_txId');
      sessionStorage.removeItem('login_regToken');
      sessionStorage.removeItem('login_aadhaar');
      sessionStorage.removeItem('login_email');
      sessionStorage.removeItem('login_country');
      sessionStorage.removeItem('login_otp_timestamp');
    } else {
      sessionStorage.setItem('login_step', step);
    }
  }, [step]);

  useEffect(() => { sessionStorage.setItem('login_phone', phoneNumber); }, [phoneNumber]);
  useEffect(() => { sessionStorage.setItem('login_txId', transactionId); }, [transactionId]);
  useEffect(() => { sessionStorage.setItem('login_regToken', registrationToken); }, [registrationToken]);
  useEffect(() => { sessionStorage.setItem('login_aadhaar', aadhaarNumber); }, [aadhaarNumber]);
  useEffect(() => { sessionStorage.setItem('login_email', emailAddress); }, [emailAddress]);
  useEffect(() => { sessionStorage.setItem('login_country', JSON.stringify(selectedCountry)); }, [selectedCountry]);

  // ── Handlers ──
  async function handleSendOtp(e?: React.FormEvent, channel: 'sms' | 'whatsapp' = 'sms') {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const digits = phoneNumber.replace(/\D/g, '');
      const result = await initiatePhone(selectedCountry.code, digits, channel);
      setTransactionId(result.transactionId);
      setAuthChannel(channel);
      setMessage(result.message);
      setStep('otp');
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeLeft(OTP_TIMER_SECONDS);
      setTimerActive(true);
      sessionStorage.setItem('login_otp_timestamp', Date.now().toString());
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
      setTimerActive(false);

      if (result.isRegistered && result.user) {
        // ── Registered user → login directly ──
        setUser(result.user);
        setStep('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        // ── New user → go to Aadhaar verification ──
        setRegistrationToken(result.registrationToken || '');
        setStep('aadhaar');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'OTP verification failed.');
      // Clear OTP on failure
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleAadhaarSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = aadhaarNumber.replace(/\s/g, '');
    if (clean.length !== 12) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const result = await registerAadhaar(registrationToken, clean);
      setIdentityData(result.identity);
      setStep('identity');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Aadhaar verification failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmRegistration() {
    setError('');
    setLoading(true);

    try {
      const result = await confirmRegistration(registrationToken);
      setUser(result.user);
      setStep('success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed.');
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

  async function handleSendEmailOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!emailAddress) return;
    setError('');
    setLoading(true);
    try {
      await initiateEmail(registrationToken, emailAddress);
      setEmailOtpActive(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send email OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmailOtp() {
    const otp = emailOtpDigits.join('');
    if (otp.length !== OTP_LENGTH) return;
    setError('');
    setLoading(true);
    try {
      await verifyEmail(registrationToken, otp);
      await handleConfirmRegistration();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Email OTP verification failed.');
      setEmailOtpDigits(Array(OTP_LENGTH).fill(''));
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
    <main className="min-h-screen flex flex-col md:flex-row bg-surface font-body-md text-on-surface antialiased overflow-hidden selection:bg-brand-secondary/20">
      {/* Left Pane: Authentication */}
      <section className="flex flex-col justify-center items-center px-margin py-lg z-10 bg-surface-container-lowest md:w-[40%] w-full relative">

        {/* Top-Left Back Button */}
        {(step === 'otp' || step === 'aadhaar' || step === 'identity' || step === 'email') && (
          <button
            onClick={() => {
              if (step === 'otp') {
                setStep('phone'); setTimerActive(false); setOtpDigits(Array(OTP_LENGTH).fill(''));
              } else if (step === 'aadhaar') {
                setStep('phone'); setAadhaarNumber('');
              } else if (step === 'identity') {
                setStep('aadhaar'); setIdentityData(null);
              } else if (step === 'email') {
                setStep('identity'); setEmailOtpActive(false); setEmailOtpDigits(Array(OTP_LENGTH).fill(''));
              }
              setError('');
            }}
            className="absolute top-6 left-3 md:top-8 md:left-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/5 text-on-surface-variant hover:bg-black/10 hover:text-on-surface transition-all"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
          </button>
        )}

        <div className="w-full max-w-[380px] space-y-lg">
          {/* Brand Header */}
          <div className="flex items-center gap-base mb-lg">
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
            <h1 className="text-3xl font-bold text-primary tracking-tight">FinTrust</h1>
          </div>

          {step === 'phone' && (
            <>
              {/* Intro */}
              <div className="space-y-xs">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Welcome Back</h2>
                <p className="font-body-md text-on-surface-variant">Securely manage your assets and track your growth.</p>
              </div>

              {/* Form */}
              <form className="space-y-md" onSubmit={handleSendOtp} noValidate>
                <div className="space-y-base relative" ref={dropdownRef}>
                  <label className="font-label-md text-label-md text-on-surface-variant block" htmlFor="phone">Phone Number</label>
                  <div className="flex gap-base">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 px-md py-[14px] bg-white border border-outline-variant rounded-lg font-body-md custom-focus transition-all hover:bg-surface-container"
                    >
                      <img src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`} alt={selectedCountry.name} className="w-6 h-[16px] shadow-sm rounded-[2px] object-cover border border-black/5" />
                      <span className="font-body-md">{selectedCountry.code}</span>
                      <span className="material-symbols-outlined text-xl text-on-surface-variant/70">expand_more</span>
                    </button>

                    {/* Country Dropdown Menu */}
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
                        <div className="overflow-y-auto max-h-[200px] px-2 py-1">
                          {filteredCountries.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => { setSelectedCountry(c); setDropdownOpen(false); setCountrySearch(''); setPhoneNumber(''); }}
                              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-left hover:bg-[#f7f9fb] transition-colors ${selectedCountry.code === c.code ? 'bg-[#f7f9fb]' : ''}`}
                            >
                              <img src={`https://flagcdn.com/w40/${c.iso}.png`} alt={c.name} className="w-7 h-[20px] shadow-sm rounded-[2px] object-cover border border-black/5 flex-shrink-0" />
                              <div className="flex flex-col flex-1 min-w-0 justify-center">
                                <span className={`text-[16px] leading-[1.2] font-medium text-[#191c1e] truncate ${c.localName !== c.name ? 'mb-1' : ''}`}>{c.name}</span>
                                {c.localName !== c.name && <span className="text-[13px] leading-[1] text-[#76777d] truncate">{c.localName}</span>}
                              </div>
                              <span className="text-[14px] text-[#76777d] font-medium mr-5 flex-shrink-0">{c.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <input
                      className="flex-1 px-md py-[14px] bg-white border border-outline-variant rounded-lg font-body-md custom-focus transition-all outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary"
                      id="phone"
                      placeholder="Enter your mobile number"
                      type="tel"
                      autoComplete="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, selectedCountry.maxLen))}
                    />
                  </div>
                </div>

                {error && <div className="text-error text-sm mt-1">{error}</div>}

                <button
                  className="w-full bg-brand-secondary text-on-brand-secondary font-headline-md py-md rounded-3xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-90 disabled:cursor-not-allowed disabled:active:scale-100"
                  type="submit"
                  disabled={loading || !isPhoneValid}
                >
                  {loading ? 'Sending...' : 'Sign In'}
                </button>

                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleDevMode}
                    className="w-full py-3 mt-4 rounded-3xl bg-surface-container-high text-on-surface-variant font-medium text-sm hover:bg-surface-dim transition-colors"
                  >
                    Quick Login (Dev Mode)
                  </button>
                )}
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
              {/* Intro */}
              <div className="space-y-xs">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Security Check</h2>
                <div className="font-body-md text-on-surface-variant flex items-center flex-wrap gap-1">
                  Enter the 6-digit code sent to
                  <span className="font-medium text-on-surface ml-1">{selectedCountry.code} {phoneNumber}</span>
                  {authChannel === 'whatsapp' && (
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-[18px] h-[18px] ml-1" />
                  )}
                </div>
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
                      className={`w-[40px] h-[48px] md:w-[46px] md:h-[54px] text-center text-xl font-bold rounded-lg border outline-none transition-all ${digit ? 'border-brand-secondary bg-brand-secondary/5 text-brand-secondary' : 'border-outline-variant bg-white text-on-surface'
                        } focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  {timerActive && timeLeft > 0 ? (
                    <span className="font-label-md text-on-surface-variant">Code expires in <span className="font-bold text-brand-secondary">{formatTimer(timeLeft)}</span></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading || resendCount >= MAX_RESENDS}
                      className="text-sm font-semibold text-brand-secondary hover:brightness-110 disabled:opacity-50 transition-colors"
                    >
                      Resend Code {resendCount > 0 && `(${MAX_RESENDS - resendCount})`}
                    </button>
                  )}
                </div>

                {error && <div className="text-error text-sm mt-1">{error}</div>}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading || !isOtpComplete}
                  className="w-full bg-brand-secondary text-on-brand-secondary font-headline-md py-md rounded-3xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('phone'); setError(''); setTimerActive(false); setOtpDigits(Array(OTP_LENGTH).fill('')); }}
                  className="w-full py-3 rounded-3xl text-sm font-medium text-on-surface-variant bg-black/5 hover:bg-black/10 transition-colors"
                >
                  Change phone number
                </button>

                {/* Other Options */}
                <div className="pt-4 border-t border-outline-variant/30 text-center">
                  <p className="text-sm text-on-surface-variant mb-4">Other login options</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={(e) => handleSendOtp(e, 'whatsapp')}
                      className="flex-1 py-3 rounded-2xl border border-outline-variant/50 shadow-sm text-sm font-medium text-[#191c1e] bg-white hover:bg-[#f7f9fb] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-5 h-5" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 'aadhaar' && (
            <form onSubmit={handleAadhaarSubmit} className="space-y-lg animate-fade-in">
              <div className="space-y-xs">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Identity Verification</h2>
                <p className="font-body-md text-on-surface-variant">Please enter your 12-digit Aadhaar number to continue</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-on-surface">Aadhaar Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={aadhaarNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                      const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
                      setAadhaarNumber(formatted);
                    }}
                    placeholder="0000 0000 0000"
                    className="w-full h-[56px] px-4 rounded-xl border border-outline-variant bg-white text-on-surface focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20 outline-none transition-all tracking-[0.2em] font-medium"
                    required
                  />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50">fingerprint</span>
                </div>
              </div>

              {error && <div className="text-error text-sm">{error}</div>}

              <button
                type="submit"
                disabled={loading || aadhaarNumber.replace(/\s/g, '').length !== 12}
                className="w-full bg-brand-secondary text-on-brand-secondary font-headline-md py-md rounded-3xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? 'Verifying...' : 'Verify Aadhaar'}
              </button>
            </form>
          )}

          {step === 'identity' && identityData && (
            <div className="space-y-lg animate-fade-in">
              <div className="space-y-xs">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Confirm Details</h2>
                <p className="font-body-md text-on-surface-variant">Please confirm your identity details fetched from Aadhaar</p>
              </div>

              <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-outline-variant/30">
                  <div className="w-12 h-12 rounded-full bg-brand-secondary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-brand-secondary">person</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-on-surface">{identityData.name}</h3>
                    <p className="text-sm text-on-surface-variant">Aadhaar ends in {identityData.aadhaarLast4}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Date of Birth</p>
                    <p className="font-medium text-sm text-on-surface">{identityData.dob}</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Nationality</p>
                    <p className="font-medium text-sm text-on-surface">{identityData.nationality}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-on-surface-variant mb-1">Father's Name</p>
                    <p className="font-medium text-sm text-on-surface">{identityData.fathersName}</p>
                  </div>
                </div>
              </div>

              {error && <div className="text-error text-sm">{error}</div>}

              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); }}
                disabled={loading}
                className="w-full bg-brand-secondary text-on-brand-secondary font-headline-md py-md rounded-3xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                Confirm Identity
              </button>
            </div>
          )}

          {step === 'email' && (
            <div className="space-y-lg animate-fade-in">
              <div className="space-y-xs">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Add Email (Optional)</h2>
                <p className="font-body-md text-on-surface-variant">This email will be used for account related notifications and security, or you can skip for now.</p>
              </div>

              {!emailOtpActive ? (
                <form onSubmit={handleSendEmailOtp} className="space-y-1">
                  <label className="text-sm font-medium text-on-surface">Email Address</label>
                  <div className="relative mb-6">
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-[56px] px-4 rounded-xl border border-outline-variant bg-white text-on-surface focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20 outline-none transition-all font-medium"
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50">mail</span>
                  </div>

                  {error && <div className="text-error text-sm pb-2">{error}</div>}

                  <button
                    type="submit"
                    disabled={loading || !emailAddress.includes('@')}
                    className="w-full bg-brand-secondary text-on-brand-secondary font-headline-md py-md rounded-3xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 mb-3"
                  >
                    {loading ? 'Sending OTP...' : 'Verify Email'}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmRegistration}
                    disabled={loading}
                    className="w-full py-3 rounded-3xl text-sm font-medium text-on-surface-variant bg-black/5 hover:bg-black/10 transition-colors"
                  >
                    Skip & Complete Registration
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-on-surface-variant">We've sent a code to <span className="font-medium text-on-surface">{emailAddress}</span></p>

                  <div className="flex gap-2 justify-between">
                    {emailOtpDigits.map((digit, i) => (
                      <input
                        key={i}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(-1);
                          const newD = [...emailOtpDigits];
                          newD[i] = val;
                          setEmailOtpDigits(newD);
                          if (val && i < OTP_LENGTH - 1) {
                            const next = document.getElementById(`email-otp-${i + 1}`);
                            next?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digit && i > 0) {
                            const prev = document.getElementById(`email-otp-${i - 1}`);
                            prev?.focus();
                          }
                        }}
                        id={`email-otp-${i}`}
                        className="w-12 h-[56px] text-center text-xl font-bold rounded-xl border border-outline-variant bg-white text-on-surface focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20 outline-none transition-all"
                      />
                    ))}
                  </div>

                  {error && <div className="text-error text-sm">{error}</div>}

                  <button
                    type="button"
                    onClick={handleVerifyEmailOtp}
                    disabled={loading || emailOtpDigits.some((d) => !d)}
                    className="w-full bg-brand-secondary text-on-brand-secondary font-headline-md py-md rounded-3xl shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    {loading ? 'Verifying...' : 'Verify & Register'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailOtpActive(false)}
                    className="w-full py-3 rounded-3xl text-sm font-medium text-on-surface-variant bg-black/5 hover:bg-black/10 transition-colors"
                  >
                    Change Email
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-12 space-y-4">
              <div className="w-24 h-24 rounded-full bg-brand-secondary/10 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-[64px] text-brand-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Verified</h2>
              <p className="font-body-md text-on-surface-variant">Entering FinTrust Global...</p>
            </div>
          )}

        </div>
      </section>

      {/* Right Pane: Visual/Brand */}
      <section className="hidden md:flex relative overflow-hidden md:w-[60%] justify-center items-end">
        {/* Professional High-Fidelity Image */}
        <div className="absolute inset-0 z-0 bg-primary-container">
          <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-primary-container/20 to-transparent z-10 opacity-60"></div>
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] hover:scale-110"
            style={{ backgroundImage: "url('/login-bg-house.jpg')" }}
          />
          {/* Interactive WebGL-like Shader Overlay */}
          <div className="absolute inset-0 opacity-40 mix-blend-overlay">
            <div className="absolute w-[800px] h-[800px] rounded-full bg-brand-secondary/30 blur-[120px] -top-1/4 -right-1/4 animate-pulse" style={{ left: '-25%', top: '-25%', opacity: 0.3, transition: '1s' }}></div>
          </div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-20 px-8 lg:px-xl w-full max-w-2xl space-y-md pb-10 lg:pb-lg">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 lg:p-lg rounded-3xl space-y-base max-w-md min-w-[300px]">
            <h3 className="font-headline-xl text-white tracking-tight drop-shadow-sm">Strength in Every Move</h3>
            <p className="font-body-lg text-white/90 drop-shadow-sm">Experience the stability and precision of institutional-grade asset management.</p>
          </div>
        </div>

        {/* Global Footer Anchor */}
        <footer className="absolute bottom-base left-0 w-full px-xl hidden md:flex justify-between items-center z-30 opacity-60">
          <span className="font-label-sm text-white">© 2024 FinTrust Global. All rights reserved.</span>
          <div className="flex gap-md">
            <a className="font-label-sm text-white hover:underline transition-all" href="#">Privacy Policy</a>
            <a className="font-label-sm text-white hover:underline transition-all" href="#">Terms of Service</a>
          </div>
        </footer>
      </section>
    </main>
  );
}

