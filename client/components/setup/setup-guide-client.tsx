'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ArrowRight, ArrowLeft, ExternalLink, CheckCircle2, ChevronDown, Layers } from 'lucide-react';
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
    id: 'voice_test', stepNumber: 4, stepLabel: 'Test ORA Live',
    title: 'Test ORA live before launching',
    description: 'Speak directly with ORA in real-time. Test product recommendations, catalog queries, and checkout guidance before going live on your store.',
    ctaText: 'Test ORA Live', ctaAction: 'launchVoice',
    learnMoreHref: '/agent?role=voice&view=feed', learnMoreText: 'Voice workspace',
  },
};

const ALL_STEP_IDS: SetupStepId[] = ['persona', 'integration', 'knowledge', 'voice_test'];
const VALID_ARCHETYPES = ['ecommerce', 'saas', 'agency', 'portfolio', 'general'];

import Image from 'next/image';

const ARCHETYPE_IMAGES: Record<SetupArchetype, string> = {
  ecommerce: '/previews/ecom-hero.jpg',
  saas: '/previews/saas-hero.jpg',
  agency: '/previews/agency-hero.jpg',
  portfolio: '/previews/portfolio-hero.jpg',
  general: '/previews/enterprise-hero.jpg',
};

// ─── Setup Hub (Archetype Selection Screen) ──────────────────────────────────

