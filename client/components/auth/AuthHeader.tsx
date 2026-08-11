import React from 'react';

interface AuthHeaderProps {
  mode: 'login' | 'register' | 'otp';
  emailForOtp?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ mode, emailForOtp }) => {
  return (
    <div className="mb-6">
      {/* Small uppercase kicker */}
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#6C5CE7]">
        {mode === 'login' && 'WELCOME BACK'}
        {mode === 'register' && 'GET STARTED'}
        {mode === 'otp' && 'VERIFICATION'}
      </span>

      {/* Bold main title */}
      <h2 className="text-3xl font-extrabold text-white mt-1 mb-2 tracking-tight font-heading">
        {mode === 'login' && 'Sign in to your account'}
        {mode === 'register' && 'Create your account'}
        {mode === 'otp' && 'Verify recipient email'}
      </h2>

      {/* Subtitle */}
      <p className="text-sm text-[#94A3B8]">
        {mode === 'login' && 'Enter your credentials to access your merchant workspace.'}
        {mode === 'register' && 'Provision your store AI engine and start engaging shoppers.'}
        {mode === 'otp' && (
          <>
            We sent a 6-digit verification code to{' '}
            <span className="text-[#2DD4C8] font-semibold">{emailForOtp || 'your email'}</span>.
          </>
        )}
      </p>
    </div>
  );
};
