"use client";

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { loginApi } from '@/services/auth-service';
import { ApiClientError } from '@/lib/api-client';
import { AuthResponseData } from '@/types/auth';

interface LoginFormProps {
  onSuccess: (data: AuthResponseData) => void;
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
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
      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 backdrop-blur-md animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Email Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#CBD5E1]">
          Email
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
            <Mail className="h-4 w-4" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full rounded-xl border border-[#2A2C3A] bg-[#1A1C29] py-3 pl-10 pr-4 text-sm text-white placeholder-[#64748B] outline-none transition-all duration-200 focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/30 hover:border-[#3A3C4E]"
          />
        </div>
      </div>

      {/* Password Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-[#CBD5E1]">
            Password
          </label>
          <a
            href="#forgot"
            onClick={(e) => {
              e.preventDefault();
              alert('Password reset link will be sent to your registered email.');
            }}
            className="text-xs text-[#2DD4C8] hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
            <Lock className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            className="w-full rounded-xl border border-[#2A2C3A] bg-[#1A1C29] py-3 pl-10 pr-10 text-sm text-white placeholder-[#64748B] outline-none transition-all duration-200 focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/30 hover:border-[#3A3C4E]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[#64748B] hover:text-[#CBD5E1] transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me Checkbox */}
      <div className="flex items-center justify-between text-xs pt-1">
        <label className="flex items-center gap-2 text-[#94A3B8] cursor-pointer select-none">
          <input
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded border-[#2A2C3A] bg-[#1A1C29] text-[#6C5CE7] focus:ring-[#6C5CE7]/40 cursor-pointer"
          />
          Keep session active (7 days)
        </label>
      </div>

      {/* Primary CTA Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#5645C7] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#6C5CE7]/25 backdrop-blur-md transition-all duration-200 hover:from-[#7B6CF6] hover:to-[#6452D8] hover:shadow-[#6C5CE7]/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-3"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            Signing In...
          </span>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Footer Switch Link */}
      <div className="pt-3 text-center text-xs text-[#94A3B8]">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-semibold text-[#6C5CE7] hover:underline"
        >
          Sign Up
        </button>
      </div>
    </form>
  );
};
