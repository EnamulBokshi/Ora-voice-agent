"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { verifyResetTokenApi, resetPasswordApi } from '@/services/auth-service';
import { ApiClientError } from '@/lib/api-client';
import { ResetPasswordResponseData } from '@/types/auth';

interface ResetPasswordFormProps {
  token: string;
  onSuccess: (data?: ResetPasswordResponseData) => void;
  onRequestNewLink: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onSuccess,
  onRequestNewLink,
}) => {
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setTokenError('No password reset token was provided in the link.');
      return;
    }

    const checkToken = async () => {
      try {
        const res = await verifyResetTokenApi(token);
        if (res.valid) {
          setTokenValid(true);
          setUserEmail(res.email || null);
        } else {
          setTokenValid(false);
          setTokenError('This password reset link is invalid or has already been used.');
        }
      } catch (err) {
        setTokenValid(false);
        if (err instanceof ApiClientError) {
          setTokenError(err.message || 'This password reset link is invalid or has expired.');
        } else {
          setTokenError('Unable to verify reset link. Please request a new one.');
        }
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await resetPasswordApi({ token, password });
      setSuccess(true);
      setTimeout(() => {
        onSuccess(res);
      }, 1000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to reset password.');
      } else {
        setError('Connection error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Verifying password reset security token...</p>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="space-y-5 animate-in fade-in">
        <div className="flex items-start gap-3 rounded-md border border-error/30 bg-error/10 p-4 text-xs text-foreground">
          <AlertCircle className="h-5 w-5 shrink-0 text-error mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-error text-sm">Link Expired or Invalid</p>
            <p className="text-muted-foreground leading-relaxed">
              {tokenError || 'This password reset link is invalid or has expired. For your security, reset links are single-use and expire in 30 minutes.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRequestNewLink}
          className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
        >
          Request new reset link
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-5 animate-in fade-in text-center py-4">
        <div className="inline-flex p-3 rounded-full bg-success/10 text-success mb-2">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Password Reset Complete</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Your account password has been updated securely. Redirecting you to your dashboard...
        </p>
        <div className="flex justify-center pt-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {userEmail && (
        <div className="rounded-md border border-border bg-surface-high/50 px-3.5 py-2.5 text-xs text-muted-foreground">
          Resetting password for: <span className="font-medium text-foreground">{userEmail}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-foreground">New password</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password (min. 8 characters)"
            required
            autoFocus
            className="w-full rounded-md border border-input bg-surface-high py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground pt-0.5">Must be at least 8 characters</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-foreground">Confirm new password</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <KeyRound className="h-4 w-4" />
          </div>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            className="w-full rounded-md border border-input bg-surface-high py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
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
            Updating password...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Save new password
          </>
        )}
      </button>

      <div className="pt-3 text-center">
        <button
          type="button"
          onClick={onRequestNewLink}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </button>
      </div>
    </form>
  );
};
