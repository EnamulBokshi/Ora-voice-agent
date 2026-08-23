'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  SlidersHorizontal,
  FileText,
  Key,
  Mic,
  ArrowRight,
  ExternalLink,
  Bot,
  Check,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TopHeader } from '@/components/dashboard/top-header';
import { useSetupProgress, SetupStepId } from '@/hooks/use-setup-progress';
import { SetupStepCard } from './setup-step-card';
import { PersonaPreview } from './previews/persona-preview';
import { KnowledgePreview } from './previews/knowledge-preview';
import { IntegrationPreview } from './previews/integration-preview';
import { VoiceTestPreview } from './previews/voice-test-preview';
import { VoiceTestModal } from '@/components/agent/modals/voice-test-modal';
import { getMeApi } from '@/services/auth-service';
import { demoProfile } from '@/lib/demo-data';

interface StepMeta {
  id: SetupStepId;
  stepNumber: number;
  shortLabel: string;
  title: string;
  icon: React.ElementType;
}

const STEPS_ROADMAP: StepMeta[] = [
  {
    id: 'persona',
    stepNumber: 1,
    shortLabel: 'Persona & Voice',
    title: 'Archetype & Directives',
    icon: SlidersHorizontal,
  },
  {
    id: 'integration',
    stepNumber: 2,
    shortLabel: 'Storefront Widget',
    title: 'Embed Snippet',
    icon: Key,
  },
  {
    id: 'knowledge',
    stepNumber: 3,
    shortLabel: 'Store Knowledge',
    title: 'Docs & Catalog Sync',
    icon: FileText,
  },
  {
    id: 'voice_test',
    stepNumber: 4,
    shortLabel: 'Live Simulation',
    title: 'Gemini Voice Test',
    icon: Mic,
  },
];

