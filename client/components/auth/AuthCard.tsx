'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthHeader } from './AuthHeader';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { OtpVerificationForm } from './OtpVerificationForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { AuthResponseData, OtpResponseData, User } from '@/types/auth';
import { getMeApi } from '@/services/auth-service';

export const AuthCard: React.FC = () => {
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('from') || '/dashboard';
  const planParam = searchParams.get('plan');
  const modeParam = searchParams.get('mode');
  const tokenParam = searchParams.get('token');
  const codeParam = searchParams.get('code') || searchParams.get('otp');
  const emailParam = searchParams.get('email');

  const getInitialMode = (): 'login' | 'register' | 'otp' | 'forgot-password' | 'reset-password' => {
    if (tokenParam || modeParam === 'reset-password') return 'reset-password';
    if (codeParam || modeParam === 'otp') return 'otp';
    if (modeParam === 'forgot-password') return 'forgot-password';
    if (modeParam === 'login') return 'login';
    return 'register';
  };

  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'forgot-password' | 'reset-password'>(getInitialMode);
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);
  const [registeredEmail, setRegisteredEmail] = useState<string | undefined>(emailParam || undefined);
  const [resetToken, setResetToken] = useState<string>(tokenParam || '');

  useEffect(() => {
    if (tokenParam) {
      setResetToken(tokenParam);
      setMode('reset-password');
    } else if (codeParam || modeParam === 'otp') {
      setMode('otp');
    } else if (modeParam === 'forgot-password') {
      setMode('forgot-password');
    } else if (modeParam === 'login') {
      setMode('login');
    } else if (modeParam === 'register') {
      setMode('register');
    }

    if (emailParam) {
      setRegisteredEmail(emailParam);
    }
  }, [modeParam, tokenParam, codeParam, emailParam]);

  const resolveTargetUrl = (role?: string) => {
    if (role === 'admin' || role === 'super_admin') {
      return redirectTarget.startsWith('/admin') ? redirectTarget : '/admin';
    }
    if (role === 'owner' || role === 'staff') {
      return redirectTarget.startsWith('/admin') ? '/dashboard' : redirectTarget;
    }
    // Unsubscribed 'user' role -> redirect to pricing to select / activate plan
    if (planParam) {
      return `/pricing?plan=${encodeURIComponent(planParam)}`;
    }
    return '/pricing';
  };

  const syncUserCookie = (role?: string) => {
    if (typeof document !== 'undefined' && role) {
      const isProd = process.env.NODE_ENV === 'production';
      document.cookie = `userRole=${role}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
    }
  };

  const handleRegisterSuccess = (data: AuthResponseData) => {
    setSessionToken(data.accessToken);
    setRegisteredEmail(data.user.email);
    if (typeof window !== 'undefined' && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    syncUserCookie(data.user.role);

    if (!data.user.emailVerified) {
      setMode('otp');
    } else {
      window.location.href = resolveTargetUrl(data.user.role);
    }
  };

  const handleLoginSuccess = (data: AuthResponseData) => {
    if (typeof window !== 'undefined' && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    syncUserCookie(data.user.role);
    window.location.href = resolveTargetUrl(data.user.role);
  };

  const handleOtpVerifiedSuccess = async (res?: OtpResponseData & { accessToken?: string; user?: User }) => {
    if (res?.accessToken) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', res.accessToken);
      }
      if (res.user?.role) {
        syncUserCookie(res.user.role);
      }
      window.location.href = resolveTargetUrl(res.user?.role);
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : sessionToken;
      const profile = await getMeApi(token || undefined);
      if (profile?.user?.role) {
        syncUserCookie(profile.user.role);
      }
      window.location.href = resolveTargetUrl(profile?.user?.role);
    } catch {
      window.location.href = resolveTargetUrl();
    }
  };

  return (
    <div className="flex flex-col justify-center w-full min-h-full p-6 sm:p-8 lg:p-10 bg-transparent text-foreground max-w-xl mx-auto">
      {/* Header */}
      <AuthHeader mode={mode} emailForOtp={registeredEmail} />

      {/* Form Views */}
      <div className="w-full">
        {mode === 'login' && (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setMode('register')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
          />
        )}

        {mode === 'register' && (
          <RegisterForm
            onSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}

        {mode === 'otp' && (
          <OtpVerificationForm
            accessToken={sessionToken}
            initialCode={codeParam || ''}
            email={registeredEmail}
            onSuccess={handleOtpVerifiedSuccess}
            onBackToLogin={() => setMode('login')}
          />
        )}

        {mode === 'forgot-password' && (
          <ForgotPasswordForm
            onBackToLogin={() => setMode('login')}
          />
        )}

        {mode === 'reset-password' && (
          <ResetPasswordForm
            token={resetToken}
            onSuccess={() => setMode('login')}
            onRequestNewLink={() => setMode('forgot-password')}
          />
        )}
      </div>
    </div>
  );
};
