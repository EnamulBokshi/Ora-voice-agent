'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  LayoutDashboard,
  Shield,
  CreditCard,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/context/auth-context';
import { User } from '@/types/auth';

export function MarketingNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated: isLoggedIn, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click or ESC
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
      window.location.href = '/auth';
    } catch {
      // Ignore network errors during logout
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
    if (!user) return '';
    switch (user.role) {
      case 'owner':
        return 'Store Owner';
      case 'admin':
        return 'Admin';
      case 'super_admin':
        return 'Super Admin';
      case 'staff':
        return 'Staff Member';
      case 'user':
        return 'Subscription Required';
      default:
        return user.role;
    }
  };

  return (
    <header className={`lp-navbar${scrolled ? ' scrolled' : ''}`} role="banner">
      <div className="lp-nav-inner">
        {/* Logo */}
        <Link href="/" className="lp-logo" aria-label="ORA Home">
          <div className="lp-logo-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14l-4-6h3V6h2v4h3l-4 6z"
                fill="currentColor"
              />
            </svg>
          </div>
          ORA
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation">
          <ul className="lp-nav-links">
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/#solutions">Solutions</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/docs">Docs</Link></li>
          </ul>
        </nav>

        {/* CTA, Theme Toggle & Profile Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />

          {/* Primary CTA (shown only when logged out) */}
          {(!mounted || !isLoggedIn) && (
            <Link
              href="/auth"
              className="lp-btn-primary lp-nav-cta"
              id="nav-get-started-cta"
            >
              Get Started
            </Link>
          )}

          {/* Profile Dropdown (when logged in) */}
          {mounted && isLoggedIn && user && (
            <div className="lp-user-menu-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="lp-user-trigger-btn"
                onClick={() => setDropdownOpen((prev) => !prev)}
                aria-expanded={dropdownOpen}
                aria-label="User profile and account menu"
                id="navbar-user-profile-trigger"
              >
                <div className="lp-user-avatar">
                  {getUserInitials()}
                </div>
                <span className="lp-user-trigger-name hidden md:inline">
                  {user.name || user.email.split('@')[0]}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--lp-text-secondary)',
                    transition: 'transform 0.15s ease',
                    transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>

              {/* Dropdown Card */}
              {dropdownOpen && (
                <div className="lp-user-dropdown-card" role="menu">
                  {/* User info */}
                  <div className="lp-user-info-section">
                    <div className="lp-user-info-name">
                      {user.name || 'Merchant Account'}
                    </div>
                    <div className="lp-user-info-email" title={user.email}>
                      {user.email}
                    </div>
                    <span
                      className={`lp-user-role-badge ${
                        user.role === 'owner' ? 'owner' : user.role.includes('admin') ? 'admin' : ''
                      }`}
                    >
                      {getRoleLabel()}
                    </span>
                  </div>

                  {/* Navigation items */}
                  <ul className="lp-user-menu-list">
                    {/* Store Dashboard link for owner/staff */}
                    {(user.role === 'owner' || user.role === 'staff') && (
                      <li>
                        <Link
                          href="/dashboard"
                          className="lp-user-menu-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <LayoutDashboard size={16} />
                          <span>Store Dashboard</span>
                        </Link>
                      </li>
                    )}

                    {/* Admin Portal link for admin/super_admin */}
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                      <li>
                        <Link
                          href="/admin"
                          className="lp-user-menu-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Shield size={16} />
                          <span>Admin Console</span>
                        </Link>
                      </li>
                    )}

                    {/* Pricing link */}
                    <li>
                      <Link
                        href="/pricing"
                        className="lp-user-menu-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <CreditCard size={16} />
                        <span>{user.role === 'user' ? 'Select Plan' : 'Subscription & Pricing'}</span>
                      </Link>
                    </li>

                    {/* Divider & Logout */}
                    <li style={{ borderTop: '1px solid var(--lp-border-light)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="lp-user-menu-item danger"
                      >
                        {loggingOut ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <LogOut size={16} />
                        )}
                        <span>{loggingOut ? 'Logging out...' : 'Log Out'}</span>
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

