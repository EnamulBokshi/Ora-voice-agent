'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Layers,
  Briefcase,
  Globe,
  Building2,
  Sparkles,
  Check,
  Bot,
  Loader2,
  CheckCircle2,
  Volume2,
  Square,
  Play,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAgentConfigApi,
  updateAgentConfigApi,
} from '@/services/agent-config-service';
import { getVoiceSampleApi } from '@/services/voice-service';
import { playGeminiAudioBase64, stopCurrentAudio } from '@/lib/audio-player';

interface PersonaPreviewProps {
  onSaved?: () => void;
}

interface ArchetypeItem {
  id: string;
  name: string;
  category: string;
  tag: string;
  icon: React.ElementType;
}

const ARCHETYPES: ArchetypeItem[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    category: 'Retail',
    tag: 'Catalog search, live stock & cart recovery',
    icon: ShoppingBag,
  },
  {
    id: 'saas',
    name: 'SaaS Product',
    category: 'Software',
    tag: 'Subscription tiers, features & trials',
    icon: Layers,
  },
  {
    id: 'agency',
    name: 'Agency & Services',
    category: 'Services',
    tag: 'Service packages, scoping & booking',
    icon: Briefcase,
  },
  {
    id: 'portfolio',
    name: 'Creator & Portfolio',
    category: 'Personal',
    tag: 'Showcase projects & direct bookings',
    icon: Globe,
  },
  {
    id: 'general',
    name: 'Enterprise & FAQ',
    category: 'Enterprise',
    tag: 'Store policies, RAG search & support',
    icon: Building2,
  },
];

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
    gender: 'Female · Melodic',
    samplePhrase: 'Welcome to our store! I am here to help you find the perfect match for your needs and answer any questions.',
  },
  {
    voiceId: 'Fenrir',
    toneName: 'Active Closer',
    tagline: 'High-energy, dynamic & conversion-driven',
    gender: 'Male · Assertive',
    samplePhrase: 'Hey there! We have limited stock available on this item today, let me secure your free priority shipping right now.',
  },
  {
    voiceId: 'Kore',
    toneName: 'Polite & Precise',
    tagline: 'Clear, professional & fact-oriented',
    gender: 'Female · Crisp',
    samplePhrase: 'Hello. I can assist you with product specifications, return policies, warranty coverage, and sizing recommendations.',
  },
  {
    voiceId: 'Puck',
    toneName: 'Friendly & Casual',
    tagline: 'Approachable, upbeat & conversational',
    gender: 'Male · Upbeat',
    samplePhrase: 'Hey! Check out our newest arrivals. Let me know if you want me to add anything directly to your cart for checkout.',
  },
  {
    voiceId: 'Charon',
    toneName: 'Direct & Concise',
    tagline: 'Deep, authoritative & enterprise-grade',
    gender: 'Male · Deep',
    samplePhrase: 'Good day. I am ready to assist with enterprise scoping, bulk wholesale pricing, and verified checkout flow.',
  },
];

