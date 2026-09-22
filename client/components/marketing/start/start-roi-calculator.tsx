'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Percent,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export function StartRoiCalculator() {
  // Inputs
  const [monthlyVisitors, setMonthlyVisitors] = useState<number>(35000);
  const [aov, setAov] = useState<number>(75);

  // Presets
  const setPreset = (visitors: number, orderValue: number) => {
    setMonthlyVisitors(visitors);
    setAov(orderValue);
  };

  // Math
  const calculations = useMemo(() => {
    // 8% add to cart rate
    const totalCarts = Math.round(monthlyVisitors * 0.08);
    // 70% industry average cart abandonment rate
    const abandonedCarts = Math.round(totalCarts * 0.70);
    // Conservative 18% voice intervention recovery rate
    const recoveredOrders = Math.round(abandonedCarts * 0.18);
    // Net new monthly recovered revenue
    const monthlyRecovered = Math.round(recoveredOrders * aov);
    // Annual
    const annualRecovered = monthlyRecovered * 12;
    // Estimated ORA tier cost
    const oraCost = monthlyVisitors > 80000 ? 299 : monthlyVisitors > 20000 ? 149 : 49;
    // ROI multiple
    const roiMultiplier = Math.max(1, Math.round(monthlyRecovered / oraCost));

    return {
      totalCarts,
      abandonedCarts,
      recoveredOrders,
      monthlyRecovered,
      annualRecovered,
      oraCost,
      roiMultiplier,
    };
  }, [monthlyVisitors, aov]);

  return (
    <section className="start-roi-section" id="roi" aria-labelledby="start-roi-title">
      <div className="lp-container">
        {/* Section Header */}
        <div className="start-section-header">
          <div className="start-badge">
            <Calculator size={13} className="text-[#C8F031]" />
            <span>INTERACTIVE ROI MODEL</span>
          </div>
          <h2 id="start-roi-title" className="start-section-title">
            Calculate Your Recovered Revenue.
          </h2>
          <p className="start-section-sub">
            See exactly how much revenue your store is currently leaving on the table 
            at checkout, and what ORA recovers autonomously each month.
          </p>
        </div>

        {/* Calculator Widget Container */}
        <div className="start-roi-card">
          {/* Left Controls */}
          <div className="start-roi-controls">
            {/* Quick Presets */}
            <div className="start-roi-presets">
              <span className="text-xs text-[#FAFAFA]/60 font-mono">QUICK PRESETS:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`start-preset-btn ${monthlyVisitors === 12000 && aov === 45 ? 'active' : ''}`}
                  onClick={() => setPreset(12000, 45)}
                >
                  Boutique (12k visits)
                </button>
                <button
                  type="button"
                  className={`start-preset-btn ${monthlyVisitors === 35000 && aov === 75 ? 'active' : ''}`}
                  onClick={() => setPreset(35000, 75)}
                >
                  Growth Brand (35k visits)
                </button>
                <button
                  type="button"
                  className={`start-preset-btn ${monthlyVisitors === 120000 && aov === 110 ? 'active' : ''}`}
                  onClick={() => setPreset(120000, 110)}
                >
                  Scale Flagship (120k visits)
                </button>
              </div>
            </div>

            {/* Slider 1: Monthly Visitors */}
            <div className="start-slider-field">
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-semibold text-[#FAFAFA]" htmlFor="roi-visitors">
                  Monthly Storefront Visitors
                </label>
                <span className="text-lg font-mono font-bold text-[#C8F031]">
                  {monthlyVisitors.toLocaleString()} / mo
                </span>
              </div>
              <input
                id="roi-visitors"
                type="range"
                min="5000"
                max="200000"
                step="2500"
                value={monthlyVisitors}
                onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
                className="start-range-slider"
                aria-label="Monthly storefront visitors slider"
              />
              <div className="flex justify-between text-[11px] font-mono text-[#FAFAFA]/40 mt-1">
                <span>5,000</span>
                <span>100,000</span>
                <span>200,000+</span>
              </div>
            </div>

            {/* Slider 2: Average Order Value (AOV) */}
            <div className="start-slider-field">
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-sm font-semibold text-[#FAFAFA]" htmlFor="roi-aov">
                  Average Order Value (AOV)
                </label>
                <span className="text-lg font-mono font-bold text-[#C8F031]">
                  ${aov} USD
                </span>
              </div>
              <input
                id="roi-aov"
                type="range"
                min="20"
                max="350"
                step="5"
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className="start-range-slider"
                aria-label="Average order value slider"
              />
              <div className="flex justify-between text-[11px] font-mono text-[#FAFAFA]/40 mt-1">
                <span>$20</span>
                <span>$180</span>
                <span>$350+</span>
              </div>
            </div>

            {/* Formula Transparency Note */}
            <div className="start-formula-note">
              <div className="flex items-center gap-1.5 text-xs text-[#FAFAFA]/70">
                <Percent size={13} className="text-[#C8F031]" />
                <span>Industry Standard Assumptions:</span>
              </div>
              <div className="text-[11px] text-[#FAFAFA]/50 mt-1 space-y-0.5">
                <div>• 8.0% of visitors add items to cart ({calculations.totalCarts.toLocaleString()} carts)</div>
                <div>• 70% cart abandonment rate ({calculations.abandonedCarts.toLocaleString()} uncompleted)</div>
                <div>• Conservative 18% voice recovery rate ({calculations.recoveredOrders.toLocaleString()} rescued orders)</div>
              </div>
            </div>
          </div>

          {/* Right Results Dashboard */}
          <div className="start-roi-results">
            <div className="start-results-header">
              <span className="text-xs font-mono text-[#C8F031] tracking-wider uppercase">
                ESTIMATED BUSINESS IMPACT
              </span>
              <div className="start-multiplier-badge">
                <Sparkles size={12} />
                <span>{calculations.roiMultiplier}x Estimated ROI</span>
              </div>
            </div>

            {/* Big Revenue Number */}
            <div className="start-revenue-hero">
              <div className="start-rev-label">Net New Monthly Recovered Revenue</div>
              <div className="start-rev-amount">
                ${calculations.monthlyRecovered.toLocaleString()}
                <span className="text-sm font-normal text-[#FAFAFA]/60"> / mo</span>
              </div>
              <div className="start-rev-annual">
                or <strong className="text-[#C8F031] font-mono">${calculations.annualRecovered.toLocaleString()}</strong> in additional annual gross revenue
              </div>
            </div>

            {/* Breakdown Grid */}
            <div className="start-breakdown-grid">
              <div className="start-breakdown-box">
                <div className="label">Recovered Orders</div>
                <div className="val text-[#FAFAFA]">+{calculations.recoveredOrders} / mo</div>
              </div>
              <div className="start-breakdown-box">
                <div className="label">Estimated ORA Plan</div>
                <div className="val text-[#C8F031]">${calculations.oraCost} / mo</div>
              </div>
            </div>

            {/* Guarantee Badge */}
            <div className="start-guarantee-box">
              <ShieldCheck size={16} className="text-[#C8F031] shrink-0" />
              <p className="text-xs text-[#FAFAFA]/80">
                <strong>5x ROI Performance Guarantee:</strong> If ORA doesn't recover at least 5 times its cost within your first 30 days, we will refund your plan 100%.
              </p>
            </div>

            {/* CTA */}
            <Link href="/auth" className="start-btn-primary w-full justify-center">
              <span>Capture This Revenue — Start Free Trial</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
