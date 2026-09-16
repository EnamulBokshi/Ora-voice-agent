'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentBusinessApi, updateBusinessApi } from '@/services/business-service';
import { getAgentConfigApi, updateAgentConfigApi, switchArchetypeApi } from '@/services/agent-config-service';
import { getMeApi } from '@/services/auth-service';
import {
  type QuickSetupStepId,
  type QuickSetupStepsState,
  type QuickSetupFormData,
  QUICK_SETUP_STEPS,
  PERSONALITY_PRESETS,
} from '@/components/quick-setup/quick-setup-types';
import type { BusinessArchetype } from '@/lib/archetypes';

const QS_EVENT = 'ora:quick-setup-changed';
const QS_OPEN_EVENT = 'ora:quick-setup-open-request';
const QS_CLOSE_EVENT = 'ora:quick-setup-close';
const DISMISSED_SESSION_KEY = 'ora_quick_setup_session_dismissed';
const DISMISSED_LOCAL_PREFIX = 'ora_qs_dismissed_';

const INITIAL_STEPS_STATE: QuickSetupStepsState = {
  store_name: false,
  business_type: false,
  store_domain: false,
  business_overview: false,
  system_prompt: false,
};

const INITIAL_FORM_DATA: QuickSetupFormData = {
  storeName: '',
  businessType: 'ecommerce',
  storeDomain: '',
  businessSummary: '',
  brandVoiceDescription: PERSONALITY_PRESETS[0].brandVoiceDescription,
  systemPrompt: PERSONALITY_PRESETS[0].systemPrompt,
  tonePresetId: 'high_conversion',
};

export function sanitizeDomain(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//i, '');
  clean = clean.replace(/\/.*$/, '');
  return clean;
}

