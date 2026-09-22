'use client';

import React from 'react';
import { Sparkles, Star, Quote, TrendingUp, CheckCircle2 } from 'lucide-react';

export function StartTestimonials() {
  const testimonials = [
    {
      metric: '+$18,400 / mo',
      metricLabel: 'Net Recovered Sales',
      kpi: '+42% Midnight Conversion',
      quote: "Shoppers buying premium knitwear at 1 AM used to drop off because sizing guides are confusing on mobile. ORA intercepts their hesitation with voice, checks chest measurements live, and drops the right size into their bag. It is like having my best retail salesperson working while I sleep.",
      name: 'Marcus Vance',
      role: 'VP of E-Commerce',
      company: 'Vance London',
      platform: 'Shopify Plus',
      avatar: 'MV',
    },
    {
      metric: '+31.4%',
      metricLabel: 'Checkout Rescues',
      kpi: 'Sub-320ms Latency',
      quote: "When customers spend $300 on audiophile headphones, they have technical questions about impedance, DAC pairing, and warranty. ORA has never hallucinated a specification. The sub-350ms response speed makes shoppers feel like they are on a real phone call with an audio expert.",
      name: 'Elena Rostova',
      role: 'Founder & Head of Product',
      company: 'Sonus Gear',
      platform: 'WooCommerce',
      avatar: 'ER',
    },
    {
      metric: '2.4x Higher',
      metricLabel: 'Mobile Cart Conversion',
      kpi: 'Bilingual Bangla & English',
      quote: "In our regional market, shoppers constantly switch between Bangla and English while checking out with bKash. ORA understands both languages fluently without missing a beat. It has completely eliminated our need for an expensive overnight customer service shift.",
      name: 'Tariq Ahmed',
      role: 'Co-Founder & COO',
      company: 'Bengal Craftworks',
      platform: 'Headless + bKash',
      avatar: 'TA',
    },
  ];

  return (
    <section className="start-testimonials-section" id="testimonials" aria-labelledby="start-testimonials-title">
      <div className="lp-container">
        {/* Section Heading */}
        <div className="start-section-header">
          <div className="start-badge">
            <Star size={13} className="text-[#C8F031]" fill="#C8F031" />
            <span>VERIFIED MERCHANT PROOFS</span>
          </div>
          <h2 id="start-testimonials-title" className="start-section-title">
            Loved by Fast-Growing <br className="hidden sm:inline" />
            Independent Brands.
          </h2>
          <p className="start-section-sub">
            See how forward-thinking e-commerce merchants are using autonomous voice AI 
            to lift conversion and capture missed late-night revenue.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="start-testimonials-grid">
          {testimonials.map((t, idx) => (
            <div key={idx} className="start-testimonial-card">
              {/* Top Metric Strip */}
              <div className="start-test-top">
                <div>
                  <div className="start-test-metric">{t.metric}</div>
                  <div className="start-test-metric-label">{t.metricLabel}</div>
                </div>
                <div className="start-test-kpi-chip">
                  <TrendingUp size={12} className="text-[#C8F031]" />
                  <span>{t.kpi}</span>
                </div>
              </div>

              {/* Quote Body */}
              <div className="start-test-quote-wrap">
                <Quote size={20} className="start-quote-icon" />
                <p className="start-test-quote">{t.quote}</p>
              </div>

              {/* Author Footer */}
              <div className="start-test-author">
                <div className="start-author-avatar">{t.avatar}</div>
                <div className="start-author-info">
                  <div className="start-author-name">
                    <span>{t.name}</span>
                    <CheckCircle2 size={13} className="text-[#C8F031] shrink-0" />
                  </div>
                  <div className="start-author-meta">{t.role} • {t.company}</div>
                </div>
                <div className="start-author-platform">{t.platform}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
