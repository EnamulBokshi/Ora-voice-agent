'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, ArrowRight, ExternalLink, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSetupProgress, type SetupStepId } from '@/hooks/use-setup-progress';
import { SetupSectionNav, type SetupArchetype, ARCHETYPES } from './setup-section-nav';
import { SetupArchIntroPage } from './setup-arch-intro-page';
import { PersonaPreview } from './previews/persona-preview';
import { KnowledgePreview } from './previews/knowledge-preview';
import { IntegrationPreview } from './previews/integration-preview';
import { VoiceTestPreview } from './previews/voice-test-preview';
import { VoiceTestModal } from '@/components/agent/modals/voice-test-modal';
import { getMeApi } from '@/services/auth-service';
import { demoProfile } from '@/lib/demo-data';

// ─── Step config ──────────────────────────────────────────────────────────────

type StepConfig = {
  id: SetupStepId;
  stepNumber: number;
  stepLabel: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
  ctaAction?: 'markComplete' | 'copySnippet' | 'launchVoice';
  learnMoreHref?: string;
  learnMoreText?: string;
};

const STEP_CONFIGS: Record<SetupStepId, StepConfig> = {
  persona: {
    id: 'persona', stepNumber: 1, stepLabel: 'Persona',
    title: 'Set up your AI sales persona & archetype',
    description: "Select your store archetype and configure brand voice tone. Simulates real shopper dialogues so you can preview ORA's personality before going live.",
    ctaText: 'Mark as Complete', ctaAction: 'markComplete',
    learnMoreHref: '/agent?role=voice', learnMoreText: 'Agent voice settings',
  },
  integration: {
    id: 'integration', stepNumber: 2, stepLabel: 'Embed',
    title: 'Embed the widget into your storefront',
    description: "Add ORA to Shopify, WooCommerce, or any React/HTML site with a single script tag. Connects your storefront to ORA's live voice engine, chat, and cart tools.",
    ctaText: 'Copy Snippet', ctaAction: 'copySnippet',
    learnMoreHref: '/agent?role=documents', learnMoreText: 'Store knowledge',
  },
  knowledge: {
    id: 'knowledge', stepNumber: 3, stepLabel: 'Knowledge',
    title: 'Sync your catalog & store documents',
    description: "Upload policies, FAQs, and product data. ORA's RAG engine vectorises your content for accurate, sub-85ms answers — no hallucinations.",
    ctaText: 'Upload Documents', ctaHref: '/agent?role=documents&view=feed',
    learnMoreHref: '/agent?role=products', learnMoreText: 'Product catalog',
  },
  voice_test: {
    id: 'voice_test', stepNumber: 4, stepLabel: 'Voice Test',
    title: 'Run a live voice test before launching',
    description: 'Have a real speech-to-speech conversation with ORA. Test product recommendations, navigation commands, and checkout flows before going live.',
    ctaText: 'Start Voice Test', ctaAction: 'launchVoice',
    learnMoreHref: '/agent?role=voice&view=feed', learnMoreText: 'Voice workspace',
  },
};

const ALL_STEP_IDS: SetupStepId[] = ['persona', 'integration', 'knowledge', 'voice_test'];
const VALID_ARCHETYPES = ['ecommerce', 'saas', 'agency', 'portfolio', 'general'];

// ─── All Store Types hub ───────────────────────────────────────────────────────

