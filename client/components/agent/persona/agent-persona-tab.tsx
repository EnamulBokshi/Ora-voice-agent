'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  UserCheck,
  ShoppingBag,
  Layers,
  Briefcase,
  Bot,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
  FileText,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAgentConfigApi,
  updateAgentConfigApi,
  AgentConfigData,
} from '@/services/agent-config-service';

// ─── Archetype Definitions ───────────────────────────────────────────────────

interface ArchetypeOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge: string;
}

const ARCHETYPES: ArchetypeOption[] = [
  {
    id: 'portfolio',
    title: 'Portfolio / Personal Website',
    subtitle: 'Engineers, Designers, Creators & Executives',
    description:
      'Warmly introduces visitors to your background, tech stack, achievements, featured projects, and directs recruiters to your contact/booking links.',
    icon: UserCheck,
    badge: 'Recommended for You',
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Storefront',
    subtitle: 'Retailers, Brands & Digital Goods',
    description:
      'Helps shoppers discover catalog products, checks size/availability, recommends alternatives, and guides checkout via Stripe or bKash.',
    icon: ShoppingBag,
    badge: 'Storefront',
  },
  {
    id: 'saas',
    title: 'SaaS Platform & Tech Product',
    subtitle: 'Software, Apps & Developer Tools',
    description:
      'Pitches features, explains subscription tiers/pricing, answers technical API questions, and onboards signups.',
    icon: Layers,
    badge: 'SaaS',
  },
  {
    id: 'agency_services',
    title: 'Agency & Professional Services',
    subtitle: 'Design Agencies, Consultancies & Studios',
    description:
      'Explains service offerings, case studies, engagement models, and schedules discovery calls with prospects.',
    icon: Briefcase,
    badge: 'Agency',
  },
  {
    id: 'general',
    title: 'General AI Assistant',
    subtitle: 'Multi-purpose Website Representative',
    description:
      'Answers visitor questions using knowledge base documents with an adaptive, conversational persona.',
    icon: Bot,
    badge: 'General',
  },
];

export function AgentPersonaTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [archetype, setArchetype] = useState<string>('portfolio');
  const [brandVoice, setBrandVoice] = useState<string>('');
  const [businessSummary, setBusinessSummary] = useState<string>('');
  const [customDirectives, setCustomDirectives] = useState<string>('');

  useEffect(() => {
    getAgentConfigApi()
      .then((res) => {
        if (res?.config) {
          setArchetype(res.config.businessArchetype || 'portfolio');
          setBrandVoice(
            res.config.brandVoiceDescription ||
              'Friendly, articulate, technical, and helpful assistant representing the creator.',
          );
          setBusinessSummary(res.config.businessSummary || '');
          setCustomDirectives(res.config.customDirectives || '');
        }
      })
      .catch((err) => {
        console.error('Failed to load agent config:', err);
        setErrorMsg('Failed to load agent settings. Using local draft.');
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
      setSuccessMsg('Agent persona & directives updated successfully!');
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
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Loading agent persona settings...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── 1. Archetype Selection ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            Business & Website Archetype
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select what your website represents. ORA dynamically tailors its tone, mission, and conversation playbook to match.
          </p>
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
                  'text-left p-4 rounded-xl border transition-all duration-200 relative flex flex-col justify-between group',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-card/40 hover:bg-card/80 hover:border-border/80',
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'p-1.5 rounded-lg',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-xs text-foreground">{opt.title}</span>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-mono font-medium',
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>{opt.subtitle}</span>
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full border flex items-center justify-center',
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                    )}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Brand Voice & Tone ─────────────────────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          Brand Voice & Tone Description
        </label>
        <p className="text-xs text-muted-foreground">
          Describe the personality, attitude, and tone ORA should adopt when speaking with visitors.
        </p>
        <input
          type="text"
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
          placeholder="e.g. Highly articulate, passionate software architect, concise, and enthusiastic."
          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* ── 3. Creator / Business Summary ─────────────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Creator Bio / Business Summary
        </label>
        <p className="text-xs text-muted-foreground">
          High-level overview of who you are or what your business does.
        </p>
        <textarea
          rows={3}
          value={businessSummary}
          onChange={(e) => setBusinessSummary(e.target.value)}
          placeholder="e.g. Enamul Bokshi — Full-Stack Software Engineer & Distributed Systems Architect specializing in real-time AI agents and high-throughput microservices."
          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      {/* ── 4. Custom Directives & Key Sections ───────────────────────────── */}
      <div className="space-y-2 pt-2 border-t border-border">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Custom Directives, Key Sections & Anchors
        </label>
        <p className="text-xs text-muted-foreground">
          Special instructions given to ORA. You can specify exact in-page sections (e.g. `#projects`, `#experience`, `#cv`, `#contact`), key talking points, or rules.
        </p>
        <textarea
          rows={5}
          value={customDirectives}
          onChange={(e) => setCustomDirectives(e.target.value)}
          placeholder={`e.g.\n• When asked about sections or navigating, refer to: #projects (featured work), #experience (past roles), #cv (resume download), and #contact (get in touch).\n• Highlight my project 'HyperFlow Distributed Event Pipeline' as my flagship architecture demo.\n• If a recruiter asks for a meeting, invite them to send an email or click the contact link.`}
          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
        />
      </div>

      {/* ── Save Action Button ────────────────────────────────────────────── */}
      <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>Save Persona Settings</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
