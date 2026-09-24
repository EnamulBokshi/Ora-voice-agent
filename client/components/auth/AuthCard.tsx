'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthHeader } from './AuthHeader';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { OtpVerificationForm } from './OtpVerificationForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { AuthResponseData, OtpResponseData, ResetPasswordResponseData, User } from '@/types/auth';
import { getMeApi } from '@/services/auth-service';
import { useAuth } from '@/context/auth-context';

export const AuthCard: React.FC = () => {
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('from') || '/dashboard';
  const planParam = searchParams.get('plan');
  const modeParam = searchParams.get('mode');
  const tokenParam = searchParams.get('token');
  const codeParam = searchParams.get('code') || searchParams.get('otp');
  const emailParam = searchParams.get('email');

  const { login: authLogin, isAuthenticated, user, isLoading: authLoading } = useAuth();

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

  // If already authenticated and not trying to reset password, redirect to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && mode === 'login' && !tokenParam) {
      window.location.href = resolveTargetUrl(user.role);
    }
  }, [authLoading, isAuthenticated, user, mode, tokenParam]);

  const syncUserCookie = (role?: string) => {
    if (typeof document !== 'undefined' && role) {
      const isProd = process.env.NODE_ENV === 'production';
      document.cookie = `userRole=${role}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
    }
  };

  const handleRegisterSuccess = (data: AuthResponseData) => {
    setSessionToken(data.accessToken);
    setRegisteredEmail(data.user.email);
    if (data.accessToken) {
      authLogin({ accessToken: data.accessToken, user: data.user, business: data.business });
    }

    if (!data.user.emailVerified) {
      setMode('otp');
    } else {
      window.location.href = resolveTargetUrl(data.user.role);
    }
  };

  const handleLoginSuccess = (data: AuthResponseData) => {
    authLogin({ accessToken: data.accessToken, user: data.user, business: data.business });
    window.location.href = resolveTargetUrl(data.user.role);
  };

  const handleOtpVerifiedSuccess = async (res?: OtpResponseData & { accessToken?: string; user?: User }) => {
    if (res?.accessToken && res.user) {
      authLogin({ accessToken: res.accessToken, user: res.user });
      window.location.href = resolveTargetUrl(res.user.role);
      return;
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : sessionToken;
      const profile = await getMeApi(token || undefined);
      if (profile?.user) {
        authLogin({ accessToken: token || '', user: profile.user, business: profile.business });
        window.location.href = resolveTargetUrl(profile.user.role);
        return;
      }
      window.location.href = resolveTargetUrl();
    } catch {
      window.location.href = resolveTargetUrl();
    }
  };

  const handleResetPasswordSuccess = (data?: ResetPasswordResponseData) => {
    if (data?.accessToken && data?.user) {
      authLogin({ accessToken: data.accessToken, user: data.user, business: data.business });
      window.location.href = resolveTargetUrl(data.user.role);
    } else {
      setMode('login');
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
            onSuccess={handleResetPasswordSuccess}
            onRequestNewLink={() => setMode('forgot-password')}
          />
        )}
      </div>
    </div>
  );
};
