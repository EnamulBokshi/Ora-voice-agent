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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminPlatformAgentCard() {
  const [data, setData] = useState<PlatformAgentConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Form State
  const [brandVoice, setBrandVoice] = useState('');
  const [archetype, setArchetype] = useState('saas');
  const [businessSummary, setBusinessSummary] = useState('');
  const [customDirectives, setCustomDirectives] = useState('');
  const [language, setLanguage] = useState('en');

  const loadConfig = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchPlatformAgentConfig();
      setData(res);
      if (res?.agentConfig) {
        setBrandVoice(res.agentConfig.brandVoiceDescription || '');
        setArchetype(res.agentConfig.businessArchetype || 'saas');
        setBusinessSummary(res.agentConfig.businessSummary || '');
        setCustomDirectives(res.agentConfig.customDirectives || '');
        setLanguage(res.agentConfig.language || 'en');
      }
    } catch (err: any) {
      console.error('Failed to load platform agent config:', err);
      setErrorMessage('Failed to load platform agent configuration.');
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
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await updatePlatformAgentConfig({
        brandVoiceDescription: brandVoice,
        businessArchetype: archetype,
        businessSummary,
        customDirectives,
        language,
      });

      setData((prev) => (prev ? { ...prev, agentConfig: res.agentConfig } : null));
      setSuccessMessage('Platform Agent configuration updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to update platform agent config:', err);
      setErrorMessage(err.message || 'Failed to update configuration.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-container p-8 flex items-center justify-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Loading Platform Agent configuration...</span>
      </div>
    );
  }

  const publishableKey = data?.business?.publishableKey || 'biz_live_ora_platform_system';

  return (
    <div className="rounded-xl border border-border bg-surface-container overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border bg-surface-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-foreground">Platform Voice Agent</h2>
            <span className="inline-flex items-center rounded-full bg-surface-high px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border">
              ora.ai Storefront
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time conversational voice brain for the public landing page
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyKey}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-high border border-border hover:bg-surface-bright text-xs font-medium text-foreground transition-colors"
            title="Copy Publishable Widget Key"
          >
            {copiedKey ? (
              <>
                <Check className="h-3.5 w-3.5 text-primary" />
                <span className="text-primary font-semibold">Key Copied</span>
              </>
            ) : (
              <>
                <Key className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate max-w-[130px] font-mono text-[11px] text-muted-foreground">{publishableKey.slice(0, 16)}...</span>
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

      {/* Messages */}
      {successMessage && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Archetype, Language, Brand Persona */}
          <div className="space-y-3.5">
            {/* Archetype & Language Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Agent Archetype
                </label>
                <select
                  value={archetype}
                  onChange={(e) => setArchetype(e.target.value)}
                  className="w-full h-8.5 rounded-lg bg-surface-lowest border border-border px-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="saas">SaaS Sales Representative</option>
                  <option value="ecommerce">E-Commerce Storefront</option>
                  <option value="agency_services">Agency & Client Services</option>
                  <option value="consulting">Consulting & Advisory</option>
                  <option value="portfolio">Developer Portfolio</option>
                  <option value="general">General Support</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Spoken Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-8.5 rounded-lg bg-surface-lowest border border-border px-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="en">English (Global)</option>
                  <option value="bn">Bengali / বাংলা</option>
                </select>
              </div>
            </div>

            {/* Brand Voice Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Voice Tone & Persona
              </label>
              <input
                type="text"
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                placeholder="e.g. Confident, concise, and helpful SaaS product advisor."
                className="w-full h-8.5 rounded-lg bg-surface-lowest border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Business Overview */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Platform Knowledge Summary
              </label>
              <textarea
                value={businessSummary}
                onChange={(e) => setBusinessSummary(e.target.value)}
                rows={3}
                placeholder="ORA — The Autonomous Multimodal Voice AI Sales Brain for Modern E-Commerce."
                className="w-full rounded-lg bg-surface-lowest border border-border p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: Custom Directives */}
          <div className="flex flex-col justify-between space-y-1">
            <div className="space-y-1 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Custom Instructions & Selling Points
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">{customDirectives.length}/3000</span>
              </div>
              <textarea
                value={customDirectives}
                onChange={(e) => setCustomDirectives(e.target.value)}
                rows={7}
                placeholder="e.g. Always emphasize sub-400ms voice streaming latency, 60-second zero-code setup, and Stripe/bKash dual billing. Direct users to /pricing when they ask about subscription tiers."
                className="w-full flex-1 rounded-lg bg-surface-lowest border border-border p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono text-[11px] leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Save Row */}
        <div className="pt-3 border-t border-border flex items-center justify-end">
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
  );
}
