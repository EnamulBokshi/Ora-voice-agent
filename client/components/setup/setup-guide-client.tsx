'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  SlidersHorizontal,
  FileText,
  Key,
  Mic,
  ArrowRight,
  Bot,
  HelpCircle,
  ExternalLink,
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
  icon: React.ElementType;
}

const STEPS_ROADMAP: StepMeta[] = [
  { id: 'persona',      stepNumber: 1, shortLabel: 'Persona & Voice',  icon: SlidersHorizontal },
  { id: 'integration',  stepNumber: 2, shortLabel: 'Widget Embed',     icon: Key },
  { id: 'knowledge',    stepNumber: 3, shortLabel: 'Store Knowledge',  icon: FileText },
  { id: 'voice_test',   stepNumber: 4, shortLabel: 'Live Voice Test',  icon: Mic },
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

  useEffect(() => {
    getMeApi()
      .then((res) => {
        if (res?.business?.publishableKey) setPublishableKey(res.business.publishableKey);
        else if (demoProfile?.business?.publishableKey) setPublishableKey(demoProfile.business.publishableKey);
        if (res?.business?.name) setStoreName(res.business.name);
      })
      .catch(() => {
        if (demoProfile?.business?.publishableKey) setPublishableKey(demoProfile.business.publishableKey);
      });
  }, []);

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
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-surface-high text-muted-foreground border border-border select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {completedCount}/{totalSteps} Complete
          </span>
        }
        actions={
          <Link
            href="/agent?tab=voice"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Bot size={13} />
            <span>Agent Studio</span>
            <ArrowRight size={11} />
          </Link>
        }
      />

      {/* ── Main scroll canvas — same max-w and padding as overview-client ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-6 space-y-6">

          {/* ── Progress header — typography-led, no card wrapper ── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border">
            <div className="space-y-1">
              <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                Onboarding · ~3 min setup
              </p>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Launch ORA on {storeName}
              </h1>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xl">
                Complete 4 steps to configure your persona, embed the widget, sync store knowledge, and run a live voice test.
              </p>
            </div>

            {/* Progress dial — same as KPI strip style */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-high"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary transition-all duration-500"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold font-mono text-foreground">{progressPercent}%</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground tabular-nums">
                  {completedCount} of {totalSteps}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isAllCompleted ? 'All complete' : `${totalSteps - completedCount} remaining`}
                </p>
              </div>
            </div>
          </div>

          {/* ── Step nav — underline tabs, exactly like AnalyticsPanel ── */}
          <div className="flex items-center gap-6 border-b border-border/80 text-[13px] font-medium pb-0">
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
                    'pb-2.5 relative flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {isCompleted
                    ? <CheckCircle2 size={12} className="text-primary" />
                    : <Icon size={12} />
                  }
                  {step.shortLabel}
                </button>
              );
            })}
          </div>

          {/* ── Completion strip — full-width flush strip, like overview banner ── */}
          {isAllCompleted && (
            <div className="flex items-center justify-between gap-4 px-0 py-3 border-b border-primary/20">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                <span className="text-[13px] text-foreground font-medium">
                  Setup complete — ORA is configured and ready to sell.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href="/dashboard"
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Go to Overview
                </Link>
                <Link
                  href="/live-desk"
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Live Desk <ArrowRight size={10} className="inline" />
                </Link>
              </div>
            </div>
          )}

          {/* ── Steps list — divider-separated rows, no card wrappers ── */}
          <div>
            <SetupStepCard
              id="persona"
              stepNumber={1}
              title="Set up your AI sales persona & archetype"
              description="Select your store archetype and configure brand voice tone. Simulates real shopper dialogues so you can preview ORA's personality before going live."
              ctaText="Mark as Complete"
              onCtaClick={() => markStepComplete('persona')}
              learnMoreHref="/agent?tab=voice"
              learnMoreText="Agent voice settings"
              isCompleted={progress.persona}
              isOpen={activeStepId === 'persona'}
              onToggleOpen={() => setActiveStepId((prev) => (prev === 'persona' ? ('' as any) : 'persona'))}
              onToggleComplete={() => toggleStep('persona')}
              previewComponent={<PersonaPreview onSaved={() => markStepComplete('persona')} />}
            />

            <SetupStepCard
              id="integration"
              stepNumber={2}
              title="Embed the widget into your storefront"
              description="Add ORA to Shopify, WooCommerce, or any React/HTML site with a single script tag. Connects your storefront to ORA's live voice engine, chat, and cart tools."
              ctaText="Copy Snippet"
              onCtaClick={() => {
                navigator.clipboard.writeText(
                  `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/ora-widget.js" data-ora-key="${publishableKey}" defer></script>`
                );
                markStepComplete('integration');
              }}
              learnMoreHref="/agent?tab=documents"
              learnMoreText="Store knowledge"
              isCompleted={progress.integration}
              isOpen={activeStepId === 'integration'}
              onToggleOpen={() => setActiveStepId((prev) => (prev === 'integration' ? ('' as any) : 'integration'))}
              onToggleComplete={() => toggleStep('integration')}
              previewComponent={
                <IntegrationPreview
                  publishableKey={publishableKey}
                  onCopied={() => markStepComplete('integration')}
                />
              }
            />

            <SetupStepCard
              id="knowledge"
              stepNumber={3}
              title="Sync your catalog & store documents"
              description="Upload policies, FAQs, and product data. ORA's RAG engine vectorises your content for accurate, sub-85ms answers — no hallucinations."
              ctaText="Upload Documents"
              ctaHref="/agent?tab=documents"
              learnMoreHref="/agent?tab=products"
              learnMoreText="Product catalog"
              isCompleted={progress.knowledge}
              isOpen={activeStepId === 'knowledge'}
              onToggleOpen={() => setActiveStepId((prev) => (prev === 'knowledge' ? ('' as any) : 'knowledge'))}
              onToggleComplete={() => toggleStep('knowledge')}
              previewComponent={<KnowledgePreview />}
            />

            <SetupStepCard
              id="voice_test"
              stepNumber={4}
              title="Run a live voice test before launching"
              description="Have a real speech-to-speech conversation with ORA. Test product recommendations, navigation commands, and checkout flows before going live."
              ctaText="Start Voice Test"
              onCtaClick={handleLaunchVoice}
              learnMoreHref="/agent?tab=voice"
              learnMoreText="Voice workspace"
              isCompleted={progress.voice_test}
              isOpen={activeStepId === 'voice_test'}
              onToggleOpen={() => setActiveStepId((prev) => (prev === 'voice_test' ? ('' as any) : 'voice_test'))}
              onToggleComplete={() => toggleStep('voice_test')}
              previewComponent={<VoiceTestPreview onOpenTestModal={handleLaunchVoice} />}
            />
          </div>

          {/* ── Footer ── */}
          <div className="pt-2 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12.5px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <HelpCircle size={13} />
              <span>Need help with a custom integration?</span>
            </div>
            <Link
              href="/agent?tab=documents"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              Open Knowledge Studio
              <ExternalLink size={11} />
            </Link>
          </div>

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
