'use client';

import React from 'react';
import Link from 'next/link';

export function StartStepsBanner() {
  return (
    <section className="fs-steps-section" id="how-it-works">
      <div className="fs-container">
        <div className="fs-steps-banner">
          {/* Left Column: Heading & Buttons */}
          <div className="fs-steps-left">
            <span className="fs-pill-badge">How ORA Works</span>
            <h2 className="fs-steps-title">
              Automate in 3 Steps!
            </h2>
            <p className="fs-steps-desc">
              ORA makes voice automation effortless, allowing you to deploy an intelligent agent 
              without coding. Here is how it works:
            </p>

            <div className="fs-steps-actions">
              <Link href="/auth" className="fs-btn-dark">
                Get Started
              </Link>
              <a href="#features" className="fs-btn-ghost">
                Learn more
              </a>
            </div>
          </div>

          {/* Right Column: 3 Stacked Step Cards */}
          <div className="fs-steps-right">
            {/* Step 1 */}
            <div className="fs-step-card">
              <span className="fs-step-tag">Step 1</span>
              <h3 className="fs-step-heading">Connect your website</h3>
              <p className="fs-step-body">
                Enter your domain URL or add one line of JavaScript embed code to your site header.
              </p>
            </div>

            {/* Step 2 */}
            <div className="fs-step-card">
              <span className="fs-step-tag lime">Step 2</span>
              <h3 className="fs-step-heading">Digest knowledge &amp; tune tone</h3>
              <p className="fs-step-body">
                ORA automatically crawls your public pages, FAQs, hours, and services in 60 seconds.
              </p>
            </div>

            {/* Step 3 */}
            <div className="fs-step-card">
              <span className="fs-step-tag">Step 3</span>
              <h3 className="fs-step-heading">Activate &amp; answer in real time</h3>
              <p className="fs-step-body">
                Your agent answers out loud with sub-350ms voice turnaround, capturing leads 24/7.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
