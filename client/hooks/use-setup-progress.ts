'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAgentConfigApi } from '@/services/agent-config-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { getProductsApi } from '@/services/products-service';
import { getMeApi } from '@/services/auth-service';
import { getDashboardStatsApi } from '@/services/dashboard-service';

export type SetupStepId = 'persona' | 'integration' | 'knowledge' | 'voice_test';

export interface SetupProgressState {
  persona: boolean;
  integration: boolean;
  knowledge: boolean;
  voice_test: boolean;
}

const STORAGE_KEY = 'ora_setup_progress_v1';
const PROGRESS_EVENT = 'ora:setup-progress-changed';

const DEFAULT_STATE: SetupProgressState = {
  persona: false,
  integration: false,
  knowledge: false,
  voice_test: false,
};

function getStoredProgress(): Partial<SetupProgressState> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function broadcastProgress(next: SetupProgressState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: next }));
}

export function useSetupProgress() {
  const [progress, setProgress] = useState<SetupProgressState>(() => ({
    ...DEFAULT_STATE,
    ...getStoredProgress(),
  }));
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize across all components and tabs instantly
  useEffect(() => {
    const onProgressChange = (e: CustomEvent<SetupProgressState>) => {
      if (e.detail) {
        setProgress(e.detail);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setProgress(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener(PROGRESS_EVENT as any, onProgressChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PROGRESS_EVENT as any, onProgressChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Load state from backend APIs & local storage
  const refreshProgress = useCallback(async () => {
    const stored = getStoredProgress();

    try {
      const [agentConfigRes, statsRes, knowledgeRes, productsRes, meRes] =
        await Promise.allSettled([
          getAgentConfigApi(),
          getDashboardStatsApi(),
          getKnowledgeDocsApi({ limit: 1 }),
          getProductsApi({ limit: 1 }),
          getMeApi(),
        ]);

      const detected: SetupProgressState = { ...DEFAULT_STATE, ...stored };

      // 1. Persona step
      if (agentConfigRes.status === 'fulfilled' && agentConfigRes.value?.config) {
        const config = agentConfigRes.value.config;
        if (
          config.businessArchetype ||
          (config.brandVoiceDescription && config.brandVoiceDescription.trim().length > 0)
        ) {
          detected.persona = true;
        }
      }

      // 2. Integration step — derived from evidence the widget actually ran.
      //
      // This used to be `if (me.business.publishableKey) detected.integration = true`.
      // Every business is issued a publishable key at signup, so the one step that
      // proves ORA is live on the merchant's storefront was pre-checked before they
      // had opened their theme editor. The overview then congratulated them on
      // shipping the thing they had not done.
      //
      // `hasWidgetTraffic` is the authoritative signal: the server sets it from
      // `detectedOrigins`, which the voice gateway writes only when the widget opens a
      // session from an actual storefront page.
      //
      // A recorded conversation is kept as a fallback for tenants whose origin
      // telemetry predates this field, but it is weaker — a voice test run from this
      // dashboard also produces a conversation, so on its own it can mark the step
      // complete without the embed ever being installed.
      const hasWidgetTraffic =
        meRes.status === 'fulfilled' && meRes.value?.business?.hasWidgetTraffic === true;
      const conversationTotal =
        statsRes.status === 'fulfilled' ? (statsRes.value?.conversationTotal ?? 0) : 0;

      if (hasWidgetTraffic || conversationTotal > 0) {
        detected.integration = true;
      }

      // 3. Knowledge & Catalog step
      const hasDocs =
        knowledgeRes.status === 'fulfilled' &&
        Array.isArray(knowledgeRes.value) &&
        knowledgeRes.value.length > 0;
      const productData = productsRes.status === 'fulfilled' ? productsRes.value : null;
      const hasProducts = Boolean(
        productData &&
          ((productData.pagination?.total ?? 0) > 0 || (productData.items?.length ?? 0) > 0),
      );
      if (hasDocs || hasProducts) {
        detected.knowledge = true;
      }

      setProgress(detected);
      broadcastProgress(detected);
    } catch {
      // If network fails, use stored state
      const fallback = { ...DEFAULT_STATE, ...stored };
      setProgress(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  // Toggle step completion manually
  const toggleStep = useCallback((stepId: SetupStepId) => {
    setProgress((prev) => {
      const next = { ...prev, [stepId]: !prev[stepId] };
      broadcastProgress(next);
      return next;
    });
  }, []);

  // Mark a specific step as complete
  const markStepComplete = useCallback((stepId: SetupStepId) => {
    setProgress((prev) => {
      if (prev[stepId]) return prev;
      const next = { ...prev, [stepId]: true };
      broadcastProgress(next);
      return next;
    });
  }, []);

  const totalSteps = 4;
  const completedCount = Object.values(progress).filter(Boolean).length;
  const isAllCompleted = completedCount === totalSteps;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return {
    progress,
    loading,
    totalSteps,
    completedCount,
    isAllCompleted,
    progressPercent,
    toggleStep,
    markStepComplete,
    refreshProgress,
  };
}
