"use client";

import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { logoutApi } from '@/services/auth-service';

interface LogoutButtonProps {
  variant?: 'sidebar' | 'topnav' | 'button';
  className?: string;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  variant = 'sidebar',
  className = '',
}) => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout, proceed with client cleanup
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        window.location.href = '/auth';
      }
    }
  };

  if (variant === 'topnav') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-[var(--surface-high)] transition-all duration-200 ${className}`}
        aria-label="Log Out"
        title="Log Out"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-xs font-semibold group ${className}`}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-red-500/20"
        style={{
          background: 'var(--toggle-bg)',
          border: '1px solid var(--toggle-border)',
        }}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
        ) : (
          <LogOut className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-400" />
        )}
      </div>
      <span>Log Out</span>
    </button>
  );
};
