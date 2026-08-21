"use client";

import React, { useState, useEffect } from 'react';
import { Mail, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Send, RefreshCw } from 'lucide-react';
import { forgotPasswordApi } from '@/services/auth-service';
import { ApiClientError } from '@/lib/api-client';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
  initialEmail?: string;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onBackToLogin,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSubmitted && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isSubmitted, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await forgotPasswordApi({ email: email.trim() });
      setIsSubmitted(true);
      setCountdown(60);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to request password reset link.');
      } else {
        setError('Connection error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    setError(null);

    try {
      await forgotPasswordApi({ email: email.trim() });
      setCountdown(60);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to resend reset link.');
      } else {
        setError('Connection error. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-5 animate-in fade-in">
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 p-4 text-xs text-foreground">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-sm">Reset link dispatched</p>
            <p className="text-muted-foreground leading-relaxed">
              If an account is associated with <span className="font-semibold text-primary">{email}</span>, you will receive an email shortly with a secure password reset link.
            </p>
            <p className="text-[11px] text-muted-foreground pt-1">
              Note: The link is single-use and will expire in 30 minutes.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || resending}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface-high py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-highest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
            {countdown > 0 ? `Resend link in ${countdown}s` : 'Resend reset link'}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-foreground">Email address</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            required
            autoFocus
            className="w-full rounded-md border border-input bg-surface-high py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-3 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending link...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send reset link
          </>
        )}
      </button>

      <div className="pt-3 text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </button>
      </div>
    </form>
  );
};
