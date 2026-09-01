import React from 'react';

interface AuthHeaderProps {
  mode: 'login' | 'register' | 'otp' | 'forgot-password' | 'reset-password';
  emailForOtp?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ mode, emailForOtp }) => {
  return (
    <div className="mb-6">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        {mode === 'login' && 'Welcome back'}
        {mode === 'register' && 'Get started'}
        {mode === 'otp' && 'Verification'}
        {mode === 'forgot-password' && 'Password recovery'}
        {mode === 'reset-password' && 'Secure reset'}
      </span>

      <h2 className="text-2xl font-semibold text-foreground mt-1 mb-2 tracking-tight">
        {mode === 'login' && 'Sign in to your account'}
        {mode === 'register' && 'Create your account'}
        {mode === 'otp' && 'Verify your email'}
        {mode === 'forgot-password' && 'Reset your password'}
        {mode === 'reset-password' && 'Set a new password'}
      </h2>

      <p className="text-sm text-muted-foreground">
        {mode === 'login' && 'Enter your credentials to access your merchant workspace.'}
        {mode === 'register' && 'Provision your store AI engine and start engaging shoppers.'}
        {mode === 'otp' && (
          <>
            We sent a 6-digit verification code to{' '}
            <span className="text-primary font-medium">{emailForOtp || 'your email'}</span>.
          </>
        )}
        {mode === 'forgot-password' &&
          'Enter the email address associated with your account and we’ll send you a password reset link.'}
        {mode === 'reset-password' &&
          'Create a strong new password with at least 8 characters to secure your account.'}
      </p>
    </div>
  );
};
