'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface PlanFeature {
  text: string;
  strong?: string;
}

interface PlanItem {
  id: string;
  name: string;
  note: string;
  monthlyPrice: string;
  yearlyPrice: string;
  isFixed?: boolean;
  desc: string;
  features: PlanFeature[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
  foot: string;
}

const PLANS: PlanItem[] = [
  {
    id: 'starter',
    name: 'Starter',
    note: 'Free forever',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    isFixed: true,
    desc: 'Test voice in a sandbox. No credit card required.',
    features: [
      { text: '100 streaming voice minutes a month', strong: '100' },
      { text: '1 storefront connection', strong: '1' },
      { text: 'Sub-350 ms turn latency', strong: 'Sub-350 ms' },
      { text: 'Catalogue and variant stock sync' },
      { text: '48kHz studio audio quality' },
      { text: 'Community support and docs' },
    ],
    cta: 'Try Sandbox',
    ctaHref: '/auth',
    featured: false,
    foot: 'No credit card required.',
  },
  {
    id: 'growth',
    name: 'Growth',
    note: '14-day trial',
    monthlyPrice: '$49',
    yearlyPrice: '$39',
    desc: 'For Shopify, WooCommerce, and custom storefronts.',
    features: [
      { text: '2,000 streaming voice minutes a month', strong: '2,000' },
      { text: 'Up to 500 voice-assisted orders', strong: '500' },
      { text: 'Sub-350 ms turn latency', strong: 'Sub-350 ms' },
      { text: 'Catalogue and variant stock sync' },
      { text: 'In-conversation cart and checkout links' },
      { text: 'Call transcripts and conversion telemetry' },
    ],
    cta: 'Start free trial',
    ctaHref: '/auth',
    featured: true,
    foot: 'No card required to start.',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    note: 'Dedicated infrastructure',
    monthlyPrice: '$149',
    yearlyPrice: '$119',
    desc: 'For high-volume stores and large SKU catalogues.',
    features: [
      { text: 'Everything in Growth' },
      { text: 'Unlimited voice minutes', strong: 'Unlimited' },
      { text: 'Unlimited voice-assisted orders', strong: 'Unlimited' },
      { text: 'Brand voice tuning and persona control' },
      { text: 'Shopify, WooCommerce, and ERP connectors' },
      { text: 'Solutions engineer, 99.99% uptime SLA', strong: '99.99%' },
    ],
    cta: 'Talk to sales',
    ctaHref: '/auth',
    featured: false,
    foot: 'Annual contracts available.',
  },
];

function renderFeature(f: PlanFeature) {
  if (!f.strong) return f.text;
  const idx = f.text.indexOf(f.strong);
  if (idx === -1) return f.text;
  return (
    <>
      {f.text.slice(0, idx)}
      <b>{f.strong}</b>
      {f.text.slice(idx + f.strong.length)}
    </>
  );
}

export function Start2Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="s2-pricing-section" id="pricing" aria-label="Pricing plans">
      <div className="s2p-wrap">
        <div className="s2p-head">
          <div>
            <h2 className="s2p-title">Pricing</h2>
            <p className="s2p-sub">Three plans. All include the full agent; the difference is volume.</p>
          </div>
          <div className="s2p-toggle" role="group" aria-label="Billing frequency">
            <button
              type="button"
              className={!yearly ? 'on' : ''}
              onClick={() => setYearly(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              className={yearly ? 'on' : ''}
              onClick={() => setYearly(true)}
            >
              Yearly
            </button>
            <span>−20%</span>
          </div>
        </div>

        <div className="s2p-plans">
          {PLANS.map((plan) => {
            const price = plan.isFixed
              ? plan.monthlyPrice
              : yearly
                ? plan.yearlyPrice
                : plan.monthlyPrice;
            const period = plan.isFixed
              ? 'per month'
              : yearly
                ? 'per month, billed yearly'
                : 'per month';

            return (
              <div
                key={plan.id}
                className={`s2p-plan${plan.featured ? ' lead' : ''}`}
              >
                <div>
                  <div className="s2p-tier">
                    <h3>{plan.name}</h3>
                    <span className="s2p-note">{plan.note}</span>
                  </div>

                  <div className="s2p-price">
                    <b>{price}</b>
                    <span>{period}</span>
                  </div>

                  <p className="s2p-desc">{plan.desc}</p>

                  <ul className="s2p-features">
                    {plan.features.map((feat, i) => (
                      <li key={i}>{renderFeature(feat)}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <Link
                    href={plan.ctaHref}
                    className={`s2p-btn${plan.featured ? ' solid' : ''}`}
                  >
                    <span>{plan.cta}</span>
                  </Link>
                  <div className="s2p-foot">{plan.foot}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
