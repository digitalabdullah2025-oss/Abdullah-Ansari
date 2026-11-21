import React, { useEffect, useRef, useState } from 'react';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
} from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Home,
  Phone,
  ShieldCheck,
  Smartphone,
  Wrench,
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import type { UserRole } from '../types';
import { BrandLogo } from './BrandLogo';

export const WelcomeScreen: React.FC<{
  onSelectRole: (role: UserRole) => void;
  onBrowseServices: () => void;
}> = ({ onSelectRole, onBrowseServices }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <header className="border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <BrandLogo size="md" showTagline />
          <button
            type="button"
            onClick={onBrowseServices}
            className="text-sm font-medium text-slate-600 hover:text-[#0B1F3A] whitespace-nowrap"
          >
            Browse Services
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center py-10 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto w-full">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#2563EB] tracking-tight">
              Trusted Indian Home Services Marketplace
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-5xl font-extrabold text-[#0B1F3A] tracking-tight leading-tight text-balance">
              Find verified local repair pros near you in minutes.
            </h1>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              AF FIXING connects homeowners with nearby AC technicians,
              electricians, plumbers, and appliance specialists with upfront
              rate cards and live arrival tracking.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Card */}
            <button
              type="button"
              onClick={() => onSelectRole('customer')}
              className="group text-left p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white hover:border-[#2563EB] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mb-5">
                  <Home className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-[#0B1F3A]">
                  Continue as Customer
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Book verified repair technicians nearby, check live map
                  availability, view transparent charges, and track arrival.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] group-hover:translate-x-1 transition-transform">
                Book a home service
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Professional Card */}
            <button
              type="button"
              onClick={() => onSelectRole('professional')}
              className="group text-left p-6 sm:p-8 rounded-2xl border border-slate-200 bg-[#0B1F3A] text-white hover:bg-[#122C4F] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-blue-300 flex items-center justify-center mb-5">
                  <Wrench className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold text-white">
                  Continue as Service Professional
                </h2>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Register your trade, toggle live online availability, receive
                  nearby booking requests, and track your earnings.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-300 group-hover:translate-x-1 transition-transform">
                Partner with AF FIXING
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>Government ID verified professionals</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>Transparent inspection & labour rates</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>Real-time GPS tracking & booking chat</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export const AuthScreen: React.FC<{
  intendedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onSuccess: () => void;
  onBack: () => void;
}> = ({ intendedRole, onRoleChange, onSuccess, onBack }) => {
  const [authTab, setAuthTab] = useState<'google' | 'phone'>('google');
  const [phoneInput, setPhoneInput] = useState('+91');
  const [otpInput, setOtpInput] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch {
          // ignore cleanup error
        }
        recaptchaRef.current = null;
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        msg.includes('popup-closed-by-user')
          ? 'Sign-in window was closed. Please try again.'
          : `Google sign-in failed: ${msg}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneInput.trim();
    if (!/^\+[1-9]\d{9,14}$/.test(cleaned)) {
      setErrorMsg('Enter a valid mobile number with country code (e.g. +919876543210).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'normal',
        });
      }
      const result = await signInWithPhoneNumber(
        auth,
        cleaned,
        recaptchaRef.current
      );
      setConfirmationResult(result);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (
        code.includes('operation-not-allowed') ||
        code.includes('configuration-not-found')
      ) {
        setErrorMsg(
          'Firebase Phone OTP sign-in is not yet enabled in the Firebase Console for this project. Please enable Phone authentication in Firebase Console or use Google Sign-In above.'
        );
      } else {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Failed to send OTP. Please check your number or use Google Sign-In.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || otpInput.trim().length < 6) {
      setErrorMsg('Enter the 6-digit OTP sent to your mobile.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await confirmationResult.confirm(otpInput.trim());
      onSuccess();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Invalid OTP code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <BrandLogo size="sm" showTagline />
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Back
          </button>
        </div>

        <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">
          Sign in to AF FIXING
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose your account type and sign in securely with Firebase.
        </p>

        {/* Account Type Selector */}
        <div className="mt-5 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => onRoleChange('customer')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
              intendedRole === 'customer'
                ? 'bg-white text-[#0B1F3A] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer Account
          </button>
          <button
            type="button"
            onClick={() => onRoleChange('professional')}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
              intendedRole === 'professional'
                ? 'bg-white text-[#0B1F3A] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Service Professional
          </button>
        </div>

        {/* Auth Method Tabs */}
        <div className="mt-5 flex border-b border-slate-200 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setAuthTab('google');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 border-b-2 transition-colors ${
              authTab === 'google'
                ? 'border-[#2563EB] text-[#0B1F3A] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Google Sign-In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('phone');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 border-b-2 transition-colors ${
              authTab === 'phone'
                ? 'border-[#2563EB] text-[#0B1F3A] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Mobile Number & OTP
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            {errorMsg}
          </div>
        )}

        {authTab === 'google' ? (
          <div className="mt-6 space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleGoogleSignIn()}
              className="w-full py-3 px-4 rounded-xl bg-[#0B1F3A] hover:bg-[#122C4F] text-white text-sm font-semibold flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>
            <p className="text-xs text-slate-500 text-center">
              Instant verified login powered by Firebase Authentication.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {!confirmationResult ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number (with +91)
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-[#2563EB]">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+919876543210"
                      className="w-full text-sm text-slate-900 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div id="recaptcha-container" />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    6-Digit OTP sent to {phoneInput}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm tracking-widest font-mono focus:outline-none focus:border-[#2563EB]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-[#0B1F3A] hover:bg-[#122C4F] text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmationResult(null)}
                  className="w-full text-xs text-slate-500 hover:text-slate-900"
                >
                  Change phone number
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
