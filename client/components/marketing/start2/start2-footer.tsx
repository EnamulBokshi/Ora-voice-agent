'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

export function Start2Footer() {
  const { isAuthenticated, role } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthed = mounted && isAuthenticated;

  const accountLinks = isAuthed
    ? [
        {
          label: role === 'admin' || role === 'super_admin' ? 'Admin Console' : 'Dashboard',
          href: role === 'admin' || role === 'super_admin' ? '/admin' : '/dashboard',
        },
        { label: 'Subscription & Pricing', href: '/pricing' },
      ]
    : [
        { label: 'Sign in', href: '/auth' },
        { label: 'Start free', href: '/auth' },
      ];

  const columns = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '/#features' },
        { label: 'How it works', href: '/#how-it-works' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Docs', href: '/docs' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '/docs' },
        { label: 'Quickstart', href: '/docs#quickstart' },
        { label: 'Shopify setup', href: '/docs#shopify-setup' },
        { label: 'Solutions', href: '/solutions' },
      ],
    },
    {
      title: 'Account',
      links: accountLinks,
    },
  ];

  return (
    <footer className="s2-ft">
      <div className="s2-ft-inner">
        <div className="s2-ft-top">
          <div className="s2-ft-brand">
            <Link href="/" className="s2-nav-logo">
              <span className="s2-logo-mark">O</span>
              <span className="s2-logo-text">ORA</span>
            </Link>
            <p className="s2-ft-desc">
              A voice sales agent for your business. Answers shoppers and closes sales, day and night.
            </p>
          </div>

          <nav className="s2-ft-cols" aria-label="Footer">
            {columns.map((col) => (
              <div key={col.title} className="s2-ft-col">
                <h2 className="s2-ft-title">{col.title}</h2>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="s2-ft-link">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="s2-ft-bottom">
          <span>&copy; {new Date().getFullYear()} ORA Technologies Inc.</span>
          <a href="#main-content" className="s2-ft-link">
            Back to top &uarr;
          </a>
        </div>
      </div>
    </footer>
  );
}
