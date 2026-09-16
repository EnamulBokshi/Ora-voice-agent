'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Store,
  Languages,
  SlidersHorizontal,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  RotateCcw,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAgentConfigApi,
  updateAgentConfigApi,
  getAgentProfilesApi,
  switchArchetypeApi,
  type AgentProfileSummary,
} from '@/services/agent-config-service';
import { getMeApi } from '@/services/auth-service';
import { VoiceTestModal } from '../modals/voice-test-modal';
import {
  SUPPORTED_LANGUAGES,
  getLanguageById,
  SupportedLanguage,
} from '@/lib/languages';
import { useReadOnly } from '@/components/common/read-only-fence';
import {
  ARCHETYPES,
  broadcastArchetypeChange,
  getArchetype,
  type BusinessArchetype,
} from '@/lib/archetypes';

// ─── Preset Templates ─────────────────────────────────────────────────────────

interface PresetTemplate {
  id: string;
  label: string;
  badge: string;
  language: string;
  brandVoice: string;
  greetingMessage: string;
  systemPrompt: string;
  avoidances: string;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'conversion_closer',
    label: 'Sales closer',
    badge: 'High Conversion',
    language: 'multilingual',
    brandVoice: 'Warm, high-energy, and focused on helping shoppers find the right products and complete checkout.',
    greetingMessage: 'Welcome to our store! Looking for anything specific today, or would you like to see our trending bestsellers?',
    systemPrompt: `You are ORA, an expert sales and shopping assistant.
- Proactively discover customer preferences, style choices, and budget.
- Mention active promo code "SAVE10" for 10% off at checkout when shoppers are deliberating.
- Remind shoppers of our money-back guarantee and fast delivery.
- Guide shoppers smoothly through cart review and checkout.`,
    avoidances: `• Never hallucinate stock or promise items that are out of stock.
• Never give unverified claims or off-policy discounts.
• Avoid aggressive or pushy language; remain consultative.`,
  },
  {
    id: 'luxury_concierge',
    label: 'Luxury concierge',
    badge: 'Premium Tone',
    language: 'multilingual',
    brandVoice: 'Sophisticated, refined, articulate, patient, and highly attentive to detail.',
    greetingMessage: 'Good day and welcome. It is a pleasure to assist you. How may I curate your shopping experience today?',
    systemPrompt: `You are ORA, the private client concierge and advisor for our collection.
- Offer tailored recommendations highlighting premium materials, craftsmanship, and styling notes.
- Answer questions regarding bespoke sizing, care instructions, and exclusive gift packaging.
- Maintain an impeccable, courteous, and polite tone at all times.`,
    avoidances: `• Never use cheapening sales slang or excessive urgency tactics.
• Never disclose private client information or internal wholesale costs.`,
  },
  {
    id: 'friendly_advisor',
    label: 'Friendly advisor',
    badge: 'Warm & Helpful',
    language: 'multilingual',
    brandVoice: 'Warm, approachable, empathetic, and attentive to customer questions.',
    greetingMessage: 'Hi there! Welcome to our store. Feel free to ask about any product, sizing, or store policies.',
    systemPrompt: `You are ORA, a friendly and helpful store advisor.
- Help shoppers find exactly what they are looking for with patience and warmth.
- Accurately explain product features, materials, shipping times, and return policies.
- Check product inventory in real time and suggest complementary items.`,
    avoidances: `• Never be dismissive or rushed with customer questions.
• Do not make up store policies or promises not verified in the catalog.`,
  },
  {
    id: 'tech_support',
    label: 'Concise support',
    badge: 'Direct & Fast',
    language: 'multilingual',
    brandVoice: 'Concise, direct, technically precise, and solution-oriented with zero fluff.',
    greetingMessage: 'Hello! I am ORA. How can I assist with your setup, documentation, or account today?',
    systemPrompt: `You are ORA, technical support and onboarding specialist for this platform.
- Deliver direct answers in 1 to 2 short sentences.
- Guide users directly to relevant documentation anchors (#docs, #pricing, #api).
- Accurately explain integration steps for Shopify, WooCommerce, and custom sites.`,
    avoidances: `• Never give lengthy rambling responses.
• Never guess API endpoints or technical specs not documented in the knowledge base.`,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function AgentPersonaTab() {
  const readOnly = useReadOnly();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // The live profile. This identifies which profile every other field on this page
  // belongs to, and is changed by switching profiles rather than by saving.
  const [activeArchetype, setActiveArchetype] = useState<BusinessArchetype>('general');
  const [profiles, setProfiles] = useState<AgentProfileSummary[]>([]);
  const [pendingArchetype, setPendingArchetype] = useState<BusinessArchetype | null>(null);
  const [switching, setSwitching] = useState(false);

  // Baseline states (from DB)
  const [initialBrandVoice, setInitialBrandVoice] = useState<string>('');
  const [initialBusinessSummary, setInitialBusinessSummary] = useState<string>('');
  const [initialCustomDirectives, setInitialCustomDirectives] = useState<string>('');
  const [initialSystemPrompt, setInitialSystemPrompt] = useState<string>('');
  const [initialGreetingMessage, setInitialGreetingMessage] = useState<string>('');
  const [initialAvoidances, setInitialAvoidances] = useState<string>('');
  const [initialLanguage, setInitialLanguage] = useState<string>('en');
  const [initialVoiceId, setInitialVoiceId] = useState<string>('Aoede');

  // Form states
  const [brandVoice, setBrandVoice] = useState<string>('');
  const [businessSummary, setBusinessSummary] = useState<string>('');
  const [customDirectives, setCustomDirectives] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [greetingMessage, setGreetingMessage] = useState<string>('');
  const [avoidances, setAvoidances] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [voiceId, setVoiceId] = useState<string>('Aoede');

  // Language Dropdown & Search state
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Active instructions sub-tab
  const [instructionTab, setInstructionTab] = useState<'prompt' | 'greeting' | 'avoidances' | 'policies'>('prompt');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    }
    if (isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangDropdownOpen]);

  const currentLangObj = useMemo(() => getLanguageById(language), [language]);

  const filteredLanguages = useMemo(() => {
    const q = langSearchQuery.toLowerCase().trim();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q),
    );
  }, [langSearchQuery]);

  // Check for unsaved changes
  const hasChanges = useMemo(() => {
    return (
      brandVoice.trim() !== initialBrandVoice.trim() ||
      businessSummary.trim() !== initialBusinessSummary.trim() ||
      customDirectives.trim() !== initialCustomDirectives.trim() ||
      systemPrompt.trim() !== initialSystemPrompt.trim() ||
      greetingMessage.trim() !== initialGreetingMessage.trim() ||
      avoidances.trim() !== initialAvoidances.trim() ||
      language !== initialLanguage ||
      voiceId !== initialVoiceId
    );
  }, [
    brandVoice,
    initialBrandVoice,
    businessSummary,
    initialBusinessSummary,
    customDirectives,
    initialCustomDirectives,
    systemPrompt,
    initialSystemPrompt,
    greetingMessage,
    initialGreetingMessage,
    avoidances,
    initialAvoidances,
    language,
    initialLanguage,
    voiceId,
    initialVoiceId,
  ]);

  // Load existing config & publishable key
  useEffect(() => {
    let active = true;

    Promise.all([
      getAgentConfigApi().catch(() => null),
      getMeApi().catch(() => null),
      getAgentProfilesApi().catch(() => null),
    ])
      .then(([res, meRes, profilesRes]) => {
        if (!active) return;

        if (profilesRes) {
          setProfiles(profilesRes.profiles || []);
        }

        if (res?.config) {
          const voice = res.config.brandVoiceDescription || '';
          const summary = res.config.businessSummary || '';
          const directives = res.config.customDirectives || '';
          const sysPrompt = res.config.systemPrompt || '';
          const greeting = res.config.greetingMessage || '';
          const avoid = res.config.avoidances || '';
          const lang = res.config.language || 'en';
          const vId = res.voice?.voiceId || 'Aoede';

          setActiveArchetype(res.activeArchetype || 'general');
          setInitialBrandVoice(voice);
          setInitialBusinessSummary(summary);
          setInitialCustomDirectives(directives);
          setInitialSystemPrompt(sysPrompt);
          setInitialGreetingMessage(greeting);
          setInitialAvoidances(avoid);
          setInitialLanguage(lang);
          setInitialVoiceId(vId);

          setBrandVoice(voice);
          setBusinessSummary(summary);
          setCustomDirectives(directives);
          setSystemPrompt(sysPrompt);
          setGreetingMessage(greeting);
          setAvoidances(avoid);
          setLanguage(lang);
          setVoiceId(vId);
        }

        if (meRes?.business?.publishableKey) {
          setPublishableKey(meRes.business.publishableKey);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Save handler
  const handleSave = async (e?: React.FormEvent) => {
    if (readOnly) {
      e?.preventDefault();
      return;
    }
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateAgentConfigApi({
        brandVoiceDescription: brandVoice,
        businessSummary,
        customDirectives,
        systemPrompt,
        greetingMessage,
        avoidances,
        language,
        voiceId: voiceId || 'Aoede',
      });

      setInitialBrandVoice(brandVoice);
      setInitialBusinessSummary(businessSummary);
      setInitialCustomDirectives(customDirectives);
      setInitialSystemPrompt(systemPrompt);
      setInitialGreetingMessage(greetingMessage);
      setInitialAvoidances(avoidances);
      setInitialLanguage(language);
      setInitialVoiceId(voiceId);

      setSuccessMsg('Settings saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save persona:', err);
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    setBrandVoice(initialBrandVoice);
    setBusinessSummary(initialBusinessSummary);
    setCustomDirectives(initialCustomDirectives);
    setSystemPrompt(initialSystemPrompt);
    setGreetingMessage(initialGreetingMessage);
    setAvoidances(initialAvoidances);
    setLanguage(initialLanguage);
    setVoiceId(initialVoiceId);
  };

  // Switching profiles. The profile being left keeps its settings and restores upon return.
  const handleConfirmSwitch = async () => {
    if (!pendingArchetype || readOnly) return;
    setSwitching(true);
    setErrorMsg(null);

    try {
      const res = await switchArchetypeApi(pendingArchetype);

      const voice = res?.config?.brandVoiceDescription || '';
      const summary = res?.config?.businessSummary || '';
      const directives = res?.config?.customDirectives || '';
      const sysPrompt = res?.config?.systemPrompt || '';
      const greeting = res?.config?.greetingMessage || '';
      const avoid = res?.config?.avoidances || '';
      const lang = res?.config?.language || 'en';
      const vId = res?.voice?.voiceId || 'Aoede';
      const nextArch = res?.activeArchetype || pendingArchetype;

      setActiveArchetype(nextArch);
      broadcastArchetypeChange(nextArch);
      setInitialBrandVoice(voice);
      setInitialBusinessSummary(summary);
      setInitialCustomDirectives(directives);
      setInitialSystemPrompt(sysPrompt);
      setInitialGreetingMessage(greeting);
      setInitialAvoidances(avoid);
      setInitialLanguage(lang);
      setInitialVoiceId(vId);

      setBrandVoice(voice);
      setBusinessSummary(summary);
      setCustomDirectives(directives);
      setSystemPrompt(sysPrompt);
      setGreetingMessage(greeting);
      setAvoidances(avoid);
      setLanguage(lang);
      setVoiceId(vId);

      const profilesRes = await getAgentProfilesApi().catch(() => null);
      if (profilesRes) setProfiles(profilesRes.profiles || []);

      setPendingArchetype(null);
      broadcastArchetypeChange(res.activeArchetype);
      setSuccessMsg(
        `Active model switched to ${getArchetype(res.activeArchetype)?.label ?? res.activeArchetype}.`,
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to switch business type:', err);
      setErrorMsg(err.message || 'Failed to switch business type.');
    } finally {
      setSwitching(false);
    }
  };

  // Preset click handler
  const handleApplyPreset = (preset: PresetTemplate) => {
    setLanguage(preset.language);
    setBrandVoice(preset.brandVoice);
    setGreetingMessage(preset.greetingMessage);
    setSystemPrompt(preset.systemPrompt);
    setAvoidances(preset.avoidances);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs">Loading persona settings...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="w-full space-y-5 pb-8">
      {/* ── Sticky Top Status & Action Bar ── */}
      <div className="sticky top-0 z-20 -mt-2 mb-5 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 sm:py-3 bg-background/95 backdrop-blur-md border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-[2px] bg-primary flex-shrink-0" />
          <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground truncate">
            <span className="text-foreground font-semibold tracking-normal">{currentLangObj.name}</span>
            {' · '}
            <span className="text-foreground font-semibold tracking-normal">
              {getArchetype(activeArchetype)?.label ?? activeArchetype}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/60 bg-surface-high/40 hover:bg-surface-high text-foreground text-[12px] font-medium transition-colors cursor-pointer shadow-xs touch-manipulation"
          >
            <span>Test voice</span>
          </button>

          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] text-muted-foreground hover:text-foreground border border-border/60 bg-surface-high/30 hover:bg-surface-high transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="submit"
            disabled={readOnly || saving}
            title={readOnly ? 'View-only access' : undefined}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground font-semibold text-[12px] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save changes</span>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 text-primary rounded-md text-xs">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Switch Confirmation Modal ── */}
      {pendingArchetype && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="switch-archetype-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-md border border-border bg-surface-container p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md border border-border/60 bg-surface-high/40 flex items-center justify-center text-primary flex-shrink-0">
                  <Store size={14} />
                </div>
                <div className="min-w-0">
                  <h3 id="switch-archetype-title" className="text-[13.5px] font-semibold text-foreground tracking-tight truncate">
                    Switch to {getArchetype(pendingArchetype)?.label ?? pendingArchetype}?
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Preset configuration switch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingArchetype(null)}
                aria-label="Close"
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Description */}
            <p className="text-[12.5px] text-muted-foreground leading-relaxed">
              Your current <span className="text-foreground font-medium">{getArchetype(activeArchetype)?.label ?? activeArchetype}</span> settings remain saved and will restore if you switch back.
            </p>

            {/* Diff breakdown */}
            <div className="rounded-md border border-border/50 bg-surface-high/20 p-3 space-y-2 text-[12px]">
              <div className="flex items-start gap-2">
                <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground shrink-0 w-24">Starts Fresh</span>
                <span className="text-foreground/90 leading-snug">Persona, system prompt, greeting, and language</span>
              </div>
              <div className="flex items-start gap-2 pt-1.5 border-t border-border/30">
                <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground shrink-0 w-24">Carries Over</span>
                <span className="text-foreground/90 leading-snug">Store connection, policies, and product catalog</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setPendingArchetype(null)}
                disabled={switching}
                className="h-8 px-3 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer border border-border/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitch}
                disabled={switching}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-primary text-primary-foreground font-semibold text-[12px] rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {switching ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Switching...</span>
                  </>
                ) : (
                  <span>Switch business type</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Business Type (Full Width Top Section) ── */}
      <div className="w-full rounded-md border border-border/50 bg-surface-lowest/40 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" />
            <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
              Business Type
            </h2>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Active: <span className="bg-[#C8F031] text-[#111111] font-bold px-2.5 py-0.5 rounded-full text-[11px] tracking-normal capitalize">{getArchetype(activeArchetype)?.label ?? activeArchetype}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 w-full">
          {ARCHETYPES.map((opt) => {
            const isSelected = activeArchetype === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={readOnly || switching}
                title={opt.blurb}
                onClick={() => {
                  if (isSelected) return;
                  setPendingArchetype(opt.id);
                }}
                className={cn(
                  'w-full min-w-0 flex items-center justify-center px-2 sm:px-3 py-2 sm:py-2.5 min-h-[40px] rounded-md border text-[11.5px] sm:text-[12px] font-medium transition-all cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-60 text-center touch-manipulation',
                  isSelected
                    ? 'bg-[#C8F031] text-[#111111] font-bold border-[#C8F031] shadow-xs'
                    : 'border-border/60 bg-surface-lowest/60 text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                )}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Language + Persona (left) | Instructions (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-5 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-5">

          {/* Card: Language */}
          <div className="rounded-md border border-border/50 bg-surface-lowest/40 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-primary" />
                <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
                  Language
                </h2>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Active: <span className="text-primary font-semibold tracking-normal">{currentLangObj.name}</span>
              </span>
            </div>

            {/* Searchable Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-md border border-border/60 bg-surface-lowest hover:bg-surface-high/30 text-foreground text-[12.5px] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{currentLangObj.flag}</span>
                  <span className="font-semibold truncate">{currentLangObj.name}</span>
                  <span className="text-muted-foreground text-[11.5px] truncate">({currentLangObj.nativeName})</span>
                </div>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ml-2', isLangDropdownOpen && 'rotate-180')} />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1.5 z-50 rounded-md border border-border/80 bg-surface-lowest/95 backdrop-blur-md shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-border/50 bg-surface-high/30 flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      type="text"
                      value={langSearchQuery}
                      onChange={(e) => setLangSearchQuery(e.target.value)}
                      placeholder="Search languages..."
                      className="w-full bg-transparent border-none text-[12px] text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                    {filteredLanguages.map((lang) => {
                      const isSelected = language.toLowerCase() === lang.id.toLowerCase();
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.id);
                            setIsLangDropdownOpen(false);
                            setLangSearchQuery('');
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-md flex items-center justify-between gap-2 text-[12px] transition-all cursor-pointer',
                            isSelected
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-surface-high/60 text-foreground',
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span>{lang.flag}</span>
                            <span className="truncate">{lang.name}</span>
                            <span className="text-muted-foreground text-[11px]">({lang.nativeName})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground opacity-80">{lang.region}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Persona */}
          <div className="rounded-md border border-border/50 bg-surface-lowest/40 p-5 sm:p-6 space-y-4">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
                    Persona
                  </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_TEMPLATES.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1 rounded-md text-[11.5px] font-medium border border-border/60 bg-surface-high/30 hover:bg-surface-high hover:border-primary/40 text-foreground transition-all cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Voice */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                  Brand Voice
                </label>
                <input
                  type="text"
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  placeholder="Warm, consultative, concise."
                  className="w-full h-8 px-3 text-[13px] bg-surface-lowest border border-border/60 rounded-md text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground"
                />
              </div>

              {/* Store Overview */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                  Store Overview
                </label>
                <textarea
                  rows={3}
                  value={businessSummary}
                  onChange={(e) => setBusinessSummary(e.target.value)}
                  placeholder="Modern apparel brand, sustainable activewear."
                  className="w-full px-3 py-2 bg-surface-lowest border border-border/60 rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground leading-relaxed resize-none"
                />
              </div>
            </div>
          </div>

        </div>
        {/* End left column */}

        {/* Card 3: Instructions & Policies */}
        <div className="rounded-md border border-border/50 bg-surface-lowest/40 p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Tabs Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
                  Instructions
                </h2>
              </div>

              {/* Segmented Pill Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-md bg-surface-high border border-border/50 text-[11.5px]">
                <button
                  type="button"
                  onClick={() => setInstructionTab('prompt')}
                  className={cn(
                    'px-2.5 py-1 rounded-[3px] transition-all cursor-pointer',
                    instructionTab === 'prompt' ? 'bg-surface-lowest text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Prompt
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionTab('greeting')}
                  className={cn(
                    'px-2.5 py-1 rounded-[3px] transition-all cursor-pointer',
                    instructionTab === 'greeting' ? 'bg-surface-lowest text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Greeting
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionTab('avoidances')}
                  className={cn(
                    'px-2.5 py-1 rounded-[3px] transition-all cursor-pointer',
                    instructionTab === 'avoidances' ? 'bg-surface-lowest text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Guardrails
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionTab('policies')}
                  className={cn(
                    'px-2.5 py-1 rounded-[3px] transition-all cursor-pointer',
                    instructionTab === 'policies' ? 'bg-surface-lowest text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Policies
                </button>
              </div>
            </div>

            {/* Tab: System Prompt */}
            {instructionTab === 'prompt' && (
              <div className="space-y-2">
                <textarea
                  rows={9}
                  aria-label="System prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={`• Help customers find products, sizes, and colors.\n• Mention promo code "SAVE10" at checkout.\n• Answer shipping and return policy questions accurately.`}
                  className="w-full px-3 py-2 bg-surface-lowest border border-border/60 rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground leading-relaxed resize-y"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Anchors:</span>
                  {['#products', '#pricing', '#shipping', '#checkout', '#contact'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSystemPrompt((prev) => `${prev} ${tag}`.trim())}
                      className="px-2 py-0.5 rounded-md border border-border/50 bg-surface-high/30 hover:bg-surface-high text-[10.5px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Greeting Phrase */}
            {instructionTab === 'greeting' && (
              <div className="space-y-2">
                <input
                  type="text"
                  aria-label="Opening greeting"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="Welcome to our store! How can I help you today?"
                  className="w-full h-8 px-3 text-[13px] bg-surface-lowest border border-border/60 rounded-md text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground"
                />
              </div>
            )}

            {/* Tab: Guardrails / What to Avoid */}
            {instructionTab === 'avoidances' && (
              <div className="space-y-2">
                <textarea
                  rows={8}
                  aria-label="Guardrails and topics to avoid"
                  value={avoidances}
                  onChange={(e) => setAvoidances(e.target.value)}
                  placeholder={`• Never mention competitors.\n• Never offer unverified discounts.\n• Stay focused on store products and policies.`}
                  className="w-full px-3 py-2 bg-surface-lowest border border-destructive/30 focus:border-destructive/60 rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-destructive leading-relaxed resize-y"
                />
              </div>
            )}

            {/* Tab: Additional Policies */}
            {instructionTab === 'policies' && (
              <div className="space-y-2">
                <textarea
                  rows={8}
                  aria-label="Store policies and directives"
                  value={customDirectives}
                  onChange={(e) => setCustomDirectives(e.target.value)}
                  placeholder={`• Free shipping above $50.\n• 7-day returns on unworn items.`}
                  className="w-full px-3 py-2 bg-surface-lowest border border-border/60 rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground leading-relaxed resize-y"
                />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Test Voice Modal ── */}
      <VoiceTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        publishableKey={publishableKey || undefined}
      />
    </form>
  );
}
