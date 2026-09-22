'use client';

import React from 'react';
import Link from 'next/link';

export function StartCtaBanner() {
  return (
    <section className="fs-cta-section">
      <div className="fs-container">
        <div className="fs-cta-card">
          <h2 className="fs-cta-headline">
            Supercharge Your Website &mdash; <br />
            Try ORA Now
          </h2>

          <div className="fs-cta-btn-row">
            <Link href="/auth" className="fs-cta-btn-lime">
              Start 14-Day Free Trial
            </Link>
            <a href="#demo-preview" className="fs-cta-btn-ghost">
              Hear live audio demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
