'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getShopifySession, UnifiedSession, OraSessionError } from '@/lib/session';
import { getSubscriptionApi } from '@/services/billing-service';
import { SubscriptionDetailsResponse } from '@/types/billing';
import { Loader2, Store, ExternalLink, LogIn, ArrowRight } from 'lucide-react';

function ShopifyNotEmbeddedNotice() {
  const [storeDomain, setStoreDomain] = useState('');
  const [detectedShop, setDetectedShop] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const s = p.get('shop');
      if (s) setDetectedShop(s);
    }
  }, []);

  const handleOpenStore = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = (detectedShop || storeDomain).trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!raw) return;
    const storeHandle = raw.replace('.myshopify.com', '');
    window.location.href = `https://admin.shopify.com/store/${storeHandle}/apps/ora-voice-ai`;
  };

  return (
    <div className="flex-1 h-full w-full overflow-y-auto flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-md w-full rounded-2xl border border-border/80 bg-surface-container p-7 text-center space-y-5 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-surface-high border border-border/60 text-foreground flex items-center justify-center mx-auto shadow-xs">
          <Store className="w-6 h-6 text-primary" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-high border border-border/60 text-[11px] font-mono text-muted-foreground mb-1">
            <span>Shopify Embedded App</span>
          </div>
          <h2 className="text-xl font-serif font-semibold tracking-tight text-foreground">
            Launch ORA in Shopify Admin
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This dashboard runs directly inside Shopify Admin to securely sync your catalog and sales agent.
          </p>
        </div>

        {detectedShop ? (
          <div className="space-y-3 pt-1">
            <div className="p-3 rounded-lg bg-surface-lowest border border-border/60 text-xs font-mono text-foreground break-all">
              Store: <span className="font-semibold text-primary">{detectedShop}</span>
            </div>
            <button
              onClick={() => handleOpenStore()}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 px-4 text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99]"
            >
              <span>Open in Shopify Admin</span>
              <ExternalLink size={13} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleOpenStore} className="space-y-3 pt-1">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="your-store-name"
                value={storeDomain}
                onChange={(e) => setStoreDomain(e.target.value)}
                className="w-full bg-surface-lowest border border-border/70 rounded-lg py-2 pl-3 pr-32 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors font-mono"
              />
              <span className="absolute right-3 text-[11px] font-mono text-muted-foreground pointer-events-none select-none">
                .myshopify.com
              </span>
            </div>
            <button
              type="submit"
              disabled={!storeDomain.trim()}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 px-4 text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md active:scale-[0.99]"
            >
              <span>Open in Shopify Admin</span>
              <ExternalLink size={13} />
            </button>
          </form>
        )}

        <div className="relative flex items-center justify-center pt-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <span className="relative bg-surface-container px-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
            or
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <a
            href="/auth"
            className="w-full py-2 px-3 rounded-lg border border-border/70 bg-surface-high hover:bg-surface-bright text-foreground text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <LogIn size={13} className="text-muted-foreground" />
            <span>Standalone Login</span>
          </a>
          <a
            href="/"
            className="w-full py-2 px-3 rounded-lg border border-transparent hover:border-border/60 hover:bg-surface-high/60 text-muted-foreground hover:text-foreground text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowRight size={13} />
            <span>ORA Homepage</span>
          </a>
        </div>
      </div>
    </div>
  );
}

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

  /**
   * Tells the watchdog in app/shopify/layout.tsx that React is running.
   *
   * Its own effect, with no dependencies, so it fires on hydration and not on
   * the session exchange finishing. The signal used to be set after
   * `await getShopifySession()`, which made it a report on the network rather
   * than on React: a slow first install left `mounted` false and the watchdog
   * announced a crash that had not happened. The loading state below is
   * server-rendered too, so nothing else on screen distinguishes frozen HTML
   * from a live component.
   */
  useEffect(() => {
    const w = window as unknown as { __ORA__?: { mounted: boolean } };
    if (w.__ORA__) w.__ORA__.mounted = true;
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
    if (error.code === 'NOT_EMBEDDED') {
      return <ShopifyNotEmbeddedNotice />;
    }

    return (
      <div className="flex-1 h-full w-full overflow-y-auto flex flex-col items-center justify-center p-6 bg-background text-foreground">
        <div className="max-w-md w-full rounded-2xl border border-destructive/40 bg-surface-container p-6 text-center space-y-4 shadow-xl">
          <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            !
          </div>
          <h2 className="text-lg font-semibold text-foreground">Connection Issue</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <p className="text-xs font-mono text-muted-foreground">Code: {error.code}</p>
          <button
            onClick={() => init(true)}
            className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
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
