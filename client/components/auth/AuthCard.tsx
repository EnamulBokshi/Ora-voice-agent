"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthHeader } from './AuthHeader';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { OtpVerificationForm } from './OtpVerificationForm';
import { AuthResponseData } from '@/types/auth';

export const AuthCard: React.FC = () => {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>('register');
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);
  const [registeredEmail, setRegisteredEmail] = useState<string | undefined>(undefined);

  const handleRegisterSuccess = (data: AuthResponseData) => {
    setSessionToken(data.accessToken);
    setRegisteredEmail(data.user.email);
    if (typeof window !== 'undefined' && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }

    if (!data.user.emailVerified) {
      setMode('otp');
    } else {
      window.location.href = '/sales';
    }
  };

  const handleLoginSuccess = (data: AuthResponseData) => {
    if (typeof window !== 'undefined' && data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    window.location.href = '/sales';
  };

  const handleOtpVerifiedSuccess = () => {
    window.location.href = '/sales';
  };


  return (
    <div className="flex flex-col justify-center w-full min-h-full p-6 sm:p-8 lg:p-10 bg-[#12121A] text-white max-w-xl mx-auto">
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
