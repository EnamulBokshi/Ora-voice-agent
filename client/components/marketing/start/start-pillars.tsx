'use client';

import React from 'react';

const PILLARS = [
  {
    num: '01',
    title: 'Train by talking',
    description:
      'Point ORA to your website or speak your answers out loud. It extracts your hours, services, pricing, and policies in minutes.',
    quiet: 'No forms, no manual spreadsheets, no documents to upload.',
  },
  {
    num: '02',
    title: 'Sub-350ms voice speed',
    description:
      'Visitors speak and ORA answers immediately. Fast enough to interrupt and be interrupted, exactly like a natural phone call.',
    quiet: 'Replaces silent contact forms with real-time conversations.',
  },
  {
    num: '03',
    title: 'Strictly grounded',
    description:
      'Answers are drawn exclusively from your business material. ORA never invents a price, promises an unavailable slot, or guesses a policy.',
    quiet: 'Deterministic guardrails with zero hallucinations.',
  },
];

export function StartPillars() {
  return (
    <section className="min-section" id="capabilities" aria-labelledby="pillars-title">
      <div className="lp-container">
        <header className="min-section-head">
          <span className="min-kicker">Core Principles</span>
          <h2 id="pillars-title" className="min-section-title">
            Three things that make it work.
          </h2>
        </header>

        <div className="min-pillars-grid">
          {PILLARS.map((p) => (
            <div className="min-pillar-card" key={p.num}>
              <div className="min-pillar-num">{p.num}</div>
              <h3 className="min-pillar-title">{p.title}</h3>
              <p className="min-pillar-desc">{p.description}</p>
              <p className="min-pillar-quiet">{p.quiet}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
