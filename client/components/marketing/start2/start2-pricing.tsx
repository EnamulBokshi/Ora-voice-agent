'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { getBillingPlansApi } from '@/services/billing-service';
import type { Plan } from '@/types/billing';
import { useAuth } from '@/context/auth-context';
import {
  formatMinor,
  planAmountMinor,
  planYearlyListMinor,
  yearlyDiscountOf,
  type BillingCycle,
} from '@/lib/plan-pricing';

/**
 * Pricing, driven by the plans managed in the admin panel
 * (GET /billing/plans returns every active, public plan).
 *
 * Monthly shows each plan's monthly price. Yearly shows the yearly price
 * (monthly × 12 less the admin-set yearly discount) with twelve monthly
 * payments crossed out beside it. The card marked with a badge in the admin
 * panel is the highlighted one; without any badge, the middle card is.
 */

// "Starter Plan" reads as "Starter" on a pricing card.
const displayName = (name: string) => name.replace(/\s+plan$/i, '');

// Bold a leading quantity ("2,500 live voice minutes", "Unlimited seats").
function renderFeature(text: string) {
  const m = text.match(/^((?:Up to\s+)?[\d.,]+\+?|Unlimited)(\s.*)$/i);
  if (!m) return text;
  return (
    <>
      <b>{m[1]}</b>
      {m[2]}
    </>
  );
}

export function Start2Pricing() {
  const { isAuthenticated, role } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [billing, setBilling] = useState<BillingCycle>('month');

  useEffect(() => {
    setMounted(true);
    let alive = true;
    getBillingPlansApi()
      .then((data) => alive && setPlans(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(
    () =>
      [...(plans ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.priceUsdCents - b.priceUsdCents,
      ),
    [plans],
  );

  // "Save up to 20%" next to the toggle: the best yearly discount on offer.
  const bestYearlyDiscount = Math.max(0, ...visible.map(yearlyDiscountOf));
  const anyBadge = visible.some((p) => p.badge);
  const cols = Math.max(1, Math.min(visible.length || 3, 4));

  return (
    <section className="s2-pricing-section" id="pricing" aria-label="Pricing plans">
      <div className="s2p-wrap">
        <div className="s2p-head">
          <div>
            <h2 className="s2p-title">Pricing</h2>
          </div>
          <div className="s2p-toggle" role="group" aria-label="Billing frequency">
            <button
              type="button"
              className={billing === 'month' ? 'on' : ''}
              aria-pressed={billing === 'month'}
              onClick={() => setBilling('month')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === 'year' ? 'on' : ''}
              aria-pressed={billing === 'year'}
              onClick={() => setBilling('year')}
            >
              Yearly
            </button>
            {bestYearlyDiscount > 0 && <span>Save up to {bestYearlyDiscount}%</span>}
          </div>
        </div>

        {failed ? (
          <p className="s2p-status">
            Plans could not be loaded right now. <Link href="/auth">Create an account</Link> to see
            every plan.
          </p>
        ) : (
          <div className="s2p-plans" style={{ '--s2p-cols': cols } as CSSProperties}>
            {plans === null
              ? [0, 1, 2].map((i) => <div key={i} className="s2p-plan s2p-skeleton" aria-hidden="true" />)
              : visible.map((plan, i) => {
                  const featured = anyBadge ? Boolean(plan.badge) : visible.length > 2 && i === 1;
                  const trial = plan.trialDays ?? 0;
                  const discount = yearlyDiscountOf(plan);
                  const priceMinor = planAmountMinor(plan, 'USD', billing);
                  const showStrike = billing === 'year' && discount > 0;
                  const isAuthed = mounted && isAuthenticated;
                  const planHref = isAuthed
                    ? role === 'admin' || role === 'super_admin'
                      ? '/admin'
                      : `/pricing?plan=${encodeURIComponent(plan._id || plan.name)}`
                    : '/auth';

                  const planLabel = isAuthed
                    ? role === 'admin' || role === 'super_admin'
                      ? 'Admin Console'
                      : trial > 0
                      ? 'Start free trial'
                      : 'Select plan'
                    : trial > 0
                    ? 'Start free trial'
                    : 'Get started';

                  return (
                    <div key={plan._id} className={`s2p-plan${featured ? ' lead' : ''}`}>
                      <div>
                        <div className="s2p-tier">
                          <h3>{displayName(plan.name)}</h3>
                          <span className="s2p-note">
                            {plan.badge || (trial > 0 ? `${trial}-day free trial` : '')}
                          </span>
                        </div>

                        <div className="s2p-price">
                          <b>{formatMinor(priceMinor, 'USD')}</b>
                          <span>{billing === 'year' ? 'per year' : 'per month'}</span>
                        </div>
                        {showStrike && (
                          <div className="s2p-save">
                            <s>{formatMinor(planYearlyListMinor(plan, 'USD'), 'USD')}</s>
                            <em>Save {discount}%</em>
                          </div>
                        )}

                        <ul className="s2p-features">
                          {plan.features.map((feat) => (
                            <li key={feat}>{renderFeature(feat)}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <Link href={planHref} className={`s2p-btn${featured ? ' solid' : ''}`}>
                          <span>{planLabel}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>
    </section>
  );
}
