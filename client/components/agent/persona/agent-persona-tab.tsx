'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Terminal,
  ShieldCheck,
  Check,
  Mic,
  Languages,
  Ban,
  HeartHandshake,
  Sparkles,
  RotateCcw,
  Play,
  Square,
  ChevronRight,
  Info,
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

// ─── Archetype Definitions ───────────────────────────────────────────────────

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

// ─── Voice Options ────────────────────────────────────────────────────────────

interface VoiceOption {
  voiceId: string;
  toneName: string;
  tagline: string;
  gender: string;
  samplePhrase: string;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    voiceId: 'Aoede',
    toneName: 'Consultative Sales',
    tagline: 'Warm, empathetic & conversational',
    gender: 'Female',
    samplePhrase:
      'Welcome to our store! I am here to help you find the perfect match for your needs and answer any questions.',
  },
  {
    voiceId: 'Fenrir',
    toneName: 'Active Closer',
    tagline: 'High-energy & conversion-driven',
    gender: 'Male',
    samplePhrase:
      'Hey there! We have limited stock available on this item today, let me secure your free priority shipping right now.',
  },
  {
    voiceId: 'Kore',
    toneName: 'Polite & Precise',
    tagline: 'Clear, professional & fact-oriented',
    gender: 'Female',
    samplePhrase:
      'Hello. I can assist you with product specifications, return policies, warranty coverage, and sizing recommendations.',
  },
  {
    voiceId: 'Puck',
    toneName: 'Friendly & Casual',
    tagline: 'Approachable & upbeat tone',
    gender: 'Male',
    samplePhrase:
      'Hey! Check out our newest arrivals. Let me know if you want me to add anything directly to your cart for checkout.',
  },
  {
    voiceId: 'Charon',
    toneName: 'Direct & Concise',
    tagline: 'Authoritative & enterprise-grade',
    gender: 'Male',
    samplePhrase:
      'Good day. I am ready to assist with enterprise scoping, bulk wholesale pricing, and verified checkout flow.',
  },
  {
    voiceId: 'Zephyr',
    toneName: 'Calm & Helpful',
    tagline: 'Gentle, supportive & reassuring',
    gender: 'Female',
    samplePhrase:
      'Hi there. Take your time browsing, and let me know if you need any recommendations or help at checkout.',
  },
];

// ─── One-Click Quick Presets ──────────────────────────────────────────────────

