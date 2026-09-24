'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { getBillingPlansApi } from '@/services/billing-service';
import type { Plan } from '@/types/billing';

/**
 * Pricing, driven by the plans managed in the admin panel
 * (GET /billing/plans returns every active, public plan).
 *
 * Monthly shows plans billed monthly; Yearly shows plans billed yearly. The
 * Yearly button stays visible but disabled until the admin creates at least
 * one yearly plan. The card marked with a badge in the admin panel is the
 * highlighted one; without any badge, the middle card is highlighted.
 */

type Interval = 'month' | 'year';

// Plans have been saved as 'month', 'monthly', 'year' or 'yearly'.
const intervalOf = (p: Plan): Interval => (/^year/i.test(p.billingInterval ?? '') ? 'year' : 'month');

const formatPrice = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

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
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [billing, setBilling] = useState<Interval>('month');

  useEffect(() => {
    let alive = true;
    getBillingPlansApi()
      .then((data) => alive && setPlans(data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const byInterval = useMemo(() => {
    const sorted = [...(plans ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.priceUsdCents - b.priceUsdCents,
    );
    return {
      month: sorted.filter((p) => intervalOf(p) === 'month'),
      year: sorted.filter((p) => intervalOf(p) === 'year'),
    };
  }, [plans]);

  const hasYearly = byInterval.year.length > 0;
  const visible = byInterval[billing];
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
              disabled={!hasYearly}
              title={hasYearly ? undefined : 'Yearly billing is not available yet'}
              onClick={() => setBilling('year')}
            >
              Yearly
            </button>
            {!hasYearly && plans && <span>Soon</span>}
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
                          <b>{formatPrice(plan.priceUsdCents)}</b>
                          <span>{billing === 'year' ? 'per year' : 'per month'}</span>
                        </div>

                        <ul className="s2p-features">
                          {plan.features.map((feat) => (
                            <li key={feat}>{renderFeature(feat)}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <Link href="/auth" className={`s2p-btn${featured ? ' solid' : ''}`}>
                          <span>{trial > 0 ? 'Start free trial' : 'Get started'}</span>
                        </Link>
                        {trial > 0 && <div className="s2p-foot">No card required for the trial.</div>}
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
