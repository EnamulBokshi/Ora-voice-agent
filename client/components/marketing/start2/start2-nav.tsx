'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  LayoutDashboard,
  Shield,
  CreditCard,
  LogOut,
  Loader2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/marketing/theme-toggle';
import { useAuth } from '@/context/auth-context';

export function Start2Nav() {
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setDropdownOpen(false);
    } catch {
      // Handled in auth context
    } finally {
      setLoggingOut(false);
    }
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.name) {
      const parts = user.name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0][0].toUpperCase();
    }
    if (user.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const getRoleLabel = () => {
    if (!role) return '';
    switch (role) {
      case 'owner':
        return 'Store Owner';
      case 'admin':
        return 'Admin';
      case 'super_admin':
        return 'Super Admin';
      case 'staff':
        return 'Staff Member';
      case 'user':
        return 'Free User';
      default:
        return role;
    }
  };

  return (
    <header className="s2-nav-wrapper">
      <div className="s2-container">
        <div className="s2-nav-bar">
          {/* Brand Logo */}
          <Link href="/" className="s2-nav-logo">
            <span className="s2-logo-mark">O</span>
            <span className="s2-logo-text">ORA</span>
          </Link>

          {/* Navigation Links */}
          <nav className="s2-nav-links" aria-label="Main Navigation">
            <Link href="/#features">Features</Link>
            <Link href="/#how-it-works">How It Works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/docs">Docs</Link>
          </nav>

          {/* Nav Actions */}
          <div className="s2-nav-actions">
            <ThemeToggle />

            {/* While determining auth state, render placeholder to avoid layout shift */}
            {isLoading ? (
              <div className="s2-nav-skeleton" />
            ) : isAuthenticated && user ? (
              /* User Profile Menu */
              <div className="s2-user-menu-wrapper" ref={dropdownRef}>
                  <button
                    type="button"
                    className="s2-user-trigger-btn"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-expanded={dropdownOpen}
                    aria-label="User account menu"
                  >
                    <div className="s2-user-avatar">{getUserInitials()}</div>
                    <span className="s2-user-name hidden sm:inline">
                      {user.name || user.email.split('@')[0]}
                    </span>
                    <ChevronDown
                      size={14}
                      style={{
                        color: 'var(--s2-text-secondary)',
                        transition: 'transform 0.15s ease',
                        transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                      }}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="s2-user-dropdown" role="menu">
                      <div className="s2-user-info-section">
                        <div className="s2-user-info-name">
                          {user.name || 'Merchant Account'}
                        </div>
                        <div className="s2-user-info-email" title={user.email}>
                          {user.email}
                        </div>
                        <span className={`s2-user-role-badge ${role || ''}`}>
                          {getRoleLabel()}
                        </span>
                      </div>

                      <ul className="s2-user-menu-list">
                        {(role === 'owner' || role === 'staff') && (
                          <li>
                            <Link
                              href="/dashboard"
                              className="s2-user-menu-item"
                              onClick={() => setDropdownOpen(false)}
                            >
                              <LayoutDashboard size={15} />
                              <span>Store Dashboard</span>
                            </Link>
                          </li>
                        )}
                        {(role === 'admin' || role === 'super_admin') && (
                          <li>
                            <Link
                              href="/admin"
                              className="s2-user-menu-item"
                              onClick={() => setDropdownOpen(false)}
                            >
                              <Shield size={15} />
                              <span>Admin Console</span>
                            </Link>
                          </li>
                        )}
                        <li>
                          <Link
                            href="/pricing"
                            className="s2-user-menu-item"
                            onClick={() => setDropdownOpen(false)}
                          >
                            <CreditCard size={15} />
                            <span>
                              {role === 'user'
                                ? 'Select Plan'
                                : 'Subscription & Pricing'}
                            </span>
                          </Link>
                        </li>
                        <li
                          style={{
                            borderTop: '1px solid var(--s2-border)',
                            marginTop: '0.35rem',
                            paddingTop: '0.35rem',
                          }}
                        >
                          <button
                            type="button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="s2-user-menu-item danger"
                          >
                            {loggingOut ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <LogOut size={15} />
                            )}
                            <span>
                              {loggingOut ? 'Logging out...' : 'Log Out'}
                            </span>
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
            ) : (
              <>
                <Link href="/auth" className="s2-nav-link-signin">
                  Sign In
                </Link>
                <Link href="/auth" className="s2-btn-primary sm">
                  <span>Start Free</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
