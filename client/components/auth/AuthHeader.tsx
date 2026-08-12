import React from 'react';

interface AuthHeaderProps {
  mode: 'login' | 'register' | 'otp';
  emailForOtp?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ mode, emailForOtp }) => {
  return (
    <div className="mb-6">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        {mode === 'login' && 'Welcome back'}
        {mode === 'register' && 'Get started'}
        {mode === 'otp' && 'Verification'}
      </span>

      <h2 className="text-2xl font-semibold text-foreground mt-1 mb-2 tracking-tight">
        {mode === 'login' && 'Sign in to your account'}
        {mode === 'register' && 'Create your account'}
        {mode === 'otp' && 'Verify your email'}
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
      </p>
    </div>
  );
};