function SetupHub() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const FAQS = [
    { q: 'Which store type should I choose?', a: 'Choose the archetype that best matches your business model. If you sell physical or digital products, choose E-Commerce. For software, choose SaaS. You can reconfigure at any time.' },
    { q: 'Are the setup steps the same for all archetypes?', a: 'The 4 configuration steps (Persona, Widget Embed, Knowledge, Voice Test) are the same for all archetypes. Each archetype simply gets a tailored intro and persona defaults.' },
    { q: 'Can I change my archetype later?', a: 'Yes. You can re-run the Persona setup step at any time to switch your store archetype and update ORA\'s behavior.' },
    { q: 'How long does setup take?', a: 'Most stores are live in 3–5 minutes. The voice test adds another 2 minutes but is strongly recommended before going live.' },
  ];

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
      <div className="w-full px-8 lg:px-10 pt-8 pb-14">

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-bold text-foreground tracking-tight leading-tight mb-2">
            One agent for every type of store
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-md mx-auto">
            Choose your store archetype. ORA adapts its persona, knowledge, and selling strategy for your specific business.{' '}
            <span className="text-primary cursor-pointer hover:underline">Learn more.</span>
          </p>
        </div>

        {/* Archetype cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {ARCHETYPES.map((arch) => (
            <Link
              key={arch.id}
              href={`/setup?archetype=${arch.id}`}
              className="group flex flex-col rounded-lg border border-border/25 bg-surface-container overflow-hidden hover:border-border/60 transition-all duration-150"
            >
              {/* Color block header */}
              <div className={cn(
                'w-full h-[100px] flex items-center justify-center flex-shrink-0',
                arch.id === 'ecommerce' ? 'bg-primary/[0.08]' :
                arch.id === 'saas'      ? 'bg-[color:var(--ora-info)]/[0.08]' :
                arch.id === 'agency'    ? 'bg-[color:var(--ora-warning)]/[0.08]' :
                arch.id === 'portfolio' ? 'bg-[color:var(--ora-success)]/[0.08]' :
                'bg-muted/[0.08]'
              )}>
                <arch.Icon size={32} className={arch.iconClass} />
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <arch.Icon size={13} className={arch.iconClass} />
                  <h2 className={cn('text-[13.5px] font-semibold', arch.iconClass)}>
                    {arch.label}
                  </h2>
                </div>
                <p className="text-[11.5px] text-muted-foreground mb-4 leading-snug flex-1">
                  {arch.id === 'ecommerce' ? 'Catalog search, live stock & cart recovery'     :
                   arch.id === 'saas'      ? 'Subscription tiers, features & trial conversion' :
                   arch.id === 'agency'    ? 'Service packages, scoping & booking'             :
                   arch.id === 'portfolio' ? 'Showcase projects & direct bookings'             :
                   'Store policies, RAG search & enterprise support'}
                </p>
                <div>
                  <span className="inline-flex items-center h-7 px-3 rounded border border-border/50 text-[11.5px] font-medium text-foreground group-hover:bg-surface-high group-hover:border-border transition-colors">
                    Get started
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* More coming soon */}
          <div className="flex items-center gap-3 border border-dashed border-border/40 py-4 px-4 rounded-lg bg-transparent md:col-span-2">
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20 flex-shrink-0" />
            <span className="text-[12px] text-muted-foreground font-medium">More store archetypes coming soon</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8">
          <p className="text-[13px] font-semibold text-foreground text-center mb-5">
            Frequently asked questions
          </p>
          <div className="divide-y divide-border/40">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-3.5 text-left hover:opacity-75 transition-opacity"
                >
                  <span className="text-[13px] font-medium text-foreground">{faq.q}</span>
                  <ChevronDown
                    size={13}
                    className={cn('text-muted-foreground flex-shrink-0 transition-transform duration-150 ml-4', openFaq === i && 'rotate-180')}
                  />
                </button>
                {openFaq === i && (
                  <div className="pb-4 animate-in fade-in duration-150">
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inner component (reads searchParams) ─────────────────────────────────────

function SetupGuideClientInner() {
  const searchParams = useSearchParams();

  const rawArch = searchParams.get('archetype');
  const rawStep = searchParams.get('step');

  const activeArchetype: SetupArchetype | null =
    rawArch && VALID_ARCHETYPES.includes(rawArch) ? (rawArch as SetupArchetype) : null;

  const activeStep: SetupStepId | null =
    rawStep && ALL_STEP_IDS.includes(rawStep as SetupStepId) ? (rawStep as SetupStepId) : null;

  const {
    progress, loading, toggleStep, markStepComplete, isAllCompleted,
  } = useSetupProgress();

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [publishableKey, setPublishableKey]     = useState<string>('biz_live_demo');

  useEffect(() => {
    getMeApi()
      .then((res) => {
        if (res?.business?.publishableKey) setPublishableKey(res.business.publishableKey);
        else if (demoProfile?.business?.publishableKey) setPublishableKey(demoProfile.business.publishableKey);
      })
      .catch(() => {
        if (demoProfile?.business?.publishableKey) setPublishableKey(demoProfile.business.publishableKey);
      });
  }, []);

  const handleLaunchVoice = useCallback(() => {
    setIsVoiceModalOpen(true);
    markStepComplete('voice_test');
  }, [markStepComplete]);

  const handleCta = useCallback((config: StepConfig) => {
    if (config.ctaAction === 'markComplete') markStepComplete(config.id);
    if (config.ctaAction === 'copySnippet') {
      navigator.clipboard.writeText(
        `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/ora-widget.js" data-ora-key="${publishableKey}" defer></script>`
      );
      markStepComplete('integration');
    }
    if (config.ctaAction === 'launchVoice') handleLaunchVoice();
  }, [markStepComplete, publishableKey, handleLaunchVoice]);

  const getPreview = (id: SetupStepId) => {
    if (id === 'persona')     return <PersonaPreview onSaved={() => markStepComplete('persona')} />;
    if (id === 'integration') return <IntegrationPreview publishableKey={publishableKey} onCopied={() => markStepComplete('integration')} />;
    if (id === 'knowledge')   return <KnowledgePreview />;
    if (id === 'voice_test')  return <VoiceTestPreview onOpenTestModal={handleLaunchVoice} />;
  };

  const activeConfig = activeStep ? STEP_CONFIGS[activeStep] : null;
  const isCompleted  = activeStep ? progress[activeStep] : false;

  const renderContent = () => {
    // No archetype → hub
    if (!activeArchetype) return <SetupHub />;
    // Archetype but no step → intro page
    if (!activeStep) return <SetupArchIntroPage archetype={activeArchetype} />;

    // Step page
    return (
      <>
        {/* Step header */}
        <div className="flex-shrink-0 px-8 pt-7 pb-6 border-b border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {activeConfig!.stepNumber}. {activeConfig!.stepLabel}
            </p>
            {isAllCompleted && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded-full bg-primary/10">
                <CheckCircle2 size={10} /> All complete
              </span>
            )}
          </div>

          <div className="flex items-start gap-3 mb-2">
            <button
              type="button"
              onClick={() => toggleStep(activeStep!)}
              title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
              className={cn(
                'mt-1 w-[18px] h-[18px] flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer',
                isCompleted ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60 hover:border-primary/60',
              )}
            >
              <Check size={9} strokeWidth={3} className={isCompleted ? 'opacity-100' : 'opacity-0'} />
            </button>
            <h1 className={cn('text-[20px] font-bold tracking-tight leading-snug', isCompleted ? 'text-muted-foreground' : 'text-foreground')}>
              {activeConfig!.title}
            </h1>
          </div>

          <p className="text-[13px] text-muted-foreground leading-relaxed ml-[30px] mb-4 max-w-2xl">
            {activeConfig!.description}
          </p>

          <div className="flex items-center gap-2 ml-[30px]">
            {activeConfig!.ctaText && (
              activeConfig!.ctaHref ? (
                <Link href={activeConfig!.ctaHref} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11.5px] font-semibold hover:bg-primary-hover transition-colors">
                  {activeConfig!.ctaText} <ArrowRight size={10} />
                </Link>
              ) : (
                <button type="button" onClick={() => handleCta(activeConfig!)} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11.5px] font-semibold hover:bg-primary-hover transition-colors cursor-pointer">
                  {activeConfig!.ctaText} <ArrowRight size={10} />
                </button>
              )
            )}
            {activeConfig!.learnMoreHref && (
              <Link href={activeConfig!.learnMoreHref} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border/60 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors">
                {activeConfig!.learnMoreText || 'Learn more'} <ExternalLink size={9} />
              </Link>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-6">
          {getPreview(activeStep!)}
        </div>
      </>
    );
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-background">
      <SetupSectionNav activeArchetype={activeArchetype} activeStep={activeStep} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderContent()}
      </div>

      <VoiceTestModal isOpen={isVoiceModalOpen} onClose={() => setIsVoiceModalOpen(false)} publishableKey={publishableKey} />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function SetupGuideClient() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading setup…</div>}>
      <SetupGuideClientInner />
    </Suspense>
  );
}
