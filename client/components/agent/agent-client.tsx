'use client';

import { useState, useEffect } from 'react';
import { AgentHeader } from './agent-header';
import { VoiceTestModal } from './modals/voice-test-modal';
import { getMeApi } from '@/services/auth-service';
import {
  getAgentConfigApi,
  updateAgentConfigApi,
} from '@/services/agent-config-service';
import {
  Bot,
  Sparkles,
  Mic,
  Sliders,
  Volume2,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  MessageSquare,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export function AgentClient() {
  const [isVoiceTestModalOpen, setIsVoiceTestModalOpen] = useState(false);
  const [publishableKey, setPublishableKey] = useState<string>('biz_live_demo');
  const [brandVoice, setBrandVoice] = useState<string>(
    'Friendly, articulate, and empathetic e-commerce sales assistant. Knowledgeable about products, pricing, and shipping policies.',
  );
  const [voiceId, setVoiceId] = useState<string>('puck');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getMeApi()
      .then((res) => {
        if (res?.business?.publishableKey) {
          setPublishableKey(res.business.publishableKey);
        }
      })
      .catch(() => { });

    getAgentConfigApi()
      .then((data) => {
        if (data?.config?.brandVoiceDescription) {
          setBrandVoice(data.config.brandVoiceDescription);
        }
        if (data?.voice?.voiceId) {
          setVoiceId(data.voice.voiceId);
        }
      })
      .catch((err) => {
        console.error('Failed to load agent config:', err);
      })
      .finally(() => {
        setIsLoadingConfig(false);
      });
  }, []);

  const handleSaveTuning = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateAgentConfigApi({
        brandVoiceDescription: brandVoice,
        voiceId,
      });
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
      {/* Top Header */}
      <AgentHeader onOpenVoiceTest={() => setIsVoiceTestModalOpen(true)} />

      {/* Hero Banner: Voice Agent Intelligence */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-surface-container p-6 lg:p-8 shadow-xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/25">
              <Zap size={14} className="text-primary" />
              <span>Gemini 2.0 Multimodal Live Voice API</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Autonomous Voice & Persona Tuning Sandbox
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ORA connects directly to Google Gemini 2.0 Live WebSockets for ultra-low latency sub-second voice conversations, automated RAG catalog lookups, and real-time order creation.
            </p>
          </div>

          <button
            onClick={() => setIsVoiceTestModalOpen(true)}
            className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all flex items-center gap-2.5 shrink-0"
          >
            <Mic size={18} />
            <span>Launch Real-Time Voice Sandbox</span>
          </button>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Voice & Persona Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Voice Prompt Card */}
          <div className="rounded-2xl border border-border bg-surface-container p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">Brand Voice & Persona Instructions</h3>
                  <p className="text-xs text-muted-foreground">Customize your AI voice agent’s tone, instructions, and sales approach.</p>
                </div>
              </div>

              {isSaved && (
                <span className="flex items-center gap-1 text-xs font-medium text-primary animate-fade-in">
                  <CheckCircle2 size={14} /> Saved
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                System Persona Prompt
              </label>
              <textarea
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe how ORA should greet customers, handle sales inquiries, and suggest products..."
              />
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {saveError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground font-mono">
                Model: gemini-2.0-flash-exp (Bidi Voice Gateway)
              </span>
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
                  <span>Save Persona Tuning</span>
                )}
              </button>
            </div>
          </div>

          {/* Voice Output Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-surface-container p-5 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Volume2 size={16} className="text-primary" />
                <span>Audio Engine Configuration</span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground font-mono">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Sampling Rate:</span>
                  <span className="text-foreground">24,000 Hz (PCM)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Prebuilt Voice:</span>
                  <span className="text-foreground">Puck (Gemini Live)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Input Mic Rate:</span>
                  <span className="text-foreground">16,000 Hz (Int16)</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-container p-5 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Cpu size={16} className="text-secondary" />
                <span>Autonomous Tools & RAG</span>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground font-mono">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Catalog Search:</span>
                  <span className="text-primary">Enabled (RAG)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Order Creation:</span>
                  <span className="text-primary">Enabled (Function Call)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Policy Check:</span>
                  <span className="text-primary">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status & Direct Sandbox Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface-container p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-base text-foreground">Voice Gateway Status</h3>
                <p className="text-xs text-muted-foreground">Live WebSockets WebSocketGateway</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-low border border-border space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Gateway Endpoint:</span>
                <span className="font-mono text-primary font-medium">ws://localhost:5000/voice</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Publishable Key:</span>
                <span className="font-mono text-foreground font-medium">{publishableKey.slice(0, 14)}...</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Protocol:</span>
                <span className="font-mono text-foreground font-medium">Socket.IO v4</span>
              </div>
            </div>

            <button
              onClick={() => setIsVoiceTestModalOpen(true)}
              className="w-full py-3 rounded-xl font-semibold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={15} />
              <span>Test Voice Agent Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Voice Test Modal */}
      <VoiceTestModal
        isOpen={isVoiceTestModalOpen}
        onClose={() => setIsVoiceTestModalOpen(false)}
        publishableKey={publishableKey}
      />
    </div>
  );
}
