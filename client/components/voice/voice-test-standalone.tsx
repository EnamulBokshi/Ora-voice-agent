'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { VoiceTestModal } from '@/components/agent/modals/voice-test-modal';
import { getMeApi } from '@/services/auth-service';

/**
 * The voice test, running in its own top-level tab.
 *
 * Shopify Admin frames the embedded app without the `microphone` Permissions
 * Policy, so `getUserMedia` cannot succeed in there at all. This page exists to
 * be opened out of the frame by `openInStandaloneTab`, which appends a fresh
 * App Bridge session token as `id_token` — the same query parameter Shopify
 * itself uses on first load, and the one `lib/session/shopify-session.ts`
 * exchanges before falling back to App Bridge.
 *
 * Deliberately outside `app/shopify/`: that layout loads the App Bridge script,
 * which has no admin frame to talk to here.
 */
export function VoiceTestStandalone() {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getMeApi()
      .then((profile) => {
        if (!active) return;
        const key = profile?.business?.publishableKey;
        if (key) setPublishableKey(key);
        else setError('This store has no publishable key yet.');
      })
      .catch((err: Error) => {
        if (active) setError(err.message || 'Could not load the store.');
      })
      .finally(() => {
        if (!active) return;
        // The session token is spent by now, and it does not belong in the
        // address bar, the history entry, or a copied link.
        const url = new URL(window.location.href);
        if (url.searchParams.has('id_token')) {
          url.searchParams.delete('id_token');
          window.history.replaceState({}, '', url.toString());
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-[13px] font-medium text-foreground">
            The voice test could not start
          </p>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            {error} Reopen it from ORA inside Shopify — the link carries a
            session token that expires after about a minute.
          </p>
        </div>
      </div>
    );
  }

  if (!publishableKey) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading voice test…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <VoiceTestModal
        isOpen
        onClose={() => window.close()}
        publishableKey={publishableKey}
      />
    </div>
  );
}
