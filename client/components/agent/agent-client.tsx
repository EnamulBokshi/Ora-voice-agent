'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mic,
  FileText,
  Package,
  Key,
  ChevronRight,
  Database,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopHeader } from '@/components/dashboard/top-header';
import { MerchantCredentialsCard } from './merchant-credentials-card';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentSection = 'voice' | 'documents' | 'products' | 'integration';

// ─── Left sub-nav definition ──────────────────────────────────────────────────

interface NavEntry {
  id: AgentSection;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavEntry[] = [
  {
    id: 'voice',
    label: 'Talk to ORA',
    description: 'Real-time voice assistant',
    icon: <Mic size={15} />,
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Policies, FAQs, manuals',
    icon: <FileText size={15} />,
  },
  {
    id: 'products',
    label: 'Product Catalog',
    description: 'SKUs, pricing, variants',
    icon: <Package size={15} />,
  },
];

const INTEGRATION_ITEM: NavEntry = {
  id: 'integration',
  label: 'Integration',
  description: 'API keys & widget embed',
  icon: <Key size={15} />,
};

// ─── Sub-nav link ─────────────────────────────────────────────────────────────

function SubNavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavEntry;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors group',
        isActive
          ? 'bg-surface-high text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
      )}
    >
      {/* Active indicator */}
      <span
        className={cn(
          'mt-0.5 flex-shrink-0 transition-colors',
          isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
        )}
      >
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-[13px] font-medium leading-tight',
            isActive ? 'text-foreground' : '',
          )}
        >
          {item.label}
        </span>
        <span className="block text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
          {item.description}
        </span>
      </span>
      {isActive && (
        <ChevronRight size={13} className="flex-shrink-0 mt-0.5 text-muted-foreground" />
      )}
    </button>
  );
}

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
  const router       = useRouter();
  const searchParams = useSearchParams();
  const rawTab       = searchParams.get('tab') as AgentSection;
  const activeSection: AgentSection =
    rawTab && ['voice', 'documents', 'products', 'integration'].includes(rawTab)
      ? rawTab
      : 'voice';

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

  const navigate = (section: AgentSection) => {
    router.push(`/agent?tab=${section}`);
  };

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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

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

      {/* ── 2-Column Layout: left sub-nav + right content ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-border">

        {/* ── Left: Sub-nav (220px) ── */}
        <nav
          className="w-[220px] flex-shrink-0 flex flex-col overflow-y-auto no-scrollbar bg-surface-lowest py-3 px-2"
          aria-label="Agent sections"
        >
          {/* Content sections */}
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Knowledge
          </p>
          <div className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <SubNavLink
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => navigate(item.id)}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="my-3 h-px bg-border mx-2" />

          {/* Integration section */}
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Setup
          </p>
          <SubNavLink
            item={INTEGRATION_ITEM}
            isActive={activeSection === 'integration'}
            onClick={() => navigate('integration')}
          />

          {/* Key status indicator */}
          <div className="mt-4 mx-2 px-3 py-2.5 rounded-md bg-surface-high border border-border">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  hasKey
                    ? 'bg-[color:var(--status-online)] animate-pulse-ring'
                    : 'bg-[color:var(--status-error)]',
                )}
              />
              <span className="text-[11px] font-medium text-foreground">
                {hasKey ? 'Widget Active' : 'No Active Key'}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {businessName}
            </p>
          </div>
        </nav>

        {/* ── Right: Content Area ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar bg-background">
          <div className="max-w-[1200px] w-full mx-auto px-6 lg:px-8 py-6 flex flex-col gap-6">

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
