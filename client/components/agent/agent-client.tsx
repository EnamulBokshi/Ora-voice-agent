'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Database,
  Radio,
  ExternalLink,
  Sparkles,
  Mic,
  FileText,
  Package,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopHeader } from '@/components/dashboard/top-header';
import { MerchantCredentialsCard } from './merchant-credentials-card';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentSection = 'persona' | 'voice' | 'documents' | 'products' | 'integration';

const AGENT_TABS: { id: AgentSection; label: string; icon: React.ElementType }[] = [
  { id: 'persona', label: 'Persona & Archetype', icon: Sparkles },
  { id: 'voice', label: 'Talk to ORA', icon: Mic },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'products', label: 'Product Catalog', icon: Package },
  { id: 'integration', label: 'Integration & Keys', icon: Key },
];

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="pb-5 border-b border-border flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 flex-shrink-0">
      <div>
        <h1 className="text-[15px] font-semibold text-foreground tracking-tight">{title}</h1>
        <p className="text-[12.5px] text-muted-foreground mt-1 max-w-xl">{description}</p>
      </div>
      {meta && <div className="flex items-center gap-2 flex-shrink-0">{meta}</div>}
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function AgentClientContent() {
  const searchParams = useSearchParams();
  const rawTab       = searchParams.get('tab') as AgentSection;
  const activeSection: AgentSection =
    rawTab && ['persona', 'voice', 'documents', 'products', 'integration'].includes(rawTab)
      ? rawTab
      : 'persona';

  const fallbackKey = demoProfile?.business?.publishableKey ?? null;
  const fallbackName = demoProfile?.business?.name ?? 'My Store';

  const [publishableKey, setPublishableKey] = useState<string | null>(
    DEMO_MODE_ENABLED ? fallbackKey : null,
  );
  const [businessName, setBusinessName]     = useState(
    DEMO_MODE_ENABLED ? fallbackName : 'My Store',
  );
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [docs, setDocs]             = useState<KnowledgeDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const loadDocs = useCallback(() => {
    getKnowledgeDocsApi()
      .then((data) => {
        setDocs(withDemoFallback(data, demoKnowledgeDocs));
      })
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
        const name = withDemoFallback(res?.business?.name ?? null, fallbackName);
        if (name) setBusinessName(name);
      })
      .catch(() => {
        setPublishableKey(withDemoFallback(null, fallbackKey));
      });
    loadDocs();
  }, [loadDocs, fallbackKey, fallbackName]);

  const hasKey = Boolean(publishableKey);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">

      {/* ── Top Header ── */}
      <TopHeader
        title="ORA Agent"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-surface-high text-muted-foreground border border-border select-none">
            <Database size={10} />
            {docs.length} docs
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              <Radio size={12} className="animate-pulse" />
              Talk to ORA
            </button>
          </div>
        }
      />

      {/* ── Widget Active Status Strip (Shown across all Agent tabs) ── */}
      <div className="flex items-center justify-between px-6 lg:px-8 py-2.5 bg-surface-high/40 border-b border-border text-[12px] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                hasKey
                  ? 'bg-[color:var(--status-online)] animate-pulse-ring'
                  : 'bg-[color:var(--status-error)]',
              )}
            />
            <span className="font-semibold text-foreground">
              {hasKey ? 'Widget Active' : 'No Active Key'}
            </span>
          </div>
          <span className="text-border">·</span>
          <span className="text-muted-foreground font-mono font-medium">
            {businessName}
          </span>
        </div>

        {activeSection !== 'integration' && (
          <Link
            href="/agent?tab=integration"
            className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <span>Widget Embed & API Keys</span>
            <ExternalLink size={11} />
          </Link>
        )}
      </div>

      {/* ── In-Page Agent Tabs Navigation ── */}
      <div className="flex items-center gap-1.5 px-6 lg:px-8 pt-4 pb-0 bg-background border-b border-border overflow-x-auto no-scrollbar flex-shrink-0">
        {AGENT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/agent?tab=${tab.id}`}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                isActive
                  ? 'border-primary text-foreground font-semibold bg-surface-high/30 rounded-t-md'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-high/20 rounded-t-md',
              )}
            >
              <Icon size={14} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Full-Width Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar bg-background">
        <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-8 py-6 flex flex-col gap-6">

          {/* ── Persona & Archetype section ── */}
          {activeSection === 'persona' && (
            <>
              <SectionHeader
                title="Agent Persona & Business Archetype"
                description="Configure ORA's business model (Portfolio, E-Commerce, SaaS, Agency), brand voice description, creator bio, and custom directives."
              />
              <AgentPersonaTab />
            </>
          )}

          {/* ── Voice section ── */}
          {activeSection === 'voice' && (
            <>
              <SectionHeader
                title="Talk to ORA"
                description="Real-time bidirectional voice assistant. Ask product questions or speak store knowledge directly into ORA's memory."
              />
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-7">
                  <VoiceFeedTab
                    publishableKey={publishableKey || undefined}
                    onFed={loadDocs}
                  />
                </div>
                <div className="xl:col-span-5">
                  <KnowledgeFeedList
                    docs={docs}
                    loading={docsLoading}
                    onDeleted={(id) => setDocs((c) => c.filter((d) => d._id !== id))}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Documents section ── */}
          {activeSection === 'documents' && (
            <>
              <SectionHeader
                title="Store & Policy Documents"
                description="Upload store policies, return conditions, warranty guidelines, FAQs, and reference documents. ORA indexes these to answer customer questions accurately."
              />
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-7">
                  <DocumentsFeedTab onFed={loadDocs} />
                </div>
                <div className="xl:col-span-5">
                  <KnowledgeFeedList
                    docs={docs}
                    loading={docsLoading}
                    onDeleted={(id) => setDocs((c) => c.filter((d) => d._id !== id))}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Products section ── */}
          {activeSection === 'products' && (
            <>
              <SectionHeader
                title="Product Catalog"
                description="View and manage items synced from your storefront or uploaded files."
              />
              <ProductDetailsFeedTab onFed={loadDocs} />
            </>
          )}

          {/* ── Integration section ── */}
          {activeSection === 'integration' && (
            <>
              <SectionHeader
                title="Integration & API Keys"
                description="Manage your publishable widget key and embed ORA on your storefront. Copy the snippet for HTML, Shopify, WooCommerce, or React."
              />
              <MerchantCredentialsCard
                businessName={businessName}
                publishableKey={publishableKey}
                onKeyChange={(newKey) => setPublishableKey(newKey)}
                onOpenTestModal={() => setIsVoiceModalOpen(true)}
              />
            </>
          )}

        </div>
      </div>

      {/* Voice test modal */}
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
