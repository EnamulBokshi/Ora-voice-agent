'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

export function CtaSection() {
  const { isAuthenticated, role } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthed = mounted && isAuthenticated;

  const ctaHref = isAuthed
    ? role === 'admin' || role === 'super_admin'
      ? '/admin'
      : role === 'user'
      ? '/pricing'
      : '/dashboard'
    : '/auth';

  const ctaLabel = isAuthed
    ? role === 'admin' || role === 'super_admin'
      ? 'Open Admin Console'
      : role === 'user'
      ? 'Select a Plan'
      : 'Go to Dashboard'
    : 'Get Started Free';

  return (
    <section
      id="cta"
      aria-labelledby="cta-headline"
      style={{ paddingTop: '2rem', paddingBottom: '6rem' }}
    >
      <div className="lp-container">
        <div
          className="lp-dark-section"
          style={{
            padding: 'clamp(4rem, 7vw, 7rem) clamp(2rem, 5vw, 4rem)',
            textAlign: 'center',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '40rem', margin: '0 auto' }}>
            <h2
              id="cta-headline"
              className="lp-display"
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                color: 'var(--lp-text-on-dark)',
                marginBottom: '1.25rem',
                lineHeight: 1.15,
              }}
            >
              Stop losing sales<br />
              Start recovering revenue
            </h2>

            <Link
              href={ctaHref}
              className="lp-btn-lime"
              id="cta-get-started-btn"
              style={{ fontSize: '1.0625rem' }}
            >
              {ctaLabel}
            </Link>

            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.8125rem',
                color: 'var(--lp-text-on-dark-dim)',
                opacity: 0.6,
              }}
            >
              {isAuthed
                ? 'Your AI sales engine is active and ready'
                : 'No credit card required'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
