'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CreditCard,
  Loader2,
  ShieldCheck,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import {
  getBillingPlansApi,
  getPaymentMethodsApi,
  subscribePlanApi,
  validateCouponApi,
  PaymentMethodOption,
} from '@/services/billing-service';
import { CouponQuote, Plan } from '@/types/billing';
import { cn } from '@/lib/utils';
import { DashboardPage } from '@/components/dashboard/dashboard-page';

type ProviderId = 'stripe' | 'bkash';

const PROVIDER_COPY: Record<ProviderId, { title: string; detail: string; currency: 'USD' | 'BDT' }> = {
  stripe: {
    title: 'Card — Stripe',
    detail: 'Visa, Mastercard and Amex. Billed in USD on Stripe Checkout.',
    currency: 'USD',
  },
  bkash: {
    title: 'bKash',
    detail: 'Tokenized checkout agreement. Billed in BDT on the bKash gateway.',
    currency: 'BDT',
  },
};

/**
 * Dedicated checkout step between picking a plan and paying for it.
 *
 * Activation never happens here: this page only starts a gateway session and hands
 * the merchant off to Stripe or bKash. The subscription turns active when that
 * gateway confirms the charge.
 */
export function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponQuote | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plans, paymentMethods] = await Promise.all([
        getBillingPlansApi(),
        getPaymentMethodsApi().catch(() => [] as PaymentMethodOption[]),
      ]);
      const match = (plans || []).find((p) => p.planId === planId) ?? null;
      setPlan(match);
      setMethods(paymentMethods);

      const firstAvailable = paymentMethods.find((m) => m.available);
      setProvider((firstAvailable?.provider as ProviderId) ?? null);

      if (!match) {
        setError('That plan is no longer available. Pick another tier from the billing page.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load checkout details.');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  const applyCoupon = useCallback(
    async (code: string, forProvider: ProviderId) => {
      if (!plan || !code.trim()) return;
      setCouponChecking(true);
      setCouponError(null);
      try {
        // The quote, including the discount and the total, is computed by the
        // server. This page only ever sends the code.
        const quote = await validateCouponApi({
          code: code.trim(),
          planId: plan.planId,
          billingProvider: forProvider,
        });
        setCoupon(quote);
      } catch (err) {
        setCoupon(null);
        setCouponError(err instanceof Error ? err.message : 'That coupon could not be applied.');
      } finally {
        setCouponChecking(false);
      }
    },
    [plan],
  );

  // A coupon is priced per currency, so switching gateway re-prices it.
  useEffect(() => {
    if (coupon && provider) {
      applyCoupon(coupon.code, provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  /**
   * A code carried in from elsewhere: the ?coupon= parameter, or one ORA put into
   * localStorage while the visitor was still signing up. It is only prefilled — the
   * validation and the amount still come from the server, exactly as for a code the
   * visitor types by hand.
   */
  useEffect(() => {
    if (!plan || !provider || coupon) return;

    let pending = searchParams.get('coupon');
    if (!pending) {
      try {
        pending = window.localStorage.getItem('ora.pendingCoupon');
      } catch {
        pending = null;
      }
    }
    if (!pending) return;

    const code = pending.toUpperCase();
    setCouponInput(code);
    applyCoupon(code, provider);
    try {
      window.localStorage.removeItem('ora.pendingCoupon');
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, provider]);

  // ORA can also hand a code over while the visitor is already on this page.
  useEffect(() => {
    const onAgentCoupon = (event: Event) => {
      const code = (event as CustomEvent<{ couponCode?: string }>).detail?.couponCode;
      if (!code || !provider) return;
      const upper = code.toUpperCase();
      setCouponInput(upper);
      applyCoupon(upper, provider);
    };

    document.addEventListener('ora:coupon:apply', onAgentCoupon);
    return () => document.removeEventListener('ora:coupon:apply', onAgentCoupon);
  }, [applyCoupon, provider]);

  const clearCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handlePay = async () => {
    if (!plan || !provider) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await subscribePlanApi({
        planId: plan.planId,
        provider,
        ...(coupon ? { couponCode: coupon.code } : {}),
      });

      if (result.requiresRedirect && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result.requiresRedirect && result.bkashURL) {
        window.location.href = result.bkashURL;
        return;
      }

      // No redirect means the server activated the plan itself: a free tier, or a
      // coupon that covered the whole price. A paid plan never lands here.
      router.push('/billing?activated=true');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start checkout. No charge was made and your plan is unchanged.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selected = provider ? PROVIDER_COPY[provider] : null;
  const money = (minor: number, currency: 'USD' | 'BDT') =>
    currency === 'USD'
      ? `$${(minor / 100).toFixed(2)}`
      : `৳${Math.round(minor / 100).toLocaleString()}`;

  const currency = selected?.currency ?? 'USD';
  const listMinor = plan ? (currency === 'USD' ? plan.priceUsdCents : plan.priceBdtPaisa) : 0;
  const dueMinor = coupon ? coupon.amountAfterMinor : listMinor;
  const priceLabel = plan ? money(dueMinor, currency) : '—';

  const noMethodAvailable = methods.length > 0 && methods.every((m) => !m.available);

  return (
    <DashboardPage
      title="Checkout"
      breadcrumb={{ label: 'Plans & Billing', href: '/billing' }}
      loading={loading}
      loadingLabel="Loading checkout…"
      bodyClassName="max-w-2xl mx-auto space-y-5"
    >
      <p className="text-[13px] text-muted-foreground">
        Choose how you want to pay. You are charged by the gateway, not by this page.
      </p>

      {/* Order summary */}
      <div className="rounded-lg border border-border/60 bg-surface-container p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13.5px] font-semibold text-foreground">{plan?.name ?? 'Plan'}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Billed {plan?.billingInterval === 'yearly' ? 'yearly' : 'monthly'} · cancel anytime
            </p>
          </div>
          <div className="text-right">
            {coupon && coupon.discountMinor > 0 && (
              <p className="text-[12px] text-muted-foreground line-through tabular-nums">
                {money(listMinor, currency)}
              </p>
            )}
            <p className="text-[20px] font-semibold text-foreground font-serif tabular-nums leading-none">
              {priceLabel}
            </p>
            <p className="text-[11px] font-mono text-muted-foreground mt-1">
              {currency} / {plan?.billingInterval === 'yearly' ? 'yr' : 'mo'}
            </p>
          </div>
        </div>

        {coupon && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40 text-[12.5px]">
            <span className="flex items-center gap-1.5 text-foreground">
              <Tag size={13} className="text-primary" />
              <strong className="font-mono font-semibold">{coupon.code}</strong>
              <span className="text-muted-foreground">
                −{money(coupon.discountMinor, coupon.currency)}
                {coupon.discountType === 'percent' ? ' off first payment' : ' off'}
              </span>
            </span>
            <button
              type="button"
              onClick={clearCoupon}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={12} />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>

      {/* Coupon */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          Coupon
        </p>
        <div className="flex items-center gap-2">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && provider) applyCoupon(couponInput, provider);
            }}
            placeholder="Enter code"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 h-9 px-3 rounded-md border border-border/60 bg-surface-lowest/60 text-[13px] font-mono tracking-wide text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <button
            type="button"
            onClick={() => provider && applyCoupon(couponInput, provider)}
            disabled={couponChecking || !couponInput.trim() || !provider}
            className="h-9 px-4 rounded-md border border-border/60 bg-surface-high/40 hover:bg-surface-high text-[12.5px] font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {couponChecking ? <Loader2 className="animate-spin" size={13} /> : 'Apply'}
          </button>
        </div>
        {couponError && (
          <p className="text-[12px] text-destructive font-medium">{couponError}</p>
        )}
        {coupon?.coversFullPrice && (
          <p className="text-[12px] text-primary font-medium">
            This coupon covers the full price. No payment is needed.
          </p>
        )}
      </div>

      {/* Payment method choice */}
      <div className="space-y-2.5">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          Payment method
        </p>

        {(['stripe', 'bkash'] as ProviderId[]).map((id) => {
          const method = methods.find((m) => m.provider === id);
          const available = method?.available ?? true;
          const copy = PROVIDER_COPY[id];
          const isSelected = provider === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => available && setProvider(id)}
              disabled={!available}
              aria-pressed={isSelected}
              className={cn(
                'w-full flex items-start gap-3 text-left rounded-lg border p-4 transition-colors',
                available ? 'cursor-pointer' : 'cursor-not-allowed opacity-55',
                isSelected
                  ? 'border-primary bg-surface-high/40 ring-1 ring-primary/20'
                  : 'border-border/60 bg-surface-lowest/40 hover:border-border',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                  isSelected ? 'border-primary' : 'border-border',
                )}
              >
                {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
              </span>

              {id === 'stripe' ? (
                <CreditCard size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
              ) : (
                <Wallet size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
              )}

              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-foreground">
                  {copy.title}
                </span>
                <span className="block text-[12px] text-muted-foreground mt-0.5">
                  {available ? copy.detail : 'Not available right now — contact support.'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {noMethodAvailable && (
        <p className="text-[12.5px] text-destructive font-medium">
          No payment gateway is configured yet, so this plan cannot be purchased. Nothing was
          charged and your current plan is unchanged.
        </p>
      )}

      {error && <p className="text-[12.5px] text-destructive font-medium">{error}</p>}

      <button
        type="button"
        onClick={handlePay}
        disabled={submitting || !plan || !provider || noMethodAvailable}
        className="w-full h-10 rounded-md bg-primary text-primary-foreground text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin" size={14} />
            <span>Opening {selected?.title ?? 'gateway'}…</span>
          </>
        ) : (
          <>
            <span>
              {coupon?.coversFullPrice
                ? 'Activate plan'
                : `Continue to ${provider === 'bkash' ? 'bKash' : 'Stripe'}`}
            </span>
            <ArrowRight size={14} />
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground">
        <ShieldCheck size={12} />
        <span>Card and wallet details are entered on the gateway, never on ORA.</span>
      </p>
    </DashboardPage>
  );
}
