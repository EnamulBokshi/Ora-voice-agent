'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Layers,
  Briefcase,
  Globe,
  Building2,
  SlidersHorizontal,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  MessageSquare,
  Terminal,
  ShieldCheck,
  Check,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAgentConfigApi,
  updateAgentConfigApi,
} from '@/services/agent-config-service';

// ─── Archetype Definitions (Compact & Professional) ───────────────────────────

interface ArchetypeOption {
  id: string;
  name: string;
  category: string;
  subtitle: string;
  icon: React.ElementType;
  features: string[];
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Storefront',
    category: 'Retail',
    subtitle: 'Catalog search, live stock & cart recovery',
    icon: ShoppingBag,
    features: ['Live Inventory Check', 'Cart Recovery Flow', 'Stripe / bKash Checkout'],
  },
  {
    id: 'saas',
    name: 'SaaS & Tech Product',
    category: 'Software',
    subtitle: 'Tier pricing, feature matrix & API onboarding',
    icon: Layers,
    features: ['Subscription Tiers', 'Documentation Navigation', 'Lead Qualification'],
  },
  {
    id: 'agency_services',
    name: 'Agency & Consultancies',
    category: 'Services',
    subtitle: 'Service packages, case studies & discovery calls',
    icon: Briefcase,
    features: ['Service Scoping', 'Case Study Pitching', 'Meeting Link Scheduling'],
  },
  {
    id: 'portfolio',
    name: 'Portfolio & Creator',
    category: 'Personal',
    subtitle: 'Featured projects, tech stack & bookings',
    icon: Globe,
    features: ['Flagship Projects', 'Tech Stack Explanation', 'Recruiter Inquiries'],
  },
  {
    id: 'general',
    name: 'Enterprise & General FAQ',
    category: 'General',
    subtitle: 'Store policies, knowledge base & support',
    icon: Building2,
    features: ['Policy FAQs', 'Knowledge Base RAG', 'Support Escalation'],
  },
];

const TONE_PRESETS = [
  'Consultative Sales',
  'Direct & Concise',
  'Technical & Precise',
  'Friendly & Casual',
];

export function AgentPersonaTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [archetype, setArchetype] = useState<string>('ecommerce');
  const [brandVoice, setBrandVoice] = useState<string>('');
  const [businessSummary, setBusinessSummary] = useState<string>('');
  const [customDirectives, setCustomDirectives] = useState<string>('');

  useEffect(() => {
    getAgentConfigApi()
      .then((res) => {
        if (res?.config) {
          setArchetype(res.config.businessArchetype || 'ecommerce');
          setBrandVoice(
            res.config.brandVoiceDescription ||
              'Articulate, concise, consultative, and focused on helping visitors find solutions.',
          );
          setBusinessSummary(res.config.businessSummary || '');
          setCustomDirectives(res.config.customDirectives || '');
        }
      })
      .catch((err) => {
        console.error('Failed to load agent config:', err);
        setErrorMsg('Failed to load agent settings. Using local defaults.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateAgentConfigApi({
        businessArchetype: archetype,
        brandVoiceDescription: brandVoice,
        businessSummary,
        customDirectives,
      });
      setSuccessMsg('Agent configuration saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update agent config:', err);
      setErrorMsg(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedArchetype = ARCHETYPES.find((a) => a.id === archetype) || ARCHETYPES[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs font-mono">Loading configuration...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="w-full space-y-4">
      {/* Feedback Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 2-Column Responsive Dashboard Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT COLUMN (Archetype & Identity) ── */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Card: Operating Model Archetype */}
          <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Business Model & Archetype
                </h2>
              </div>
              <span className="text-[10.5px] font-mono text-muted-foreground">
                Active: <span className="text-primary font-medium">{selectedArchetype.category}</span>
              </span>
            </div>

            {/* Compact Archetype List */}
            <div className="grid grid-cols-1 gap-2">
              {ARCHETYPES.map((opt) => {
                const Icon = opt.icon;
                const isSelected = archetype === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setArchetype(opt.id)}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 rounded-md border transition-all flex items-center justify-between gap-3 group cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border bg-background/40 hover:bg-background/80 hover:border-border/80',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'p-1.5 rounded border flex-shrink-0',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/30 text-muted-foreground border-border group-hover:text-foreground',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-[12px] truncate">
                            {opt.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {opt.subtitle}
                        </p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                      )}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card: Brand Voice */}
          <div className="rounded-lg border border-border bg-card/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Communication Tone
                </h2>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {TONE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBrandVoice(preset)}
                  className={cn(
                    'text-[10.5px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer',
                    brandVoice.toLowerCase().includes(preset.toLowerCase())
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="e.g. Consultative, concise, solution-driven, and friendly."
              className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Card: Store Overview */}
          <div className="rounded-lg border border-border bg-card/40 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Store Profile & Overview
              </h2>
            </div>
            <textarea
              rows={2}
              value={businessSummary}
              onChange={(e) => setBusinessSummary(e.target.value)}
              placeholder="e.g. High-performance retail brand delivering sustainable activewear with express delivery."
              className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* ── RIGHT COLUMN (Directives, Capabilities & Save) ── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card: Active Capabilities Binding */}
          <div className="rounded-lg border border-border bg-card/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Bound Capabilities
                </h2>
              </div>
              <span className="text-[10.5px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Live
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Based on <span className="text-foreground font-medium">{selectedArchetype.name}</span>, ORA activates:
            </p>

            <div className="space-y-1.5 pt-1">
              {selectedArchetype.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-xs text-foreground bg-background/50 border border-border/60 px-2.5 py-1.5 rounded">
                  <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="text-[11.5px]">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Operational Directives & Policies */}
          <div className="rounded-lg border border-border bg-card/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Directives & Policies
                </h2>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Custom rules, promo codes, anchors (<code className="text-primary font-mono text-[10.5px]">#products</code>, <code className="text-primary font-mono text-[10.5px]">#pricing</code>).
            </p>
            <textarea
              rows={5}
              value={customDirectives}
              onChange={(e) => setCustomDirectives(e.target.value)}
              placeholder={`# Rules & Policies\n• Offer 10% discount code "SAVE10" at checkout.\n• Free shipping above $75.\n• Refer to anchors: #products, #pricing.`}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          {/* Save Action Card */}
          <div className="rounded-lg border border-border bg-card/40 p-3.5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground font-mono truncate">
              Auto-syncs with live sessions
            </span>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex-shrink-0"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </form>
  );
}
