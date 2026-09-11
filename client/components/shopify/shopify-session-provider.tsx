'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getShopifySession, UnifiedSession, OraSessionError } from '@/lib/session';
import { getSubscriptionApi } from '@/services/billing-service';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { Loader2 } from 'lucide-react';

interface ShopifySessionContextType {
  session: UnifiedSession | null;
  subscription: SubscriptionDetailsResponse | null;
  loading: boolean;
  error: { code: string; message: string } | null;
  refreshSession: (force?: boolean) => Promise<void>;
  hasActivePlan: boolean;
}

const ShopifySessionContext = createContext<ShopifySessionContextType | null>(null);

export function ShopifySessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UnifiedSession | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const init = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Establish ORA session from App Bridge
      const sess = await getShopifySession(force);
      setSession(sess);

      // Signal watchdog that React mounted successfully
      const w = typeof window !== 'undefined' ? (window as unknown as { __ORA__?: { mounted: boolean } }) : null;
      if (w?.__ORA__) w.__ORA__.mounted = true;

      // 2. Fetch subscription status
      try {
        const sub = await getSubscriptionApi();
        setSubscription(sub);
      } catch (subErr) {
        console.warn('[ShopifySessionProvider] Could not load subscription details:', subErr);
      }
    } catch (err: any) {
      const code = err instanceof OraSessionError ? err.code : 'SESSION_ERROR';
      setError({ code, message: err.message || 'Failed to authenticate with ORA.' });
      console.error('[ShopifySessionProvider] Session init failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const hasActivePlan = Boolean(
    subscription?.subscription?.status === 'active' &&
    subscription?.subscription?.planId &&
    subscription?.subscription?.planId !== 'free'
  );

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-container px-6 py-4 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-foreground">
            Connecting store to ORA Voice AI...
          </span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground font-mono">
          Verifying Shopify App Bridge session & catalog state
        </p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md w-full rounded-xl border border-destructive/40 bg-surface-container p-6 text-center space-y-4 shadow-xl">
          <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            !
          </div>
          <h2 className="text-lg font-semibold text-foreground">Connection Issue</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <p className="text-xs font-mono text-muted-foreground">Code: {error.code}</p>
          <button
            onClick={() => init(true)}
            className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <ShopifySessionContext.Provider
      value={{
        session,
        subscription,
        loading,
        error,
        refreshSession: init,
        hasActivePlan,
      }}
    >
      {children}
    </ShopifySessionContext.Provider>
  );
}

export function useShopifySession() {
  const ctx = useContext(ShopifySessionContext);
  if (!ctx) {
    throw new Error('useShopifySession must be used within a ShopifySessionProvider');
  }
  return ctx;
}
