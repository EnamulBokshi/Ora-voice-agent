'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Sparkles, Shield, Zap, ArrowRight, Loader2, CheckCircle2, AlertCircle, XCircle, Globe, CreditCard, LogOut, User } from 'lucide-react';
import { getBillingPlansApi, subscribePlanApi } from '@/services/billing-service';
import { getMeApi, refreshApi, logoutApi } from '@/services/auth-service';
import { Plan } from '@/types/billing';
import { demoPlans } from '@/lib/demo-data';

export function PricingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get('plan');
  const statusParam = searchParams.get('status');
  const canceledParam = searchParams.get('canceled');
  const sessionIdParam = searchParams.get('session_id');

  const [provider, setProvider] = useState<'stripe' | 'bkash'>('stripe');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch plans
    getBillingPlansApi()
      .then((data) => setPlans(data && data.length > 0 ? data : demoPlans))
      .catch(() => setPlans(demoPlans))
      .finally(() => setLoading(false));

    // 2. Check auth status & current role
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        getMeApi(token)
          .then((profile) => {
            if (profile?.user) {
              setIsLoggedIn(true);
              setUserRole(profile.user.role);
              setUserEmail(profile.user.email);
            }
          })
          .catch(() => {
            setIsLoggedIn(false);
            setUserRole(null);
          });
      }
    }

    // 3. Handle incoming Stripe / Gateway return callback
    if (statusParam === 'success' || sessionIdParam) {
      setSuccessMessage('🎉 Payment & subscription confirmed! Activating your merchant dashboard...');
      setErrorMessage(null);
      if (typeof document !== 'undefined') {
        const isProd = process.env.NODE_ENV === 'production';
        document.cookie = `userRole=owner; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
      }
      setUserRole('owner');

      // Refresh JWT token to owner payload
      refreshApi()
        .then((refreshRes) => {
          if (refreshRes?.accessToken && typeof window !== 'undefined') {
            localStorage.setItem('accessToken', refreshRes.accessToken);
          }
        })
        .catch(() => null);

      const timer = setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2500);
      return () => clearTimeout(timer);
    } else if (canceledParam === 'true' || statusParam === 'canceled') {
      setErrorMessage('Subscription checkout was canceled or incomplete. You can select a plan at any time.');
      setSuccessMessage(null);
    }
  }, [statusParam, sessionIdParam, canceledParam]);

  const handleSelectPlan = async (plan: Plan) => {
    // If not logged in -> redirect to auth with return params
    if (!isLoggedIn) {
      router.push(`/auth?from=/pricing&plan=${plan.planId}`);
      return;
    }

    setSubscribingId(plan.planId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await subscribePlanApi({
        planId: plan.planId,
        provider: provider,
      });

      // 1. If bKash gateway redirect is required
      if (res.requiresRedirect && res.bkashURL) {
        window.location.href = res.bkashURL;
        return;
      }

      // 2. If Stripe Checkout hosted session redirect is required
      if (res.requiresRedirect && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }

      // 3. Free Plan or Direct Sandbox Activation
      if (typeof document !== 'undefined') {
        const isProd = process.env.NODE_ENV === 'production';
        document.cookie = `userRole=owner; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
      }

      setUserRole('owner');
      setSuccessMessage(
        `🎉 Congratulations! You have successfully subscribed to the ${plan.name}. Redirecting to your dashboard...`
      );

      // Refresh JWT token to owner payload
      refreshApi()
        .then((refreshRes) => {
          if (refreshRes?.accessToken && typeof window !== 'undefined') {
            localStorage.setItem('accessToken', refreshRes.accessToken);
          }
        })
        .catch(() => null);

      // Brief delay to display celebration toast, then navigate to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Subscription initiation failed. Please try again.');
    } finally {
      setSubscribingId(null);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutApi();
    } catch {
      // Ignore network errors during logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        document.cookie = 'userRole=; path=/; max-age=0; SameSite=Lax';
        setIsLoggedIn(false);
        setUserRole(null);
        setUserEmail(null);
        window.location.href = '/auth';
      }
    }
  };

  const getPlanPriceDisplay = (plan: Plan) => {
    if (provider === 'bkash') {
      const bdtAmount = Math.round(plan.priceBdtPaisa / 100);
      return {
        currency: '৳',
        amount: bdtAmount.toLocaleString(),
        period: '/month',
      };
    }
    const usdAmount = Math.round(plan.priceUsdCents / 100);
    return {
      currency: '$',
      amount: usdAmount.toLocaleString(),
      period: '/month',
    };
  };

  return (
    <div
      className="lp-root"
      style={{
        minHeight: '100vh',
        paddingTop: '8.5rem',
        paddingBottom: '6rem',
        backgroundColor: 'var(--lp-bg)',
      }}
    >
      <div className="lp-container">
        {/* Success Modal / Banner */}
        {successMessage && (
          <div
            style={{
              marginBottom: '2.5rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: 'rgba(200, 240, 49, 0.12)',
              border: '1px solid var(--lp-primary)',
              borderRadius: 'var(--lp-radius-xl)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              color: 'var(--lp-text-primary)',
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <CheckCircle2 style={{ color: 'var(--lp-primary)', flexShrink: 0 }} size={24} />
            <div style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>{successMessage}</div>
            <Loader2 className="animate-spin" style={{ color: 'var(--lp-primary)' }} size={20} />
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div
            style={{
              marginBottom: '2.5rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--lp-radius-xl)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              color: '#ef4444',
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <AlertCircle style={{ color: '#ef4444', flexShrink: 0 }} size={24} />
            <div style={{ flex: 1, fontWeight: 600, fontSize: '0.9375rem' }}>{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
                opacity: 0.7,
              }}
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        {/* Hero Header */}
        <div style={{ textAlign: 'center', maxWidth: '52rem', margin: '0 auto 3rem' }}>
          {/* Section pill */}
          <div className="lp-section-label" style={{ marginBottom: '1.25rem' }}>
            <div className="lp-section-label-line" />
            <span className="lp-section-label-text">Transparent Multimodal AI Pricing</span>
            <div className="lp-section-label-line" />
          </div>

          {/* Main Headline */}
          <h1
            className="lp-display lp-text-gradient"
            style={{
              fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)',
              lineHeight: 1.15,
              marginBottom: '1.25rem',
              letterSpacing: '-0.025em',
            }}
          >
            Supercharge Your Store With <br className="hidden sm:inline" />
            <span style={{ color: 'var(--lp-primary)', WebkitTextFillColor: 'var(--lp-primary)' }}>
              Autonomous Voice AI
            </span>
          </h1>

          {/* Subheading */}
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--lp-text-secondary)',
              lineHeight: 1.6,
              maxWidth: '40rem',
              margin: '0 auto 1.5rem',
            }}
          >
            Choose the plan that fits your business scale. Unlock real-time voice selling, live inventory syncing, and automated instant checkout.
          </p>

          {/* Currency / Provider Selector Pill */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '2.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.35rem',
                backgroundColor: 'var(--lp-bg-white)',
                border: '1px solid var(--lp-border)',
                borderRadius: 'var(--lp-radius-xl)',
                gap: '0.35rem',
                boxShadow: 'var(--lp-shadow-card)',
              }}
            >
              <button
                type="button"
                onClick={() => setProvider('stripe')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--lp-radius-lg)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  backgroundColor: provider === 'stripe' ? 'var(--lp-primary)' : 'transparent',
                  color: provider === 'stripe' ? 'var(--lp-dark)' : 'var(--lp-text-secondary)',
                }}
              >
                <CreditCard size={15} />
                International (USD • Stripe)
              </button>

              <button
                type="button"
                onClick={() => setProvider('bkash')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--lp-radius-lg)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  backgroundColor: provider === 'bkash' ? 'var(--lp-primary)' : 'transparent',
                  color: provider === 'bkash' ? 'var(--lp-dark)' : 'var(--lp-text-secondary)',
                }}
              >
                <Globe size={15} />
                Bangladesh (BDT • bKash)
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        {loading ? (
          <div
            style={{
              padding: '5rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              color: 'var(--lp-text-secondary)',
              fontSize: '0.9375rem',
            }}
          >
            <Loader2 className="animate-spin" style={{ color: 'var(--lp-primary)' }} size={24} />
            Loading plan tiers...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              alignItems: 'stretch',
              marginTop: '1rem',
            }}
          >
            {plans.map((plan) => {
              const isSelected = requestedPlan ? plan.planId === requestedPlan : plan.planId === 'growth';
              const isScale = plan.planId === 'scale';
              const isSubscribing = subscribingId === plan.planId;
              const price = getPlanPriceDisplay(plan);

              return (
                <div
                  key={plan._id || plan.planId}
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--lp-radius-2xl)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '2.5rem 2rem',
                    backgroundColor: isSelected ? 'var(--lp-dark-elevated)' : 'var(--lp-bg-white)',
                    border: isSelected ? '2px solid var(--lp-primary)' : '1px solid var(--lp-border)',
                    boxShadow: isSelected
                      ? '0 16px 40px -8px rgba(200, 240, 49, 0.22), 0 0 0 1px rgba(200, 240, 49, 0.15)'
                      : 'var(--lp-shadow-card)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* Floating Most Popular / Selected Badge */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-0.75rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'var(--lp-primary)',
                        color: 'var(--lp-dark)',
                        fontSize: '0.6875rem',
                        fontFamily: 'var(--lp-font-mono)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        padding: '0.25rem 0.85rem',
                        borderRadius: 'var(--lp-radius-full)',
                        boxShadow: '0 2px 8px rgba(200, 240, 49, 0.4)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {requestedPlan === plan.planId ? 'Selected Plan' : 'Most Popular'}
                    </div>
                  )}

                  {/* Plan Header */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3
                      className="lp-headline"
                      style={{
                        fontSize: '1.375rem',
                        fontWeight: 700,
                        color: isSelected ? 'var(--lp-text-on-dark)' : 'var(--lp-text-primary)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {plan.name}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: isSelected ? 'var(--lp-text-on-dark-dim)' : 'var(--lp-text-secondary)',
                        lineHeight: 1.5,
                        minHeight: '2.5rem',
                      }}
                    >
                      {plan.planId === 'growth'
                        ? 'For growing e-commerce stores wanting autonomous voice conversions.'
                        : isScale
                        ? 'For high-volume merchants demanding unlimited voice scale.'
                        : 'Starter tier for testing and light sandbox interactions.'}
                    </p>
                  </div>

                  {/* Price Tag */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '0.25rem',
                      marginBottom: '1.75rem',
                      paddingBottom: '1.75rem',
                      borderBottom: isSelected
                        ? '1px solid var(--lp-dark-border)'
                        : '1px solid var(--lp-border)',
                    }}
                  >
                    <span
                      className="lp-display"
                      style={{
                        fontSize: '2.75rem',
                        fontWeight: 800,
                        color: isSelected ? 'var(--lp-text-on-dark)' : 'var(--lp-text-primary)',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {price.currency}
                      {price.amount}
                    </span>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: isSelected ? 'var(--lp-text-on-dark-dim)' : 'var(--lp-text-secondary)',
                        fontWeight: 500,
                      }}
                    >
                      {price.period}
                    </span>
                  </div>

                  {/* Capability List */}
                  <div style={{ flex: 1, marginBottom: '2rem' }}>
                    <div
                      className="lp-mono"
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: isSelected ? 'var(--lp-primary-dim)' : 'var(--lp-text-tertiary)',
                        marginBottom: '1rem',
                      }}
                    >
                      Included Capabilities
                    </div>

                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <li
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          fontSize: '0.8125rem',
                          color: isSelected ? 'var(--lp-text-on-dark)' : 'var(--lp-text-primary)',
                        }}
                      >
                        <Check size={16} style={{ color: 'var(--lp-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                        <span>
                          <strong style={{ color: isSelected ? '#ffffff' : 'inherit' }}>
                            {plan.limits.conversationMinutes.toLocaleString()}
                          </strong>{' '}
                          Voice AI conversation minutes
                        </span>
                      </li>
                      <li
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          fontSize: '0.8125rem',
                          color: isSelected ? 'var(--lp-text-on-dark)' : 'var(--lp-text-primary)',
                        }}
                      >
                        <Check size={16} style={{ color: 'var(--lp-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                        <span>
                          <strong style={{ color: isSelected ? '#ffffff' : 'inherit' }}>
                            {plan.limits.ordersPerMonth.toLocaleString()}
                          </strong>{' '}
                          Automated checkout orders/mo
                        </span>
                      </li>
                      <li
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          fontSize: '0.8125rem',
                          color: isSelected ? 'var(--lp-text-on-dark)' : 'var(--lp-text-primary)',
                        }}
                      >
                        <Check size={16} style={{ color: 'var(--lp-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                        <span>
                          <strong style={{ color: isSelected ? '#ffffff' : 'inherit' }}>
                            {plan.limits.connectedStores}
                          </strong>{' '}
                          Store connector{plan.limits.connectedStores > 1 ? 's' : ''} (Shopify / WooCommerce)
                        </span>
                      </li>
                      <li
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          fontSize: '0.8125rem',
                          color: isSelected ? 'var(--lp-text-on-dark)' : 'var(--lp-text-primary)',
                        }}
                      >
                        <Check size={16} style={{ color: 'var(--lp-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                        <span>
                          <strong style={{ color: isSelected ? '#ffffff' : 'inherit' }}>
                            {plan.limits.seats}
                          </strong>{' '}
                          Admin & staff dashboard seat{plan.limits.seats > 1 ? 's' : ''}
                        </span>
                      </li>
                      <li
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          fontSize: '0.8125rem',
                          color: isSelected ? 'var(--lp-text-on-dark)' : 'var(--lp-text-primary)',
                        }}
                      >
                        <Check size={16} style={{ color: 'var(--lp-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                        <span>Full RAG catalog vector indexing & live search</span>
                      </li>
                      <li
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          fontSize: '0.8125rem',
                          color: isSelected ? 'var(--lp-text-on-dark)' : 'var(--lp-text-primary)',
                        }}
                      >
                        <Check size={16} style={{ color: 'var(--lp-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                        <span>Instant publishable widget key & embed script</span>
                      </li>
                    </ul>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isSubscribing}
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.25rem',
                      borderRadius: 'var(--lp-radius-xl)',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: isSubscribing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      border: isSelected ? 'none' : '1px solid var(--lp-border)',
                      backgroundColor: isSelected ? 'var(--lp-primary)' : 'var(--lp-dark)',
                      color: isSelected ? 'var(--lp-dark)' : '#ffffff',
                      boxShadow: isSelected ? '0 4px 16px rgba(200, 240, 49, 0.35)' : 'none',
                      transition: 'all 0.15s ease',
                      opacity: isSubscribing ? 0.7 : 1,
                    }}
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Connecting Gateway...
                      </>
                    ) : !isLoggedIn ? (
                      <>
                        Get Started
                        <ArrowRight size={15} />
                      </>
                    ) : userRole === 'user' ? (
                      <>
                        {plan.planId === 'free' ? 'Activate Free Tier' : 'Subscribe & Activate Store'}
                        <Zap size={15} />
                      </>
                    ) : (
                      <>
                        Switch to {plan.name}
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature Comparison & Security Guarantees */}
        <div
          style={{
            marginTop: '5rem',
            paddingTop: '3.5rem',
            borderTop: '1px solid var(--lp-border)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--lp-radius-lg)',
                  backgroundColor: 'var(--lp-bg-white)',
                  border: '1px solid var(--lp-border)',
                  color: 'var(--lp-primary-dim)',
                  boxShadow: 'var(--lp-shadow-card)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={22} style={{ color: 'var(--lp-text-primary)' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--lp-text-primary)', marginBottom: '0.25rem' }}>
                  Instant Key Provisioning
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--lp-text-secondary)', lineHeight: 1.5 }}>
                  Upon subscription confirmation, your unique live widget key and user manual are instantly generated and emailed to your inbox.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--lp-radius-lg)',
                  backgroundColor: 'var(--lp-bg-white)',
                  border: '1px solid var(--lp-border)',
                  color: 'var(--lp-primary-dim)',
                  boxShadow: 'var(--lp-shadow-card)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={22} style={{ color: 'var(--lp-text-primary)' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--lp-text-primary)', marginBottom: '0.25rem' }}>
                  Bank-Grade Encryption
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--lp-text-secondary)', lineHeight: 1.5 }}>
                  All payment transactions and store credentials are protected with AES-256 field-level encryption and strict tenant scoping.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--lp-radius-lg)',
                  backgroundColor: 'var(--lp-bg-white)',
                  border: '1px solid var(--lp-border)',
                  color: 'var(--lp-primary-dim)',
                  boxShadow: 'var(--lp-shadow-card)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={22} style={{ color: 'var(--lp-text-primary)' }} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--lp-text-primary)', marginBottom: '0.25rem' }}>
                  Multi-Channel RAG Vector Search
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--lp-text-secondary)', lineHeight: 1.5 }}>
                  Upload CSVs or connect Shopify to give your AI voice assistant instantaneous access to real-time inventory and pricing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
