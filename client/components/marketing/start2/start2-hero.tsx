'use client';

import React from 'react';
import { Start2CommandCenter } from './start2-command-center';

export function Start2Hero() {
  return (
    <section className="s2-hero-section">
      <div className="s2-container">
        {/* Hero Header Block (Matched to reference mockup with ORA project typography and color palette) */}
        <div className="s2-hero-heading-wrap text-center">
          <div className="s2-hero-kicker">
            {/* Voice Commerce */}
          </div>

          <h1 className="s2-hero-title">
            A sales agent that<br />speaks for your business.
          </h1>

          <p className="s2-hero-sub">
            Fast, smart answers for every visitor. ORA knows your products and policies, and closes sales for you 24/7.
          </p>
        </div>

        {/* Centerpiece: the Command Center, ported from the design system's
            ora-hero-v2.html. Replaces the previous video-controller frame. */}
        <Start2CommandCenter />

      </div>
    </section>
  );
}