interface PresetTemplate {
  id: string;
  label: string;
  badge: string;
  description: string;
  archetype: string;
  language: string;
  brandVoice: string;
  greetingMessage: string;
  systemPrompt: string;
  avoidances: string;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'bangla_ecommerce',
    label: '🇧🇩 বাংলা ই-কমার্স (Bangla Only)',
    badge: 'বাংলা / Bangladesh',
    description: 'শুধুমাত্র বাংলায় সাবলীলভাবে কথা বলে পণ্যের তথ্য ও অর্ডারে সহায়তা করবে।',
    archetype: 'ecommerce',
    language: 'bn',
    brandVoice: 'উষ্ণ, আন্তরিক, বিনয়ী এবং অত্যন্ত হেল্পফুল সেলস অ্যাসিস্ট্যান্ট।',
    greetingMessage: 'আসসালামু আলাইকুম! ORA-তে আপনাকে স্বাগতম। আজ আপনাকে কোন পণ্যটি খুঁজে দিতে পারি?',
    systemPrompt: `You are ORA, the dedicated AI voice shopping assistant for this store.
- You MUST speak exclusively in natural, polite Bengali (Bangla / বাংলা).
- Help customers find products, check live availability, sizes, colors, and prices.
- Clearly explain delivery terms: Inside Dhaka delivery takes 24-48 hours (60 TK), outside Dhaka takes 3-5 days (120 TK).
- Support smooth order placement via bKash online payment and Cash on Delivery.
- Always be respectful and address shoppers warmly with "আপনি".`,
    avoidances: `• Do not speak in English unless the customer explicitly requests to switch.
• Never mention competitors (like Aarong, Daraz, or Yellow).
• Do not promise unauthorized discounts beyond active coupon codes.
• Never discuss politics or unrelated controversies.`,
  },
  {
    id: 'conversion_closer',
    label: '🛍️ Proactive Sales Closer',
    badge: 'High Conversion',
    description: 'Energetic, helpful closer that recommends trending items & offers promo codes.',
    archetype: 'ecommerce',
    language: 'multilingual',
    brandVoice: 'High-energy, proactive, consultative, and focused on driving smooth checkouts.',
    greetingMessage: 'Welcome to our store! Looking for anything specific today, or would you like to see our trending bestsellers?',
    systemPrompt: `You are ORA, an expert AI sales and personal shopping assistant.
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
    label: '💎 Luxury & VIP Concierge',
    badge: 'Premium Brand',
    description: 'Refined, highly respectful tone with tailored styling & bespoke assistance.',
    archetype: 'ecommerce',
    language: 'multilingual',
    brandVoice: 'Sophisticated, refined, articulate, patient, and highly attentive to detail.',
    greetingMessage: 'Good day and welcome. It is a pleasure to assist you. How may I curate your shopping experience today?',
    systemPrompt: `You are ORA, the private client concierge and advisor for our luxury collection.
- Offer tailored recommendations highlighting premium materials, craftsmanship, and styling notes.
- Answer questions regarding bespoke sizing, care instructions, and exclusive gift packaging.
- Maintain an impeccable, courteous, and polite tone at all times.`,
    avoidances: `• Never use cheapening sales slang or excessive urgency tactics.
• Never disclose private client information or internal wholesale costs.`,
  },
  {
    id: 'tech_support',
    label: '⚡ Direct & Concise Support',
    badge: 'Zero Fluff',
    description: 'Ultra-fast, accurate answers with direct links and technical precision.',
    archetype: 'saas',
    language: 'multilingual',
    brandVoice: 'Concise, direct, technically precise, and solution-oriented with zero fluff.',
    greetingMessage: 'Hello! I am ORA. How can I assist with your setup, documentation, or account today?',
    systemPrompt: `You are ORA, technical support and onboarding specialist for this platform.
- Deliver direct answers in 1 to 2 short sentences.
- Guide users directly to relevant documentation anchors (#docs, #pricing, #api).
- Accurately explain integration steps for Shopify, WooCommerce, and Next.js.`,
    avoidances: `• Never give lengthy rambling responses or marketing fluff.
• Never guess API endpoints or technical specs not documented in the knowledge base.`,
  },
];

// ─── Waveform Audio Preview Component ─────────────────────────────────────────

function WaveformAudioControl({
  isPlaying,
  isLoading,
  onToggle,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  onToggle: (e: React.MouseEvent) => void;
}) {
  const bars = [35, 65, 90, 45, 80, 100, 70, 50, 85, 40, 60, 95, 55, 75];

  return (
    <div
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 py-1.5 px-3 rounded-md border transition-all cursor-pointer select-none group/player',
        isPlaying
          ? 'bg-primary/10 border-primary/40 text-primary'
          : 'bg-surface-lowest/70 border-border/50 hover:border-border text-muted-foreground hover:text-foreground',
      )}
      title={isPlaying ? 'Stop audio' : 'Play voice preview'}
    >
      <div
        className={cn(
          'w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all flex-shrink-0',
          isPlaying
            ? 'bg-primary text-primary-foreground'
            : 'bg-surface-high group-hover/player:bg-surface-highest text-foreground',
        )}
      >
        {isLoading ? (
          <Loader2 size={10} className="animate-spin text-primary" />
        ) : isPlaying ? (
          <Square size={7} fill="currentColor" />
        ) : (
          <Play size={7} fill="currentColor" className="ml-0.5" />
        )}
      </div>

      <div className="flex items-center gap-[2px] h-3 flex-1">
        {bars.map((height, i) => (
          <span
            key={i}
            className={cn(
              'w-[2px] rounded-full transition-all duration-150',
              isPlaying
                ? 'bg-primary animate-pulse'
                : 'bg-muted-foreground/30 group-hover/player:bg-muted-foreground/60',
            )}
            style={{
              height: isPlaying ? `${Math.max(30, (height * ((i % 3) + 1)) % 100)}%` : `${height * 0.4}%`,
              animationDelay: `${(i * 65) % 450}ms`,
            }}
          />
        ))}
      </div>

      <span className="text-[9.5px] font-mono uppercase tracking-wider opacity-80">
        {isPlaying ? 'Playing' : 'Preview'}
      </span>
    </div>
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

  // Audio preview states
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Active sub-tab in prompt editor
  const [promptTab, setPromptTab] = useState<'system' | 'treatment' | 'avoidances'>('system');

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
      getAgentConfigApi().catch((err) => {
        console.error('Failed to load agent config:', err);
        return null;
      }),
      getMeApi().catch(() => null),
    ])
      .then(([res, meRes]) => {
        if (!active) return;

        if (meRes?.business?.publishableKey) {
          setPublishableKey(meRes.business.publishableKey);
        }

        if (res?.config) {
          const arch = res.config.businessArchetype || 'ecommerce';
          const voice =
            res.config.brandVoiceDescription ||
            'Articulate, concise, consultative, and focused on helping visitors find solutions.';
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

      setSuccessMsg('System prompt & persona configuration saved and synced live.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update agent config:', err);
      setErrorMsg(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Discard edits
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
  };

  // Apply quick preset
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
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (voice.gender === 'Female'
                ? v.name.toLowerCase().includes('female') ||
                  v.name.includes('Samantha') ||
                  v.name.includes('Zira')
                : v.name.toLowerCase().includes('male') || v.name.includes('David')),
          ) || voices[0];
        if (preferred) utterance.voice = preferred;
        utterance.onstart = () => setPlayingVoiceId(voice.voiceId);
        utterance.onend = () => setPlayingVoiceId(null);
        utterance.onerror = () => setPlayingVoiceId(null);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const selectedArchetype = ARCHETYPES.find((a) => a.id === archetype) || ARCHETYPES[0];
  const currentVoiceObj = VOICE_OPTIONS.find((v) => v.voiceId === voiceId) || VOICE_OPTIONS[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs font-mono">Loading System Prompt & Persona configuration...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="w-full space-y-6">
      {/* ── TOP HEADER TOOLBAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-border/60 bg-surface-lowest/40 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold text-foreground font-serif tracking-tight">
                ORA System Prompt & Persona Studio
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-surface-high border border-border/60 text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />
                Live Runtime
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Define what ORA does, how it greets & treats shoppers, language rules (e.g. Bangla only), and what to avoid.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface-high/60 hover:bg-surface-high text-foreground text-[12px] font-medium transition-colors cursor-pointer shadow-xs"
          >
            <Mic className="h-3.5 w-3.5 text-primary" />
            <span>Test Prompt Live</span>
          </button>

          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] text-muted-foreground hover:text-foreground border border-border/60 bg-surface-high/40 hover:bg-surface-high transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground font-semibold text-[12px] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Prompt</span>
              </>
            )}
          </button>
        </div>
      </div>

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

      {/* ── 1. ONE-CLICK STARTER PRESETS ── */}
      <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              One-Click Starter Templates & Language Presets
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Click to auto-populate prompt & directives
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_TEMPLATES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-left p-3 rounded-md border border-border/70 bg-surface-lowest/60 hover:bg-surface-high/60 hover:border-primary/50 transition-all group cursor-pointer flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[12.5px] font-semibold text-foreground group-hover:text-primary transition-colors">
                    {preset.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {preset.description}
                </p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] font-mono text-muted-foreground">
                <span>{preset.badge}</span>
                <span className="text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Apply <ChevronRight size={10} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. LANGUAGE & REGIONAL SETTINGS ── */}
      <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Language & Spoken Dialect
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Current: <span className="text-primary font-semibold uppercase">{language}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              id: 'bn',
              title: '🇧🇩 বাংলা শুধুমাত্র (Bangla Only)',
              desc: 'Enforces 100% Bengali voice & chat communication.',
            },
            {
              id: 'multilingual',
              title: '🌐 Multilingual / Auto-Detect',
              desc: 'Auto-detects and responds in English, Bengali, or shopper dialect.',
            },
            {
              id: 'en',
              title: '🇺🇸 English Only',
              desc: 'Standard global English communication.',
            },
          ].map((langOpt) => {
            const isSelected = language === langOpt.id;
            return (
              <button
                key={langOpt.id}
                type="button"
                onClick={() => setLanguage(langOpt.id)}
                className={cn(
                  'text-left p-3 rounded-md border transition-all cursor-pointer flex items-start gap-2.5',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40 text-foreground'
                    : 'border-border bg-surface-lowest/40 hover:bg-surface-high/40 text-muted-foreground hover:text-foreground',
                )}
              >
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5',
                    isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                  )}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <div className="min-w-0">
                  <span className="text-[12px] font-semibold block text-foreground">{langOpt.title}</span>
                  <span className="text-[11px] text-muted-foreground leading-snug">{langOpt.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. MASTER PROMPT & DIRECTIVES STUDIO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT (Tabs: System Prompt, Greetings, Avoidances) ── */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
            {/* Tab navigation headers */}
            <div className="flex items-center border-b border-border bg-surface-lowest/60 px-3 pt-2 gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setPromptTab('system')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors cursor-pointer',
                  promptTab === 'system'
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>1. Master System Prompt</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-1">({systemPrompt.length} chars)</span>
              </button>

              <button
                type="button"
                onClick={() => setPromptTab('treatment')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors cursor-pointer',
                  promptTab === 'treatment'
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                <span>2. Greeting & Consumer Treatment</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-1">({greetingMessage.length} chars)</span>
              </button>

              <button
                type="button"
                onClick={() => setPromptTab('avoidances')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors cursor-pointer',
                  promptTab === 'avoidances'
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Ban className="h-3.5 w-3.5 text-destructive" />
                <span>3. What to Avoid</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-1">({avoidances.length} chars)</span>
              </button>
            </div>

            {/* Tab 1: Master System Prompt */}
            {promptTab === 'system' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] text-muted-foreground">
                    Define ORA's primary mission, operating guidelines, product recommendation logic, and checkout instructions.
                  </p>
                  <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                    {systemPrompt.length} / 4000
                  </span>
                </div>

                <textarea
                  rows={10}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={`You are ORA, the flagship AI sales representative for this store.\n• Proactively guide customers to relevant products based on their questions.\n• Mention our 30-day money-back guarantee when objections arise.\n• Offer discount code "SAVE10" for 10% off at checkout.\n• Keep voice responses concise (1-2 sentences) and conversational.`}
                  className="w-full px-3.5 py-2.5 bg-surface-lowest border border-border/80 rounded-md text-[12.5px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
                />

                {/* Quick Variable Insert Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10.5px] font-mono text-muted-foreground mr-1">Quick Anchors:</span>
                  {['#products', '#pricing', '#shipping', '#checkout', '#contact'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSystemPrompt((prev) => `${prev} ${tag}`.trim())}
                      className="px-2 py-0.5 rounded border border-border/60 bg-surface-high/40 hover:bg-surface-high text-[10.5px] font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Greeting & Consumer Treatment */}
            {promptTab === 'treatment' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] text-muted-foreground">
                    Specify how ORA should welcome new visitors, address their questions, and handle hesitations.
                  </p>
                  <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                    {greetingMessage.length} / 2000
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Initial Spoken Greeting Phrase
                    </label>
                    <input
                      type="text"
                      value={greetingMessage}
                      onChange={(e) => setGreetingMessage(e.target.value)}
                      placeholder='e.g. আসসালামু আলাইকুম! ORA-তে আপনাকে স্বাগতম। আজ আপনাকে কী খুঁজে দিতে পারি?'
                      className="w-full px-3 py-2 bg-surface-lowest border border-border/80 rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Brand Voice & Demeanor
                    </label>
                    <input
                      type="text"
                      value={brandVoice}
                      onChange={(e) => setBrandVoice(e.target.value)}
                      placeholder="e.g. Warm, consultative, energetic, and highly respectful."
                      className="w-full px-3 py-2 bg-surface-lowest border border-border/80 rounded-md text-[12.5px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                      Store Profile Summary
                    </label>
                    <textarea
                      rows={3}
                      value={businessSummary}
                      onChange={(e) => setBusinessSummary(e.target.value)}
                      placeholder="e.g. Premium retail apparel delivering sustainable activewear with express delivery across Bangladesh."
                      className="w-full px-3 py-2 bg-surface-lowest border border-border/80 rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: What to Avoid */}
            {promptTab === 'avoidances' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] text-muted-foreground">
                    Strict rules and restrictions. ORA will never mention these topics or violate these guardrails.
                  </p>
                  <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                    {avoidances.length} / 2000
                  </span>
                </div>

                <textarea
                  rows={8}
                  value={avoidances}
                  onChange={(e) => setAvoidances(e.target.value)}
                  placeholder={`• Never mention competitor brands (e.g. CompetitorA, CompetitorB).\n• Never offer discounts higher than 15%.\n• Do not discuss politics, controversy, or non-store related topics.\n• Never promise delivery dates that contradict our standard 3-5 day policy.`}
                  className="w-full px-3.5 py-2.5 bg-surface-lowest border border-destructive/30 focus:border-destructive/60 rounded-md text-[12.5px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-destructive leading-relaxed resize-y"
                />

                <div className="p-2.5 rounded bg-destructive/5 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  <span>These restrictions are bound as high-priority negative constraints in ORA's live reasoning loop.</span>
                </div>
              </div>
            )}

          </div>

          {/* Operational Directives / Policies (Markdown) */}
          <div className="rounded-lg border border-border bg-card/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Additional Directives & Store Policies
                </h2>
              </div>
              <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                {customDirectives.length} chars
              </span>
            </div>
            <textarea
              rows={4}
              value={customDirectives}
              onChange={(e) => setCustomDirectives(e.target.value)}
              placeholder={`# Delivery & Return Rules\n• Free shipping above ৳2,000 / $50.\n• 7-day hassle-free exchange on clothing.`}
              className="w-full px-3 py-2 bg-surface-lowest border border-border/80 rounded-md text-[12px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
            />
          </div>
        </div>

        {/* ── RIGHT (Voice Model Selection & Archetype) ── */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card: Voice Models */}
          <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Voice Model
                </h2>
              </div>
              <span className="text-[10.5px] font-mono text-muted-foreground">
                Active: <span className="text-primary font-medium">{currentVoiceObj.voiceId}</span>
              </span>
            </div>

            <div className="space-y-2">
              {VOICE_OPTIONS.map((voice) => {
                const isSelected = voiceId === voice.voiceId;
                const isPlaying = playingVoiceId === voice.voiceId;
                const isLoadingAudio = loadingAudioId === voice.voiceId;

                return (
                  <div
                    key={voice.voiceId}
                    onClick={() => setVoiceId(voice.voiceId)}
                    className={cn(
                      'p-2.5 rounded-md border transition-all cursor-pointer flex items-center justify-between gap-2 select-none',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border/60 bg-surface-lowest/40 hover:bg-surface-high/60',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-foreground truncate">
                          {voice.voiceId}
                        </span>
                        <span className="text-[9.5px] font-mono text-muted-foreground px-1 py-0.2 rounded bg-surface-high border border-border/50">
                          {voice.gender}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground truncate">{voice.toneName}</p>
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

          {/* Card: Business Archetype */}
          <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Operating Model
                </h2>
              </div>
            </div>

            <div className="space-y-1.5">
              {ARCHETYPES.map((opt) => {
                const Icon = opt.icon;
                const isSelected = archetype === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setArchetype(opt.id)}
                    className={cn(
                      'w-full text-left p-2 rounded-md border transition-all flex items-center justify-between gap-2 group cursor-pointer',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border/60 bg-surface-lowest/40 hover:bg-surface-high/60',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="text-[11.5px] font-medium text-foreground truncate">{opt.name}</span>
                    </div>
                    {isSelected && <Check className="h-3 w-3 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ── LIVE TEST MODAL ── */}
      <VoiceTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        publishableKey={publishableKey || undefined}
      />
    </form>
  );
}
