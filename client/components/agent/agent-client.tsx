'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgentHeader } from './agent-header';
import { VoiceTestModal } from './modals/voice-test-modal';
import { VoiceFeedTab } from './feed/voice-feed-tab';
import { DocumentsFeedTab } from './feed/documents-feed-tab';
import { ProductDetailsFeedTab } from './feed/product-details-feed-tab';
import { KnowledgeFeedList } from './feed/knowledge-feed-list';
import { getMeApi } from '@/services/auth-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { KnowledgeDoc } from '@/types/knowledge';
import { Mic, FileText, Package } from 'lucide-react';

type AgentSection = 'voice' | 'documents' | 'products';

const SECTION_TITLE: Record<AgentSection, { title: string; desc: string; icon: React.ReactNode }> = {
  voice: {
    title: 'Voice Notes & Guidelines',
    desc: 'Speak directly into your mic to record store guidelines, answers, and context.',
    icon: <Mic size={18} className="text-primary" />,
  },
  documents: {
    title: 'Store & Policy Documents',
    desc: 'Upload store policies, FAQs, product manuals, or PDF/text reference files.',
    icon: <FileText size={18} className="text-primary" />,
  },
  products: {
    title: 'Product Information',
    desc: 'Add product specifications, pricing details, sizing notes, and inventory rules.',
    icon: <Package size={18} className="text-primary" />,
  },
};

function AgentClientContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') as AgentSection;
  const activeSection: AgentSection =
    rawTab && ['voice', 'documents', 'products'].includes(rawTab) ? rawTab : 'voice';

  const [isVoiceTestModalOpen, setIsVoiceTestModalOpen] = useState(false);
  const [publishableKey, setPublishableKey] = useState('biz_live_demo');
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
      })
      .catch(() => {});
    loadDocs();
  }, [loadDocs]);

  const activeMeta = SECTION_TITLE[activeSection];

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 w-full">
      <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-5">
        <AgentHeader onOpenVoiceTest={() => setIsVoiceTestModalOpen(true)} />

        <div className="rounded-2xl border border-border bg-surface-container overflow-hidden">
          {/* Active section banner header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface-low">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              {activeMeta.icon}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{activeMeta.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{activeMeta.desc}</p>
            </div>
          </div>

          <div className="p-6">
            {activeSection === 'voice' && <VoiceFeedTab onFed={loadDocs} />}
            {activeSection === 'documents' && <DocumentsFeedTab onFed={loadDocs} />}
            {activeSection === 'products' && <ProductDetailsFeedTab onFed={loadDocs} />}
          </div>
        </div>

        <KnowledgeFeedList
          docs={docs}
          loading={docsLoading}
          onDeleted={(id) => setDocs((current) => current.filter((doc) => doc._id !== id))}
        />
      </div>

      <VoiceTestModal
        isOpen={isVoiceTestModalOpen}
        onClose={() => setIsVoiceTestModalOpen(false)}
        publishableKey={publishableKey}
      />
    </div>
  );
}

export function AgentClient() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading ORA Agent...</div>}>
      <AgentClientContent />
    </Suspense>
  );
}
