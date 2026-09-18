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

/**
 * Categories are told apart by their icon and their label, not by a colour
 * each. Six hues across six pills reads as decoration and leaves no colour
 * free to mean anything: the accent is reserved here for what is selected and
 * for the one primary action, and semantic colour for how an entry was filed.
 */
interface CategoryOption {
  id: TargetCategory;
  label: string;
  hint: string;
  Icon: React.ElementType;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'all',
    label: 'Sort it for me',
    hint: 'Talk about anything in any order. Each topic is filed on its own once you finish.',
    Icon: Layers,
  },
  {
    id: DocType.POLICY,
    label: 'Store policy',
    hint: 'Return windows, couriers and delivery times, warranties, cancellation terms.',
    Icon: ShieldCheck,
  },
  {
    id: DocType.PRODUCT_MANUAL,
    label: 'Product details',
    hint: 'Sizing and fit, materials, variants, care and washing instructions.',
    Icon: Tag,
  },
  {
    id: DocType.FAQ,
    label: 'Customer questions',
    hint: 'A question shoppers keep asking, and the answer you want ORA to give.',
    Icon: HelpCircle,
  },
  {
    id: DocType.SALES_PLAYBOOK,
    label: 'Selling rules',
    hint: 'Discounts and their limits, bundles, price matching, what to offer and when.',
    Icon: BookOpen,
  },
  {
    id: DocType.BRAND_RULE,
    label: 'Voice and tone',
    hint: 'How ORA should greet people, the words to use, and the words to never use.',
    Icon: FileText,
  },
];

const DOC_TYPE_META: Record<string, { label: string; Icon: React.ElementType }> = {
  [DocType.POLICY]: { label: 'Store policy', Icon: ShieldCheck },
  [DocType.PRODUCT_MANUAL]: { label: 'Product details', Icon: Tag },
  [DocType.FAQ]: { label: 'Customer questions', Icon: HelpCircle },
  [DocType.SALES_PLAYBOOK]: { label: 'Selling rules', Icon: BookOpen },
  [DocType.BRAND_RULE]: { label: 'Voice and tone', Icon: FileText },
  [DocType.UPLOADED_DOC]: { label: 'Document', Icon: FileText },
};

/**
 * How an entry landed. This is the one place colour carries meaning on this
 * screen, so each outcome also carries its own word — colour alone would leave
 * the distinction invisible to anyone who cannot separate these two greens.
 */
