'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sliders,
  Globe,
  FileText,
  Volume2,
  Store,
  Shield,
  MessageSquare,
  ShoppingBag,
  Layers,
  Briefcase,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Mic,
  RotateCcw,
  Play,
  Square,
  ChevronDown,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAgentConfigApi,
  updateAgentConfigApi,
} from '@/services/agent-config-service';
import { getMeApi } from '@/services/auth-service';
import { getVoiceSampleApi } from '@/services/voice-service';
import { playGeminiAudioBase64, stopCurrentAudio } from '@/lib/audio-player';
import { VoiceTestModal } from '../modals/voice-test-modal';
import {
  SUPPORTED_LANGUAGES,
  getLanguageById,
  SupportedLanguage,
} from '@/lib/languages';

// ─── Archetypes ───────────────────────────────────────────────────────────────

interface ArchetypeOption {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
}

const ARCHETYPES: ArchetypeOption[] = [
  { id: 'ecommerce', name: 'E-Commerce', category: 'Retail', icon: ShoppingBag },
  { id: 'saas', name: 'SaaS Product', category: 'Software', icon: Layers },
  { id: 'agency_services', name: 'Agency & Services', category: 'Services', icon: Briefcase },
  { id: 'portfolio', name: 'Portfolio', category: 'Personal', icon: Globe },
  { id: 'enterprise', name: 'Enterprise', category: 'Corporate', icon: Building2 },
];

// ─── Voice Options ────────────────────────────────────────────────────────────

interface VoiceOption {
  voiceId: string;
  gender: 'Female' | 'Male';
  name: string;
  tone: string;
  accent: string;
  samplePhrase: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    voiceId: 'Aoede',
    gender: 'Female',
    name: 'Aoede',
    tone: 'Sophisticated & Breezy',
    accent: 'Neutral Global',
    samplePhrase: 'Hello! Welcome to our store. How may I assist with your shopping today?',
  },
  {
    voiceId: 'Kore',
    gender: 'Female',
    name: 'Kore',
    tone: 'Warm & Calm',
    accent: 'Soft & Approachable',
    samplePhrase: 'Welcome. Take your time browsing. Let me know if you have questions on sizing or details.',
  },
  {
    voiceId: 'Charon',
    gender: 'Male',
    name: 'Charon',
    tone: 'Deep & Authoritative',
    accent: 'Clear & Professional',
    samplePhrase: 'Good day. I am ORA, your store assistant. How may I assist with your purchase decisions?',
  },
  {
    voiceId: 'Fenrir',
    gender: 'Male',
    name: 'Fenrir',
    tone: 'Dynamic & Energetic',
    accent: 'Direct & Action-driven',
    samplePhrase: 'Hey there! Check out our new arrivals. Let me find the best options and discounts for you.',
  },
  {
    voiceId: 'Puck',
    gender: 'Male',
    name: 'Puck',
    tone: 'Casual & Upbeat',
    accent: 'Modern & Friendly',
    samplePhrase: 'Hi there! Feel free to browse, and let me know if you need any recommendations or help at checkout.',
  },
];

// ─── Preset Templates ─────────────────────────────────────────────────────────

