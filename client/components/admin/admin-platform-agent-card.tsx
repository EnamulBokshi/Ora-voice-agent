'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchPlatformAgentConfig,
  updatePlatformAgentConfig,
} from '@/services/admin-service';
import { PlatformAgentConfigData } from '@/types/admin';
import { VoiceTestModal } from '@/components/agent/modals/voice-test-modal';
import {
  Key,
  Copy,
  Check,
  Save,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Play,
  Sliders,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminPlatformAgentCard() {
  const [data, setData] = useState<PlatformAgentConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Form State
  const [brandVoice, setBrandVoice] = useState('');
  const [archetype, setArchetype] = useState('saas');
  const [businessSummary, setBusinessSummary] = useState('');
  const [customDirectives, setCustomDirectives] = useState('');
  const [language, setLanguage] = useState('en');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetchPlatformAgentConfig();
      setData(res);
      if (res?.agentConfig) {
        setBrandVoice(res.agentConfig.brandVoiceDescription || '');
        setArchetype(res.agentConfig.archetype || 'saas');
        setBusinessSummary(res.agentConfig.businessSummary || '');
        setCustomDirectives(res.agentConfig.customDirectives || '');
        setLanguage(res.agentConfig.language || 'en');
      }
    } catch (err: any) {
      console.error('Failed to load platform agent config:', err);
      showNotification('error', 'Failed to load platform agent configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleCopyKey = () => {
    const key = data?.business?.publishableKey;
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await updatePlatformAgentConfig({
        brandVoiceDescription: brandVoice,
        archetype,
        businessSummary,
        customDirectives,
        language,
      });

      setData((prev) => (prev ? { ...prev, agentConfig: res.agentConfig } : null));
      showNotification('success', 'Platform Agent configuration updated successfully.');
    } catch (err: any) {
      console.error('Failed to update platform agent config:', err);
      showNotification('error', err?.message || 'Failed to update configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-container p-8 flex items-center justify-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading Platform Agent configuration...</span>
      </div>
    );
  }

  const publishableKey = data?.business?.publishableKey || 'biz_live_ora_platform_system';

  return (
    <>
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          className={cn(
            'fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200',
            feedback.type === 'success'
              ? 'border-primary/40 bg-surface-container/95 text-foreground shadow-primary/10'
              : 'border-destructive/40 bg-surface-container/95 text-foreground shadow-destructive/10',
          )}
        >
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              feedback.type === 'success'
                ? 'bg-primary/15 text-primary'
                : 'bg-destructive/15 text-destructive',
            )}
          >
            {feedback.type === 'success' ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
          </div>
          <div className="flex flex-col pr-2">
            <span className="font-bold text-foreground">
              {feedback.type === 'success' ? 'Saved' : 'Error'}
            </span>
            <span className="text-xs text-muted-foreground font-normal">{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-surface-high hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface-container overflow-hidden shadow-xs">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-border bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-high border border-border text-foreground">
              <Sliders size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-heading font-bold text-foreground">
                  Platform Voice Agent Configuration
                </h2>
                <span className="inline-flex items-center rounded-full bg-surface-high px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground border border-border">
                  ora.ai Storefront
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time conversational voice brain powering the public marketing showcase & demo
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopyKey}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-high border border-border hover:bg-surface-bright text-xs font-medium text-foreground transition-colors shadow-xs"
              title="Copy Publishable Widget Key"
            >
              {copiedKey ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[130px] font-mono text-[11px] text-muted-foreground">
                    {publishableKey.slice(0, 16)}...
                  </span>
                  <Copy className="h-3 w-3 text-muted-foreground ml-0.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Test Voice</span>
            </button>
          </div>
        </div>

        {/* Main Configuration Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Archetype, Language, Brand Persona */}
            <div className="space-y-4">
              {/* Archetype & Language Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Agent Archetype
                  </label>
                  <select
                    value={archetype}
                    onChange={(e) => setArchetype(e.target.value)}
                    className="w-full h-9 rounded-lg bg-surface-high border border-border px-3 text-xs font-medium text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors cursor-pointer shadow-xs"
                  >
                    <option value="saas">SaaS Sales Representative</option>
                    <option value="ecommerce">E-Commerce Storefront</option>
                    <option value="agency_services">Agency & Client Services</option>
                    <option value="consulting">Consulting & Advisory</option>
                    <option value="portfolio">Developer Portfolio</option>
                    <option value="general">General Support</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Spoken Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-9 rounded-lg bg-surface-high border border-border px-3 text-xs font-medium text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors cursor-pointer shadow-xs"
                  >
                    <option value="en">English (Global)</option>
                    <option value="bn">Bengali / বাংলা</option>
                  </select>
                </div>
              </div>

              {/* Brand Voice Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Voice Tone & Persona
                </label>
                <input
                  type="text"
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  placeholder="e.g. Confident, concise, and helpful SaaS product advisor."
                  className="w-full h-9 rounded-lg bg-surface-high border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors shadow-xs"
                />
              </div>

              {/* Business Overview */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Platform Knowledge Summary
                </label>
                <textarea
                  value={businessSummary}
                  onChange={(e) => setBusinessSummary(e.target.value)}
                  rows={3}
                  placeholder="ORA — The Autonomous Multimodal Voice AI Sales Brain for Modern E-Commerce."
                  className="w-full rounded-lg bg-surface-high border border-border p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors resize-none leading-relaxed shadow-xs"
                />
              </div>
            </div>

            {/* Right Column: Custom Directives */}
            <div className="flex flex-col justify-between space-y-1.5">
              <div className="space-y-1.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Custom Instructions & Selling Points
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {customDirectives.length}/3000
                  </span>
                </div>
                <textarea
                  value={customDirectives}
                  onChange={(e) => setCustomDirectives(e.target.value)}
                  rows={7}
                  placeholder="e.g. Always emphasize sub-400ms voice streaming latency, 60-second zero-code setup, and Stripe/bKash dual billing. Direct users to /pricing when they ask about subscription tiers."
                  className="w-full flex-1 rounded-lg bg-surface-high border border-border p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors font-mono text-[11px] leading-relaxed resize-none shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Save Row */}
          <div className="pt-4 border-t border-border flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Voice Test Modal */}
        <VoiceTestModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          publishableKey={publishableKey}
        />
      </div>
    </>
  );
}
