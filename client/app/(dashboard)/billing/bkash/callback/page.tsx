'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCcw, ShieldCheck } from 'lucide-react';
import { executeBkashAgreementApi } from '@/services/billing-service';
import Link from 'next/link';

function BkashCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paymentID = searchParams.get('paymentID') || searchParams.get('paymentId');
  const status = searchParams.get('status');
  const planId = searchParams.get('planId') || 'growth';
  // The server decides the final cycle (a reserved coupon's cycle wins over this).
  const billingCycle = searchParams.get('cycle') === 'year' ? 'year' : 'month';

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentID) {
      setLoading(false);
      setErrorMessage('Missing bKash Payment Identification.');
      return;
    }

    if (status === 'cancel') {
      setLoading(false);
      setErrorMessage('bKash agreement authorization was canceled.');
      return;
    }

    if (status === 'failure') {
      setLoading(false);
      setErrorMessage('bKash payment authorization failed. Please try again.');
      return;
    }

    // Status is success or empty, execute agreement
    executeBkashAgreementApi({ paymentID, planId, billingCycle })
      .then(() => {
        setSuccess(true);
        // Set owner cookie for fast edge middleware routing
        if (typeof document !== 'undefined') {
          const isProd = process.env.NODE_ENV === 'production';
          document.cookie = `userRole=owner; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax${isProd ? '; Secure' : ''}`;
        }
        // Redirect after brief delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2200);
      })
      .catch((err: any) => {
        setErrorMessage(
          err?.message || 'Failed to complete bKash recurring authorization. Please contact support.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [paymentID, status, planId, billingCycle, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {loading && (
          <div className="space-y-4 py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
            <h2 className="text-xl font-bold font-display text-foreground">
              Confirming bKash Agreement...
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please wait while we verify your agreement and activate your store credentials.
            </p>
          </div>
        )}

        {!loading && success && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-in bounce-in">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-bold font-display text-foreground">
              Subscription Activated!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your bKash recurring checkout agreement has been successfully established and your store is now live.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-border text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-primary" />
              Redirecting to Command Center...
            </div>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive">
              <XCircle size={36} />
            </div>
            <h2 className="text-xl font-bold font-display text-foreground">
              Agreement Failed
            </h2>
            <p className="text-xs text-destructive/90 bg-destructive/5 p-3 rounded-lg border border-destructive/20 leading-relaxed">
              {errorMessage}
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw size={14} /> Try Again
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-surface-container text-foreground text-xs font-medium hover:bg-surface-high transition-all flex items-center justify-center gap-2"
              >
                Dashboard <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BkashCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      }
    >
      <BkashCallbackContent />
    </Suspense>
  );
}
