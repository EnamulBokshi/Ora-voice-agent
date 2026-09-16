'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Trash2,
  CheckCircle2,
  Loader2,
  PenLine,
  AudioLines,
  AlertTriangle,
  FileText,
  HelpCircle,
  BookOpen,
  Tag,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Send,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { ingestVoiceTranscriptApi } from '@/services/knowledge-service';
import { DocType, IngestVoiceTranscriptResponseData } from '@/types/knowledge';
import { cn } from '@/lib/utils';
import { GeminiLiveClient } from '@/services/gemini-live-client';
import { LivingOrb, LivingOrbState } from '@/components/orb/living-orb';
import { MicrophoneBlockedNotice } from '@/components/voice/microphone-blocked-notice';
import { isMicrophoneBlockedByPolicy } from '@/lib/voice/microphone-access';
import { getSessionStrategy } from '@/lib/session';
import { useReadOnly } from '@/components/common/read-only-fence';

interface VoiceFeedTabProps {
  publishableKey?: string;
  onFed?: () => void;
}

interface TranscriptEntry {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
}

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error';

/**
 * How the merchant feeds knowledge.
 * - converse: full duplex with ORA note-taker persona.
 * - dictate:  silent transcribe mode via Gemini Live ASR. LivingOrb animates with voice energy,
 *             ORA stays completely silent while merchant reads without interruption.
 */
type VoiceMode = 'converse' | 'dictate';

type TargetCategory = 'all' | DocType;

interface CategoryOption {
  id: TargetCategory;
  label: string;
  description: string;
  hint: string;
  Icon: React.ElementType;
  badgeClass: string;
  dotClass: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'all',
    label: 'Automatic Sorting',
    description: 'Structures voice input into policies, products, FAQs, and guidelines automatically.',
    hint: 'Speak freely — automatically sorts policies, product details, and store guidelines.',
    Icon: Layers,
    badgeClass: 'border-primary/40 bg-primary/10 text-primary',
    dotClass: 'bg-primary',
  },
  {
    id: DocType.POLICY,
    label: 'Store Policy',
    description: 'Shipping timelines, return & refund windows, warranty, exchange rules.',
    hint: 'Speak your return window, shipping couriers, replacement policy, or cancellation terms.',
    Icon: ShieldCheck,
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
    dotClass: 'bg-emerald-500',
  },
  {
    id: DocType.PRODUCT_MANUAL,
    label: 'Product Details',
    description: 'Materials, sizing guides, variations, specifications, care instructions.',
    hint: 'Describe product dimensions, fabric composition, sizing fit, or washing instructions.',
    Icon: Tag,
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-500',
    dotClass: 'bg-sky-500',
  },
  {
    id: DocType.FAQ,
    label: 'Customer FAQ',
    description: 'Common customer questions and standard authoritative answers.',
    hint: 'State common shopper questions along with the exact answer ORA should give.',
    Icon: HelpCircle,
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
    dotClass: 'bg-amber-500',
  },
  {
    id: DocType.SALES_PLAYBOOK,
    label: 'Sales Playbook',
    description: 'Discount thresholds, bundle offers, upselling rules, pricing guidelines.',
    hint: 'Explain seasonal discount codes, bundle deals, price match terms, or upselling tips.',
    Icon: BookOpen,
    badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-500',
    dotClass: 'bg-purple-500',
  },
  {
    id: DocType.BRAND_RULE,
    label: 'Brand & Tone',
    description: 'Brand story, tone of voice, prohibited terms, core brand philosophy.',
    hint: 'Define your store personality, customer greeting style, or words ORA should never say.',
    Icon: FileText,
    badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-500',
    dotClass: 'bg-rose-500',
  },
];

