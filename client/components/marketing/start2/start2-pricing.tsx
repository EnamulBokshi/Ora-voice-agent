'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

export function Start2Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const proPrice = billingCycle === 'monthly' ? '$49' : '$39';
  const entPrice = billingCycle === 'monthly' ? '$149' : '$119';

  return (
    <section className="s2-pricing-section" id="pricing">
      <div className="s2-container">
        {/* Header */}
        <div className="s2-section-head text-center">
          <h2 className="s2-section-title">
            Simple transparent pricing
          </h2>
          <p className="s2-section-sub">
            Choose the plan that fits your volume. Start free and scale as your traffic grows.
          </p>

          {/* Billing Cycle Pill Toggle */}
          <div className="s2-billing-toggle-wrap">
            <div className="s2-billing-toggle">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`s2-toggle-tab ${billingCycle === 'monthly' ? 'active' : ''}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`s2-toggle-tab ${billingCycle === 'yearly' ? 'active' : ''}`}
              >
                Yearly <span className="s2-discount-tag">-20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2 Primary Side-by-Side Cards */}
        <div className="s2-pricing-cards-grid">
          {/* Growth Plan */}
          <div className="s2-price-card featured">
            <div className="s2-price-top">
              <div className="flex justify-between items-center mb-2">
                <span className="s2-plan-tag">Most Popular</span>
                <span className="text-xs text-muted-foreground">14-Day Free Trial</span>
              </div>
              <div className="s2-price-amount-row">
                <span className="s2-price-number">{proPrice}</span>
                <span className="s2-price-period">/month</span>
              </div>
              <h3 className="text-base font-bold text-foreground mt-1">Growth Plan</h3>
              <p className="s2-plan-tagline">
                Essential for growing Shopify, WooCommerce, and custom merchants.
              </p>
            </div>

            <div className="s2-price-features">
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>2,000 streaming voice minutes/month</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Up to 500 voice-assisted orders/month</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Sub-350ms streaming turn-taking latency</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Automatic catalog &amp; variant stock synchronization</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>In-conversation cart &amp; 1-click checkout links</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Full voice call transcripts &amp; conversion telemetry</span>
              </div>
            </div>

            <div className="s2-price-footer">
              <Link href="/auth" className="s2-btn-primary w-full justify-center">
                <span>Start 14-Day Free Trial</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="s2-price-card">
            <div className="s2-price-top">
              <div className="flex justify-between items-center mb-2">
                <span className="s2-plan-tag neutral">Scale &amp; Security</span>
                <span className="text-xs text-muted-foreground">Dedicated Infra</span>
              </div>
              <div className="s2-price-amount-row">
                <span className="s2-price-number">{entPrice}</span>
                <span className="s2-price-period">/month</span>
              </div>
              <h3 className="text-base font-bold text-foreground mt-1">Enterprise Plan</h3>
              <p className="s2-plan-tagline">
                Built for high-volume stores, large SKU catalogs, and enterprise brands.
              </p>
            </div>

            <div className="s2-price-features">
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Everything in Growth, plus:</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Unlimited voice conversation minutes</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Unlimited voice-assisted orders</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Custom brand voice tuning &amp; persona control</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Shopify, WooCommerce, and custom ERP connectors</span>
              </div>
              <div className="s2-feature-row">
                <Check size={14} className="s2-check-green shrink-0" />
                <span>Dedicated solutions engineer &amp; 99.99% uptime SLA</span>
              </div>
            </div>

            <div className="s2-price-footer">
              <Link href="/auth" className="s2-btn-secondary w-full justify-center">
                <span>Start 14-Day Free Trial</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Full-Width Starter Tier Card (Matching saas_demo_2 bottom bar) */}
        <div className="s2-price-wide-bar">
          <div className="s2-wide-col">
            <h4 className="font-bold text-sm text-foreground">Free Sandbox</h4>
            <p className="text-xs text-muted-foreground">Test voice with 100 free minutes/mo</p>
          </div>
          <div className="s2-wide-col">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <Check size={13} className="text-[#16A34A] dark:text-[#C8F031]" />
              <span>1 Website Connection</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Automated URL page crawler</p>
          </div>
          <div className="s2-wide-col">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <Check size={13} className="text-[#16A34A] dark:text-[#C8F031]" />
              <span>48kHz Streaming Audio</span>
            </div>
            <p className="text-[11px] text-muted-foreground">Sub-350ms engine included</p>
          </div>
          <div className="s2-wide-col text-right">
            <div className="text-xl font-extrabold text-foreground">Free</div>
            <Link href="/auth" className="text-xs font-semibold text-[#16A34A] dark:text-[#C8F031] hover:underline inline-flex items-center gap-1">
              <span>Try Sandbox</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
