'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { getMeApi } from '@/services/auth-service';
import { User } from '@/types/auth';

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        getMeApi(token)
          .then((data) => {
            if (data?.user) {
              setIsLoggedIn(true);
              setUser(data.user);
            } else {
              setIsLoggedIn(false);
              setUser(null);
            }
          })
          .catch(() => {
            setIsLoggedIn(false);
            setUser(null);
          });
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    }

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getCtaLink = () => {
    if (!isLoggedIn || !user) return '/auth';
    if (user.role === 'admin' || user.role === 'super_admin') return '/admin';
    if (user.role === 'owner' || user.role === 'staff') return '/dashboard';
    if (user.role === 'user') return '/pricing';
    return '/auth';
  };

  const getCtaLabel = () => {
    if (!isLoggedIn || !user) return 'Get Started';
    if (user.role === 'admin' || user.role === 'super_admin') return 'Admin Portal';
    if (user.role === 'owner' || user.role === 'staff') return 'Dashboard';
    if (user.role === 'user') return 'Choose Plan';
    return 'Get Started';
  };

  return (
    <header className={`lp-navbar${scrolled ? ' scrolled' : ''}`} role="banner">
      <div className="lp-nav-inner">
        {/* Logo */}
        <Link href="/" className="lp-logo" aria-label="ORA — Home">
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

        {/* CTA & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />

          {/* Primary CTA (Dashboard when logged in / Get Started when logged out) */}
          <Link
            href={getCtaLink()}
            className="lp-btn-primary lp-nav-cta"
            id="nav-get-started-cta"
          >
            {getCtaLabel()}
          </Link>
        </div>
      </div>
    </header>
  );
}