const DOC_TYPE_META: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  [DocType.POLICY]: { label: 'Store Policy', badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500', dotClass: 'bg-emerald-500' },
  [DocType.PRODUCT_MANUAL]: { label: 'Product Detail', badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-500', dotClass: 'bg-sky-500' },
  [DocType.FAQ]: { label: 'Customer FAQ', badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-500', dotClass: 'bg-amber-500' },
  [DocType.SALES_PLAYBOOK]: { label: 'Sales Guidance', badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-500', dotClass: 'bg-purple-500' },
  [DocType.BRAND_RULE]: { label: 'Brand Rule', badgeClass: 'border-rose-500/30 bg-rose-500/10 text-rose-500', dotClass: 'bg-rose-500' },
  [DocType.UPLOADED_DOC]: { label: 'Document', badgeClass: 'border-blue-500/30 bg-blue-500/10 text-blue-500', dotClass: 'bg-blue-500' },
};

export function VoiceFeedTab({ publishableKey, onFed }: VoiceFeedTabProps) {
  const readOnly = useReadOnly();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('converse');
  const [selectedCategory, setSelectedCategory] = useState<TargetCategory>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Resolved after mount rather than at module scope: it reads the document's
  // Permissions Policy, which does not exist during server rendering.
  const [micBlocked, setMicBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [sessionId] = useState<string>(() => `feed_${Math.random().toString(36).substring(2, 9)}`);

  // Live partial text while dictating
  const [interimText, setInterimText] = useState<string>('');

  // Manual Note expansion
  const [showManualNote, setShowManualNote] = useState<boolean>(false);
  const [manualNoteText, setManualNoteText] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Organising the session into categorised knowledge
  const [isOrganising, setIsOrganising] = useState<boolean>(false);
  const [organiseError, setOrganiseError] = useState<string | null>(null);
  const [organiseResult, setOrganiseResult] = useState<IngestVoiceTranscriptResponseData | null>(null);

  // Direct Client Ref
  const directClientRef = useRef<GeminiLiveClient | null>(null);
  const transcriptsRef = useRef<TranscriptEntry[]>([]);

  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  // Append log entry helper
  const addTranscript = useCallback((sender: 'user' | 'agent' | 'system', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTranscripts((prev) => [...prev, { id: Math.random().toString(), sender, text, timestamp: time }]);
  }, []);

  // Clean up recording and connections
  const stopSession = useCallback(() => {
    if (directClientRef.current) {
      directClientRef.current.stop();
      directClientRef.current = null;
    }
    setInterimText('');
    setStatus('idle');
    setAudioLevel(0);
  }, []);

  /**
   * Start Live Voice Session via GeminiLiveClient
   * In 'converse' mode: sessionMode='training', silentMode=false
   * In 'dictate' mode: sessionMode='training', silentMode=true (ASR transcribes, LivingOrb pulses, ORA is silent)
   */
  const startVoiceSession = async (mode: VoiceMode = voiceMode) => {
    try {
      let keyToUse = publishableKey;
      if (!keyToUse) {
        const session = await getSessionStrategy().getSession().catch(() => null);
        keyToUse = session?.business?.publishableKey || undefined;
      }

      if (!keyToUse) {
        setErrorMessage('Store publishable key is loading. Please try again in a second.');
        setStatus('error');
        return;
      }

      stopSession();
      setErrorMessage(null);
      setStatus('connecting');
      setOrganiseResult(null);
      setOrganiseError(null);

      const sessionToken = await getSessionStrategy().getToken().catch(() => null);
      const token = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
      const isSilent = mode === 'dictate';

      const client = new GeminiLiveClient({
        publishableKey: keyToUse,
        sessionId,
        authToken: token || undefined,
        sessionMode: 'training',
        silentMode: isSilent,
        onStatusChange: (newStatus) => setStatus(newStatus),
        onTranscript: (sender, text) => {
          if (sender === 'user') {
            setInterimText('');
          }
          addTranscript(sender, text);
        },
        onAudioLevel: (level) => setAudioLevel(level),
        onError: (err) => {
          setErrorMessage(err);
          setStatus('error');
        },
      });

      directClientRef.current = client;
      await client.start();

      if (isSilent) {
        addTranscript('system', 'Silent transcribe mode active. Speak naturally — ORA stays silent and streams your words.');
      } else {
        addTranscript('system', 'ORA Learning Assistant connected. Tell ORA about your store knowledge.');
      }
    } catch (err: any) {
      console.error('[VoiceFeedTab] Session setup error:', err);
      setErrorMessage(err.message || 'Voice stream failed to initialize. Please check microphone permissions.');
      setStatus('error');
    }
  };

  /**
   * Hand the session turns to the backend to split by topic and file into categories.
   */
  const organiseIntoKnowledge = useCallback(async (customTurns?: { speaker: 'merchant' | 'ora'; text: string }[]) => {
    // Filing a session into the knowledge base is `POST
    // /knowledge/voice-transcript`, which is `@Roles(OWNER, ADMIN)`. Guarded
    // here rather than at each caller, because ending a session files it
    // automatically.
    if (readOnly) return;

    const turns = customTurns ?? transcriptsRef.current
      .filter((t) => t.sender === 'user' || t.sender === 'agent')
      .map((t) => ({
        speaker: (t.sender === 'user' ? 'merchant' : 'ora') as 'merchant' | 'ora',
        text: t.text,
      }));

    if (!turns.some((t) => t.speaker === 'merchant' && t.text.trim())) return;

    setIsOrganising(true);
    setOrganiseError(null);
    try {
      const result = await ingestVoiceTranscriptApi({
        turns,
        sessionId,
        targetCategory: selectedCategory !== 'all' ? selectedCategory : undefined,
      });
      setOrganiseResult(result);
      if (result.saved.length > 0 && onFed) {
        onFed();
      }
    } catch (err: any) {
      console.error('Failed to organise voice session into knowledge:', err);
      setOrganiseError(
        err?.message || 'Could not file this session into the knowledge base. Please try again.',
      );
    } finally {
      setIsOrganising(false);
    }
  }, [sessionId, selectedCategory, onFed, readOnly]);

  /**
   * Ending a session files it automatically.
   */
  const stopAndOrganise = useCallback(() => {
    stopSession();
    void organiseIntoKnowledge();
  }, [stopSession, organiseIntoKnowledge]);

  const handleToggleVoice = () => {
    if (status === 'connecting') return;
    // Both modes capture the microphone, so a policy block rules out either.
    if (micBlocked) return;
    if (status === 'idle' || status === 'error') {
      startVoiceSession(voiceMode);
    } else {
      stopAndOrganise();
    }
  };

  const handleManualNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNoteText.trim() || isSubmittingNote) return;

    setIsSubmittingNote(true);
    try {
      const noteTurn = { speaker: 'merchant' as const, text: manualNoteText.trim() };
      addTranscript('user', manualNoteText.trim());
      await organiseIntoKnowledge([noteTurn]);
      setManualNoteText('');
      setShowManualNote(false);
    } catch (err: any) {
      setOrganiseError(err?.message || 'Failed to file note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  useEffect(() => {
    setMicBlocked(isMicrophoneBlockedByPolicy());
  }, []);

  const isActive = status === 'listening' || status === 'speaking' || status === 'connecting';
  const activeCategoryMeta = CATEGORY_OPTIONS.find((c) => c.id === selectedCategory) || CATEGORY_OPTIONS[0];

  return (
    <div className="space-y-5">
      {/* ── 1. Target Knowledge Category Selector ── */}
      <div className="rounded-md border border-border/50 bg-surface-lowest/40 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-primary flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
              Target Category
            </h2>
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {selectedCategory === 'all' ? 'Auto-Sorting Active' : 'Category Selected'}
          </span>
        </div>

        {/* Category Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const CatIcon = cat.Icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all border text-xs cursor-pointer',
                  isSelected
                    ? 'bg-surface-high border-border text-foreground font-semibold shadow-xs'
                    : 'bg-surface-low/50 border-border/40 text-muted-foreground hover:text-foreground hover:bg-surface-high/60',
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                    isSelected ? 'bg-primary/15 text-primary' : 'bg-surface-container text-muted-foreground',
                  )}
                >
                  <CatIcon size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium leading-tight truncate">{cat.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Category Guidance Tip */}
        <div className="mt-2 pt-2.5 border-t border-border/30 flex items-start gap-2 text-[11.5px] text-muted-foreground leading-relaxed">
          <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', activeCategoryMeta.dotClass)} />
          <p>
            <strong className="text-foreground">{activeCategoryMeta.label}:</strong> {activeCategoryMeta.hint}
          </p>
        </div>
      </div>

      {/* ── 2. Voice Feed Orb Card ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-6 relative flex flex-col items-center justify-center text-center">
        {/* Ambient glow */}
        <div
          className={cn(
            'absolute inset-0 pointer-events-none transition-opacity duration-700 rounded-md',
            isActive ? 'opacity-10' : 'opacity-0',
          )}
          style={{
            background:
              status === 'speaking'
                ? 'radial-gradient(circle at center, var(--primary) 0%, transparent 70%)'
                : 'radial-gradient(circle at center, var(--status-warning) 0%, transparent 70%)',
          }}
        />

        {micBlocked && <MicrophoneBlockedNotice className="relative z-10 mb-2" />}

        {/* Mode Selector: Converse vs Dictate */}
        <div className="relative z-10 inline-flex items-center gap-1 p-1 rounded-md border border-border/60 bg-surface-lowest/70 shadow-xs mb-2">
          {([
            {
              id: 'converse' as VoiceMode,
              label: 'Interactive Voice',
              Icon: AudioLines,
              hint: 'Live conversation with spoken confirmations',
            },
            {
              id: 'dictate' as VoiceMode,
              label: 'Direct Dictation',
              Icon: PenLine,
              hint: 'Continuous transcription without spoken replies — ideal for reading out policies',
            },
          ]).map(({ id, label, Icon, hint }) => (
            <button
              key={id}
              type="button"
              title={hint}
              disabled={isActive}
              onClick={() => {
                setVoiceMode(id);
                if (!isActive) {
                  stopSession();
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                voiceMode === id
                  ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Central Living Crystal Wave Orb */}
        <div className="relative flex flex-col items-center justify-center my-3">
          <LivingOrb
            size={115}
            voiceState={status === 'connected' ? 'active' : (status as LivingOrbState)}
            energyLevel={audioLevel}
            onClick={handleToggleVoice}
            ariaLabel={isActive ? 'Stop ORA Voice Assistant' : 'Start ORA Voice Assistant'}
            title={isActive ? 'Click to stop and organize into knowledge' : 'Click to start voice input'}
          />
        </div>

        {/* Dynamic Status Display */}
        <div className="relative z-10 mt-1 max-w-md">
          <p className="text-[12px] font-medium text-muted-foreground">
            {status === 'speaking'
              ? 'ORA speaking...'
              : status === 'listening'
                ? voiceMode === 'dictate'
                  ? 'Transcribing your speech'
                  : 'Listening... speak store information'
                : status === 'connecting'
                  ? 'Connecting to live stream...'
                  : 'Click the orb or press Start to begin speaking'}
          </p>
        </div>

        {/* Voice Control Toolbar */}
        {isActive && (
          <div className="relative z-10 flex items-center gap-2 mt-4">
            {voiceMode === 'converse' && (
              <button
                type="button"
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (directClientRef.current) {
                    directClientRef.current.setMuted(nextMuted);
                  }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer',
                  isMuted
                    ? 'bg-error/10 border-error/30 text-error'
                    : 'bg-surface-low border-border text-foreground hover:bg-surface-high',
                )}
              >
                {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                {isMuted ? 'Muted' : 'Mute Mic'}
              </button>
            )}

            <button
              type="button"
              onClick={stopAndOrganise}
              title="End the session and save into store knowledge"
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-surface-low hover:bg-error/10 hover:text-error border border-border transition-colors flex items-center gap-1.5 text-muted-foreground cursor-pointer"
            >
              <Square size={12} />
              Stop &amp; Save
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="relative z-10 mt-3 p-2.5 rounded-md bg-error/10 border border-error/20 text-xs text-error max-w-md">
            {errorMessage}
          </div>
        )}
      </div>

      {/* ── 3. Quick Note / Manual Paste (Optional alternative) ── */}
      <div className="rounded-md border border-border/50 bg-surface-lowest/30 p-3.5">
        <button
          type="button"
          onClick={() => setShowManualNote((prev) => !prev)}
          className="w-full flex items-center justify-between text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-foreground" />
            <span>Have written notes or copied text? Add or paste directly</span>
          </div>
          {showManualNote ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showManualNote && (
          <form onSubmit={handleManualNoteSubmit} className="mt-3 space-y-2 pt-2 border-t border-border/40">
            <textarea
              value={manualNoteText}
              onChange={(e) => setManualNoteText(e.target.value)}
              placeholder={`Paste or type store info here to index under ${activeCategoryMeta.label}...\ne.g. Orders placed before 2 PM ship same day via Express Delivery.`}
              rows={3}
              className="w-full p-2.5 text-xs rounded-md bg-surface-low border border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-foreground leading-relaxed resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Category: <strong className="text-foreground">{activeCategoryMeta.label}</strong>
              </span>
              <button
                type="submit"
                disabled={readOnly || !manualNoteText.trim() || isSubmittingNote}
                title={readOnly ? 'View-only access' : undefined}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmittingNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Save Note</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── 4. Session Transcript Log ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <AudioLines size={14} className="text-primary flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
              Session Transcript
            </h2>
            {transcripts.length > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">({transcripts.length})</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {transcripts.some((t) => t.sender === 'user' || t.sender === 'agent') && (
              <button
                type="button"
                onClick={() => void organiseIntoKnowledge()}
                disabled={isOrganising}
                title="Save transcript entries into store knowledge"
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isOrganising ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : organiseResult ? (
                  <CheckCircle2 size={11} />
                ) : (
                  <Layers size={11} />
                )}
                <span>{isOrganising ? 'Organising…' : 'Organise into knowledge'}</span>
              </button>
            )}

            {transcripts.length > 0 && (
              <button
                type="button"
                onClick={() => setTranscripts([])}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1 cursor-pointer"
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transcript scroll area */}
        <div className="space-y-3 min-h-[160px] max-h-[320px] overflow-y-auto pt-3.5 no-scrollbar">
          {transcripts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground select-none">
              <p className="font-medium text-foreground">No voice input captured yet.</p>
              <p className="text-[11px] mt-1 text-muted-foreground/70">
                Click the Living Orb above to speak with ORA or transcribe store knowledge.
              </p>
            </div>
          ) : (
            transcripts.map((entry) => {
              if (entry.sender === 'system') {
                return (
                  <div key={entry.id} className="text-center my-1.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-[3px] text-[10px] bg-surface-low border border-border/40 text-muted-foreground">
                      {entry.text}
                    </span>
                  </div>
                );
              }

              const isUser = entry.sender === 'user';

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex flex-col gap-1 max-w-[85%]',
                    isUser ? 'self-end items-end ml-auto' : 'self-start items-start',
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={cn('font-medium', isUser ? 'text-foreground' : 'text-foreground dark:text-[#C8F031]')}>
                      {isUser ? 'You (Merchant)' : 'ORA (Learning Assistant)'}
                    </span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="tabular-nums">{entry.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      'p-3 rounded-md text-xs leading-relaxed border',
                      isUser
                        ? 'bg-surface-high/50 border-border/60 text-foreground'
                        : 'bg-transparent border-border/50 text-foreground',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{entry.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 5. What was filed into Knowledge Base ── */}
      {(organiseResult || organiseError) && (
        <div className="rounded-md border border-border/50 bg-transparent p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
              <span className="text-[13px] font-semibold text-foreground">
                Organised into Knowledge Base
              </span>
            </div>
            {organiseResult?.saved && organiseResult.saved.length > 0 && (
              <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1 tabular-nums">
                <CheckCircle2 size={12} /> {organiseResult.saved.length} {organiseResult.saved.length === 1 ? 'entry indexed' : 'entries indexed'}
              </span>
            )}
          </div>

          {organiseError ? (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-error">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              <p>{organiseError}</p>
            </div>
          ) : organiseResult && organiseResult.saved.length === 0 ? (
            <div className="mt-3 p-3 rounded-md bg-surface-low/50 border border-border/40 text-[12px] text-muted-foreground">
              <p className="font-medium text-foreground">No durable store knowledge detected in this session.</p>
              <p className="mt-1 text-[11.5px] leading-relaxed">
                Try stating actionable facts directly: return windows, refund procedures, shipping carriers, sizing charts, or pricing policies.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              {organiseResult?.saved.map((entry) => {
                const meta = DOC_TYPE_META[entry.docType] || {
                  label: entry.docType,
                  badgeClass: 'border-border bg-surface-high text-foreground',
                  dotClass: 'bg-foreground',
                };

                return (
                  <div
                    key={entry.id}
                    className="p-3 rounded-md border border-border/50 bg-surface-lowest/40 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium border',
                              meta.badgeClass,
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotClass)} />
                            {meta.label}
                          </span>

                          <span className="text-[10px] text-muted-foreground">
                            {entry.action === 'created' && (
                              <span className="text-emerald-500 font-semibold">• New Entry</span>
                            )}
                            {entry.action === 'updated' && (
                              <span className="text-sky-500 font-semibold">• Updated Existing</span>
                            )}
                            {entry.action === 'unchanged' && (
                              <span className="text-muted-foreground font-semibold">• Already Up to Date</span>
                            )}
                          </span>
                        </div>

                        <p className="text-[13px] font-semibold text-foreground">
                          {entry.title}
                        </p>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[10.5px] text-muted-foreground/80 tabular-nums">
                          {Math.round(entry.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>

                    {entry.chunksCount && (
                      <p className="text-[11px] text-muted-foreground/70 tabular-nums">
                        Created {entry.chunksCount} indexed knowledge {entry.chunksCount === 1 ? 'section' : 'sections'}
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Method:{' '}
                  <strong className="text-foreground">
                    {organiseResult?.method === 'model' ? 'Structured Knowledge' : 'Direct Layout'}
                  </strong>
                </span>
                <span className="text-muted-foreground/80">
                  Synced directly with Knowledge Base
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
