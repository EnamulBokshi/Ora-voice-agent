'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AGENT_VIEWS,
  DEFAULT_AGENT_ROLE,
  ROLE_LANDING_VIEW,
  isRoleVisible,
  type AgentRole,
  type AgentView,
} from '@/lib/agent-roles';
import { ARCHETYPE_CHANGED_EVENT } from '@/lib/archetypes';
import { AGENT_TEST_PAGE_ENABLED } from '@/lib/disabled-features';
// DISABLED: the role hub and the editorial "Get started" pages are switched
// off — see lib/disabled-features.ts. The components are kept rather than
// deleted so a merge that restores their call sites conflicts here.
// import { AgentHub } from './agent-hub';
// import { AgentGetStartedPage } from './agent-get-started-page';
import { AgentSectionLayout } from './agent-section-layout';
import { VoiceTestModal } from './modals/voice-test-modal';
import { VoiceFeedTab } from './feed/voice-feed-tab';
import { VoiceTestStudio } from './test/voice-test-studio';
import { DocumentsFeedTab } from './feed/documents-feed-tab';
import { ProductDetailsFeedTab } from './feed/product-details-feed-tab';
import { KnowledgeFeedList } from './feed/knowledge-feed-list';
import { AgentPersonaTab } from './persona/agent-persona-tab';
import { getMeApi } from '@/services/auth-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { KnowledgeDoc } from '@/types/knowledge';
import { demoKnowledgeDocs, demoProfile } from '@/lib/demo-data';
import { withDemoFallback, DEMO_MODE_ENABLED } from '@/lib/demo-config';
import { Mic, FileText, Package, Database, ArrowRight, ExternalLink, Sliders, SlidersHorizontal, MessageSquare, Code2, PhoneCall, Radio, BrainCircuit, Sparkles } from 'lucide-react';
import { IntegrationPreview } from '@/components/setup/previews/integration-preview';
import { ReadOnlyFence } from '@/components/common/read-only-fence';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

// ─── Main content ─────────────────────────────────────────────────────────────

function AgentClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canManage, readOnlyReason, loading: permissionsLoading } = usePermissions();

  const rawRole = searchParams.get('role');
  const rawView = searchParams.get('view');
  const legacyTab = searchParams.get('tab'); // backward compat

  // Resolve role. With the hub disabled, `/agent` with no role opens the
  // default role's page rather than a landing screen.
  const normalizeRole = (r: string | null): AgentRole | null => {
    if (!r) return null;
    if (r === 'persona') return 'prompt';
    if (r === 'embed' || r === 'widget') return 'script';
    if (['prompt', 'voice', 'documents', 'products', 'script'].includes(r)) {
      return r as AgentRole;
    }
    return null;
  };

  const activeRole: AgentRole =
    normalizeRole(rawRole) ??
    normalizeRole(legacyTab) ??
    DEFAULT_AGENT_ROLE;

  // Resolve view. `get-started` is no longer a destination, so a bookmarked
  // link to one lands on the role's main feature page instead.
  const requestedView =
    rawView && AGENT_VIEWS.includes(rawView as AgentView)
      ? (rawView as AgentView)
      : null;

  const DISABLED_VIEWS: AgentView[] = [
    'get-started',
    ...(AGENT_TEST_PAGE_ENABLED ? [] : (['test'] as AgentView[])),
  ];

  const activeView: AgentView =
    requestedView && !DISABLED_VIEWS.includes(requestedView)
      ? requestedView
      : ROLE_LANDING_VIEW[activeRole];

  const fallbackKey = demoProfile?.business?.publishableKey ?? null;

  const [publishableKey, setPublishableKey] = useState<string | null>(
    DEMO_MODE_ENABLED ? fallbackKey : null,
  );
  // Which roles this business is offered depends on what it actually is: a
  // business with no catalogue is not shown catalogue tools.
  const [businessContext, setBusinessContext] = useState<{
    archetype?: string;
    hasCatalog?: boolean;
    isWidgetActive?: boolean;
  }>({});
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
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
        setBusinessContext({
          archetype: res?.business?.activeArchetype,
          hasCatalog: res?.business?.hasCatalog,
          isWidgetActive: res?.business?.isWidgetActive,
        });
      })
      .catch(() => setPublishableKey(withDemoFallback(null, fallbackKey)));
    loadDocs();
  }, [loadDocs, fallbackKey]);

  // Same reason as the dashboard sidebar: the fetch above runs once on mount,
  // so a business type switched on the persona page would otherwise leave this
  // surface still redirecting away from the Product Catalog role.
  useEffect(() => {
    const onArchetypeChange = (e: Event) => {
      const next = (e as CustomEvent<unknown>).detail;
      setBusinessContext((prev) => ({ ...prev, archetype: next as string | undefined }));
    };
    window.addEventListener(ARCHETYPE_CHANGED_EVENT, onArchetypeChange);
    return () => window.removeEventListener(ARCHETYPE_CHANGED_EVENT, onArchetypeChange);
  }, []);

  // ── Render content based on role + view ────────────────────────────────────

  // The persona page is the main feature of this surface: it is what `prompt`
  // renders, and what anything unrecognised falls back to now that the hub and
  // the "Get started" pages are disabled.
  const renderPersona = () => (
    <AgentSectionLayout
      iconNode={<Sliders size={16} className="text-foreground" />}
      title="System Prompt & Persona"
      description="Set your business type, language, brand tone, and store instructions."
      previewSrc="/previews/agent-persona-role.jpg"
      previewAlt="Store voice and persona preview"
    >
      <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-2">
        <AgentPersonaTab />
      </div>
    </AgentSectionLayout>
  );

  const renderContent = () => {
    // A role this business is not offered cannot be reached by typing its URL.
    if (!isRoleVisible(activeRole, businessContext)) {
      return renderPersona();
    }

    // DISABLED: hub and "Get started" — see lib/disabled-features.ts.
    // if (activeRole === null) return <AgentHub />;
    // if (activeView === 'get-started' && activeRole !== 'prompt') {
    //   return <AgentGetStartedPage role={activeRole} />;
    // }

    // ── Prompt: System Prompt & Persona ────────────────────────────────────
    if (activeRole === 'prompt') {
      return renderPersona();
    }

    // ── Voice: feed, test, or knowledge views ──────────────────────────────
    // ── Voice: Train & Test ORA ─────────────────────────────────────────────
    if (activeRole === 'voice') {
      const isTestView = activeView === 'test';
      return (
        <AgentSectionLayout
          iconNode={<BrainCircuit size={16} className="text-foreground" />}
          title="Train & Test ORA"
          description="Train your sales agent with store knowledge, policies, and products, then test customer conversations in real time."
          previewSrc="/previews/agent-voice-role.jpg"
          previewAlt="ORA voice training and storefront testing"
          howLabel={isTestView ? 'Customer Simulation Studio' : 'Knowledge Training Studio'}
          ctaNodes={
            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center gap-1 p-0.5 rounded-md border border-border/60 bg-surface-lowest/80 shadow-xs">
                <button
                  type="button"
                  onClick={() => router.push('/agent?role=voice&view=feed')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                    !isTestView
                      ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Mic size={12} />
                  <span>Train Knowledge</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/agent?role=voice&view=test')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                    isTestView
                      ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Radio size={12} className={isTestView ? 'text-primary' : ''} />
                  <span>Test Assistant</span>
                </button>
              </div>

              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/40 bg-surface-lowest/40 text-[11px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-status-online animate-pulse" />
                <span className="font-medium text-foreground">ORA Ready</span>
              </div>
            </div>
          }
        >
          <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-7">
                {isTestView ? (
                  <VoiceTestStudio
                    publishableKey={publishableKey || undefined}
                    onSwitchToTrain={() => router.push('/agent?role=voice&view=feed')}
                  />
                ) : (
                  <VoiceFeedTab
                    publishableKey={publishableKey || undefined}
                    onFed={loadDocs}
                    onSwitchToTest={() => router.push('/agent?role=voice&view=test')}
                  />
                )}
              </div>
              <div className="xl:col-span-5">
                <KnowledgeFeedList
                  docs={docs}
                  loading={docsLoading}
                  onDeleted={(id) => setDocs((c) => c.filter((d) => d._id !== id))}
                />
              </div>
            </div>
          </div>
        </AgentSectionLayout>
      );
    }

    // ── Documents: feed or knowledge views ─────────────────────────────────
    if (activeRole === 'documents') {
      if (activeView === 'feed') {
        return (
          <AgentSectionLayout
            iconNode={<FileText size={16} className="text-foreground" />}
            title="Upload Files"
            description="Upload store policies, shipping guides, and FAQs."
            previewSrc="/previews/agent-docs-role.jpg"
            previewAlt="Store documents and policies"
            howLabel="Store documents"
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
            iconNode={<Database size={16} className="text-foreground" />}
            title="Knowledge Base"
            description="Reference guides, store knowledge, and indexed documents used during customer conversations."
            previewSrc="/previews/docs-step2-index.jpg"
            previewAlt="ORA knowledge base"
            howLabel="Store knowledge"
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
            description="Connect your Shopify or WooCommerce catalog, or import products via CSV."
            previewSrc="/previews/agent-products-role.jpg"
            previewAlt="ORA product catalog"
            howLabel="Catalog synchronization"
          >
            <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
              <ProductDetailsFeedTab onFed={loadDocs} />
            </div>
          </AgentSectionLayout>
        );
      }
    }

    // ── Widget Embed & Install Script ───────────────────────────────────────
    if (activeRole === 'script') {
      return (
        <AgentSectionLayout
          iconNode={<Code2 size={16} className="text-foreground" />}
          title="Widget Embed"
          description="Connect ORA to your storefront. Shoppers can talk to your voice agent immediately."
          previewSrc="/previews/agent-script-role.jpg"
          previewAlt="Storefront widget embed script"
          howLabel="Storefront embed"
        >
          <div className="h-full overflow-y-auto no-scrollbar px-4 sm:px-6 py-5">
            <IntegrationPreview
              publishableKey={publishableKey}
              isWidgetActive={businessContext.isWidgetActive !== false}
            />
          </div>
        </AgentSectionLayout>
      );
    }

    // ── Fallback: the main feature page ─────────────────────────────────────
    return renderPersona();
  };

  // Every write on this surface — persona, knowledge, catalog, keys — is
  // `@Roles(OWNER, ADMIN)` on the server, so a `staff` account could open the
  // panels and have each save answer 403. Fencing once here beats a `disabled`
  // prop threaded through a dozen panels.
  //
  // The fence stays off while the role is still loading, so the page does not
  // flash a banner at the account that is allowed to be here.
  const readOnly = !permissionsLoading && !canManage;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <ReadOnlyFence active={readOnly} message={readOnlyReason}>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {renderContent()}
        </div>
      </ReadOnlyFence>

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
