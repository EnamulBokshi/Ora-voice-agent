'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function StartCta() {
  return (
    <section className="min-cta-section" aria-labelledby="cta-title">
      <div className="lp-container">
        <div className="min-cta-box">
          <span className="min-kicker lime">Ready in Minutes</span>
          <h2 id="cta-title" className="min-cta-title">
            Stop letting after-hours visitors leave <br className="hidden sm:inline" />
            with unanswered questions.
          </h2>
          <p className="min-cta-sub">
            Deploy your real-time voice agent today. 14 days free, no credit card required.
          </p>

          <div className="min-cta-action">
            <Link href="/auth" className="min-btn-primary large" id="start-footer-cta">
              <span>Start 14-Day Free Trial</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <p className="min-cta-perks">
            1-line script installation &middot; Zero model training needed &middot; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
