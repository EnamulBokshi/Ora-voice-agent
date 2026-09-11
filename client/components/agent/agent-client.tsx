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
import { AgentPersonaTab } from './persona/agent-persona-tab';
import { getMeApi } from '@/services/auth-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { KnowledgeDoc } from '@/types/knowledge';
import { demoKnowledgeDocs, demoProfile } from '@/lib/demo-data';
import { withDemoFallback, DEMO_MODE_ENABLED } from '@/lib/demo-config';
import { Mic, FileText, Package, ArrowRight, ExternalLink, Sliders, PhoneCall, Sparkles, MessageSquare } from 'lucide-react';
import Link from 'next/link';

// ─── Main content ─────────────────────────────────────────────────────────────

function AgentClientContent() {
  const searchParams = useSearchParams();

  // New param scheme: ?role=voice|prompt|documents|products&view=...
  // Also support legacy ?tab= for backward compatibility
  const rawRole  = searchParams.get('role');
  const rawView  = searchParams.get('view');
  const legacyTab = searchParams.get('tab'); // backward compat

  // Resolve role
  const activeRole: AgentRole | null =
    rawRole && ['prompt', 'persona', 'voice', 'documents', 'products'].includes(rawRole)
      ? ((rawRole === 'persona' ? 'prompt' : rawRole) as AgentRole)
      : legacyTab && ['prompt', 'persona', 'voice', 'documents', 'products'].includes(legacyTab)
      ? ((legacyTab === 'persona' ? 'prompt' : legacyTab) as AgentRole)
      : null;

  // Resolve view — defaults to 'get-started' when role is selected (or 'prompt' for prompt role)
  const activeView: AgentView =
    rawView && ['get-started', 'feed', 'test', 'knowledge', 'catalog', 'prompt'].includes(rawView)
      ? (rawView as AgentView)
      : activeRole === 'prompt'
      ? 'prompt'
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
    if (activeView === 'get-started' && activeRole !== 'prompt') {
      return <AgentGetStartedPage role={activeRole} />;
    }

    // ── Prompt: System Prompt & Persona ────────────────────────────────────
    if (activeRole === 'prompt') {
      return (
        <AgentSectionLayout
          iconNode={<Sliders size={16} className="text-foreground" />}
          title="System Prompt & Persona"
          description="Configure ORA's operating instructions, supported language & spoken dialect rules, greeting behavior, and strict avoidances."
          previewSrc="/previews/agent-persona-role.jpg"
          previewAlt="Store voice and persona preview"
        >
          <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-2">
            <AgentPersonaTab />
          </div>
        </AgentSectionLayout>
      );
    }

    // ── Voice: feed, test, or knowledge views ──────────────────────────────
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
      if (activeView === 'test') {
        return (
          <AgentSectionLayout
            iconNode={<PhoneCall size={16} className="text-foreground" />}
            title="Test ORA"
            description="Talk to your agent exactly as a customer would. Ask it what you just taught it, and hear the answer it will give on your storefront."
            previewSrc="/previews/agent-voice-role.jpg"
            previewAlt="Testing the ORA voice agent"
            howLabel="Hear what your customers hear"
            ctaNodes={
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-md bg-foreground text-background text-[11.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Start test call <ArrowRight size={10} />
              </button>
            }
          >
            <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
              <div className="max-w-2xl space-y-5">
                <div className="rounded-md border border-border/50 p-6">
                  <div className="flex items-start gap-3">
                    <PhoneCall size={16} className="text-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-foreground font-serif">
                        Start a live test call
                      </h3>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                        This is the same agent, the same voice, and the same knowledge base your
                        shoppers reach through the widget. Nothing you say here is saved as
                        training data.
                      </p>
                      <button
                        onClick={() => setIsVoiceModalOpen(true)}
                        className="mt-3.5 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-foreground text-background text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <Mic size={12} /> Start test call
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border/50 p-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/40">
                    <MessageSquare size={13} className="text-foreground" />
                    <span className="text-[13px] font-semibold text-foreground font-serif">
                      What to ask
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground leading-relaxed">
                    <li>• Something you taught in Voice feed — if the answer is vague, the entry needs rewording.</li>
                    <li>• A question your customers actually ask, in their words rather than yours.</li>
                    <li>• A question you have never answered, to hear how ORA behaves when it does not know.</li>
                    <li>• Ask to be taken to a page, to check navigation works end to end.</li>
                  </ul>
                </div>

                <div className="rounded-md border border-border/50 p-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/40">
                    <Sparkles size={13} className="text-foreground" />
                    <span className="text-[13px] font-semibold text-foreground font-serif">
                      If an answer is wrong
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] text-muted-foreground leading-relaxed">
                    Go back to{' '}
                    <Link href="/agent?role=voice&view=feed" className="text-foreground underline underline-offset-2">
                      Voice feed
                    </Link>{' '}
                    and say the correct version out loud. Re-teaching a topic updates the existing
                    entry rather than adding a competing one, so the wrong answer stops being
                    retrievable.
                  </p>
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
            description="Upload store policies, shipping guides, FAQs, and reference files. ORA's RAG engine indexes your content so answers cite what you uploaded."
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
      if (activeView === 'test') {
        return (
          <AgentSectionLayout
            iconNode={<PhoneCall size={16} className="text-foreground" />}
            title="Test ORA"
            description="Talk to your agent exactly as a customer would. Ask it what you just taught it, and hear the answer it will give on your storefront."
            previewSrc="/previews/agent-voice-role.jpg"
            previewAlt="Testing the ORA voice agent"
            howLabel="Hear what your customers hear"
            ctaNodes={
              <button
                onClick={() => setIsVoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-md bg-foreground text-background text-[11.5px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Start test call <ArrowRight size={10} />
              </button>
            }
          >
            <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
              <div className="max-w-2xl space-y-5">
                <div className="rounded-md border border-border/50 p-6">
                  <div className="flex items-start gap-3">
                    <PhoneCall size={16} className="text-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-foreground font-serif">
                        Start a live test call
                      </h3>
                      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                        This is the same agent, the same voice, and the same knowledge base your
                        shoppers reach through the widget. Nothing you say here is saved as
                        training data.
                      </p>
                      <button
                        onClick={() => setIsVoiceModalOpen(true)}
                        className="mt-3.5 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-foreground text-background text-[12px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <Mic size={12} /> Start test call
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border/50 p-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/40">
                    <MessageSquare size={13} className="text-foreground" />
                    <span className="text-[13px] font-semibold text-foreground font-serif">
                      What to ask
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground leading-relaxed">
                    <li>• Something you taught in Voice feed — if the answer is vague, the entry needs rewording.</li>
                    <li>• A question your customers actually ask, in their words rather than yours.</li>
                    <li>• A question you have never answered, to hear how ORA behaves when it does not know.</li>
                    <li>• Ask to be taken to a page, to check navigation works end to end.</li>
                  </ul>
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
      if (activeView === 'catalog' || activeView === 'feed') {
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
