'use client';

import { useCallback, useEffect, useState } from 'react';
import { AgentHeader } from './agent-header';
import { VoiceTestModal } from './modals/voice-test-modal';
import { VoiceFeedTab } from './feed/voice-feed-tab';
import { DocumentsFeedTab } from './feed/documents-feed-tab';
import { TextFeedTab } from './feed/text-feed-tab';
import { KnowledgeFeedList } from './feed/knowledge-feed-list';
import { FeedTabId } from './feed/feed-types';
import { getMeApi } from '@/services/auth-service';
import { getAgentConfigApi, updateAgentConfigApi } from '@/services/agent-config-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { KnowledgeDoc } from '@/types/knowledge';
import { cn } from '@/lib/utils';
import { Mic, FileText, PenLine, Sliders, CheckCircle2, Loader2 } from 'lucide-react';

const TABS: { id: FeedTabId; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'voice', label: 'Voice', icon: <Mic size={15} />, hint: 'Speak your info — ORA transcribes it' },
  { id: 'documents', label: 'Documents', icon: <FileText size={15} />, hint: 'Upload business documents' },
  { id: 'text', label: 'Text', icon: <PenLine size={15} />, hint: 'Type or paste info directly' },
];

export function AgentClient() {
  const [activeTab, setActiveTab] = useState<FeedTabId>('voice');
  const [isVoiceTestModalOpen, setIsVoiceTestModalOpen] = useState(false);
  const [publishableKey, setPublishableKey] = useState<string>('biz_live_demo');

  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  const [brandVoice, setBrandVoice] = useState<string>(
    'Friendly, articulate, and empathetic e-commerce sales assistant. Knowledgeable about products, pricing, and shipping policies.',
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadDocs = useCallback(() => {
    getKnowledgeDocsApi()
      .then(setDocs)
      .catch((err) => console.error('Failed to load knowledge docs:', err))
      .finally(() => setDocsLoading(false));
  }, []);

  useEffect(() => {
    getMeApi()
      .then((res) => {
        if (res?.business?.publishableKey) {
          setPublishableKey(res.business.publishableKey);
        }
      })
      .catch(() => {});

    getAgentConfigApi()
      .then((data) => {
        if (data?.config?.brandVoiceDescription) {
          setBrandVoice(data.config.brandVoiceDescription);
        }
      })
      .catch((err) => console.error('Failed to load agent config:', err))
      .finally(() => setIsLoadingConfig(false));

    loadDocs();
  }, [loadDocs]);

  const handleSaveTuning = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateAgentConfigApi({ brandVoiceDescription: brandVoice });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-6">
      <AgentHeader onOpenVoiceTest={() => setIsVoiceTestModalOpen(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Feed tabs */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface-container overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-border bg-surface-low">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 px-4 py-3.5 border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-foreground bg-surface-container'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  <span className={activeTab === tab.id ? 'text-primary' : ''}>{tab.icon}</span>
                  {tab.label}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:block">{tab.hint}</span>
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div className="p-6">
            {activeTab === 'voice' && <VoiceFeedTab onFed={loadDocs} />}
            {activeTab === 'documents' && <DocumentsFeedTab onFed={loadDocs} />}
            {activeTab === 'text' && <TextFeedTab onFed={loadDocs} />}
          </div>
        </div>

        {/* Right: What ORA knows */}
        <KnowledgeFeedList
          docs={docs}
          loading={docsLoading}
          onDeleted={(id) => setDocs((prev) => prev.filter((d) => d._id !== id))}
        />
      </div>

      {/* Persona tuning */}
      <div className="rounded-2xl border border-border bg-surface-container p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground">Brand Voice & Persona</h3>
              <p className="text-xs text-muted-foreground">
                How ORA should greet customers, handle inquiries, and suggest products.
              </p>
            </div>
          </div>

          {isSaved && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 animate-fade-in">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
        </div>

        <textarea
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Describe how ORA should greet customers, handle sales inquiries, and suggest products..."
        />

        {saveError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {saveError}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSaveTuning}
            disabled={isSaving || isLoadingConfig}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-surface-high hover:bg-surface-bright text-foreground transition-colors border border-border flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Persona</span>
            )}
          </button>
        </div>
      </div>

      <VoiceTestModal
        isOpen={isVoiceTestModalOpen}
        onClose={() => setIsVoiceTestModalOpen(false)}
        publishableKey={publishableKey}
      />
    </div>
  );
}
