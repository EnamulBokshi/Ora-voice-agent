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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAgentConfigApi, updateAgentConfigApi } from '@/services/agent-config-service';
import { getVoiceSampleApi } from '@/services/voice-service';
import { playGeminiAudioBase64, stopCurrentAudio } from '@/lib/audio-player';

interface PersonaPreviewProps {
  archetype?: string | null;
  onSaved?: () => void;
}

// ─── Preset Tones ────────────────────────────────────────────────────────────

const TONE_PRESETS = [
  {
    label: 'Consultative',
    tone: 'Warm, consultative, and empathetic. Focuses on discovering customer needs without pressure.',
    directives: 'Ask clarifying questions on size, use case, and budget. Mention our 30-day guarantee when shoppers hesitate.',
  },
  {
    label: 'Active Closer',
    tone: 'High-energy, assertive, direct, and focused on driving purchases and highlighting urgency.',
    directives: 'Highlight limited stock and fast delivery. Proactively offer to add matching items to cart.',
  },
  {
    label: 'Polite & Precise',
    tone: 'Professional, calm, accurate, and fact-focused with clear concise structure.',
    directives: 'Quote exact return windows and warranty details from store policies. Never speculate on dates.',
  },
  {
    label: 'Friendly & Casual',
    tone: 'Approachable, upbeat, conversational, and energetic like an expert store associate.',
    directives: 'Keep replies concise. Recommend trending new arrivals and offer personalized styling tips.',
  },
];

// ─── 6 Symmetric Voice Options (3 per row) ───────────────────────────────────

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

// ─── ElevenLabs-Style Mini Waveform Player ─────────────────────────────────────

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

      {/* Equalizer Bars */}
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
  const [initialLanguage, setInitialLanguage] = useState<string>('en');

  // Working state
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Aoede');
  const [brandVoiceDesc, setBrandVoiceDesc] = useState<string>(initialToneDesc);
  const [customDirectives, setCustomDirectives] = useState<string>(initialDirectives);
  const [language, setLanguage] = useState<string>(initialLanguage);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Determine active preset (if current text matches any preset)
  const activePresetLabel = useMemo(() => {
    const found = TONE_PRESETS.find((p) => p.tone.trim() === brandVoiceDesc.trim());
    return found ? found.label : 'Custom';
  }, [brandVoiceDesc]);

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
      language !== initialLanguage
    );
  }, [
    selectedVoiceId,
    initialVoiceId,
    brandVoiceDesc,
    initialToneDesc,
    customDirectives,
    initialDirectives,
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
        const lang = res?.config?.language || 'en';

        setInitialVoiceId(voiceId);
        setInitialToneDesc(toneDesc);
        setInitialDirectives(directives);
        setInitialLanguage(lang);

        setSelectedVoiceId(voiceId);
        setBrandVoiceDesc(toneDesc);
        setCustomDirectives(directives);
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
        language: language,
        voiceId: targetVoiceId,
      });

      setInitialVoiceId(targetVoiceId);
      setInitialToneDesc(brandVoiceDesc);
      setInitialDirectives(customDirectives);
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
    setLanguage(initialLanguage);
  };

  const handleApplyPreset = (preset: (typeof TONE_PRESETS)[0]) => {
    setBrandVoiceDesc(preset.tone);
    setCustomDirectives(preset.directives);
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
      {/* ── 1. VOICE MODELS CARD ── */}
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
                {/* Header: Radio dot + Name + Gender + Active */}
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

                {/* Subtitle & Tagline */}
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-foreground leading-snug">
                    {voice.toneName}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5 truncate">
                    {voice.tagline}
                  </p>
                </div>

                {/* Waveform Audio Control */}
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

      {/* ── 2. APPLIED TONE & DIRECTIVES CARD ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              Applied Directives & Tone
            </h2>
            <span className="ml-2 inline-flex items-center gap-1 text-[10.5px] font-mono px-2 py-0.5 rounded-[3px] bg-surface-high text-foreground border border-border/60 font-medium">
              <Sliders size={10} />
              <span>{activePresetLabel}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mr-1">Presets:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {TONE_PRESETS.map((preset) => {
                const isPresetActive = activePresetLabel === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={cn(
                      'inline-flex items-center px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors cursor-pointer',
                      isPresetActive
                        ? 'border-foreground bg-foreground text-background font-semibold shadow-xs'
                        : 'border-border/60 bg-surface-high/40 hover:bg-surface-high text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2-Column Applied Tone & Directives Textareas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Tone & Demeanor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Brand Tone & Demeanor
              </label>
              <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                {brandVoiceDesc.length} chars
              </span>
            </div>
            <textarea
              rows={4}
              value={brandVoiceDesc}
              onChange={(e) => setBrandVoiceDesc(e.target.value)}
              placeholder="e.g. Consultative, warm, concise, and focused on helping shoppers find the right fit."
              className="w-full px-3 py-2 text-[12.5px] bg-surface-high/30 border border-border/60 rounded-md text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground transition-colors leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Custom Directives */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Directives & Rules of Engagement
              </label>
              <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                {customDirectives.length} chars
              </span>
            </div>
            <textarea
              rows={4}
              value={customDirectives}
              onChange={(e) => setCustomDirectives(e.target.value)}
              placeholder="e.g. Always check stock before confirming availability. Mention 30-day return policy for hesitant buyers."
              className="w-full px-3 py-2 text-[12.5px] bg-surface-high/30 border border-border/60 rounded-md text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground transition-colors leading-relaxed resize-none font-sans"
            />
          </div>
        </div>

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
