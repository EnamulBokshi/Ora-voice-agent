'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgentSectionNav, type AgentRole, type AgentView } from './agent-section-nav';
import { AgentHub } from './agent-hub';
import { AgentGetStartedPage } from './agent-get-started-page';
import { AgentSectionLayout } from './agent-section-layout';
import { VoiceTestModal } from './modals/voice-test-modal';
import { VoiceFeedTab } from './feed/voice-feed-tab';
import { DocumentsFeedTab } from './feed/documents-feed-tab';
import { ProductDetailsFeedTab } from './feed/product-details-feed-tab';
import { KnowledgeFeedList } from './feed/knowledge-feed-list';
import { getMeApi } from '@/services/auth-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { KnowledgeDoc } from '@/types/knowledge';
import { demoKnowledgeDocs, demoProfile } from '@/lib/demo-data';
import { withDemoFallback, DEMO_MODE_ENABLED } from '@/lib/demo-config';
import { Mic, FileText, Package, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// ─── Main content ─────────────────────────────────────────────────────────────

function AgentClientContent() {
  const searchParams = useSearchParams();

  // New param scheme: ?role=voice&view=get-started|feed|knowledge|catalog
  // Also support legacy ?tab= for backward compatibility
  const rawRole  = searchParams.get('role');
  const rawView  = searchParams.get('view');
  const legacyTab = searchParams.get('tab'); // backward compat

  // Resolve role
  const activeRole: AgentRole | null =
    rawRole && ['voice', 'documents', 'products'].includes(rawRole)
      ? (rawRole as AgentRole)
      : legacyTab && ['voice', 'documents', 'products'].includes(legacyTab)
      ? (legacyTab as AgentRole)
      : null;

  // Resolve view — defaults to 'get-started' when role is selected
  const activeView: AgentView =
    rawView && ['get-started', 'feed', 'knowledge', 'catalog'].includes(rawView)
      ? (rawView as AgentView)
      : 'get-started';

  const fallbackKey = demoProfile?.business?.publishableKey ?? null;

  const [publishableKey, setPublishableKey] = useState<string | null>(
    DEMO_MODE_ENABLED ? fallbackKey : null,
  );
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [docs, setDocs]               = useState<KnowledgeDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const loadDocs = useCallback(() => {
    getKnowledgeDocsApi()
      .then((data) => setDocs(withDemoFallback(data, demoKnowledgeDocs)))
      .catch((err) => {
        console.error('Failed to load knowledge docs:', err);
        setDocs(withDemoFallback(null, demoKnowledgeDocs));
      })
      .finally(() => setDocsLoading(false));
  }, []);

  useEffect(() => {
    getMeApi()
      .then((res) => {
        const key = withDemoFallback(res?.business?.publishableKey ?? null, fallbackKey);
        setPublishableKey(key);
      })
      .catch(() => setPublishableKey(withDemoFallback(null, fallbackKey)));
    loadDocs();
  }, [loadDocs, fallbackKey]);

  // ── Render content based on role + view ────────────────────────────────────

  const renderContent = () => {
    // ── No role selected: hub page ─────────────────────────────────────────
    if (activeRole === null) return <AgentHub />;

    // ── "Get started" editorial page (default view) ────────────────────────
    if (activeView === 'get-started') {
      return <AgentGetStartedPage role={activeRole} />;
    }

    // ── Voice: feed or knowledge views ─────────────────────────────────────
    if (activeRole === 'voice') {
      if (activeView === 'feed') {
        return (
          <AgentSectionLayout
            iconNode={<Mic size={16} className="text-foreground" />}
            title="Voice Feed"
            description="Engage your shoppers through real-time speech-to-speech AI. Feed ORA product knowledge by speaking — it indexes instantly."
            previewSrc="/previews/agent-voice-role.jpg"
            previewAlt="ORA voice interface"
            howLabel="Train ORA by talking"
            ctaNodes={
              <>
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-md bg-foreground text-background text-[11.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Start talking <ArrowRight size={10} />
                </button>
                <Link href="/agent?role=voice" className="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-md border border-border/60 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors bg-surface-lowest/40">
                  Get started <ExternalLink size={9} />
                </Link>
              </>
            }
          >
            <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-7">
                  <VoiceFeedTab publishableKey={publishableKey || undefined} onFed={loadDocs} />
                </div>
                <div className="xl:col-span-5">
                  <KnowledgeFeedList docs={docs} loading={docsLoading} onDeleted={(id) => setDocs((c) => c.filter((d) => d._id !== id))} />
                </div>
              </div>
            </div>
          </AgentSectionLayout>
        );
      }
      if (activeView === 'knowledge') {
        return (
          <AgentSectionLayout
            iconNode={<Mic size={16} className="text-foreground" />}
            title="Knowledge Base"
            description="All knowledge indexed by ORA — from voice training sessions, uploaded documents, and product catalog syncs."
            previewSrc="/previews/docs-step2-index.jpg"
            previewAlt="ORA knowledge base"
            howLabel="What ORA knows"
          >
            <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
              <KnowledgeFeedList docs={docs} loading={docsLoading} onDeleted={(id) => setDocs((c) => c.filter((d) => d._id !== id))} />
            </div>
          </AgentSectionLayout>
        );
      }
    }

    // ── Documents: feed or knowledge views ─────────────────────────────────
    if (activeRole === 'documents') {
      if (activeView === 'feed') {
        return (
          <AgentSectionLayout
            iconNode={<FileText size={16} className="text-foreground" />}
            title="Upload Files"
            description="Upload store policies, shipping guides, FAQs, and reference files. ORA's RAG engine vectorises your content for accurate, sub-85ms answers."
            previewSrc="/previews/docs-step1-upload.jpg"
            previewAlt="ORA knowledge base"
            howLabel="Upload your store knowledge"
            ctaNodes={
              <Link href="/agent?role=documents" className="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-md border border-border/60 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors bg-surface-lowest/40">
                Get started <ExternalLink size={9} />
              </Link>
            }
          >
            <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-7">
                  <DocumentsFeedTab onFed={loadDocs} />
                </div>
                <div className="xl:col-span-5">
                  <KnowledgeFeedList docs={docs} loading={docsLoading} onDeleted={(id) => setDocs((c) => c.filter((d) => d._id !== id))} />
                </div>
              </div>
            </div>
          </AgentSectionLayout>
        );
      }
      if (activeView === 'knowledge') {
        return (
          <AgentSectionLayout
            iconNode={<FileText size={16} className="text-foreground" />}
            title="Knowledge Base"
            description="All indexed documents available to ORA. Each file is vectorised and searchable by your shoppers through ORA's voice and chat interfaces."
            previewSrc="/previews/docs-step2-index.jpg"
            previewAlt="ORA knowledge base"
            howLabel="Indexed knowledge"
          >
            <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
              <KnowledgeFeedList docs={docs} loading={docsLoading} onDeleted={(id) => setDocs((c) => c.filter((d) => d._id !== id))} />
            </div>
          </AgentSectionLayout>
        );
      }
    }

    // ── Products: catalog view ─────────────────────────────────────────────
    if (activeRole === 'products') {
      if (activeView === 'catalog') {
        return (
          <AgentSectionLayout
            iconNode={<Package size={16} className="text-foreground" />}
            title="Sync Catalog"
            description="Sync your inventory from Shopify or WooCommerce, or upload a CSV. ORA uses live product data to answer availability questions and guide checkout."
            previewSrc="/previews/products-step1-sync.jpg"
            previewAlt="ORA product catalog"
            howLabel="Sync your product inventory"
            ctaNodes={
              <Link href="/agent?role=products" className="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-md border border-border/60 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors bg-surface-lowest/40">
                Get started <ExternalLink size={9} />
              </Link>
            }
          >
            <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
              <ProductDetailsFeedTab onFed={loadDocs} />
            </div>
          </AgentSectionLayout>
        );
      }
    }

    // ── Fallback: get-started ───────────────────────────────────────────────
    return <AgentGetStartedPage role={activeRole} />;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderContent()}
      </div>

      <VoiceTestModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        publishableKey={publishableKey || undefined}
      />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function AgentClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading ORA Agent…</div>}>
      <AgentClientContent />
    </Suspense>
  );
}
