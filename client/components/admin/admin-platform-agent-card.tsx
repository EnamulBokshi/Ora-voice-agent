'use client';

import React, { useState, useEffect } from 'react';
import {
  fetchPlatformAgentConfig,
  updatePlatformAgentConfig,
} from '@/services/admin-service';
import { PlatformAgentConfigData } from '@/types/admin';
import { VoiceTestModal } from '@/components/agent/modals/voice-test-modal';
import {
  Bot,
  Key,
  Copy,
  Check,
  MessageSquare,
  Save,
  Radio,
  Globe,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
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
      setSuccessMessage('ORA Platform AI Agent configuration updated successfully!');
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
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>Loading Platform ORA AI Agent configuration...</span>
      </div>
    );
  }

  const publishableKey = data?.business?.publishableKey || 'biz_live_ora_platform_system';

  return (
    <div className="rounded-xl border border-border bg-surface-container overflow-hidden shadow-xs">
      {/* Header Banner */}
      <div className="p-6 border-b border-border bg-surface-low flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-foreground">ORA Platform AI Agent & Sales Brain</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/40">
                <Radio className="h-2.5 w-2.5 animate-pulse text-primary" />
                SYSTEM TENANT
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure the flagship voice AI agent that powers <span className="text-foreground font-medium">ora.ai</span>, handles live landing page visitors, answers pricing and integration queries, and drives SaaS conversions.
            </p>
          </div>
        </div>

        {/* Live Voice Test Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-high border border-border hover:border-primary/40 hover:bg-surface-bright text-xs font-semibold text-foreground transition-all"
          >
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span>Test Platform Voice Agent</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mx-6 mt-6 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mx-6 mt-6 p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content Form */}
      <form onSubmit={handleSave} className="p-6 space-y-6">
        {/* System Tenant Key Bar */}
        <div className="rounded-lg bg-surface-lowest border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Key className="h-3.5 w-3.5 text-primary" />
              <span>Platform Publishable Key (Public Storefront Token)</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {publishableKey}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyKey}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-high border border-border hover:border-primary/30 text-xs font-medium text-foreground transition-all"
            >
              {copiedKey ? (
                <>
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span className="text-primary">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copy Key</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Archetype & Language Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Archetype Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary" />
              <span>Agent Archetype</span>
            </label>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full h-9 rounded-lg bg-surface-lowest border border-border px-3 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="saas">SaaS / Platform Sales Agent (Recommended for ORA)</option>
              <option value="portfolio">Developer / Founder Portfolio</option>
              <option value="agency_services">Agency & Client Services</option>
              <option value="ecommerce">E-Commerce & Storefront Assistant</option>
              <option value="consulting">Consulting & Advisory</option>
              <option value="general">General Website Representative</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Determines Gemini Voice toolsets (dynamic pricing lookups, navigation actions, lead capture).
            </p>
          </div>

          {/* Primary Language */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" />
              <span>Primary Language</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full h-9 rounded-lg bg-surface-lowest border border-border px-3 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="en">English (Global)</option>
              <option value="bn">Bengali / বাংলা</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Default spoken language for Gemini Live voice streams.
            </p>
          </div>
        </div>

        {/* Brand Voice Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            <span>Brand Voice & Persona</span>
          </label>
          <input
            type="text"
            value={brandVoice}
            onChange={(e) => setBrandVoice(e.target.value)}
            placeholder="e.g. Authoritative, enthusiastic, and highly knowledgeable AI sales representative for ORA."
            className="w-full h-9 rounded-lg bg-surface-lowest border border-border px-3 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <p className="text-[11px] text-muted-foreground">
            Defines the tone, pace, energy, and communication style ORA adopts when speaking to visitors.
          </p>
        </div>

        {/* Custom Directives & Selling Points */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>Custom Directives & Selling Points (Prompt Injection)</span>
            <span className="text-[10px] text-muted-foreground font-mono">{customDirectives.length}/3000</span>
          </label>
          <textarea
            value={customDirectives}
            onChange={(e) => setCustomDirectives(e.target.value)}
            rows={4}
            placeholder="e.g. Always highlight our sub-400ms streaming latency, 60-second zero-config setup, Stripe & bKash dual checkout, and dynamic DOM scraping. Direct visitors to /pricing when they ask about plans."
            className="w-full rounded-lg bg-surface-lowest border border-border p-3 text-xs text-foreground focus:outline-none focus:border-primary transition-colors font-mono leading-relaxed resize-y"
          />
          <p className="text-[11px] text-muted-foreground">
            Special business rules, discount promo codes, or guidance injected directly into Gemini's system instructions.
          </p>
        </div>

        {/* Business One-Liner Summary */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Platform Knowledge Summary
          </label>
          <textarea
            value={businessSummary}
            onChange={(e) => setBusinessSummary(e.target.value)}
            rows={2}
            placeholder="ORA — The Autonomous Multimodal Voice AI Sales Brain for Every Merchant."
            className="w-full rounded-lg bg-surface-lowest border border-border p-3 text-xs text-foreground focus:outline-none focus:border-primary transition-colors resize-y"
          />
          <p className="text-[11px] text-muted-foreground">
            Core overview preloaded into ORA's prompt memory before any search tool is triggered.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            Changes take effect immediately on all new voice sessions initiated on the landing page.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Platform Agent Config</span>
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
