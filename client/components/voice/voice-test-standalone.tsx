'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Mic, Radio } from 'lucide-react';

import { VoiceFeedTab } from '@/components/agent/feed/voice-feed-tab';
import { VoiceTestStudio } from '@/components/agent/test/voice-test-studio';
import { KnowledgeFeedList } from '@/components/agent/feed/knowledge-feed-list';
import { ReadOnlyBanner, ReadOnlyFence } from '@/components/common/read-only-fence';
import { usePermissions } from '@/hooks/use-permissions';
import { getMeApi } from '@/services/auth-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import type { KnowledgeDoc } from '@/types/knowledge';
import type { StandaloneVoiceView } from '@/lib/voice/microphone-access';
import { cn } from '@/lib/utils';

function readInitialView(): StandaloneVoiceView {
  if (typeof window === 'undefined') return 'test';
  return new URLSearchParams(window.location.search).get('view') === 'feed' ? 'feed' : 'test';
}

/**
 * Train & Test ORA, running in its own top-level tab.
 *
 * Shopify Admin frames the embedded app without the `microphone` Permissions
 * Policy, so `getUserMedia` cannot succeed in there at all. This page exists to
 * be opened out of the frame by `openInStandaloneTab`, which appends a fresh
 * App Bridge session token as `id_token` — the same query parameter Shopify
 * itself uses on first load, and the one `lib/session/shopify-session.ts`
 * exchanges before falling back to App Bridge. `lib/session` keeps treating
 * this path as a Shopify session after the token is stripped from the URL.
 *
 * It is the same workspace as the dashboard's `/agent?role=voice`: the voice
 * feed that teaches ORA, the test studio that talks to it as a shopper, and the
 * knowledge list the feed writes into.
 *
 * Deliberately outside `app/shopify/`: that layout loads the App Bridge script,
 * which has no admin frame to talk to here.
 */
export function VoiceTestStandalone() {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<StandaloneVoiceView>(readInitialView);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const { canManage, readOnlyReason, loading: permissionsLoading } = usePermissions();

  const loadDocs = useCallback(() => {
    getKnowledgeDocsApi()
      .then((data) => setDocs(data ?? []))
      .catch((err) => console.error('[VoiceTestStandalone] Failed to load knowledge docs:', err))
      .finally(() => setDocsLoading(false));
  }, []);

  useEffect(() => {
    let active = true;

    getMeApi()
      .then((profile) => {
        if (!active) return;
        const key = profile?.business?.publishableKey;
        setStoreName(profile?.business?.name ?? null);
        if (key) {
          setPublishableKey(key);
          loadDocs();
        } else {
          setError('This store has no publishable key yet.');
        }
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
  }, [loadDocs]);

  const switchView = useCallback((next: StandaloneVoiceView) => {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set('view', next);
    window.history.replaceState({}, '', url.toString());
  }, []);

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="text-[13px] font-medium text-foreground">
            Train &amp; Test ORA could not start
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
          <span className="text-sm font-medium">Loading Train &amp; Test ORA…</span>
        </div>
      </div>
    );
  }

  // Training writes to the knowledge base and the server refuses a training
  // ticket to staff accounts, so the same fence as Agent Configuration applies.
  const readOnly = !permissionsLoading && !canManage;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight truncate">Train &amp; Test ORA</h1>
            {storeName && (
              <p className="text-[11.5px] text-muted-foreground truncate">{storeName}</p>
            )}
          </div>

          <div className="inline-flex items-center gap-1 p-0.5 rounded-md border border-border/60 bg-surface-lowest/80 shadow-xs">
            <button
              type="button"
              onClick={() => switchView('feed')}
              className={cn(
                'px-3 py-1.5 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                view === 'feed'
                  ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Mic size={12} />
              <span>Train Knowledge</span>
            </button>
            <button
              type="button"
              onClick={() => switchView('test')}
              className={cn(
                'px-3 py-1.5 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                view === 'test'
                  ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Radio size={12} className={view === 'test' ? 'text-primary' : ''} />
              <span>Test Assistant</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {readOnly && <ReadOnlyBanner message={readOnlyReason} />}

        <ReadOnlyFence active={readOnly} banner={false}>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-7">
              {view === 'test' ? (
                <VoiceTestStudio
                  publishableKey={publishableKey}
                  onSwitchToTrain={() => switchView('feed')}
                />
              ) : (
                <VoiceFeedTab
                  publishableKey={publishableKey}
                  onFed={loadDocs}
                  onSwitchToTest={() => switchView('test')}
                />
              )}
            </div>
            <div className="xl:col-span-5">
              <KnowledgeFeedList
                docs={docs}
                loading={docsLoading}
                onDeleted={(id) => setDocs((current) => current.filter((d) => d._id !== id))}
              />
            </div>
          </div>
        </ReadOnlyFence>
      </main>
    </div>
  );
}
