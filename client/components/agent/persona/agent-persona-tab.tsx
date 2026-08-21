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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAgentConfigApi,
  updateAgentConfigApi,
} from '@/services/agent-config-service';

// ─── Business Model Archetypes ────────────────────────────────────────────────

interface ArchetypeOption {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  capabilities: string[];
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce & Retail Storefront',
    category: 'Storefront',
    description:
      'Product catalog search, real-time stock/size verification, cart recovery, and Stripe / bKash checkout guidance.',
    icon: ShoppingBag,
    capabilities: ['Catalog Search', 'Cart Recovery', 'Live Inventory', '1-Click Checkout'],
  },
  {
    id: 'saas',
    name: 'SaaS & Digital Tech Product',
    category: 'Software',
    description:
      'Feature explanation, subscription tier pricing, API / documentation navigation, and signup onboarding.',
    icon: Layers,
    capabilities: ['Tier Pricing', 'Feature Matrix', 'Docs Navigation', 'Lead Capture'],
  },
  {
    id: 'agency_services',
    name: 'Agency & Professional Services',
    category: 'Services',
    description:
      'Service package pitching, past case studies, project scoping, and prospect discovery call booking.',
    icon: Briefcase,
    capabilities: ['Service Packages', 'Case Studies', 'Discovery Booking', 'Inquiries'],
  },
  {
    id: 'portfolio',
    name: 'Portfolio & Creator Profile',
    category: 'Personal',
    description:
      'Showcase featured projects, technical stack, career milestones, and direct recruiters to booking links.',
    icon: Globe,
    capabilities: ['Featured Projects', 'Tech Stack', 'Resume / CV', 'Contact Links'],
  },
  {
    id: 'general',
    name: 'Enterprise & General Knowledge',
    category: 'General',
    description:
      'Comprehensive customer support using ingested knowledge base documents, store policies, and escalation workflows.',
    icon: Building2,
    capabilities: ['Policy FAQs', 'Knowledge RAG', 'Escalation', 'Multi-Topic'],
  },
];

const TONE_PRESETS = [
  'Direct & Concise',
  'Consultative Sales',
  'Technical & Precise',
  'Friendly & Casual',
  'High-Energy Luxury',
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
              'Articulate, concise, consultative, and focused on helping shoppers find the right solution.',
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
      setSuccessMsg('Agent configuration and directives saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update agent config:', err);
      setErrorMsg(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs font-mono">Loading configuration...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
      {/* Feedback Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 1. Business & Store Archetype ─────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card/40 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              Business Model & Archetype
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Select the primary operating model. ORA dynamically binds the appropriate conversation playbooks and sales tools.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-border bg-background text-muted-foreground">
            {ARCHETYPES.find((a) => a.id === archetype)?.category.toUpperCase() || 'CUSTOM'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {ARCHETYPES.map((opt) => {
            const Icon = opt.icon;
            const isSelected = archetype === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setArchetype(opt.id)}
                className={cn(
                  'text-left p-4 rounded-md border transition-all text-xs relative flex flex-col justify-between group cursor-pointer',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                    : 'border-border bg-background/50 hover:bg-background/90 hover:border-border/80',
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'p-1.5 rounded border',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/40 text-muted-foreground border-border group-hover:text-foreground',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold text-foreground text-[12.5px]">{opt.name}</span>
                    </div>

                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                      )}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-wrap items-center gap-1.5">
                  {opt.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                        isSelected
                          ? 'border-primary/30 text-primary bg-primary/10'
                          : 'border-border/60 text-muted-foreground/80 bg-muted/20',
                      )}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Brand Voice & Tone ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card/40 p-5 space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Brand Voice & Communication Tone
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Defines the demeanor, cadence, and sales style ORA maintains during conversations.
          </p>
        </div>

        {/* Preset quick-tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground font-mono mr-1">Presets:</span>
          {TONE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setBrandVoice(preset)}
              className={cn(
                'text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer',
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
          placeholder="e.g. Consultative, concise, highly professional, direct, and solution-driven."
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* ── 3. Store & Business Overview ──────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card/40 p-5 space-y-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Store Overview & Mission
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            A concise overview of what your store sells or what your business provides. ORA uses this as core identity grounding.
          </p>
        </div>

        <textarea
          rows={3}
          value={businessSummary}
          onChange={(e) => setBusinessSummary(e.target.value)}
          placeholder="e.g. Apex Apparel is a premier sustainable activewear brand delivering high-durability performance gear with eco-certified fabrics and express worldwide shipping."
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
        />
      </div>

      {/* ── 4. Operational Directives & Policies ───────────────────────────── */}
      <div className="rounded-lg border border-border bg-card/40 p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              Operational Directives, Store Policies & Anchors
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Specific operating rules, promotion codes, return policy guidelines, and navigation anchors (e.g. <code className="font-mono text-primary text-[11px]">#pricing</code>, <code className="font-mono text-primary text-[11px]">#products</code>).
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Active Memory</span>
          </div>
        </div>

        <textarea
          rows={5}
          value={customDirectives}
          onChange={(e) => setCustomDirectives(e.target.value)}
          placeholder={`# Operating Directives\n• Offer 10% discount code "SAVE10" to customers hesitating on checkout.\n• Free shipping applies to orders above $75.\n• When customers ask for navigation, refer to: #products, #pricing, #contact.\n• For support escalations, direct inquiries to support@store.com.`}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
        />
      </div>

      {/* ── Save Action Bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-[11.5px] text-muted-foreground font-mono">
          Changes take effect instantly on live store voice & chat sessions.
        </span>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
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
  );
}
