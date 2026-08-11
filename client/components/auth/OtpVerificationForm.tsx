"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { verifyOtpApi, resendOtpApi } from '@/services/auth-service';
import { ApiClientError } from '@/lib/api-client';

interface OtpVerificationFormProps {
  accessToken?: string;
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  accessToken,
  onSuccess,
  onBackToLogin,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next box if digit entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const newDigits = pasted.split('');
      setDigits(newDigits);
      setError(null);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await verifyOtpApi(code, accessToken);
      setSuccessMsg(res.message || 'Email successfully verified!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Invalid verification code.');
      } else {
        setError('Verification failed. Please check the code and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await resendOtpApi(accessToken);
      setSuccessMsg(res.message || 'A new 6-digit verification code has been sent.');
      setCountdown(60);
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to resend OTP code.');
      } else {
        setError('Connection error while resending OTP.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert Banners */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 rounded-xl border border-[#2DD4C8]/30 bg-[#2DD4C8]/10 p-3.5 text-xs text-[#2DD4C8] backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-[#2DD4C8] shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* 6 Digit Input Boxes */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 py-2">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className="h-12 w-11 sm:h-14 sm:w-12 text-center text-xl font-bold text-white bg-[#161722]/90 border border-[#2A2C3A] rounded-xl outline-none transition-all duration-200 focus:border-[#2DD4C8] focus:ring-2 focus:ring-[#2DD4C8]/30 hover:border-[#3A3C4E] selection:bg-transparent"
          />
        ))}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || digits.join('').length !== 6}
        className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2DD4C8] to-[#6C5CE7] py-3 text-sm font-semibold text-white shadow-lg shadow-[#2DD4C8]/25 backdrop-blur-md transition-all duration-200 hover:from-[#3BE4D8] hover:to-[#7B6CF6] hover:shadow-[#2DD4C8]/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            Verifying Code...
          </>
        ) : (
          <>
            Confirm Verification
            <ShieldCheck className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
          </>
        )}
      </button>

      {/* Resend & Back Row */}
      <div className="flex items-center justify-between pt-2 text-xs">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-[#94A3B8] hover:text-white transition-colors"
        >
          ← Back to Sign In
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          className="flex items-center gap-1.5 text-[#2DD4C8] hover:underline disabled:text-[#64748B] disabled:no-underline cursor-pointer disabled:cursor-not-allowed font-medium"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
        </button>
      </div>
    </form>
  );
};
