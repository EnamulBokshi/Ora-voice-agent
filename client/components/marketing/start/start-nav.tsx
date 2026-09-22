'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/marketing/theme-toggle';

export function StartNav() {
  return (
    <header className="fs-nav-wrapper">
      <div className="fs-nav-bar">
        {/* Brand Logo */}
        <Link href="/start" className="fs-nav-logo">
          <span className="fs-logo-mark">O</span>
          <span className="fs-logo-text">ORA</span>
        </Link>

        {/* Nav Links */}
        <nav className="fs-nav-links" aria-label="Main Navigation">
          <a href="#features">Features</a>
          <a href="#why-ora">About us</a>
          <a href="#pricing">Pricing</a>
          <a href="#how-it-works">Capabilities</a>
          <a href="#integrations">Integrations</a>
        </nav>

        {/* Action Buttons + Theme Toggle */}
        <div className="fs-nav-actions">
          <ThemeToggle />
          <Link href="/auth" className="fs-btn-dark sm">
            Try it for free
          </Link>
        </div>
      </div>
    </header>
  );
}
