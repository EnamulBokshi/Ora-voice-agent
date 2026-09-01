import React from 'react';
import { AuthHeroSection } from './AuthHeroSection';

export const AuthBackground: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="relative min-h-screen w-full bg-background text-foreground font-sans flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-x-hidden">
      {/* Centered Brand Container */}
      <div className="relative z-10 w-full max-w-6xl rounded-lg border border-border bg-surface-container shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] w-full">
          {/* Left Hero Column (7 columns on desktop) */}
          <div className="lg:col-span-7 hidden lg:block border-r border-border">
            <AuthHeroSection />
          </div>

          {/* Right Form Column (5 columns on desktop) */}
          <div className="lg:col-span-5 flex items-center justify-center w-full bg-surface-low">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
