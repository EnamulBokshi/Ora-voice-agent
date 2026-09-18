'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type QuickSetupStepId,
  QUICK_SETUP_STEPS,
  PERSONALITY_PRESETS,
} from './quick-setup-types';
import { ARCHETYPES, type BusinessArchetype } from '@/lib/archetypes';
import { useQuickSetup, sanitizeDomain } from '@/hooks/use-quick-setup';

export function QuickSetupModal() {
  const {
    isOpen,
    activeStep,
    saving,
    stepsState,
    formData,
    completedCount,
    totalSteps,
    setActiveStep,
    dismissModal,
    updateFormFields,
    saveCurrentStep,
  } = useQuickSetup();

  const [inputError, setInputError] = useState<string | null>(null);

  const currentStepIndex = useMemo(() => {
    const idx = QUICK_SETUP_STEPS.findIndex((s) => s.id === activeStep);
    return idx >= 0 ? idx : 0;
  }, [activeStep]);

  const currentStepMeta = QUICK_SETUP_STEPS[currentStepIndex];

  useEffect(() => { setInputError(null); }, [activeStep]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, dismissModal]);

  const handleAutoDraftSummary = () => {
    const store = formData.storeName.trim() || 'Our store';
    const map: Record<string, string> = {
      ecommerce:           `${store} sells curated products online with fast shipping and easy returns.`,
      saas:                `${store} is a subscription software product with self-serve onboarding.`,
      clinic_appointments: `${store} offers medical consultations and online appointment booking.`,
      agency_services:     `${store} is a full-service agency — strategy, design, and delivery.`,
      consulting:          `${store} provides professional advisory services and strategic guidance.`,
    };
    updateFormFields({ businessSummary: map[formData.businessType] ?? `${store} is a business focused on quality and customer satisfaction.` });
  };

  const handleSelectTone = (presetId: string) => {
    const preset = PERSONALITY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    updateFormFields({
      tonePresetId: preset.id,
      brandVoiceDescription: preset.brandVoiceDescription,
      systemPrompt: preset.systemPrompt,
    });
  };

  const handleContinue = async () => {
    setInputError(null);
    const ok = await saveCurrentStep(activeStep);
    if (!ok) { setInputError('Could not save. Try again.'); return; }
    if (currentStepIndex < QUICK_SETUP_STEPS.length - 1) {
      setActiveStep(QUICK_SETUP_STEPS[currentStepIndex + 1].id);
    } else {
      dismissModal();
    }
  };

  const handleSkip = () => {
    setInputError(null);
    if (currentStepIndex < QUICK_SETUP_STEPS.length - 1) {
      setActiveStep(QUICK_SETUP_STEPS[currentStepIndex + 1].id);
    } else {
      dismissModal();
    }
  };

  const handleBack = () => {
    setInputError(null);
    if (currentStepIndex > 0) setActiveStep(QUICK_SETUP_STEPS[currentStepIndex - 1].id);
  };

  if (!isOpen) return null;

  const currentArchetypeObj = ARCHETYPES.find((a) => a.id === formData.businessType) ?? ARCHETYPES[0];
  const currentToneObj = PERSONALITY_PRESETS.find((p) => p.id === formData.tonePresetId) ?? PERSONALITY_PRESETS[0];
  const isLastStep = currentStepIndex === QUICK_SETUP_STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qs-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl flex flex-col rounded-xl border border-border/80 dark:border-border/50 bg-card text-card-foreground shadow-2xl overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 dark:border-border/40 bg-muted/30 dark:bg-transparent flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* step dots */}
            <div className="flex items-center gap-1">
              {QUICK_SETUP_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStep(s.id)}
                  title={s.title}
                  className={cn(
                    'h-[3px] rounded-full transition-all duration-200 focus-visible:outline-none',
                    s.id === activeStep ? 'w-5 bg-primary' : stepsState[s.id] ? 'w-3 bg-primary/40' : 'w-3 bg-muted-foreground/25 dark:bg-surface-bright',
                  )}
                />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {currentStepIndex + 1} / {totalSteps}
            </span>
          </div>
          <button
            onClick={dismissModal}
            aria-label="Close"
            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-surface-high transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="px-5 py-6 space-y-5">

            {/* Step title */}
            <div>
              <p className="text-[10.5px] text-muted-foreground uppercase tracking-widest font-medium mb-1">
                {currentStepMeta.eyebrow}
              </p>
              <h2 id="qs-title" className="text-base font-semibold text-foreground tracking-tight">
                {currentStepMeta.title}
              </h2>
            </div>

            {/* ── Step 1: Store Name ── */}
            {activeStep === 'store_name' && (
              <input
                id="qs-store-name"
                type="text"
                autoFocus
                value={formData.storeName}
                onChange={(e) => updateFormFields({ storeName: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}
                placeholder="Your store or brand name"
                className="w-full h-10 px-3.5 rounded-lg border border-border/80 dark:border-border/70 bg-surface-lowest/70 dark:bg-surface-container text-foreground text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/25 outline-none transition-colors"
              />
            )}

            {/* ── Step 2: Business Type ── */}
            {activeStep === 'business_type' && (
              <div className="space-y-1.5">
                {ARCHETYPES.map((arch) => {
                  const selected = formData.businessType === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => updateFormFields({ businessType: arch.id as BusinessArchetype })}
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-all cursor-pointer',
                        selected
                          ? 'border-primary/50 bg-primary/5 text-foreground'
                          : 'border-border/60 hover:border-border dark:border-border/50 dark:hover:border-border/80 hover:bg-muted/50 dark:hover:bg-surface-high/50 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="text-sm font-medium">{arch.label}</span>
                      {selected && <Check size={13} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Step 3: Domain ── */}
            {activeStep === 'store_domain' && (
              <div className="space-y-2">
                <input
                  id="qs-store-domain"
                  type="text"
                  autoFocus
                  value={formData.storeDomain}
                  onChange={(e) => updateFormFields({ storeDomain: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}
                  placeholder="yourdomain.com"
                  className="w-full h-10 px-3.5 rounded-lg border border-border/80 dark:border-border/70 bg-surface-lowest/70 dark:bg-surface-container text-foreground text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/25 outline-none transition-colors"
                />
                {formData.storeDomain && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Check size={10} className="text-primary" />
                    <span className="text-foreground/70">{sanitizeDomain(formData.storeDomain)}</span>
                  </p>
                )}
              </div>
            )}

            {/* ── Step 4: Overview ── */}
            {activeStep === 'business_overview' && (
              <div className="space-y-2">
                <textarea
                  id="qs-overview"
                  rows={4}
                  autoFocus
                  value={formData.businessSummary}
                  onChange={(e) => updateFormFields({ businessSummary: e.target.value })}
                  placeholder="What do you sell, and who is it for?"
                  className="w-full p-3.5 rounded-lg border border-border/80 dark:border-border/70 bg-surface-lowest/70 dark:bg-surface-container text-foreground text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/25 outline-none transition-colors resize-none"
                />
                <button
                  type="button"
                  onClick={handleAutoDraftSummary}
                  className="text-[11px] text-primary hover:opacity-75 font-medium cursor-pointer transition-opacity"
                >
                  Generate a draft
                </button>
              </div>
            )}

            {/* ── Step 5: Tone ── */}
            {activeStep === 'system_prompt' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  {PERSONALITY_PRESETS.map((preset) => {
                    const selected = formData.tonePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectTone(preset.id)}
                        className={cn(
                          'w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left transition-all cursor-pointer',
                          selected
                            ? 'border-primary/50 bg-primary/5 text-foreground'
                            : 'border-border/60 hover:border-border dark:border-border/50 dark:hover:border-border/80 hover:bg-muted/50 dark:hover:bg-surface-high/50 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <div>
                          <span className="text-sm font-medium block">{preset.label}</span>
                          <span className="text-[11px] text-muted-foreground">{preset.tagline}</span>
                        </div>
                        {selected && <Check size={13} className="text-primary flex-shrink-0 ml-3" />}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label htmlFor="qs-directives" className="block text-xs text-muted-foreground mb-1.5">
                    Custom instructions <span className="opacity-60">(optional)</span>
                  </label>
                  <textarea
                    id="qs-directives"
                    rows={2}
                    value={formData.systemPrompt}
                    onChange={(e) => updateFormFields({ systemPrompt: e.target.value })}
                    placeholder="e.g. Always mention our 30-day return policy"
                    className="w-full p-3.5 rounded-lg border border-border/80 dark:border-border/70 bg-surface-lowest/70 dark:bg-surface-container text-foreground text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/25 outline-none transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            {inputError && (
              <p className="text-xs text-destructive">{inputError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border/60 dark:border-border/40 bg-muted/20 dark:bg-transparent flex items-center justify-between flex-shrink-0">
          <div>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded hover:bg-muted dark:hover:bg-surface-high cursor-pointer"
              >
                <ArrowLeft size={12} />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving…' : isLastStep ? 'Done' : 'Continue'}
              {!saving && <ArrowRight size={12} />}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