export function SetupGuideClient() {
  const {
    progress,
    loading,
    totalSteps,
    completedCount,
    isAllCompleted,
    progressPercent,
    toggleStep,
    markStepComplete,
  } = useSetupProgress();

  const [activeStepId, setActiveStepId] = useState<SetupStepId>('persona');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [publishableKey, setPublishableKey] = useState<string>('biz_live_demo');
  const [storeName, setStoreName] = useState<string>('Your Store');

  // Load real merchant publishable key & store name
  useEffect(() => {
    getMeApi()
      .then((res) => {
        if (res?.business?.publishableKey) {
          setPublishableKey(res.business.publishableKey);
        } else if (demoProfile?.business?.publishableKey) {
          setPublishableKey(demoProfile.business.publishableKey);
        }
        if (res?.business?.name) {
          setStoreName(res.business.name);
        }
      })
      .catch(() => {
        if (demoProfile?.business?.publishableKey) {
          setPublishableKey(demoProfile.business.publishableKey);
        }
      });
  }, []);

  // Automatically open the first incomplete step upon loading
  useEffect(() => {
    if (!loading) {
      if (!progress.persona) setActiveStepId('persona');
      else if (!progress.integration) setActiveStepId('integration');
      else if (!progress.knowledge) setActiveStepId('knowledge');
      else if (!progress.voice_test) setActiveStepId('voice_test');
    }
  }, [loading, progress.persona, progress.integration, progress.knowledge, progress.voice_test]);

  const handleLaunchVoice = () => {
    setIsVoiceModalOpen(true);
    markStepComplete('voice_test');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* ── Top Header ── */}
      <TopHeader
        title="Store Setup Guide"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-primary/10 text-primary border border-primary/30 shadow-xs select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {completedCount}/{totalSteps} Completed
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/agent?tab=voice"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors shadow-xs"
            >
              <Bot size={13} className="text-primary" />
              <span>Open Agent Studio</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        }
      />

      {/* ── Main Scroll Area ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6 no-scrollbar">
        
        {/* ── Bespoke Onboarding Roadmap Hero ── */}
        <div className="rounded-2xl border border-border/80 bg-surface-lowest p-6 sm:p-7 relative overflow-hidden shadow-sm">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* Top row: Title + Metric Dial */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-primary uppercase tracking-wider">
                  <Sparkles size={13} />
                  <span>Interactive Onboarding</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground lowercase flex items-center gap-1">
                    <Clock size={11} /> ~3 min setup
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Launch ORA on {storeName}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                  Complete these 4 foundational steps to tune your sales persona, embed the live widget, sync store knowledge, and verify real-time voice selling.
                </p>
              </div>

              {/* Circular gauge & status counter */}
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-surface-high/70 border border-border/60 self-start md:self-auto flex-shrink-0">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-border"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-primary transition-all duration-500 ease-out"
                      strokeDasharray={`${progressPercent}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-bold font-mono text-foreground">
                    {progressPercent}%
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-foreground">
                    {isAllCompleted ? 'Ready for Storefront' : `${completedCount} of 4 Complete`}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {isAllCompleted ? 'All systems active' : `${4 - completedCount} steps remaining`}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive 4-Node Roadmap Track */}
            <div className="pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STEPS_ROADMAP.map((step) => {
                  const isCompleted = progress[step.id];
                  const isActive = activeStepId === step.id;
                  const Icon = step.icon;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setActiveStepId(step.id)}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer group',
                        isActive
                          ? 'border-primary/80 bg-surface-high/90 ring-1 ring-primary/30 shadow-xs'
                          : isCompleted
                          ? 'border-primary/30 bg-surface-high/30 hover:border-primary/50'
                          : 'border-border/60 bg-surface-low/30 hover:bg-surface-high/40 hover:border-border',
                      )}
                    >
                      {/* Node circle */}
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold transition-colors',
                          isCompleted
                            ? 'bg-primary text-primary-foreground shadow-xs shadow-primary/30'
                            : isActive
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : 'bg-surface-high text-muted-foreground border border-border/60',
                        )}
                      >
                        {isCompleted ? (
                          <Check size={13} strokeWidth={3} />
                        ) : (
                          <span>0{step.stepNumber}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-[11.5px] font-bold truncate leading-tight transition-colors',
                            isActive
                              ? 'text-foreground'
                              : isCompleted
                              ? 'text-foreground/90'
                              : 'text-muted-foreground group-hover:text-foreground',
                          )}
                        >
                          {step.shortLabel}
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                          {isCompleted ? '✓ Done' : step.title}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Completion Celebration Banner (if 100%) ── */}
        {isAllCompleted && (
          <div className="p-5 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/10 to-surface-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0 shadow-md shadow-primary/30">
                <CheckCircle2 size={22} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  🎉 Congratulations! Your store setup is fully configured.
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  ORA is active, tailored to your archetype, and ready to assist and close sales for your customers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
              >
                Go to Overview
              </Link>
              <Link
                href="/live-desk"
                className="px-3.5 py-2 rounded-lg border border-border bg-surface-high text-foreground text-xs font-semibold hover:bg-surface-highest transition-colors"
              >
                Live Desk
              </Link>
            </div>
          </div>
        )}

        {/* ── Steps Accordion List ── */}
        <div className="space-y-4">
          
          {/* Step 1: Persona & Archetype */}
          <SetupStepCard
            id="persona"
            stepNumber={1}
            title="Set up your AI sales persona & archetype"
            description="Select your store category archetype (E-Commerce, SaaS, Agency, Portfolio, Enterprise) and choose your brand voice tone. Listen to live voice tone previews and simulate real shopper dialogues."
            ctaText="Mark Step as Complete"
            onCtaClick={() => markStepComplete('persona')}
            learnMoreHref="/agent?tab=voice"
            learnMoreText="Explore agent voice"
            isCompleted={progress.persona}
            isOpen={activeStepId === 'persona'}
            onToggleOpen={() =>
              setActiveStepId((prev) => (prev === 'persona' ? ('' as any) : 'persona'))
            }
            onToggleComplete={() => toggleStep('persona')}
            previewComponent={
              <PersonaPreview
                onSaved={() => markStepComplete('persona')}
              />
            }
          />

          {/* Step 2: Storefront Integration (Requested as Step 2) */}
          <SetupStepCard
            id="integration"
            stepNumber={2}
            title="Integrate the widget into your storefront"
            description="Embed ORA into your Shopify, WooCommerce, or custom React/HTML store with a single line of code. Connects your storefront directly to ORA's live voice, text chat, and cart engine."
            ctaText="Copy Embed Snippet"
            onCtaClick={() => {
              navigator.clipboard.writeText(
                `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/ora-widget.js" data-ora-key="${publishableKey}" defer></script>`
              );
              markStepComplete('integration');
            }}
            learnMoreHref="/agent?tab=documents"
            learnMoreText="Manage store knowledge"
            isCompleted={progress.integration}
            isOpen={activeStepId === 'integration'}
            onToggleOpen={() =>
              setActiveStepId((prev) => (prev === 'integration' ? ('' as any) : 'integration'))
            }
            onToggleComplete={() => toggleStep('integration')}
            previewComponent={
              <IntegrationPreview
                publishableKey={publishableKey}
                onCopied={() => markStepComplete('integration')}
              />
            }
          />

          {/* Step 3: Catalog & Store Documents (Requested as Step 3) */}
          <SetupStepCard
            id="knowledge"
            stepNumber={3}
            title="Feed ORA your catalog & store documents"
            description="Upload shipping policies, return guidelines, FAQs, and product catalogs. ORA's real-time RAG engine automatically chunks and vectorizes your content so it answers customer queries with 100% accuracy."
            ctaText="Upload Documents in Studio"
            ctaHref="/agent?tab=documents"
            learnMoreHref="/agent?tab=products"
            learnMoreText="View product catalog"
            isCompleted={progress.knowledge}
            isOpen={activeStepId === 'knowledge'}
            onToggleOpen={() =>
              setActiveStepId((prev) => (prev === 'knowledge' ? ('' as any) : 'knowledge'))
            }
            onToggleComplete={() => toggleStep('knowledge')}
            previewComponent={<KnowledgePreview />}
          />

          {/* Step 4: Live Voice Test Simulation */}
          <SetupStepCard
            id="voice_test"
            stepNumber={4}
            title="Test ORA with live voice & conversational sales"
            description="Experience ORA firsthand with ultra-low latency speech-to-speech AI. Have a real conversation, ask about catalog products, test recommendation responses, and verify checkout flows before launching."
            ctaText="Launch Live Voice Session"
            onCtaClick={handleLaunchVoice}
            learnMoreHref="/agent?tab=voice"
            learnMoreText="Voice workspace"
            isCompleted={progress.voice_test}
            isOpen={activeStepId === 'voice_test'}
            onToggleOpen={() =>
              setActiveStepId((prev) => (prev === 'voice_test' ? ('' as any) : 'voice_test'))
            }
            onToggleComplete={() => toggleStep('voice_test')}
            previewComponent={<VoiceTestPreview onOpenTestModal={handleLaunchVoice} />}
          />

        </div>

        {/* ── Help / Documentation Footer ── */}
        <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <HelpCircle size={14} className="text-muted-foreground" />
            <span>Need assistance customizing ORA for your custom platform?</span>
          </div>
          <Link
            href="/agent?tab=documents"
            className="text-primary hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Open Knowledge & Documents Studio</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* ── Voice Test Modal ── */}
      <VoiceTestModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        publishableKey={publishableKey}
      />
    </div>
  );
}
