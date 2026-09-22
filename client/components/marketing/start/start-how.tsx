'use client';

import React from 'react';

const STEPS = [
  {
    step: 'Step 01',
    title: 'Connect your website',
    text: 'Enter your domain or add one line of JavaScript to your header. ORA reads your public pages automatically.',
  },
  {
    step: 'Step 02',
    title: 'Review what it knows',
    text: 'Check extracted services, pricing, and policies in your clean dashboard. Adjust rules with one click.',
  },
  {
    step: 'Step 03',
    title: 'Go live in voice',
    text: 'Turn the switch on. ORA answers visitor questions out loud with sub-350ms turnaround, 24 hours a day.',
  },
];

export function StartHow() {
  return (
    <section className="min-section" id="how-it-works" aria-labelledby="how-title">
      <div className="lp-container">
        <header className="min-section-head">
          <span className="min-kicker">Simple Setup</span>
          <h2 id="how-title" className="min-section-title">
            Up and running in three steps.
          </h2>
        </header>

        <div className="min-steps-row">
          {STEPS.map((s, idx) => (
            <div className="min-step-col" key={idx}>
              <span className="min-step-kicker">{s.step}</span>
              <h3 className="min-step-title">{s.title}</h3>
              <p className="min-step-text">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
