'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAgentConfigApi } from '@/services/agent-config-service';
import { getKnowledgeDocsApi } from '@/services/knowledge-service';
import { getProductsApi } from '@/services/products-service';
import { getMeApi } from '@/services/auth-service';

export type SetupStepId = 'persona' | 'integration' | 'knowledge' | 'voice_test';

export interface SetupProgressState {
  persona: boolean;
  integration: boolean;
  knowledge: boolean;
  voice_test: boolean;
}

const STORAGE_KEY = 'ora_setup_progress_v1';

const DEFAULT_STATE: SetupProgressState = {
  persona: false,
  integration: false,
  knowledge: false,
  voice_test: false,
};

export function useSetupProgress() {
  const [progress, setProgress] = useState<SetupProgressState>(DEFAULT_STATE);
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial state from localStorage & backend APIs
  const refreshProgress = useCallback(async () => {
    let stored: Partial<SetupProgressState> = {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        stored = JSON.parse(saved);
      }
    } catch {
      // ignore JSON parse error
    }

    try {
      const [agentConfigRes, meRes, knowledgeRes, productsRes] = await Promise.allSettled([
        getAgentConfigApi(),
        getMeApi(),
        getKnowledgeDocsApi({ limit: 1 }),
        getProductsApi({ limit: 1 }),
      ]);

      const detected: SetupProgressState = { ...DEFAULT_STATE, ...stored };

      // 1. Persona step
      if (agentConfigRes.status === 'fulfilled' && agentConfigRes.value?.config) {
        const config = agentConfigRes.value.config;
        if (config.businessArchetype || (config.brandVoiceDescription && config.brandVoiceDescription.trim().length > 0)) {
          detected.persona = true;
        }
      }

      // 2. Integration step
      if (meRes.status === 'fulfilled' && meRes.value?.business?.publishableKey) {
        detected.integration = true;
      }

      // 3. Knowledge & Catalog step
      const hasDocs =
        knowledgeRes.status === 'fulfilled' &&
        Array.isArray(knowledgeRes.value) &&
        knowledgeRes.value.length > 0;
      const productData = productsRes.status === 'fulfilled' ? productsRes.value : null;
      const hasProducts =
        Boolean(productData && ((productData.pagination?.total ?? 0) > 0 || (productData.items?.length ?? 0) > 0));
      if (hasDocs || hasProducts) {
        detected.knowledge = true;
      }

      setProgress(detected);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(detected));
      } catch {
        // ignore storage error
      }
    } catch {
      // If network fails, use stored state
      setProgress((prev) => ({ ...prev, ...stored }));
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Mark a specific step as complete
  const markStepComplete = useCallback((stepId: SetupStepId) => {
    setProgress((prev) => {
      if (prev[stepId]) return prev;
      const next = { ...prev, [stepId]: true };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
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
