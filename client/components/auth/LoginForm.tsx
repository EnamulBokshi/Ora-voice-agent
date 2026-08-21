"use client";

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { loginApi } from '@/services/auth-service';
import { ApiClientError } from '@/lib/api-client';
import { AuthResponseData } from '@/types/auth';

interface LoginFormProps {
  onSuccess: (data: AuthResponseData) => void;
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await loginApi({ email, password });
      onSuccess(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Invalid email or password.');
      } else {
        setError('Connection to auth server failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-foreground">Email</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full rounded-md border border-input bg-surface-high py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-foreground">Password</label>
          {onSwitchToForgotPassword && (
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </button>
          )}
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
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
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-3"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </button>

      <div className="pt-3 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </button>
      </div>
    </form>
  );
};
