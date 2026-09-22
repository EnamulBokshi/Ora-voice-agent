'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function Start2Cta() {
  return (
    <section className="s2-cta-section">
      <div className="s2-container">
        <div className="s2-cta-box text-center">
          <h2 className="s2-cta-title">
            Start selling with voice.
          </h2>
          <p className="s2-cta-sub">
            Deploy ORA on your website in under 2 minutes. Convert after-hours visitors 24/7.
          </p>

          <div className="s2-cta-actions">
            <Link href="/auth" className="s2-btn-primary">
              <span>Start Free Trial</span>
              <ArrowRight size={16} />
            </Link>
            <a href="#live-desk-simulation" className="s2-btn-secondary">
              <span>Watch Live Demo</span>
            </a>
          </div>

          {/* 3 Trust Bullets */}
          <div className="s2-cta-trust-row">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 size={13} className="text-[#16A34A] dark:text-[#C8F031]" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 size={13} className="text-[#16A34A] dark:text-[#C8F031]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 size={13} className="text-[#16A34A] dark:text-[#C8F031]" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
