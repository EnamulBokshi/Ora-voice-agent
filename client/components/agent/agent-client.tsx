'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgentHeader } from './agent-header';
import { MerchantCredentialsCard } from './merchant-credentials-card';
import { VoiceTestModal } from './modals/voice-test-modal';
import { VoiceFeedTab } from './feed/voice-feed-tab';
import { DocumentsFeedTab } from './feed/documents-feed-tab';
import { ProductDetailsFeedTab } from './feed/product-details-feed-tab';
import { KnowledgeFeedList } from './feed/knowledge-feed-list';
import { getMeApi } from '@/services/auth-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { KnowledgeDoc } from '@/types/knowledge';

type AgentSection = 'voice' | 'documents' | 'products';

function AgentClientContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') as AgentSection;
  const activeSection: AgentSection =
    rawTab && ['voice', 'documents', 'products'].includes(rawTab) ? rawTab : 'voice';

  const [publishableKey, setPublishableKey] = useState('biz_live_982c61c23c07d6df12d49a3c');
  const [businessName, setBusinessName] = useState("enam's Store");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const loadDocs = useCallback(() => {
    getKnowledgeDocsApi()
      .then(setDocs)
      .catch((err) => console.error('Failed to load knowledge docs:', err))
      .finally(() => setDocsLoading(false));
  }, []);

  useEffect(() => {
    getMeApi()
      .then((res) => {
        if (res?.business?.publishableKey) setPublishableKey(res.business.publishableKey);
        if (res?.business?.name) setBusinessName(res.business.name);
      })
      .catch(() => {});
    loadDocs();
  }, [loadDocs]);

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 w-full bg-background">
      <div className="mx-auto flex min-h-full max-w-[1440px] flex-col gap-6">

        {/* ── Page Header ── */}
        <AgentHeader
          activeSection={activeSection}
          totalDocs={docs.length}
        />

        {/* ── Merchant Store Access & Integration Hub ── */}
        <MerchantCredentialsCard
          businessName={businessName}
          publishableKey={publishableKey}
          onOpenTestModal={() => setIsVoiceModalOpen(true)}
        />

        {/* ── View 1: Talk to ORA (Live Bidirectional Voice Assistant) + Knowledge Index ── */}
        {activeSection === 'voice' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-7">
              <VoiceFeedTab
                publishableKey={publishableKey}
                onFed={loadDocs}
              />
            </div>

            <div className="xl:col-span-5">
              <KnowledgeFeedList
                docs={docs}
                loading={docsLoading}
                onDeleted={(id) => setDocs((current) => current.filter((doc) => doc._id !== id))}
              />
            </div>
          </div>
        )}

        {/* ── View 2: Documents Feed + Knowledge Index ── */}
        {activeSection === 'documents' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-7 rounded-md border border-border bg-surface-container p-5 lg:p-6">
              <div className="mb-5 pb-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Upload Business Documents</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a document category and upload PDFs, text files, or manuals.
                </p>
              </div>
              <DocumentsFeedTab onFed={loadDocs} />
            </div>

            <div className="xl:col-span-5">
              <KnowledgeFeedList
                docs={docs}
                loading={docsLoading}
                onDeleted={(id) => setDocs((current) => current.filter((doc) => doc._id !== id))}
              />
            </div>
          </div>
        )}

        {/* ── View 3: Product Catalog Mirror & Ingestion Hub ── */}
        {activeSection === 'products' && (
          <div className="rounded-2xl border border-border bg-surface-container p-5 lg:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Product Catalog Mirror & Ingestion Hub
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Synchronize and inspect your live catalog. Mirrored SKUs are auto-vectorized in Gemini for real-time AI voice & text discovery.
                </p>
              </div>
            </div>
            <ProductDetailsFeedTab onFed={loadDocs} />
          </div>
        )}

        {/* ── Direct Voice Test Modal ── */}
        <VoiceTestModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          publishableKey={publishableKey}
        />

      </div>
    </div>
  );
}

export function AgentClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading Store Knowledge...</div>}>
      <AgentClientContent />
    </Suspense>
  );
}

