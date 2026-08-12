"use client";

import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { logoutApi } from '@/services/auth-service';

interface LogoutButtonProps {
  variant?: 'sidebar' | 'topnav' | 'button' | 'icon';
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

  if (variant === 'topnav' || variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={`w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors ${className}`}
        aria-label="Log Out"
        title="Log Out"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-surface-lowest text-muted-foreground hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors ${className}`}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
        ) : (
          <LogOut className="h-3.5 w-3.5" />
        )}
        <span>Log Out</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium group ${className}`}
    >
      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0">
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

