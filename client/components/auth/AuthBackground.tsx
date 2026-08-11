import React from 'react';
import { AuthHeroSection } from './AuthHeroSection';

export const AuthBackground: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="relative min-h-screen w-full bg-[#0D0E15] text-[#EDEEF4] font-sans flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-[#6C5CE7]/30 selection:text-[#2DD4C8] overflow-x-hidden">
      {/* Background Radial Dotted Grid Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#2A2C3A_1.2px,transparent_1.2px)] [background-size:20px_20px] opacity-40" />

      {/* Dynamic Ambient Background Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#6C5CE7]/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-[#2DD4C8]/10 blur-[150px]" />

      {/* Floating Centered Glass Container */}
      <div className="relative z-10 w-full max-w-6xl rounded-3xl backdrop-blur-2xl bg-[#161722]/90 border border-[#2A2C3A]/80 shadow-[0_25px_70px_rgba(0,0,0,0.65)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] w-full">
          {/* Left Hero Column (7 columns on desktop) */}
          <div className="lg:col-span-7 hidden lg:block border-r border-[#2A2C3A]/60">
            <AuthHeroSection />
          </div>

          {/* Right Form Column (5 columns on desktop) */}
          <div className="lg:col-span-5 flex items-center justify-center w-full bg-[#12121A]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
