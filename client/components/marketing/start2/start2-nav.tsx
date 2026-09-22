'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/marketing/theme-toggle';

export function Start2Nav() {
  return (
    <header className="s2-nav-wrapper">
      <div className="s2-container">
        <div className="s2-nav-bar">
          {/* Brand Logo */}
          <Link href="/start2" className="s2-nav-logo">
            <span className="s2-logo-mark">O</span>
            <span className="s2-logo-text">ORA</span>
          </Link>

          {/* Navigation Links */}
          <nav className="s2-nav-links" aria-label="Main Navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#capabilities">Integrations</a>
          </nav>

          {/* Nav Actions */}
          <div className="s2-nav-actions">
            <ThemeToggle />
            <Link href="/auth" className="s2-nav-link-signin">
              Sign In
            </Link>
            <Link href="/auth" className="s2-btn-primary sm">
              <span>Start Free</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