interface PresetTemplate {
  id: string;
  label: string;
  badge: string;
  archetype: string;
  language: string;
  brandVoice: string;
  greetingMessage: string;
  systemPrompt: string;
  avoidances: string;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'conversion_closer',
    label: '🛍️ Sales Closer',
    badge: 'High Conversion',
    archetype: 'ecommerce',
    language: 'multilingual',
    brandVoice: 'High-energy, consultative, and focused on helping shoppers find the right products and complete checkouts.',
    greetingMessage: 'Welcome to our store! Looking for anything specific today, or would you like to see our trending bestsellers?',
    systemPrompt: `You are ORA, an expert sales and personal shopping assistant.
- Proactively discover customer preferences, style choices, and budget.
- Mention active promo code "SAVE10" for 10% off at checkout when shoppers are deliberating.
- Remind shoppers of our 30-day money-back guarantee and fast delivery.
- Guide shoppers smoothly through cart review and checkout.`,
    avoidances: `• Never hallucinate stock or promise items that are out of stock.
• Never give medical, legal, or unverified claims.
• Avoid aggressive or pushy language; remain consultative.`,
  },
  {
    id: 'luxury_concierge',
    label: '💎 Luxury Concierge',
    badge: 'Premium Tone',
    archetype: 'ecommerce',
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
    label: '🤝 Friendly Advisor',
    badge: 'Warm & Helpful',
    archetype: 'ecommerce',
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
    label: '⚡ Concise Support',
    badge: 'Direct & Fast',
    archetype: 'saas',
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

// ─── Audio Waveform Button ────────────────────────────────────────────────────

function WaveformAudioControl({
  isPlaying,
  isLoading,
  onToggle,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const bars = [40, 75, 100, 50, 85, 95, 60, 45, 90, 65];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 py-1 px-2.5 rounded-lg border transition-all cursor-pointer select-none',
        isPlaying
          ? 'bg-primary/10 border-primary/40 text-primary'
          : 'bg-surface-lowest/70 border-border/50 hover:border-border text-muted-foreground hover:text-foreground',
      )}
      title={isPlaying ? 'Stop sample' : 'Play voice sample'}
    >
      <div
        className={cn(
          'w-4 h-4 rounded-full flex items-center justify-center transition-all flex-shrink-0',
          isPlaying ? 'bg-primary text-primary-foreground' : 'bg-surface-high text-foreground',
        )}
      >
        {isLoading ? (
          <Loader2 size={9} className="animate-spin text-primary" />
        ) : isPlaying ? (
          <Square size={6} fill="currentColor" />
        ) : (
          <Play size={6} fill="currentColor" className="ml-0.5" />
        )}
      </div>

      <div className="flex items-center gap-[2px] h-2.5">
        {bars.map((height, i) => (
          <span
            key={i}
            className={cn(
              'w-[2px] rounded-full transition-all duration-150',
              isPlaying ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30',
            )}
            style={{
              height: isPlaying ? `${Math.max(30, (height * ((i % 3) + 1)) % 100)}%` : `${height * 0.35}%`,
              animationDelay: `${(i * 65) % 450}ms`,
            }}
          />
        ))}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AgentPersonaTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Baseline states (from DB)
  const [initialArchetype, setInitialArchetype] = useState<string>('ecommerce');
  const [initialBrandVoice, setInitialBrandVoice] = useState<string>('');
  const [initialBusinessSummary, setInitialBusinessSummary] = useState<string>('');
  const [initialCustomDirectives, setInitialCustomDirectives] = useState<string>('');
  const [initialSystemPrompt, setInitialSystemPrompt] = useState<string>('');
  const [initialGreetingMessage, setInitialGreetingMessage] = useState<string>('');
  const [initialAvoidances, setInitialAvoidances] = useState<string>('');
  const [initialLanguage, setInitialLanguage] = useState<string>('en');
  const [initialVoiceId, setInitialVoiceId] = useState<string>('Aoede');

  // Form states
  const [archetype, setArchetype] = useState<string>('ecommerce');
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

  // Audio preview states
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

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
      archetype !== initialArchetype ||
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
    archetype,
    initialArchetype,
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
    ])
      .then(([res, meRes]) => {
        if (!active) return;

        if (res?.config) {
          const arch = res.config.businessArchetype || 'ecommerce';
          const voice = res.config.brandVoiceDescription || '';
          const summary = res.config.businessSummary || '';
          const directives = res.config.customDirectives || '';
          const sysPrompt = res.config.systemPrompt || '';
          const greeting = res.config.greetingMessage || '';
          const avoid = res.config.avoidances || '';
          const lang = res.config.language || 'en';
          const vId = res.voice?.voiceId || 'Aoede';

          setInitialArchetype(arch);
          setInitialBrandVoice(voice);
          setInitialBusinessSummary(summary);
          setInitialCustomDirectives(directives);
          setInitialSystemPrompt(sysPrompt);
          setInitialGreetingMessage(greeting);
          setInitialAvoidances(avoid);
          setInitialLanguage(lang);
          setInitialVoiceId(vId);

          setArchetype(arch);
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
      stopCurrentAudio();
    };
  }, []);

  // Save handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateAgentConfigApi({
        businessArchetype: archetype,
        brandVoiceDescription: brandVoice,
        businessSummary,
        customDirectives,
        systemPrompt,
        greetingMessage,
        avoidances,
        language,
        voiceId,
      });

      setInitialArchetype(archetype);
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
    setArchetype(initialArchetype);
    setBrandVoice(initialBrandVoice);
    setBusinessSummary(initialBusinessSummary);
    setCustomDirectives(initialCustomDirectives);
    setSystemPrompt(initialSystemPrompt);
    setGreetingMessage(initialGreetingMessage);
    setAvoidances(initialAvoidances);
    setLanguage(initialLanguage);
    setVoiceId(initialVoiceId);
    stopCurrentAudio();
    setPlayingVoiceId(null);
  };

  // Preset click handler
  const handleApplyPreset = (preset: PresetTemplate) => {
    setArchetype(preset.archetype);
    setLanguage(preset.language);
    setBrandVoice(preset.brandVoice);
    setGreetingMessage(preset.greetingMessage);
    setSystemPrompt(preset.systemPrompt);
    setAvoidances(preset.avoidances);
  };

  // Audio sample playback
  const handlePlayVoiceSample = async (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingVoiceId === voice.voiceId) {
      stopCurrentAudio();
      setPlayingVoiceId(null);
      setLoadingAudioId(null);
      return;
    }
    setLoadingAudioId(voice.voiceId);
    try {
      const res = await getVoiceSampleApi({
        voiceId: voice.voiceId,
        sampleText: voice.samplePhrase,
      });
      if (!res?.audioBase64) throw new Error('No audio returned');
      setLoadingAudioId(null);
      setPlayingVoiceId(voice.voiceId);
      await playGeminiAudioBase64(res.audioBase64, res.mimeType || 'audio/mp4');
      setPlayingVoiceId(null);
    } catch {
      setLoadingAudioId(null);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(voice.samplePhrase);
        utterance.pitch = voice.gender === 'Female' ? 1.05 : 0.92;
        utterance.rate = 1.0;
        utterance.onstart = () => setPlayingVoiceId(voice.voiceId);
        utterance.onend = () => setPlayingVoiceId(null);
        utterance.onerror = () => setPlayingVoiceId(null);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const currentVoiceObj = VOICE_OPTIONS.find((v) => v.voiceId === voiceId) || VOICE_OPTIONS[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs font-mono">Loading store persona...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="w-full space-y-5 pb-8">
      {/* ── Sticky Top Status & Action Bar ── */}
      <div className="sticky top-0 z-20 -mt-2 mb-5 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/90 backdrop-blur-md border-b border-border/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[12px] font-mono text-muted-foreground">
            Store Language: <span className="text-foreground font-semibold">{currentLangObj.flag} {currentLangObj.name}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-surface-high/40 hover:bg-surface-high text-foreground text-[12px] font-medium transition-colors cursor-pointer shadow-xs"
          >
            <Mic className="h-3.5 w-3.5 text-primary" />
            <span>Test Voice</span>
          </button>

          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground border border-border/60 bg-surface-high/30 hover:bg-surface-high transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground font-semibold text-[12px] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
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

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── ROW 1: Symmetrical 2-Column Grid (Persona & Tone | Spoken Language) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Card 1: Persona & Tone */}
        <div className="rounded-xl border border-border/50 bg-surface-lowest/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                <h2 className="text-[13px] font-semibold text-foreground">
                  Persona & Tone
                </h2>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">Quick Styles</span>
            </div>

            {/* Quick Preset Selector */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TEMPLATES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium border border-border/60 bg-surface-high/30 hover:bg-surface-high hover:border-primary/40 text-foreground transition-all cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Brand Voice Description */}
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-medium text-muted-foreground">
                Brand Voice & Demeanor
              </label>
              <input
                type="text"
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                placeholder="e.g. Consultative, warm, concise, and focused on helping visitors."
                className="w-full px-3 py-2 bg-surface-lowest border border-border/70 rounded-lg text-[12.5px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Store Profile Summary */}
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-medium text-muted-foreground">
                Store Overview
              </label>
              <textarea
                rows={3}
                value={businessSummary}
                onChange={(e) => setBusinessSummary(e.target.value)}
                placeholder="e.g. Premium retail apparel delivering sustainable activewear with express delivery."
                className="w-full px-3 py-2 bg-surface-lowest border border-border/70 rounded-lg text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Spoken Language */}
        <div className="rounded-xl border border-border/50 bg-surface-lowest/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="text-[13px] font-semibold text-foreground">
                  Spoken Language
                </h2>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Active: <span className="text-primary font-semibold">{currentLangObj.flag} {currentLangObj.name}</span>
              </span>
            </div>

            {/* Searchable Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border/70 bg-surface-lowest hover:bg-surface-high/30 text-foreground text-[12.5px] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base">{currentLangObj.flag}</span>
                  <span className="font-semibold truncate">{currentLangObj.name}</span>
                  <span className="text-muted-foreground text-[11.5px] truncate">({currentLangObj.nativeName})</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-high border border-border/60 text-muted-foreground ml-auto hidden sm:inline-block">
                    {currentLangObj.region}
                  </span>
                </div>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ml-2', isLangDropdownOpen && 'rotate-180')} />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border/90 bg-surface-lowest/95 backdrop-blur-md shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-border/50 bg-surface-high/30 flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <input
                      type="text"
                      value={langSearchQuery}
                      onChange={(e) => setLangSearchQuery(e.target.value)}
                      placeholder="Search languages by name, native script, or region..."
                      className="w-full bg-transparent border-none text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
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
                            'w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-[12px] transition-all cursor-pointer',
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
                            <span className="text-[9.5px] font-mono text-muted-foreground opacity-80">{lang.region}</span>
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

          {/* Active Dialect Note */}
          <div className="p-3 rounded-lg bg-surface-high/20 border border-border/40 text-[11.5px] text-muted-foreground">
            <span className="text-foreground font-medium block mb-0.5">{currentLangObj.name} ({currentLangObj.nativeName})</span>
            <span>{currentLangObj.description}</span>
          </div>
        </div>

      </div>

      {/* ── ROW 2: Symmetrical 2-Column Grid (Instructions & Guardrails | Voice & Archetype) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Card 3: Instructions & Policies */}
        <div className="rounded-xl border border-border/50 bg-surface-lowest/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Tabs Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-[13px] font-semibold text-foreground">
                  Instructions
                </h2>
              </div>

              {/* Segmented Pill Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-high border border-border/50 text-[11.5px]">
                <button
                  type="button"
                  onClick={() => setInstructionTab('prompt')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                    instructionTab === 'prompt' ? 'bg-surface-lowest text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Prompt
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionTab('greeting')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                    instructionTab === 'greeting' ? 'bg-surface-lowest text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Greeting
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionTab('avoidances')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                    instructionTab === 'avoidances' ? 'bg-surface-lowest text-foreground font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Guardrails
                </button>
                <button
                  type="button"
                  onClick={() => setInstructionTab('policies')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer',
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
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={`• Help customers find products, sizes, and colors.\n• Mention discount code "SAVE10" at checkout.\n• Answer shipping and return policy questions accurately.`}
                  className="w-full px-3 py-2 bg-surface-lowest border border-border/70 rounded-lg text-[12px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-mono text-muted-foreground">Anchors:</span>
                  {['#products', '#pricing', '#shipping', '#checkout', '#contact'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSystemPrompt((prev) => `${prev} ${tag}`.trim())}
                      className="px-2 py-0.5 rounded border border-border/50 bg-surface-high/30 hover:bg-surface-high text-[10.5px] font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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
                <label className="text-[11.5px] font-medium text-muted-foreground">
                  Initial Spoken Greeting
                </label>
                <input
                  type="text"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="e.g. Welcome to our store! How may I assist you today?"
                  className="w-full px-3 py-2 bg-surface-lowest border border-border/70 rounded-lg text-[12.5px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  This phrase is spoken when shoppers initiate a voice session.
                </p>
              </div>
            )}

            {/* Tab: Guardrails / What to Avoid */}
            {instructionTab === 'avoidances' && (
              <div className="space-y-2">
                <textarea
                  rows={9}
                  value={avoidances}
                  onChange={(e) => setAvoidances(e.target.value)}
                  placeholder={`• Never mention competitors.\n• Never offer unverified discounts.\n• Stay focused on store products and policies.`}
                  className="w-full px-3 py-2 bg-surface-lowest border border-destructive/30 focus:border-destructive/60 rounded-lg text-[12px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-destructive leading-relaxed resize-y"
                />
              </div>
            )}

            {/* Tab: Additional Policies */}
            {instructionTab === 'policies' && (
              <div className="space-y-2">
                <textarea
                  rows={9}
                  value={customDirectives}
                  onChange={(e) => setCustomDirectives(e.target.value)}
                  placeholder={`• Free shipping above $50.\n• 7-day hassle-free returns on unworn items.`}
                  className="w-full px-3 py-2 bg-surface-lowest border border-border/70 rounded-lg text-[12px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
                />
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Voice Model & Store Archetype */}
        <div className="rounded-xl border border-border/50 bg-surface-lowest/40 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Voice Model Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  <h2 className="text-[13px] font-semibold text-foreground">
                    Voice Model
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-primary font-medium">
                  {currentVoiceObj.name} ({currentVoiceObj.gender})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VOICE_OPTIONS.map((voice) => {
                  const isSelected = voiceId === voice.voiceId;
                  const isPlaying = playingVoiceId === voice.voiceId;
                  const isLoadingAudio = loadingAudioId === voice.voiceId;

                  return (
                    <div
                      key={voice.voiceId}
                      onClick={() => setVoiceId(voice.voiceId)}
                      className={cn(
                        'p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 select-none',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                          : 'border-border/60 bg-surface-lowest/60 hover:bg-surface-high/50',
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-semibold text-foreground truncate">
                            {voice.name}
                          </span>
                          <span className="text-[9.5px] font-mono text-muted-foreground px-1 py-0.2 rounded bg-surface-high border border-border/50">
                            {voice.gender}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground truncate">{voice.tone}</p>
                      </div>

                      <div className="flex-shrink-0">
                        <WaveformAudioControl
                          isPlaying={isPlaying}
                          isLoading={!!isLoadingAudio}
                          onToggle={(e) => handlePlayVoiceSample(voice, e)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Archetype Section */}
            <div className="space-y-2.5 pt-2 border-t border-border/30">
              <div className="flex items-center gap-2 pb-1">
                <Store className="h-4 w-4 text-primary" />
                <h2 className="text-[13px] font-semibold text-foreground">
                  Store Archetype
                </h2>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ARCHETYPES.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = archetype === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setArchetype(opt.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-medium transition-all cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/15 text-primary font-semibold'
                          : 'border-border/60 bg-surface-lowest/60 text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{opt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
