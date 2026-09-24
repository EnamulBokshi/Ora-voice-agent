'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { getBillingPlansApi } from '@/services/billing-service';
import { refreshApi } from '@/services/auth-service';
import { StartTrialModal } from '@/components/billing/start-trial-modal';
import type { Plan } from '@/types/billing';
import { useAuth } from '@/context/auth-context';
import {
  formatMinor,
  planAmountMinor,
  planYearlyListMinor,
  yearlyDiscountOf,
  type BillingCycle,
  type PricingCurrency,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = searchParams?.get('plan');
  const statusParam = searchParams?.get('status');
  const sessionIdParam = searchParams?.get('session_id');

  const { isAuthenticated, role } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [currency, setCurrency] = useState<PricingCurrency>('USD');
  const [billing, setBilling] = useState<BillingCycle>('month');
  const [trialPlan, setTrialPlan] = useState<Plan | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Handle Stripe/bKash checkout return
  useEffect(() => {
    if (statusParam === 'success' || sessionIdParam) {
      setSuccessMessage('🎉 Payment & subscription confirmed! Activating your merchant dashboard...');
      if (typeof document !== 'undefined') {
        const isProd = process.env.NODE_ENV === 'production';
        document.cookie = `userRole=owner; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
      }
      refreshApi().then((res) => {
        if (res?.accessToken && typeof window !== 'undefined') {
          localStorage.setItem('accessToken', res.accessToken);
        }
      }).catch(() => null);

      const timer = setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [statusParam, sessionIdParam]);

  // Auto-open trial modal if requested plan is in search params and user is authenticated
  useEffect(() => {
    if (requestedPlan && plans && role === 'user' && !trialPlan) {
      const match = plans.find(
        (p) =>
          p.planId?.toLowerCase() === requestedPlan.toLowerCase() ||
          p.name?.toLowerCase() === requestedPlan.toLowerCase() ||
          p._id === requestedPlan,
      );
      if (match) {
        setTrialPlan(match);
      }
    }
  }, [requestedPlan, plans, role, trialPlan]);

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

  const handlePlanClick = (e: React.MouseEvent, plan: Plan) => {
    if (!mounted || !isAuthenticated) {
      // Allow link navigation to /auth?from=/pricing&plan=...
      return;
    }

    if (role === 'admin' || role === 'super_admin') {
      // Let link navigation go to /admin
      return;
    }

    if (role === 'user') {
      e.preventDefault();
      setTrialPlan(plan);
      return;
    }

    // Merchant (owner / staff) upgrading
    e.preventDefault();
    router.push(
      `/billing/checkout?planId=${encodeURIComponent(plan.planId || plan._id)}${billing === 'year' ? '&cycle=year' : ''}`,
    );
  };

  const handleTrialStarted = async (plan: Plan) => {
    setTrialPlan(null);
    setSuccessMessage(`🎉 Your 14-day ${plan.name} trial is active. Opening your dashboard…`);
    if (typeof document !== 'undefined') {
      const isProd = process.env.NODE_ENV === 'production';
      document.cookie = `userRole=owner; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
    }
    try {
      const refreshed = await refreshApi();
      if (refreshed?.accessToken && typeof window !== 'undefined') {
        localStorage.setItem('accessToken', refreshed.accessToken);
      }
    } catch {
      // Session rechecked on dashboard
    }
    window.location.href = '/dashboard';
  };

  return (
    <section className="s2-pricing-section" id="pricing" aria-label="Pricing plans">
      <div className="s2p-wrap">
        {/* Success Alert Banner */}
        {successMessage && (
          <div
            style={{
              marginBottom: '2rem',
              padding: '1rem 1.25rem',
              backgroundColor: 'rgba(200, 240, 49, 0.12)',
              border: '1px solid var(--s2-brand-lime)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--s2-text-primary)',
              fontSize: '0.92rem',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 style={{ color: 'var(--s2-brand-lime)', flexShrink: 0 }} size={20} />
            <span style={{ flex: 1 }}>{successMessage}</span>
            <Loader2 className="animate-spin" size={18} style={{ color: 'var(--s2-brand-lime)' }} />
          </div>
        )}

        <div className="s2p-head">
          <div>
            <h2 className="s2p-title">Pricing</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Currency Switcher */}
            <div className="s2p-toggle" role="group" aria-label="Currency">
              <button
                type="button"
                className={currency === 'USD' ? 'on' : ''}
                aria-pressed={currency === 'USD'}
                onClick={() => setCurrency('USD')}
              >
                USD ($)
              </button>
              <button
                type="button"
                className={currency === 'BDT' ? 'on' : ''}
                aria-pressed={currency === 'BDT'}
                onClick={() => setCurrency('BDT')}
              >
                BDT (৳)
              </button>
            </div>

            {/* Billing Frequency Toggle */}
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
                  const priceMinor = planAmountMinor(plan, currency, billing);
                  const showStrike = billing === 'year' && discount > 0;
                  const isAuthed = mounted && isAuthenticated;

                  const planHref = isAuthed
                    ? role === 'admin' || role === 'super_admin'
                      ? '/admin'
                      : role === 'user'
                      ? '#'
                      : `/billing/checkout?planId=${encodeURIComponent(plan.planId || plan._id)}${billing === 'year' ? '&cycle=year' : ''}`
                    : `/auth?from=/pricing&plan=${encodeURIComponent(plan.planId || plan._id)}${billing === 'year' ? '&cycle=year' : ''}`;

                  const planLabel = isAuthed
                    ? role === 'admin' || role === 'super_admin'
                      ? 'Admin Console'
                      : role === 'user'
                      ? trial > 0
                        ? 'Start 14-day free trial'
                        : 'Select plan'
                      : 'Switch plan'
                    : trial > 0
                    ? 'Start 14-day free trial'
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
                          <b>{formatMinor(priceMinor, currency)}</b>
                          <span>{billing === 'year' ? 'per year' : 'per month'}</span>
                        </div>
                        {showStrike && (
                          <div className="s2p-save">
                            <s>{formatMinor(planYearlyListMinor(plan, currency), currency)}</s>
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
                        <Link
                          href={planHref}
                          onClick={(e) => handlePlanClick(e, plan)}
                          className={`s2p-btn${featured ? ' solid' : ''}`}
                        >
                          <span>{planLabel}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>

      {/* Start Trial Modal for logged-in user claiming trial */}
      <StartTrialModal
        isOpen={Boolean(trialPlan)}
        plan={trialPlan}
        onClose={() => setTrialPlan(null)}
        onSuccess={() => trialPlan && handleTrialStarted(trialPlan)}
      />
    </section>
  );
}