function SetupHub() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'Which archetype should I choose?',
      a: 'Choose the archetype that best matches your primary business model. If you sell physical or digital goods, choose E-Commerce. For software products, choose SaaS. You can reconfigure and switch archetypes at any time.',
    },
    {
      q: 'Are the configuration steps the same for all store archetypes?',
      a: 'Yes. The 4 core setup steps (Persona & Voice, Widget Embed, Store Knowledge, and Simulation Lab) are identical across all archetypes. Each archetype provides tailored default directives, voice tones, and contextual guidance.',
    },
    {
      q: 'Can I test ORA before embedding the snippet on my live site?',
      a: 'Absolutely. Step 4 lets you run a full interactive voice simulation directly in your browser without adding any code to your store.',
    },
    {
      q: 'How long does full onboarding take?',
      a: 'Most merchants complete configuration in under 2 minutes. Syncing your product catalog or knowledge docs takes less than 60 seconds.',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
      <div className="max-w-5xl mx-auto px-8 lg:px-12 pt-10 pb-20">

        {/* ── Hub Hero Header ── */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <p className="text-[11.5px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Getting Started · Step 1 of 2
          </p>
          <h1 className="text-[32px] sm:text-[40px] font-semibold text-foreground tracking-tight leading-[1.15] font-serif mb-3.5">
            Select your store archetype
          </h1>
          <p className="text-[14.5px] text-muted-foreground leading-relaxed">
            Choose your business model below to configure ORA with industry-tailored sales personas, knowledge retrieval models, and conversion tools.
          </p>
          <p className="text-[13px] text-muted-foreground/80 mt-2">
            Need help choosing? Read our{' '}
            <Link href="/docs" className="text-foreground dark:text-[#C8F031] font-medium underline underline-offset-4">
              Archetype Guide
            </Link>
            .
          </p>
        </div>

        {/* ── Symmetric Archetype Grid (2 cards per row) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
          {ARCHETYPES.map((arch) => {
            const { Icon } = arch;
            const imgSrc = ARCHETYPE_IMAGES[arch.id];

            return (
              <div
                key={arch.id}
                onClick={() => router.push(`/setup?archetype=${arch.id}`)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-surface-lowest/70 hover:border-border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md min-h-[300px]"
              >
                {/* Top Image Preview Frame */}
                <div className="relative w-full h-44 bg-surface-container/50 overflow-hidden border-b border-border/40">
                  <Image
                    src={imgSrc}
                    alt={arch.label}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-lowest/90 via-transparent to-transparent" />
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-foreground font-semibold px-2.5 py-1 rounded-md bg-surface-lowest/90 backdrop-blur-md border border-border/60 shadow-xs">
                      {arch.category}
                    </span>
                  </div>
                </div>

                {/* Bottom Content Row */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 group-hover:bg-surface-highest transition-colors">
                      <Icon size={18} className="text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-foreground group-hover:text-foreground transition-colors truncate">
                        {arch.label}
                      </h3>
                      <p className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                        {arch.id === 'ecommerce' && 'Physical & digital retail products with cart tools'}
                        {arch.id === 'saas' && 'Subscription software, API tiers & onboarding flows'}
                        {arch.id === 'agency' && 'Client consulting, project scoping & lead intake'}
                        {arch.id === 'portfolio' && 'Creators, studios & personalized client demos'}
                        {arch.id === 'general' && 'Support desks, documentation & general enterprise'}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center flex-shrink-0 text-muted-foreground group-hover:text-foreground group-hover:border-foreground/50 transition-colors">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* More coming soon */}
          <div className="flex flex-col items-center justify-center gap-2.5 border border-dashed border-border/50 p-6 rounded-2xl bg-surface-lowest/20 text-center min-h-[220px]">
            <div className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center border border-border/40 text-muted-foreground">
              <Layers size={14} className="text-foreground dark:text-[#C8F031]" />
            </div>
            <span className="text-[14px] text-foreground font-semibold">More store archetypes</span>
            <span className="text-[12.5px] text-muted-foreground/80 max-w-[220px] leading-relaxed">
              Custom business models and multi-brand routing coming in upcoming releases.
            </span>
          </div>
        </div>

        {/* ── Hub FAQ Section ── */}
        <div className="pt-10 border-t border-border/40 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground dark:text-[#C8F031]">
              Frequently Asked Questions
            </p>
            <div className="h-px bg-border/40 flex-1 ml-2" />
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border/50 bg-surface-lowest/40 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-4.5 text-left text-[14px] font-medium text-foreground hover:bg-surface-high/30 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={cn('text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-4', isOpen && 'rotate-180')}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4.5 pb-4.5 pt-1 text-[13px] text-muted-foreground leading-relaxed border-t border-border/30">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Setup Guide Client Main ──────────────────────────────────────────────────

function SetupGuideClientInner() {
  const router = useRouter();
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
  const [isWidgetActive, setIsWidgetActive]     = useState<boolean>(true);

  useEffect(() => {
    getMeApi()
      .then((res) => {
        if (res?.business?.publishableKey) setPublishableKey(res.business.publishableKey);
        else if (demoProfile?.business?.publishableKey) setPublishableKey(demoProfile.business.publishableKey);
        if (typeof res?.business?.isWidgetActive === 'boolean') {
          setIsWidgetActive(res.business.isWidgetActive);
        } else if (typeof demoProfile?.business?.isWidgetActive === 'boolean') {
          setIsWidgetActive(demoProfile.business.isWidgetActive);
        }
      })
      .catch(() => {
        if (demoProfile?.business?.publishableKey) setPublishableKey(demoProfile.business.publishableKey);
        if (typeof demoProfile?.business?.isWidgetActive === 'boolean') {
          setIsWidgetActive(demoProfile.business.isWidgetActive);
        }
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
    if (id === 'persona')     return <PersonaPreview archetype={activeArchetype} onSaved={() => markStepComplete('persona')} />;
    if (id === 'integration') return <IntegrationPreview publishableKey={publishableKey} isWidgetActive={isWidgetActive} onCopied={() => markStepComplete('integration')} />;
    if (id === 'knowledge')   return <KnowledgePreview onCompleted={() => markStepComplete('knowledge')} />;
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
    const currentArch = ARCHETYPES.find((a) => a.id === activeArchetype) || ARCHETYPES[0];
    const ArchIcon = currentArch.Icon;
    const currentStepIndex = ALL_STEP_IDS.indexOf(activeStep!);
    const prevStep = currentStepIndex > 0 ? ALL_STEP_IDS[currentStepIndex - 1] : null;
    const nextStep = currentStepIndex < ALL_STEP_IDS.length - 1 ? ALL_STEP_IDS[currentStepIndex + 1] : null;

    return (
      <div className="flex-1 overflow-y-auto no-scrollbar bg-background">
        <div className="w-full px-4 sm:px-6 py-5 space-y-6 pb-16">

          {/* ── Editorial Step Header ── */}
          <div className="border-b border-border/40 pb-5 mb-6">
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0">
                  <ArchIcon size={14} className="text-foreground" />
                </div>
                <span className="text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground">
                  {currentArch.label} · Step {activeConfig!.stepNumber} of {ALL_STEP_IDS.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleStep(activeStep!)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-7.5 px-3 rounded-md border text-[12px] font-medium transition-colors cursor-pointer',
                    isCompleted
                      ? 'bg-surface-high border-border/70 text-foreground font-semibold'
                      : 'border-border/60 bg-surface-high/40 text-muted-foreground hover:text-foreground hover:bg-surface-high',
                  )}
                >
                  <Check size={12} strokeWidth={isCompleted ? 3 : 2} className={cn(isCompleted ? 'text-foreground dark:text-[#C8F031]' : 'text-muted-foreground')} />
                  <span>{isCompleted ? 'Completed' : 'Mark complete'}</span>
                </button>
              </div>
            </div>

            <h1 className="text-[24px] sm:text-[28px] font-semibold text-foreground tracking-tight leading-[1.2] font-serif mb-1.5">
              {activeConfig!.title}
            </h1>
            <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
              {activeConfig!.description}
            </p>
          </div>

          {/* ── Section Eyebrow Divider ── */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Configure & Test
            </p>
            <div className="h-px bg-border/30 flex-1 ml-2" />
          </div>

          {/* ── Main Configuration Workspace ── */}
          <div className="mb-10">
            {getPreview(activeStep!)}
          </div>

          {/* ── Step Navigation Footer ── */}
          <div className="flex items-center justify-between pt-5 border-t border-border/40">
            {prevStep ? (
              <button
                type="button"
                onClick={() => router.push(`/setup?archetype=${activeArchetype}&step=${prevStep}`)}
                className="inline-flex items-center gap-2 h-8 px-3.5 rounded-md border border-border/60 bg-surface-high/40 hover:bg-surface-high text-[12px] font-medium text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft size={12} />
                <span>Previous Step</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push(`/setup?archetype=${activeArchetype}`)}
                className="inline-flex items-center gap-2 h-8 px-3.5 rounded-md border border-border/60 bg-surface-high/40 hover:bg-surface-high text-[12px] font-medium text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft size={12} />
                <span>Overview</span>
              </button>
            )}

            {nextStep ? (
              <button
                type="button"
                onClick={() => {
                  markStepComplete(activeStep!);
                  router.push(`/setup?archetype=${activeArchetype}&step=${nextStep}`);
                }}
                className="inline-flex items-center gap-2 h-8 px-4 rounded-md bg-foreground text-background font-semibold text-[12px] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <span>Next Step</span>
                <ArrowRight size={12} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  markStepComplete(activeStep!);
                  router.push('/dashboard');
                }}
                className="inline-flex items-center gap-2 h-8 px-4 rounded-md bg-foreground text-background font-semibold text-[12px] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
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
