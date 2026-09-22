'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Link2, 
  Sliders, 
  TrendingUp, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  Volume2
} from 'lucide-react';

export function StartHowItWorks() {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      id: 1,
      num: '01',
      tag: '30 SECONDS',
      title: 'Connect & Ingest Catalog',
      desc: 'Simply enter your Shopify or WooCommerce store URL. ORA securely reads your products, variants, real-time inventory, sizing tables, and return policies in one automated pass.',
      bullets: [
        'Automatic XML sitemap & catalog discovery',
        'Extracts size charts, fabric materials, and specs',
        'Zero manual CSV uploads or database migrations',
      ],
      mock: {
        type: 'crawl',
        url: 'https://aurora-apparel.com',
        status: 'Catalog Sync Completed',
        items: '524 Products Indexed',
        variants: '1,840 Variants Linked',
        policies: 'Shipping & Returns Grounded',
      },
    },
    {
      id: 2,
      num: '02',
      tag: '1 MINUTE',
      title: 'Set Persona & Guardrails',
      desc: 'Fine-tune how ORA speaks with your shoppers. Select voice timbre, set allowable discount boundaries, and decide whether to speak English, Bangla, or multilingual code-switching.',
      bullets: [
        'Choose tone: Luxury Minimalist, Consultative, or High-Energy',
        'Set hard discount limits (e.g. max 10% on carts > $75)',
        'Define escalation triggers to human WhatsApp or Zendesk',
      ],
      mock: {
        type: 'persona',
        voiceName: 'Aura Studio (Natural Warm)',
        style: 'Consultative & Premium',
        discountCap: 'Max 10% on $70+ Carts',
        languages: 'English (US/UK) + Bangla (Bilingual)',
      },
    },
    {
      id: 3,
      num: '03',
      tag: 'INSTANT REVENUE',
      title: 'Turn on 24/7 Autonomous Sales',
      desc: 'Flip the toggle to live. The voice widget appears on your storefront. ORA greets shoppers, answers objections, updates carts, and recovers midnight checkouts while you sleep.',
      bullets: [
        'Handles hundreds of simultaneous shopper calls',
        'Generates one-click direct checkout tokens',
        'Real-time conversion & recovered revenue analytics',
      ],
      mock: {
        type: 'live',
        activeSessions: '18 Concurrent Shoppers',
        recoveredTonight: '$1,480.00 Net Sales',
        topObjection: 'Sizing & International Delivery',
      },
    },
  ];

  return (
    <section className="start-how-section" id="how-it-works" aria-labelledby="start-how-title">
      <div className="lp-container">
        {/* Section Heading */}
        <div className="start-section-header">
          <div className="start-badge">
            <Sparkles size={13} className="text-[#C8F031]" />
            <span>3-MINUTE ONBOARDING</span>
          </div>
          <h2 id="start-how-title" className="start-section-title">
            From Zero to Live Voice Sales <br className="hidden sm:inline" />
            in Under Three Minutes.
          </h2>
          <p className="start-section-sub">
            No complex engineering pipelines or machine learning training needed. 
            Connect your storefront and let ORA digest your catalog instantly.
          </p>
        </div>

        {/* Step Tabs & Display */}
        <div className="start-how-grid">
          {/* Step Selector List */}
          <div className="start-how-steps" role="tablist">
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`start-how-step-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <div className="start-step-num-pill">
                    <span>{step.num}</span>
                  </div>

                  <div className="start-step-text">
                    <div className="flex items-center gap-2">
                      <span className="start-step-tag">{step.tag}</span>
                    </div>
                    <h3 className="start-step-heading">{step.title}</h3>
                    <p className="start-step-summary">{step.desc}</p>

                    {isActive && (
                      <ul className="start-step-bullets">
                        {step.bullets.map((b, idx) => (
                          <li key={idx}>
                            <Check size={14} className="text-[#C8F031] shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Visual Display for the Active Step */}
          <div className="start-how-preview">
            <div className="start-preview-window">
              {/* Window Bar */}
              <div className="start-preview-bar">
                <div className="start-window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="start-window-title">
                  {activeStep === 1 && 'Ingestion Engine — Step 01'}
                  {activeStep === 2 && 'Brand Personality Studio — Step 02'}
                  {activeStep === 3 && 'Autonomous Sales Engine — Step 03'}
                </div>
                <div className="start-window-status">
                  <span className="start-pulse-dot" />
                  <span>ONLINE</span>
                </div>
              </div>

              {/* Step 1 Preview Body */}
              {activeStep === 1 && (
                <div className="start-preview-body step-1">
                  <div className="start-ingest-bar">
                    <Link2 size={16} className="text-[#C8F031]" />
                    <span className="font-mono text-xs text-[#FAFAFA]">https://aurora-apparel.com</span>
                    <span className="start-ingest-tag">Shopify Storefront</span>
                  </div>

                  <div className="start-crawl-progress">
                    <div className="flex items-center justify-between text-xs font-mono text-[#FAFAFA]/80 mb-2">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw size={12} className="text-[#C8F031] animate-spin" />
                        Crawling Sitemaps & Products...
                      </span>
                      <span className="text-[#C8F031]">100% Complete</span>
                    </div>
                    <div className="start-crawl-bar-track">
                      <div className="start-crawl-bar-fill" />
                    </div>
                  </div>

                  <div className="start-crawl-stats-grid">
                    <div className="start-stat-box">
                      <span className="start-stat-label">Products Synced</span>
                      <span className="start-stat-val text-[#FAFAFA]">524 Items</span>
                    </div>
                    <div className="start-stat-box">
                      <span className="start-stat-label">SKU Variants</span>
                      <span className="start-stat-val text-[#C8F031]">1,840 SKUs</span>
                    </div>
                    <div className="start-stat-box">
                      <span className="start-stat-label">Policy Grounding</span>
                      <span className="start-stat-val text-[#FAFAFA]">Verified</span>
                    </div>
                    <div className="start-stat-box">
                      <span className="start-stat-label">Crawl Duration</span>
                      <span className="start-stat-val text-[#FAFAFA]">28 Seconds</span>
                    </div>
                  </div>

                  <div className="start-crawl-badge-row">
                    <ShieldCheck size={14} className="text-[#C8F031]" />
                    <span className="text-xs text-[#FAFAFA]/70">
                      Product descriptions, pricing, colorways, and sizes cached for sub-50ms lookup.
                    </span>
                  </div>
                </div>
              )}

              {/* Step 2 Preview Body */}
              {activeStep === 2 && (
                <div className="start-preview-body step-2">
                  <div className="start-persona-row">
                    <span className="text-xs font-mono text-[#FAFAFA]/60 uppercase">Selected Voice Agent</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Volume2 size={16} className="text-[#C8F031]" />
                      <span className="text-sm font-semibold text-[#FAFAFA]">Aura Studio — Warm, Natural British/US</span>
                    </div>
                  </div>

                  <div className="start-persona-controls">
                    <div className="start-control-group">
                      <label className="text-xs text-[#FAFAFA]/70 flex justify-between">
                        <span>Sales Assertiveness</span>
                        <span className="text-[#C8F031] font-mono">Helpful Advisor (Balanced)</span>
                      </label>
                      <div className="start-slider-mock">
                        <div className="start-slider-fill" style={{ width: '65%' }} />
                        <div className="start-slider-thumb" style={{ left: '65%' }} />
                      </div>
                    </div>

                    <div className="start-control-group">
                      <label className="text-xs text-[#FAFAFA]/70 flex justify-between">
                        <span>Max Promotional Discount</span>
                        <span className="text-[#C8F031] font-mono">10% Cap (Strict)</span>
                      </label>
                      <div className="start-slider-mock">
                        <div className="start-slider-fill" style={{ width: '40%' }} />
                        <div className="start-slider-thumb" style={{ left: '40%' }} />
                      </div>
                    </div>
                  </div>

                  <div className="start-lang-chips">
                    <span className="start-lang-chip active">English (Natural)</span>
                    <span className="start-lang-chip active">Bangla (Bilingual)</span>
                    <span className="start-lang-chip">+ 12 Other Locales</span>
                  </div>
                </div>
              )}

              {/* Step 3 Preview Body */}
              {activeStep === 3 && (
                <div className="start-preview-body step-3">
                  <div className="start-live-dashboard-preview">
                    <div className="start-live-kpi-row">
                      <div className="start-live-kpi">
                        <span className="label">Live Shoppers in Voice</span>
                        <span className="val text-[#C8F031]">18 Active</span>
                      </div>
                      <div className="start-live-kpi">
                        <span className="label">Recovered Tonight</span>
                        <span className="val text-[#FAFAFA]">$1,480.00</span>
                      </div>
                      <div className="start-live-kpi">
                        <span className="label">Checkout Rate</span>
                        <span className="val text-[#C8F031]">24.8%</span>
                      </div>
                    </div>

                    <div className="start-live-pulse-card">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-[#C8F031]" />
                        <span className="text-xs font-semibold text-[#FAFAFA]">Nighttime Shopper Activity (11 PM - 5 AM)</span>
                      </div>
                      <p className="text-xs text-[#FAFAFA]/70 mt-1">
                        "Shopper in California asked if Large fits a 6'2 athletic frame. Size confirmed, added to cart, converted in 85 seconds."
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
