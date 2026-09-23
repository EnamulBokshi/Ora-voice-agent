'use client';

import React from 'react';
import Link from 'next/link';
import { Start2CommandCenter } from './start2-command-center';

export function Start2Hero() {
  return (
    <section className="s2-hero-section">
      <div className="s2-container">
        {/* Hero Header Block (Matched to reference mockup with ORA project typography and color palette) */}
        <div className="s2-hero-heading-wrap text-center">
          <div className="s2-hero-kicker">
            Voice Commerce
          </div>

          <h1 className="s2-hero-title">
            A sales agent that<br />speaks for your store.
          </h1>

          <p className="s2-hero-sub">
            ORA talks to visitors in under 350 ms, answers only from your catalogue and policies, and closes the sale around the clock.
          </p>

          {/* Dual Action Buttons */}
          <div className="s2-hero-cta-row">
            <Link href="/auth" className="s2-hero-btn-primary">
              <span>Start free trial</span>
            </Link>
            <a href="#live-desk-simulation" className="s2-hero-btn-secondary">
              <span>Hear a live call</span>
            </a>
          </div>

          {/* Subtle Hairline Divider */}
          <div className="s2-hero-divider" aria-hidden="true" />

          {/* Clean Rating Proof Line */}
          <div className="s2-hero-reviews">
            <span className="s2-hero-rating-score">4.9 / 5</span>
            <span className="s2-hero-rating-text">
              across 300 Shopify and WooCommerce merchants
            </span>
          </div>
        </div>

        {/* Centerpiece: the Command Center, ported from the design system's
            ora-hero-v2.html. Replaces the previous video-controller frame. */}
        <Start2CommandCenter />

      </div>
    </section>
  );
}
