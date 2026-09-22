'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

export function StartPricing() {
  const plans = [
    {
      name: 'Starter',
      price: '$19',
      period: '/Month',
      target: 'For Individuals & Small Sites',
      isFeatured: false,
      features: [
        'Up to 500 voice minutes / month',
        '1 website domain connection',
        'Automatic page crawler & sitemap sync',
        'Email & community support',
      ],
      btnText: 'Get started',
      btnClass: 'fs-btn-ghost w-full justify-center',
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/Month',
      target: 'For Growing Businesses',
      isFeatured: true,
      features: [
        'Unlimited real-time voice minutes',
        'Multi-archetype tuning (Clinics, Shops, Agencies)',
        'Sub-350ms streaming neural voice',
        'Live visitor analytics & lead attribution',
        '24/7 priority chat support',
      ],
      btnText: 'Get started',
      btnClass: 'fs-btn-dark w-full justify-center featured',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '/Pricing',
      target: 'For Large Teams & Enterprises',
      isFeatured: false,
      features: [
        'Dedicated streaming infrastructure & 99.99% SLA',
        'Custom brand voice cloning & personality',
        'Custom webhooks & CRM integrations',
        'On-demand workflow customization',
        'Personalized 1-on-1 onboarding',
      ],
      btnText: 'Talk to sales',
      btnClass: 'fs-btn-ghost w-full justify-center',
    },
  ];

  return (
    <section className="fs-pricing-section" id="pricing">
      <div className="fs-container">
        {/* Header */}
        <div className="fs-section-head text-center">
          <span className="fs-pill-badge">Pricing</span>
          <h2 className="fs-section-title">
            Flexible Plans for Every Business
          </h2>
          <p className="fs-section-sub">
            From independent practices to high-volume brands, we have a plan that scales with you.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="fs-pricing-grid">
          {plans.map((plan, idx) => (
            <div 
              className={`fs-price-card ${plan.isFeatured ? 'featured' : ''}`} 
              key={idx}
            >
              <div className="fs-price-card-header">
                <span className="fs-plan-name">{plan.name}</span>
                <div className="fs-plan-price-row">
                  <span className="fs-plan-price">{plan.price}</span>
                  <span className="fs-plan-period">{plan.period}</span>
                </div>
                <p className="fs-plan-target">{plan.target}</p>
              </div>

              <div className="fs-price-features-list">
                {plan.features.map((f, i) => (
                  <div className="fs-price-feature-item" key={i}>
                    <Check size={14} className="fs-check-icon shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="fs-price-card-footer">
                <Link href="/auth" className={plan.btnClass}>
                  {plan.btnText}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
