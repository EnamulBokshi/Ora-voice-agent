"use client";

import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { registerApi } from '@/services/auth-service';
import { ApiClientError } from '@/lib/api-client';
import { AuthResponseData } from '@/types/auth';

interface RegisterFormProps {
  onSuccess: (data: AuthResponseData) => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to all Terms & Conditions.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await registerApi({
        businessName: `${name}'s Store`,
        name,
        email,
        password,
      });
      onSuccess(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || 'Failed to create merchant account.');
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

      {/* Name Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#CBD5E1]">
          Name
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
            <User className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
            className="w-full rounded-xl border border-[#2A2C3A] bg-[#1A1C29] py-3 pl-10 pr-4 text-sm text-white placeholder-[#64748B] outline-none transition-all duration-200 focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/30 hover:border-[#3A3C4E]"
          />
        </div>
      </div>

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
        <label className="block text-xs font-semibold text-[#CBD5E1]">
          Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#64748B]">
            <Lock className="h-4 w-4" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password"
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
        <p className="text-[11px] text-[#64748B] pt-0.5">
          Must be at least 8 characters
        </p>
      </div>

      {/* Terms Checkbox */}
      <div className="flex items-center gap-2 pt-1 text-xs text-[#94A3B8]">
        <input
          type="checkbox"
          id="terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="h-4 w-4 rounded border-[#2A2C3A] bg-[#1A1C29] text-[#6C5CE7] focus:ring-[#6C5CE7]/40 cursor-pointer"
        />
        <label htmlFor="terms" className="cursor-pointer select-none">
          I agree to all <span className="font-semibold text-white hover:underline">Terms & Conditions</span>
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
            Creating Account...
          </span>
        ) : (
          'Sign Up'
        )}
      </button>

      {/* Footer Switch Link */}
      <div className="pt-3 text-center text-xs text-[#94A3B8]">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-[#6C5CE7] hover:underline"
        >
          Sign In
        </button>
      </div>
    </form>
  );
};
