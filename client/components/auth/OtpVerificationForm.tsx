"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
      setSuccessMsg(res.message || 'Email successfully verified.');
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
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-error/30 bg-error/10 p-3.5 text-xs text-error animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 rounded-md border border-success/30 bg-success/10 p-3.5 text-xs text-success animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

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
            className="h-12 w-11 sm:h-14 sm:w-12 text-center text-xl font-semibold text-foreground bg-surface-high border border-input rounded-md outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={loading || digits.join('').length !== 6}
        className="group relative flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying code...
          </>
        ) : (
          <>
            Confirm verification
            <ShieldCheck className="h-4 w-4" />
          </>
        )}
      </button>

      <div className="flex items-center justify-between pt-2 text-xs">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to sign in
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          className="flex items-center gap-1.5 text-primary hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer disabled:cursor-not-allowed font-medium"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
};