export function PersonaPreview({ onSaved }: PersonaPreviewProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<string>('ecommerce');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Aoede');
  const [selectedTone, setSelectedTone] = useState<string>('Consultative Sales');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loadingAudioVoiceId, setLoadingAudioVoiceId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Load real configuration from NestJS API
  useEffect(() => {
    let active = true;
    getAgentConfigApi()
      .then((res) => {
        if (!active) return;
        if (res?.config?.businessArchetype) {
          setSelectedArchetype(res.config.businessArchetype);
        }
        if (res?.config?.brandVoiceDescription) {
          setSelectedTone(res.config.brandVoiceDescription);
        }
        if (res?.voice?.voiceId) {
          setSelectedVoiceId(res.voice.voiceId);
        }
      })
      .catch((err) => {
        console.error('[PersonaPreview] Failed to load agent config:', err);
      });

    return () => {
      active = false;
      stopCurrentAudio();
    };
  }, []);

  // Save via real PATCH /agent-config endpoint
  const saveConfig = async (arch: string, tone: string, voiceId: string) => {
    setSaving(true);
    try {
      await updateAgentConfigApi({
        businessArchetype: arch,
        brandVoiceDescription: tone,
        voiceId: voiceId,
      });
      setSavedSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSavedSuccess(false), 2200);
    } catch (err) {
      console.error('[PersonaPreview] Failed to update agent config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectArchetype = (archId: string) => {
    setSelectedArchetype(archId);
    saveConfig(archId, selectedTone, selectedVoiceId);
  };

  const handleSelectVoice = (voice: VoiceOption) => {
    setSelectedVoiceId(voice.voiceId);
    setSelectedTone(voice.toneName);
    saveConfig(selectedArchetype, voice.toneName, voice.voiceId);
  };

  const handlePlayVoiceSample = async (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();

    // If already playing this voice, stop it
    if (playingVoiceId === voice.voiceId) {
      stopCurrentAudio();
      setPlayingVoiceId(null);
      setLoadingAudioVoiceId(null);
      return;
    }

    stopCurrentAudio();
    setLoadingAudioVoiceId(voice.voiceId);

    try {
      // 1. Call real Gemini voice audio generation endpoint on backend
      const res = await getVoiceSampleApi({
        voiceId: voice.voiceId,
        sampleText: voice.samplePhrase,
      });

      if (res?.success && res?.audioBase64) {
        setLoadingAudioVoiceId(null);
        setPlayingVoiceId(voice.voiceId);
        await playGeminiAudioBase64(res.audioBase64, res.mimeType, () => {
          setPlayingVoiceId(null);
        });
        return;
      }

      // 2. Fallback to browser Speech Synthesis if Gemini backend key not yet provisioned
      throw new Error(res?.error || 'Gemini Audio not available');
    } catch (err) {
      console.warn('[PersonaPreview] Real Gemini API audio not returned, using browser speech fallback:', err);
      setLoadingAudioVoiceId(null);

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(voice.samplePhrase);
        utterance.pitch = voice.gender.startsWith('Female') ? 1.05 : 0.92;
        utterance.rate = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (voice.gender.startsWith('Female')
                ? v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Zira')
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
    <div className="w-full h-full min-h-[320px] rounded-xl border border-border/80 bg-surface-lowest/95 p-5 sm:p-6 flex flex-col justify-between select-none relative overflow-hidden group shadow-sm">
      {/* Subtle backdrop glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary border border-primary/25">
            <Bot size={15} />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-foreground tracking-tight">
              Archetype & Voice Persona
            </h4>
            <p className="text-[10.5px] text-muted-foreground font-mono">
              Live Google Gemini Voice Engine & MongoDB <span className="text-primary font-semibold">/agent-config</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] text-primary bg-primary/10 border border-primary/25 font-mono font-medium animate-pulse">
              <Loader2 size={11} className="animate-spin" />
              Saving to DB…
            </span>
          )}
          {savedSuccess && !saving && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] text-primary bg-primary/10 border border-primary/30 font-mono font-medium animate-in fade-in">
              <CheckCircle2 size={11} strokeWidth={2.5} />
              Saved Live
            </span>
          )}
          {!saving && !savedSuccess && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-surface-high text-foreground border border-border/80 font-mono">
              <Sparkles size={11} className="text-primary" />
              Gemini Live Synced
            </span>
          )}
        </div>
      </div>

      {/* 1. Archetype selection grid */}
      <div className="my-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider font-mono">
            1. Store Business Archetype
          </span>
          <span className="text-[10.5px] text-muted-foreground">
            Customizes sales directives & catalog workflow
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {ARCHETYPES.map((arch) => {
            const Icon = arch.icon;
            const isSelected = selectedArchetype === arch.id;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => handleSelectArchetype(arch.id)}
                className={cn(
                  'flex flex-col p-2.5 rounded-xl border text-left transition-all duration-150 relative cursor-pointer group/btn',
                  isSelected
                    ? 'border-primary bg-surface-high/95 shadow-xs shadow-primary/20 ring-1 ring-primary/40'
                    : 'border-border/60 bg-surface-low/40 hover:bg-surface-high/60 hover:border-border text-muted-foreground',
                )}
              >
                <div className="flex items-center justify-between mb-1.5 w-full">
                  <Icon
                    size={14}
                    className={cn(
                      'transition-colors',
                      isSelected ? 'text-primary' : 'text-muted-foreground group-hover/btn:text-foreground',
                    )}
                  />
                  {isSelected ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-xs shadow-primary/40">
                      <Check size={9} strokeWidth={3} />
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono text-muted-foreground/60 px-1 py-0.2 rounded bg-surface-lowest">
                      {arch.category}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-[11px] font-bold tracking-tight truncate',
                    isSelected ? 'text-foreground' : 'text-foreground/80',
                  )}
                >
                  {arch.name}
                </p>
                <p className="text-[9.5px] text-muted-foreground mt-0.5 line-clamp-1 leading-tight">
                  {arch.tag}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Voice & Tone Persona Selection with Listen Buttons */}
      <div className="pt-3.5 border-t border-border/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider font-mono">
            2. Choose AI Voice Model & Brand Tone
          </span>
          <span className="text-[10.5px] text-muted-foreground font-mono flex items-center gap-1">
            <Volume2 size={11} className="text-primary" />
            Click ▶ to hear Gemini speech tone
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {VOICE_OPTIONS.map((voice) => {
            const isSelected = selectedVoiceId === voice.voiceId;
            const isPlaying = playingVoiceId === voice.voiceId;
            const isLoadingAudio = loadingAudioVoiceId === voice.voiceId;

            return (
              <div
                key={voice.voiceId}
                onClick={() => handleSelectVoice(voice)}
                className={cn(
                  'flex flex-col justify-between p-3 rounded-xl border transition-all duration-150 relative cursor-pointer',
                  isSelected
                    ? 'border-primary bg-surface-high/90 ring-1 ring-primary/40 shadow-xs'
                    : 'border-border/60 bg-surface-low/30 hover:border-border hover:bg-surface-high/50',
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          isSelected ? 'bg-primary' : 'bg-muted-foreground/40',
                        )}
                      />
                      <p className="text-[12px] font-bold text-foreground truncate">
                        {voice.voiceId}
                      </p>
                      <span className="text-[9.5px] font-mono text-muted-foreground">
                        ({voice.gender})
                      </span>
                    </div>

                    {isSelected && (
                      <span className="text-[9px] font-mono font-bold text-primary px-1.5 py-0.2 rounded bg-primary/15 border border-primary/30">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-semibold text-primary/90 mt-0.5">
                    {voice.toneName}
                  </p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {voice.tagline}
                  </p>
                </div>

                {/* Voice listen bar */}
                <div className="pt-2.5 mt-2.5 border-t border-border/40 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => handlePlayVoiceSample(voice, e)}
                    disabled={isLoadingAudio}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer shadow-xs',
                      isPlaying
                        ? 'bg-primary text-primary-foreground animate-pulse'
                        : 'bg-surface-high hover:bg-surface-highest text-foreground border border-border/70',
                    )}
                  >
                    {isLoadingAudio ? (
                      <>
                        <Loader2 size={10} className="animate-spin text-primary" />
                        <span>Generating…</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <Square size={9} fill="currentColor" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Play size={9} fill="currentColor" className="text-primary" />
                        <span>Hear Voice</span>
                      </>
                    )}
                  </button>

                  {isPlaying && (
                    <div className="flex items-center gap-0.5 h-3">
                      <span className="w-1 bg-primary h-full animate-pulse rounded-full" />
                      <span className="w-1 bg-primary h-2/3 animate-pulse delay-75 rounded-full" />
                      <span className="w-1 bg-primary h-4/5 animate-pulse delay-150 rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