export function useQuickSetup() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<QuickSetupStepId>('store_name');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [stepsState, setStepsState] = useState<QuickSetupStepsState>(INITIAL_STEPS_STATE);
  const [formData, setFormData] = useState<QuickSetupFormData>(INITIAL_FORM_DATA);
  const initialTriggerEvaluated = useRef(false);

  // Synchronize across all tabs and components
  useEffect(() => {
    const handleBroadcast = (e: CustomEvent<{ stepsState?: QuickSetupStepsState; formData?: Partial<QuickSetupFormData> }>) => {
      if (e.detail?.stepsState) {
        setStepsState(e.detail.stepsState);
      }
      if (e.detail?.formData) {
        setFormData((prev) => ({ ...prev, ...e.detail.formData }));
      }
    };

    const handleOpenRequest = (e: CustomEvent<{ stepId?: QuickSetupStepId }>) => {
      if (e.detail?.stepId) {
        setActiveStep(e.detail.stepId);
      }
      setIsOpen(true);
    };

    const handleCloseRequest = () => {
      setIsOpen(false);
    };

    window.addEventListener(QS_EVENT as any, handleBroadcast);
    window.addEventListener(QS_OPEN_EVENT as any, handleOpenRequest);
    window.addEventListener(QS_CLOSE_EVENT as any, handleCloseRequest);

    return () => {
      window.removeEventListener(QS_EVENT as any, handleBroadcast);
      window.removeEventListener(QS_OPEN_EVENT as any, handleOpenRequest);
      window.removeEventListener(QS_CLOSE_EVENT as any, handleCloseRequest);
    };
  }, []);

  const evaluateAndSync = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, configRes] = await Promise.allSettled([
        getMeApi(),
        getAgentConfigApi(),
      ]);

      const business = meRes.status === 'fulfilled' ? meRes.value?.business : null;
      const bId = business?.id || (business as any)?._id || null;
      if (bId) setBusinessId(bId);

      const agentConfig = configRes.status === 'fulfilled' ? configRes.value?.config : null;
      const activeArch = (configRes.status === 'fulfilled' && configRes.value?.activeArchetype)
        ? configRes.value.activeArchetype
        : (business?.activeArchetype as BusinessArchetype) || 'ecommerce';

      const currentName = business?.name || '';
      const isNameCustomized = Boolean(
        currentName &&
        currentName.trim().length > 0 &&
        currentName.trim() !== 'My Store' &&
        currentName.trim() !== 'Untitled Business'
      );

      const isArchCustomized = Boolean(business?.activeArchetype || configRes.status === 'fulfilled');
      const currentDomain = business?.domain || '';
      const isDomainCustomized = Boolean(currentDomain && currentDomain.trim().length > 0);

      const currentSummary = agentConfig?.businessSummary || '';
      const isSummaryCustomized = Boolean(currentSummary && currentSummary.trim().length > 10);

      const currentBrandVoice = agentConfig?.brandVoiceDescription || '';
      const currentPrompt = agentConfig?.systemPrompt || '';
      const isPromptCustomized = Boolean(
        (currentBrandVoice && currentBrandVoice.trim().length > 0) ||
        (currentPrompt && currentPrompt.trim().length > 0)
      );

      const newSteps: QuickSetupStepsState = {
        store_name: isNameCustomized,
        business_type: isArchCustomized,
        store_domain: isDomainCustomized,
        business_overview: isSummaryCustomized,
        system_prompt: isPromptCustomized,
      };

      setStepsState(newSteps);

      setFormData((prev) => ({
        ...prev,
        storeName: isNameCustomized ? currentName : prev.storeName,
        businessType: activeArch,
        storeDomain: currentDomain,
        businessSummary: currentSummary,
        brandVoiceDescription: currentBrandVoice || prev.brandVoiceDescription,
        systemPrompt: currentPrompt || prev.systemPrompt,
      }));

      // Check first-login trigger once on load
      const isAllDone = Object.values(newSteps).every(Boolean);
      if (!isAllDone && !initialTriggerEvaluated.current && typeof window !== 'undefined') {
        initialTriggerEvaluated.current = true;
        const sessionDismissed = sessionStorage.getItem(DISMISSED_SESSION_KEY) === 'true';
        const localDismissed = bId ? localStorage.getItem(`${DISMISSED_LOCAL_PREFIX}${bId}`) === 'true' : false;

        if (!sessionDismissed && !localDismissed) {
          // Find first incomplete step
          const firstIncomplete = QUICK_SETUP_STEPS.find((s) => !newSteps[s.id]);
          if (firstIncomplete) {
            setActiveStep(firstIncomplete.id);
          }
          setIsOpen(true);
        }
      }
    } catch {
      // Fallback state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    evaluateAndSync();
  }, [evaluateAndSync]);

  const completedCount = Object.values(stepsState).filter(Boolean).length;
  const totalSteps = QUICK_SETUP_STEPS.length;
  const isAllCompleted = completedCount === totalSteps;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  const openModal = useCallback((stepId?: QuickSetupStepId) => {
    if (typeof window === 'undefined') return;
    // Resolve which step to land on
    const targetStep = stepId ?? QUICK_SETUP_STEPS.find((s) => !stepsState[s.id])?.id;
    // Dispatch event — the modal component (which is a sibling in the tree)
    // listens for this and opens itself. Using the event bus avoids the problem
    // of each hook instance owning separate isOpen state.
    window.dispatchEvent(
      new CustomEvent(QS_OPEN_EVENT, { detail: { stepId: targetStep } }),
    );
  }, [stepsState]);

  const closeModal = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(QS_CLOSE_EVENT));
    }
  }, []);

  const dismissModal = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(QS_CLOSE_EVENT));
      sessionStorage.setItem(DISMISSED_SESSION_KEY, 'true');
      if (businessId) {
        localStorage.setItem(`${DISMISSED_LOCAL_PREFIX}${businessId}`, 'true');
      }
    }
  }, [businessId]);

  const updateFormFields = useCallback((fields: Partial<QuickSetupFormData>) => {
    // Compute next value first, outside the updater, so we can dispatch the
    // broadcast event AFTER setFormData — never inside the updater, which runs
    // during React's render phase and would trigger the
    // "Cannot update a component while rendering a different component" error.
    setFormData((prev) => {
      const next = { ...prev, ...fields };
      // Defer the cross-instance broadcast to after the current render commits.
      queueMicrotask(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(QS_EVENT, { detail: { formData: next } }),
          );
        }
      });
      return next;
    });
  }, []);

  // Save the current step to backend and mark as complete.
  // A step is only marked done when the user has provided a real value —
  // clicking Continue/Done with an empty field advances navigation but leaves
  // the step incomplete so the banner/dock keep prompting them.
  const saveCurrentStep = useCallback(
    async (stepId: QuickSetupStepId): Promise<boolean> => {
      setSaving(true);
      try {
        let hasValue = false;

        if (stepId === 'store_name') {
          const name = formData.storeName.trim();
          if (name.length > 0) {
            await updateBusinessApi({ name });
            hasValue = true;
          }
        } else if (stepId === 'business_type') {
          if (formData.businessType) {
            await switchArchetypeApi(formData.businessType);
            hasValue = true;
          }
        } else if (stepId === 'store_domain') {
          const domain = sanitizeDomain(formData.storeDomain);
          if (domain.length > 0) {
            await updateBusinessApi({ domain });
            hasValue = true;
          }
        } else if (stepId === 'business_overview') {
          const summary = formData.businessSummary.trim();
          if (summary.length > 0) {
            await updateAgentConfigApi({ businessSummary: summary });
            hasValue = true;
          }
        } else if (stepId === 'system_prompt') {
          // Tone preset is always pre-selected, so this step is always saveable
          const voice = formData.brandVoiceDescription.trim();
          const prompt = formData.systemPrompt.trim();
          await updateAgentConfigApi({ brandVoiceDescription: voice, systemPrompt: prompt });
          hasValue = true;
        }

        if (hasValue) {
          const updatedSteps = { ...stepsState, [stepId]: true };
          setStepsState(updatedSteps);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent(QS_EVENT, { detail: { stepsState: updatedSteps, formData } }),
            );
          }
        }

        // Always return true — navigation advances even if blank; the step just
        // stays incomplete in the progress tracker.
        return true;
      } catch (err) {
        console.error(`Failed to save quick setup step [${stepId}]:`, err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [formData, stepsState],
  );

  return {
    isOpen,
    activeStep,
    loading,
    saving,
    stepsState,
    formData,
    completedCount,
    totalSteps,
    isAllCompleted,
    progressPercent,
    setActiveStep,
    openModal,
    closeModal,
    dismissModal,
    updateFormFields,
    saveCurrentStep,
    refreshSetup: evaluateAndSync,
  };
}

/** Global helper to trigger opening the setup modal from anywhere */
export function triggerQuickSetupModal(stepId?: QuickSetupStepId) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(QS_OPEN_EVENT, {
      detail: { stepId },
    }),
  );
}
