'use client';

import React from 'react';

const ARCHETYPES = [
  {
    role: 'Clinics & Practices',
    commonQuery: 'Do you take new patients? What are your consultation fees?',
    benefit: 'Answers booking rules and schedules appointments 24/7 without receptionist hold times.',
  },
  {
    role: 'Agencies & Studios',
    commonQuery: 'Do you offer monthly retainers or fixed sprints?',
    benefit: 'Qualifies prospective clients and answers capability questions immediately.',
  },
  {
    role: 'Online Shops & Brands',
    commonQuery: 'Is this size in stock, and what is your return policy?',
    benefit: 'Resolves sizing and shipping hesitation before shoppers abandon cart.',
  },
  {
    role: 'Consultancies & Advisory',
    commonQuery: 'Have you worked in our sector, and what is your intake process?',
    benefit: 'Explains methodology, credentials, and books discovery calls.',
  },
];

export function StartArchetypes() {
  return (
    <section className="min-section alt" id="use-cases" aria-labelledby="archetypes-title">
      <div className="lp-container">
        <header className="min-section-head">
          <span className="min-kicker">Multi-Sector Support</span>
          <h2 id="archetypes-title" className="min-section-title">
            Built for your kind of business.
          </h2>
          <p className="min-section-sub">
            ORA adapts its vocabulary and knowledge to match how your industry actually speaks with customers.
          </p>
        </header>

        <div className="min-archetypes-grid">
          {ARCHETYPES.map((a, idx) => (
            <div className="min-arch-card" key={idx}>
              <div className="min-arch-header">
                <span className="min-arch-badge">0{idx + 1}</span>
                <h3 className="min-arch-title">{a.role}</h3>
              </div>
              <div className="min-arch-query">
                <span className="min-arch-label">Typical visitor ask:</span>
                <p className="min-arch-quote">&ldquo;{a.commonQuery}&rdquo;</p>
              </div>
              <p className="min-arch-benefit">{a.benefit}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
