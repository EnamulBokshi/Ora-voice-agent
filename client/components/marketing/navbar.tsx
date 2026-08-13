'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
            <li><Link href="#features">Features</Link></li>
            <li><Link href="#solutions">Solutions</Link></li>
            <li><Link href="#pricing">Pricing</Link></li>
            <li><Link href="#docs">Docs</Link></li>
          </ul>
        </nav>

        {/* CTA */}
        <Link href="/auth" className="lp-btn-primary lp-nav-cta" id="nav-get-started-cta">
          Get Started
        </Link>
      </div>
    </header>
  );
}
