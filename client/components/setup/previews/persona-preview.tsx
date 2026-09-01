'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  Loader2,
  CheckCircle2,
  Square,
  Play,
  Save,
  RotateCcw,
  Sliders,
  Languages,
  Terminal,
  HeartHandshake,
  Ban,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAgentConfigApi, updateAgentConfigApi } from '@/services/agent-config-service';
import { getVoiceSampleApi } from '@/services/voice-service';
import { playGeminiAudioBase64, stopCurrentAudio } from '@/lib/audio-player';

interface PersonaPreviewProps {
  archetype?: string | null;
  onSaved?: () => void;
}

// ─── One-Click Quick Presets ──────────────────────────────────────────────────

interface PresetTemplate {
  id: string;
  label: string;
  badge: string;
  description: string;
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
    description: 'শুধুমাত্র বাংলায় কথা বলে পণ্যের তথ্য, সাইজ ও অর্ডারে সহায়তা করবে।',
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
    description: 'Energetic, consultative closer that recommends items & offers promo codes.',
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

// ─── 6 Symmetric Voice Options ───────────────────────────────────────────────

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

// ─── Mini Waveform Player ─────────────────────────────────────────────────────

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
        'flex items-center gap-2 py-1.5 px-3 rounded-lg border transition-all cursor-pointer select-none group/player',
        isPlaying
          ? 'bg-[#C8F031]/10 border-[#C8F031]/40 text-[#C8F031]'
          : 'bg-surface-lowest/70 border-border/50 hover:border-border/80 text-muted-foreground hover:text-foreground',
      )}
      title={isPlaying ? 'Stop audio' : 'Play voice preview'}
    >
      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0',
          isPlaying
            ? 'bg-[#C8F031] text-neutral-950'
            : 'bg-surface-high group-hover/player:bg-surface-highest text-foreground',
        )}
      >
        {isLoading ? (
          <Loader2 size={10} className="animate-spin text-[#C8F031]" />
        ) : isPlaying ? (
          <Square size={8} fill="currentColor" />
        ) : (
          <Play size={8} fill="currentColor" className="ml-0.5 text-foreground" />
        )}
      </div>

      <div className="flex items-center gap-[2px] h-3.5 flex-1">
        {bars.map((height, i) => (
          <span
            key={i}
            className={cn(
              'w-[2px] rounded-full transition-all duration-150',
              isPlaying
                ? 'bg-[#C8F031] animate-pulse'
                : 'bg-muted-foreground/30 group-hover/player:bg-muted-foreground/60',
            )}
            style={{
              height: isPlaying ? `${Math.max(30, (height * ((i % 3) + 1)) % 100)}%` : `${height * 0.4}%`,
              animationDelay: `${(i * 65) % 450}ms`,
            }}
          />
        ))}
      </div>

      <span className="text-[10px] font-mono uppercase tracking-wider opacity-80">
        {isPlaying ? 'Playing' : 'Preview'}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PersonaPreview({ archetype = 'ecommerce', onSaved }: PersonaPreviewProps) {
  // Baseline values (from DB)
  const [initialVoiceId, setInitialVoiceId] = useState<string>('Aoede');
  const [initialToneDesc, setInitialToneDesc] = useState<string>(
    'Warm, helpful and consultative sales assistant. Never hallucinate stock or policy facts.',
  );
  const [initialDirectives, setInitialDirectives] = useState<string>(
    'Guide customers to relevant items, mention 30-day money-back guarantee when objections arise.',
  );
  const [initialSystemPrompt, setInitialSystemPrompt] = useState<string>('');
  const [initialGreetingMessage, setInitialGreetingMessage] = useState<string>('');
  const [initialAvoidances, setInitialAvoidances] = useState<string>('');
  const [initialLanguage, setInitialLanguage] = useState<string>('en');

  // Working state
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Aoede');
  const [brandVoiceDesc, setBrandVoiceDesc] = useState<string>(initialToneDesc);
  const [customDirectives, setCustomDirectives] = useState<string>(initialDirectives);
  const [systemPrompt, setSystemPrompt] = useState<string>(initialSystemPrompt);
  const [greetingMessage, setGreetingMessage] = useState<string>(initialGreetingMessage);
  const [avoidances, setAvoidances] = useState<string>(initialAvoidances);
  const [language, setLanguage] = useState<string>(initialLanguage);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [promptTab, setPromptTab] = useState<'system' | 'treatment' | 'avoidances'>('system');

  // Active voice metadata
  const currentVoiceObj = useMemo(() => {
    return VOICE_OPTIONS.find((v) => v.voiceId === selectedVoiceId) || VOICE_OPTIONS[0];
  }, [selectedVoiceId]);

  // Check if form has unsaved edits
  const hasChanges = useMemo(() => {
    return (
      selectedVoiceId !== initialVoiceId ||
      brandVoiceDesc.trim() !== initialToneDesc.trim() ||
      customDirectives.trim() !== initialDirectives.trim() ||
      systemPrompt.trim() !== initialSystemPrompt.trim() ||
      greetingMessage.trim() !== initialGreetingMessage.trim() ||
      avoidances.trim() !== initialAvoidances.trim() ||
      language !== initialLanguage
    );
  }, [
    selectedVoiceId,
    initialVoiceId,
    brandVoiceDesc,
    initialToneDesc,
    customDirectives,
    initialDirectives,
    systemPrompt,
    initialSystemPrompt,
    greetingMessage,
    initialGreetingMessage,
    avoidances,
    initialAvoidances,
    language,
    initialLanguage,
  ]);

  // Load existing config
  useEffect(() => {
    let active = true;
    getAgentConfigApi()
      .then((res) => {
        if (!active) return;
        const voiceId = res?.voice?.voiceId || 'Aoede';
        const toneDesc =
          res?.config?.brandVoiceDescription ||
          'Warm, helpful and consultative sales assistant. Never hallucinate stock or policy facts.';
        const directives =
          res?.config?.customDirectives ||
          'Guide customers to relevant items, mention 30-day money-back guarantee when objections arise.';
        const sysPrompt = res?.config?.systemPrompt || '';
        const greeting = res?.config?.greetingMessage || '';
        const avoid = res?.config?.avoidances || '';
        const lang = res?.config?.language || 'en';

        setInitialVoiceId(voiceId);
        setInitialToneDesc(toneDesc);
        setInitialDirectives(directives);
        setInitialSystemPrompt(sysPrompt);
        setInitialGreetingMessage(greeting);
        setInitialAvoidances(avoid);
        setInitialLanguage(lang);

        setSelectedVoiceId(voiceId);
        setBrandVoiceDesc(toneDesc);
        setCustomDirectives(directives);
        setSystemPrompt(sysPrompt);
        setGreetingMessage(greeting);
        setAvoidances(avoid);
        setLanguage(lang);
      })
      .catch((err) => console.error('[PersonaPreview] Failed to load agent config:', err));
    return () => {
      active = false;
      stopCurrentAudio();
    };
  }, []);

  // Save handler
  const handleSave = async (overrideVoiceId?: string) => {
    setSaving(true);
    const targetVoiceId = overrideVoiceId ?? selectedVoiceId;
    try {
      await updateAgentConfigApi({
        businessArchetype: archetype || 'ecommerce',
        brandVoiceDescription: brandVoiceDesc,
        customDirectives: customDirectives,
        systemPrompt: systemPrompt,
        greetingMessage: greetingMessage,
        avoidances: avoidances,
        language: language,
        voiceId: targetVoiceId,
      });

      setInitialVoiceId(targetVoiceId);
      setInitialToneDesc(brandVoiceDesc);
      setInitialDirectives(customDirectives);
      setInitialSystemPrompt(systemPrompt);
      setInitialGreetingMessage(greetingMessage);
      setInitialAvoidances(avoidances);
      setInitialLanguage(language);

      setSavedSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSavedSuccess(false), 2400);
    } catch (err) {
      console.error('[PersonaPreview] Failed to update agent config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setSelectedVoiceId(initialVoiceId);
    setBrandVoiceDesc(initialToneDesc);
    setCustomDirectives(initialDirectives);
    setSystemPrompt(initialSystemPrompt);
    setGreetingMessage(initialGreetingMessage);
    setAvoidances(initialAvoidances);
    setLanguage(initialLanguage);
  };

  const handleApplyPreset = (preset: PresetTemplate) => {
    setLanguage(preset.language);
    setBrandVoiceDesc(preset.brandVoice);
    setGreetingMessage(preset.greetingMessage);
    setSystemPrompt(preset.systemPrompt);
    setAvoidances(preset.avoidances);
  };

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

  return (
    <div className="w-full space-y-6">
      {/* ── 1. ONE-CLICK STARTER PRESETS ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#C8F031]" />
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              One-Click Starter Presets & Language Profiles
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Click to populate directives</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_TEMPLATES.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-left p-3 rounded-md border border-border/60 bg-surface-high/20 hover:bg-surface-high/50 hover:border-foreground/50 transition-all group cursor-pointer flex flex-col justify-between gap-2"
            >
              <div>
                <span className="text-[12px] font-semibold text-foreground group-hover:text-[#C8F031] transition-colors block mb-1">
                  {preset.label}
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {preset.description}
                </p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] font-mono text-muted-foreground">
                <span>{preset.badge}</span>
                <span className="text-foreground group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Apply <ChevronRight size={10} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. LANGUAGE CONFIGURATION ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Languages className="h-3.5 w-3.5 text-[#C8F031]" />
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              Spoken & Chat Language
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Current: <span className="text-[#C8F031] font-semibold uppercase">{language}</span>
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
              desc: 'Auto-detects and responds in English, Bengali, or dialect.',
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
                    ? 'border-foreground/80 bg-surface-high/60 shadow-xs text-foreground'
                    : 'border-border/50 bg-surface-high/20 hover:bg-surface-high/40 text-muted-foreground hover:text-foreground',
                )}
              >
                <div
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5',
                    isSelected ? 'border-foreground bg-foreground' : 'border-border/70',
                  )}
                >
                  {isSelected && <div className="w-1 h-1 rounded-full bg-background" />}
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

      {/* ── 3. VOICE MODELS CARD ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              Voice Models & Tone Options
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Selected: <span className="text-foreground font-semibold">{currentVoiceObj.voiceId}</span> ({currentVoiceObj.gender})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {VOICE_OPTIONS.map((voice) => {
            const isSelected = selectedVoiceId === voice.voiceId;
            const isPlaying = playingVoiceId === voice.voiceId;
            const isLoadingAudio = loadingAudioId === voice.voiceId;

            return (
              <div
                key={voice.voiceId}
                onClick={() => setSelectedVoiceId(voice.voiceId)}
                className={cn(
                  'p-4 rounded-md border transition-colors cursor-pointer flex flex-col justify-between gap-3 select-none',
                  isSelected
                    ? 'border-foreground/60 bg-surface-high/60 shadow-xs'
                    : 'border-border/50 bg-surface-high/20 hover:bg-surface-high/40 hover:border-border/70',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected ? 'border-foreground bg-foreground' : 'border-border/70',
                      )}
                    >
                      {isSelected && <div className="w-1 h-1 rounded-full bg-background" />}
                    </div>
                    <span className="text-[13.5px] font-semibold text-foreground truncate">
                      {voice.voiceId}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 rounded-[2px] bg-surface-high border border-border/50">
                      {voice.gender}
                    </span>
                  </div>

                  {isSelected && (
                    <span className="text-[10px] font-semibold text-foreground bg-surface-high px-2 py-0.5 rounded-[3px] border border-border/60 font-mono flex-shrink-0">
                      Selected
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-foreground leading-snug">
                    {voice.toneName}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5 truncate">
                    {voice.tagline}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/30">
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

      {/* ── 4. MASTER PROMPT & DIRECTIVES STUDIO ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-4">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-border/40 pb-2 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setPromptTab('system')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer',
              promptTab === 'system'
                ? 'bg-surface-high text-foreground font-semibold border border-border/60'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>1. Master System Prompt</span>
            <span className="text-[10.5px] font-mono text-muted-foreground ml-1">({systemPrompt.length} chars)</span>
          </button>

          <button
            type="button"
            onClick={() => setPromptTab('treatment')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer',
              promptTab === 'treatment'
                ? 'bg-surface-high text-foreground font-semibold border border-border/60'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <HeartHandshake className="h-3.5 w-3.5 text-[#C8F031]" />
            <span>2. Greeting & Consumer Treatment</span>
            <span className="text-[10.5px] font-mono text-muted-foreground ml-1">({greetingMessage.length} chars)</span>
          </button>

          <button
            type="button"
            onClick={() => setPromptTab('avoidances')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer',
              promptTab === 'avoidances'
                ? 'bg-surface-high text-foreground font-semibold border border-border/60'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Ban className="h-3.5 w-3.5 text-destructive" />
            <span>3. What to Avoid</span>
            <span className="text-[10.5px] font-mono text-muted-foreground ml-1">({avoidances.length} chars)</span>
          </button>
        </div>

        {/* Tab 1: System Prompt */}
        {promptTab === 'system' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Custom System Prompt & Behavioral Instructions
              </label>
              <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                {systemPrompt.length} chars
              </span>
            </div>
            <textarea
              rows={7}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={`You are ORA, the flagship AI sales representative for this store.\n• Proactively guide customers to relevant products based on their questions.\n• Mention our 30-day money-back guarantee when objections arise.\n• Offer discount code "SAVE10" for 10% off at checkout.\n• Keep voice responses concise (1-2 sentences) and conversational.`}
              className="w-full px-3.5 py-2.5 text-[12.5px] bg-surface-high/30 border border-border/60 rounded-md text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground transition-colors leading-relaxed font-mono resize-y"
            />
          </div>
        )}

        {/* Tab 2: Greeting & Treatment */}
        {promptTab === 'treatment' && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Initial Spoken Greeting Phrase
              </label>
              <input
                type="text"
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                placeholder='e.g. আসসালামু আলাইকুম! ORA-তে আপনাকে স্বাগতম। আজ আপনাকে কী খুঁজে দিতে পারি?'
                className="w-full px-3 py-2 text-[12.5px] bg-surface-high/30 border border-border/60 rounded-md text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Brand Tone & Demeanor
              </label>
              <input
                type="text"
                value={brandVoiceDesc}
                onChange={(e) => setBrandVoiceDesc(e.target.value)}
                placeholder="e.g. Warm, consultative, concise, and focused on helping shoppers find the right fit."
                className="w-full px-3 py-2 text-[12.5px] bg-surface-high/30 border border-border/60 rounded-md text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground transition-colors"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Avoidances */}
        {promptTab === 'avoidances' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Restrictions & Forbidden Behaviors
              </label>
              <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                {avoidances.length} chars
              </span>
            </div>
            <textarea
              rows={6}
              value={avoidances}
              onChange={(e) => setAvoidances(e.target.value)}
              placeholder={`• Never mention competitor brands (e.g. CompetitorA, CompetitorB).\n• Never offer discounts higher than 15%.\n• Do not discuss politics, controversy, or non-store related topics.`}
              className="w-full px-3.5 py-2.5 text-[12.5px] bg-surface-high/30 border border-destructive/30 rounded-md text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-destructive transition-colors leading-relaxed font-mono resize-y"
            />
            <div className="p-2.5 rounded bg-destructive/5 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2">
              <Info className="h-4 w-4 flex-shrink-0" />
              <span>Negative constraints are enforced at runtime during live customer turns.</span>
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {savedSuccess && !saving && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground font-mono bg-surface-high px-2.5 py-1 rounded-md border border-border/60">
                <CheckCircle2 size={12} className="text-foreground dark:text-[#C8F031]" /> Saved live
              </span>
            )}
            {!savedSuccess && hasChanges && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-amber-500 dark:text-amber-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" /> Unsaved changes
              </span>
            )}
            {!savedSuccess && !hasChanges && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" /> Configuration Synced
              </span>
            )}

            {hasChanges && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[12px] text-muted-foreground hover:text-foreground border border-border/60 bg-surface-high/40 hover:bg-surface-high transition-colors cursor-pointer"
              >
                <RotateCcw size={11} />
                Discard
              </button>
            )}
          </div>

          {(hasChanges || saving || savedSuccess) && (
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-semibold transition-opacity cursor-pointer shadow-xs bg-foreground text-background hover:opacity-90"
            >
              {saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Saving Changes…</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check size={12} strokeWidth={2.5} />
                  <span>Saved Live</span>
                </>
              ) : (
                <>
                  <Save size={12} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
