'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthHeader } from './AuthHeader';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { OtpVerificationForm } from './OtpVerificationForm';
import { AuthResponseData } from '@/types/auth';
import { getMeApi } from '@/services/auth-service';

export const AuthCard: React.FC = () => {
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('from') || '/dashboard';

  const [mode, setMode] = useState<'login' | 'register' | 'otp'>('register');
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);
  const [registeredEmail, setRegisteredEmail] = useState<string | undefined>(undefined);

  const resolveTargetUrl = (role?: string) => {
    if (role === 'admin' || role === 'super_admin') {
      return redirectTarget.startsWith('/admin') ? redirectTarget : '/admin';
    }
    if (role === 'owner' || role === 'staff') {
      return redirectTarget.startsWith('/admin') ? '/dashboard' : redirectTarget;
    }
    // 'user' role cannot access admin or dashboard -> redirect to /pricing
    return '/pricing';
  };

  const handleRegisterSuccess = (data: AuthResponseData) => {
    setSessionToken(data.accessToken);
    setRegisteredEmail(data.user.email);
    if (typeof window !== 'undefined' && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }

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
    window.location.href = resolveTargetUrl(data.user.role);
  };

  const handleOtpVerifiedSuccess = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : sessionToken;
      const profile = await getMeApi(token || undefined);
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
            onSuccess={handleOtpVerifiedSuccess}
            onBackToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
};