const ACTION_META: Record<string, { label: string; className: string }> = {
  created: { label: 'New', className: 'text-emerald-600 dark:text-emerald-400' },
  updated: { label: 'Updated', className: 'text-sky-600 dark:text-sky-400' },
  unchanged: { label: 'No change', className: 'text-muted-foreground' },
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
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3.5 border-b border-border/40">
          <Layers size={14} aria-hidden="true" className="text-muted-foreground flex-shrink-0" />
          <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
            What are you about to tell ORA?
          </h2>
        </div>

        {/*
          A radiogroup, not six buttons: only one applies at a time, and arrow
          keys are what a keyboard user reaches for once the group has focus.
        */}
        <div role="radiogroup" aria-label="Knowledge category" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const CatIcon = cat.Icon;
            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-left border text-xs cursor-pointer',
                  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-container',
                  isSelected
                    ? 'bg-surface-high border-foreground/25 text-foreground'
                    : 'bg-transparent border-border/50 text-muted-foreground hover:text-foreground hover:border-border',
                )}
              >
                <CatIcon
                  size={14}
                  aria-hidden="true"
                  className={cn('flex-shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground/70')}
                />
                <span className={cn('min-w-0 flex-1 truncate leading-tight', isSelected ? 'font-semibold' : 'font-medium')}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* The hint answers "so what do I say?", which is where merchants stall. */}
        <p aria-live="polite" className="text-xs text-muted-foreground leading-relaxed max-w-[68ch]">
          {activeCategoryMeta.hint}
        </p>
      </div>

      {/* ── 2. Voice Feed Orb Card ── */}
      {/*
        This is the one surface on the tab that raises its voice. Everything
        around it sits on the page background with a hairline; this one is
        filled and given room, so the thing the merchant came here to do reads
        first and the supporting controls stay supporting.
      */}
      <div className="rounded-md border border-border/50 bg-surface-lowest/60 px-6 py-8 sm:py-10 relative flex flex-col items-center justify-center text-center overflow-hidden">
        {/* The session's only ambient signal: present while live, gone at rest. */}
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-40 pointer-events-none transition-opacity duration-500',
            isActive ? 'opacity-[0.07]' : 'opacity-0',
          )}
          style={{
            background:
              status === 'speaking'
                ? 'radial-gradient(60% 100% at 50% 0%, var(--primary) 0%, transparent 100%)'
                : 'radial-gradient(60% 100% at 50% 0%, var(--status-warning) 0%, transparent 100%)',
          }}
        />

        {micBlocked && <MicrophoneBlockedNotice className="relative z-10 mb-2" />}

        {/* Mode Selector: Converse vs Dictate */}
        <div
          role="radiogroup"
          aria-label="Voice mode"
          className="relative z-10 inline-flex items-center gap-1 p-1 rounded-md border border-border/60 bg-surface-container"
        >
          {([
            {
              id: 'converse' as VoiceMode,
              label: 'Talk with ORA',
              Icon: AudioLines,
            },
            {
              id: 'dictate' as VoiceMode,
              label: 'Just listen',
              Icon: PenLine,
            },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={voiceMode === id}
              disabled={isActive}
              onClick={() => {
                setVoiceMode(id);
                if (!isActive) {
                  stopSession();
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 cursor-pointer',
                'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                voiceMode === id
                  ? 'bg-surface-high text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground font-medium',
              )}
            >
              <Icon size={12} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* The mode's consequence, spelled out rather than hidden in a tooltip. */}
        <p className="relative z-10 mt-2 text-[11px] text-muted-foreground max-w-[46ch]">
          {voiceMode === 'converse'
            ? 'ORA answers out loud and asks when something is unclear.'
            : 'ORA stays silent and writes down everything you say. Best for reading a policy out.'}
        </p>

        {/* Central Living Crystal Wave Orb */}
        <div className="relative flex flex-col items-center justify-center my-7">
          <LivingOrb
            size={140}
            voiceState={status === 'connected' ? 'active' : (status as LivingOrbState)}
            energyLevel={audioLevel}
            onClick={handleToggleVoice}
            ariaLabel={isActive ? 'Stop the session and file it into knowledge' : 'Start speaking to ORA'}
            title={isActive ? 'Stop the session and file it into knowledge' : 'Start speaking to ORA'}
          />
        </div>

        {/* Dynamic Status Display */}
        <div className="relative z-10 max-w-md">
          <p aria-live="polite" className="text-[15px] font-semibold text-foreground tracking-tight">
            {status === 'speaking'
              ? 'ORA is answering'
              : status === 'listening'
                ? voiceMode === 'dictate'
                  ? 'Writing down what you say'
                  : 'Listening'
                : status === 'connecting'
                  ? 'Connecting'
                  : 'Ready when you are'}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {isActive
              ? 'Everything is filed when you stop, not before.'
              : 'Tap the orb and start talking.'}
          </p>
        </div>

        {/* Voice Control Toolbar */}
        {isActive && (
          <div className="relative z-10 flex items-center gap-2 mt-6">
            {voiceMode === 'converse' && (
              <button
                type="button"
                aria-pressed={isMuted}
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (directClientRef.current) {
                    directClientRef.current.setMuted(nextMuted);
                  }
                }}
                className={cn(
                  'px-3 py-2 rounded-md text-xs font-semibold border flex items-center gap-1.5 cursor-pointer',
                  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isMuted
                    ? 'bg-error/10 border-error/30 text-error'
                    : 'bg-surface-container border-border text-foreground hover:bg-surface-high',
                )}
              >
                {isMuted ? <MicOff size={13} aria-hidden="true" /> : <Mic size={13} aria-hidden="true" />}
                {isMuted ? 'Microphone off' : 'Mute microphone'}
              </button>
            )}

            {/* The one primary action while a session runs. */}
            <button
              type="button"
              onClick={stopAndOrganise}
              className={cn(
                'px-4 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1.5 cursor-pointer',
                'transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-lowest',
              )}
            >
              <Square size={12} aria-hidden="true" />
              Stop and file
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="relative z-10 mt-5 p-3 rounded-md bg-error/10 border border-error/20 text-xs text-error max-w-md text-left flex items-start gap-2"
          >
            <AlertTriangle size={13} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* ── 3. Quick Note / Manual Paste (Optional alternative) ── */}
      <div className="rounded-md border border-border/50 bg-transparent px-5 py-4">
        <button
          type="button"
          aria-expanded={showManualNote}
          onClick={() => setShowManualNote((prev) => !prev)}
          className={cn(
            'w-full flex items-center justify-between gap-3 text-left text-xs font-medium cursor-pointer rounded-md',
            'text-muted-foreground hover:text-foreground transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <span className="flex items-center gap-2">
            <PenLine size={13} aria-hidden="true" className="flex-shrink-0" />
            Rather type it? Write or paste it here instead
          </span>
          {showManualNote ? (
            <ChevronUp size={14} aria-hidden="true" className="flex-shrink-0" />
          ) : (
            <ChevronDown size={14} aria-hidden="true" className="flex-shrink-0" />
          )}
        </button>

        {showManualNote && (
          <form onSubmit={handleManualNoteSubmit} className="mt-4 space-y-3 pt-4 border-t border-border/40">
            <label htmlFor="voice-feed-manual-note" className="block text-xs font-medium text-foreground">
              Filed under {activeCategoryMeta.label.toLowerCase()}
            </label>
            <textarea
              id="voice-feed-manual-note"
              value={manualNoteText}
              onChange={(e) => setManualNoteText(e.target.value)}
              placeholder={'For example: orders placed before 2 PM ship the same day by express delivery.'}
              rows={3}
              className={cn(
                'w-full p-3 text-xs rounded-md bg-surface-container border border-border/60 text-foreground leading-relaxed resize-y',
                'placeholder:text-muted-foreground/60 transition-colors duration-150',
                'focus:outline-none focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring',
              )}
            />
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={readOnly || !manualNoteText.trim() || isSubmittingNote}
                title={readOnly ? 'You have view-only access' : undefined}
                className={cn(
                  'px-3.5 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground flex items-center gap-1.5 cursor-pointer',
                  'transition-colors duration-150 hover:bg-primary-hover',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isSubmittingNote ? (
                  <Loader2 size={12} aria-hidden="true" className="animate-spin" />
                ) : (
                  <Send size={12} aria-hidden="true" />
                )}
                <span>{isSubmittingNote ? 'Filing' : 'File this note'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── 4. Session Transcript Log ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2 min-w-0">
            <AudioLines size={14} aria-hidden="true" className="text-muted-foreground flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
              This session
            </h2>
            {transcripts.length > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">{transcripts.length}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {transcripts.length > 0 && (
              <button
                type="button"
                onClick={() => setTranscripts([])}
                className={cn(
                  'text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer',
                  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <Trash2 size={11} aria-hidden="true" />
                Clear
              </button>
            )}

            {transcripts.some((t) => t.sender === 'user' || t.sender === 'agent') && (
              <button
                type="button"
                onClick={() => void organiseIntoKnowledge()}
                disabled={isOrganising}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground flex items-center gap-1.5 cursor-pointer',
                  'transition-colors duration-150 hover:bg-primary-hover',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isOrganising ? (
                  <Loader2 size={11} aria-hidden="true" className="animate-spin" />
                ) : organiseResult ? (
                  <CheckCircle2 size={11} aria-hidden="true" />
                ) : (
                  <Layers size={11} aria-hidden="true" />
                )}
                <span>{isOrganising ? 'Filing' : 'File into knowledge'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Transcript scroll area */}
        <div
          aria-live="polite"
          className="flex flex-col space-y-4 min-h-[160px] max-h-[320px] overflow-y-auto pt-4 pr-1 voice-feed-scroll"
        >
          {transcripts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-xs select-none">
              <p className="font-medium text-foreground">Nothing said yet</p>
              <p className="mt-1.5 text-muted-foreground max-w-[42ch] leading-relaxed">
                Start a session above and talk the way you would to a new employee on their first day.
              </p>
            </div>
          ) : (
            transcripts.map((entry) => {
              if (entry.sender === 'system') {
                return (
                  <p key={entry.id} className="text-center text-[11px] text-muted-foreground/80 py-0.5">
                    {entry.text}
                  </p>
                );
              }

              const isUser = entry.sender === 'user';

              return (
                <div
                  key={entry.id}
                  className={cn(
                    // Capped by measure rather than by a percentage: the panel
                    // is full width now, and a percentage would let a long
                    // turn run to an unreadable line length on a wide monitor.
                    'flex flex-col gap-1.5 max-w-[68ch]',
                    isUser ? 'self-end items-end' : 'self-start items-start',
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{isUser ? 'You' : 'ORA'}</span>
                    <span aria-hidden="true" className="text-muted-foreground/50">·</span>
                    <span className="tabular-nums">{entry.timestamp}</span>
                  </div>

                  {/*
                    The merchant's own words are the material being taught, so
                    they are the ones given a surface; ORA's replies sit on the
                    page, indented by a rule, as the quieter half of the record.
                  */}
                  <div
                    className={cn(
                      'text-xs leading-relaxed text-foreground',
                      isUser
                        ? 'px-3.5 py-2.5 rounded-md bg-surface-high/60 text-left'
                        : 'pl-3 border-l border-border/60 text-muted-foreground',
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
        <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-border/40">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={14} aria-hidden="true" className="text-muted-foreground flex-shrink-0" />
              <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
                What ORA learned
              </h2>
            </div>
            {organiseResult?.saved && organiseResult.saved.length > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                {organiseResult.saved.length} {organiseResult.saved.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>

          {organiseError ? (
            <div role="alert" className="mt-4 flex items-start gap-2 text-xs text-error">
              <AlertTriangle size={13} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">{organiseError}</p>
            </div>
          ) : organiseResult && organiseResult.saved.length === 0 ? (
            <div className="mt-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Nothing here was worth keeping</p>
              <p className="mt-1.5 leading-relaxed max-w-[62ch]">
                ORA keeps facts it can repeat to a shopper. Try a plain statement it could quote back:
                how many days a return takes, which courier you use, what a size 40 actually measures.
              </p>
            </div>
          ) : (
            // A list with rules, not a stack of cards inside a card. The title
            // is what the merchant recognises, so it leads at full weight and
            // the filing detail trails behind it.
            <>
              <ul className="mt-1 divide-y divide-border/40">
              {organiseResult?.saved.map((entry) => {
                const meta = DOC_TYPE_META[entry.docType] || { label: entry.docType, Icon: FileText };
                const action = ACTION_META[entry.action] || ACTION_META.unchanged;
                const EntryIcon = meta.Icon;

                return (
                  <li key={entry.id} className="flex items-start gap-3 py-3.5">
                    <EntryIcon
                      size={14}
                      aria-hidden="true"
                      className="mt-0.5 flex-shrink-0 text-muted-foreground/70"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground leading-snug">
                        {entry.title}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {meta.label}
                        <span aria-hidden="true" className="mx-1.5 text-muted-foreground/50">·</span>
                        <span className={cn('font-medium', action.className)}>{action.label}</span>
                        {entry.chunksCount ? (
                          <>
                            <span aria-hidden="true" className="mx-1.5 text-muted-foreground/50">·</span>
                            <span className="tabular-nums">
                              {entry.chunksCount} searchable {entry.chunksCount === 1 ? 'piece' : 'pieces'}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <span className="text-[11px] text-muted-foreground/80 tabular-nums flex-shrink-0 mt-0.5">
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  </li>
                );
              })}
              </ul>

              <p className="pt-3.5 mt-1 border-t border-border/40 text-[11px] text-muted-foreground leading-relaxed">
                {organiseResult?.method === 'model'
                  ? 'ORA split what you said by topic and filed each part on its own. Edit any of these from the knowledge list.'
                  : 'Sorted by keyword this time, so check the titles before you rely on them. Edit any of these from the knowledge list.'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
