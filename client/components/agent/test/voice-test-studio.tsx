'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  RotateCcw,
  Send,
  Radio,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  HelpCircle,
  ShoppingBag,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { GeminiLiveClient } from '@/services/gemini-live-client';
import { LivingOrb, LivingOrbState } from '@/components/orb/living-orb';
import { MicrophoneBlockedNotice } from '@/components/voice/microphone-blocked-notice';
import { isMicrophoneBlockedByPolicy } from '@/lib/voice/microphone-access';
import { getSessionStrategy } from '@/lib/session';
import { getVoiceTicketApi } from '@/services/voice-service';
import { useStickToBottom } from '@/hooks/use-stick-to-bottom';
import { cn } from '@/lib/utils';

interface VoiceTestStudioProps {
  publishableKey?: string | null;
  onSwitchToTrain?: () => void;
}

interface TranscriptEntry {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
}

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error';

const SUGGESTED_QUERIES = [
  { label: 'Return & refund policy', query: 'What is your return and refund policy?' },
  { label: 'Shipping timelines', query: 'How long does delivery take and which carriers do you use?' },
  { label: 'Discounts & promotions', query: 'Are there any active promo codes or bundle discounts?' },
  { label: 'Exchange procedure', query: 'How can I exchange a product if the size is wrong?' },
];

export function VoiceTestStudio({ publishableKey, onSwitchToTrain }: VoiceTestStudioProps) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [textInput, setTextInput] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>(() => `test_${Math.random().toString(36).substring(2, 9)}`);

  const directLiveClientRef = useRef<GeminiLiveClient | null>(null);
  const { ref: messageListRef, onScroll: onMessageListScroll } =
    useStickToBottom<HTMLDivElement>(transcripts);

  const addTranscript = useCallback((sender: 'user' | 'agent' | 'system', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTranscripts((prev) => [...prev, { id: Math.random().toString(), sender, text, timestamp: time }]);
  }, []);

  const stopSession = useCallback(() => {
    if (directLiveClientRef.current) {
      try {
        directLiveClientRef.current.stop();
      } catch (e) {
        console.error('Error stopping live client:', e);
      }
      directLiveClientRef.current = null;
    }
    setStatus('idle');
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    setMicBlocked(isMicrophoneBlockedByPolicy());
    return () => {
      stopSession();
    };
  }, [stopSession]);

  const startSession = async (): Promise<GeminiLiveClient | null> => {
    try {
      let keyToUse = publishableKey;
      if (!keyToUse) {
        const session = await getSessionStrategy().getSession().catch(() => null);
        keyToUse = session?.business?.publishableKey || undefined;
      }

      if (!keyToUse) {
        setErrorMessage('Store publishable key is loading. Please try again in a moment.');
        setStatus('error');
        return null;
      }

      stopSession();
      setErrorMessage(null);
      setStatus('connecting');

      const freshSessionId = `test_${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(freshSessionId);

      // A `test` ticket makes ORA meet the owner as an anonymous shopper, keeps
      // the session out of their listings and usage, and still works while the
      // widget is switched off. The context is a shopper landing on the
      // storefront home page, not this dashboard page, so ORA cannot tell it is
      // being tested.
      const ticket = await getVoiceTicketApi('test');
      const client = new GeminiLiveClient({
        publishableKey: keyToUse,
        sessionId: freshSessionId,
        ticket,
        clientContext: {
          currentPath: '/',
          title: '',
          history: ['/'],
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
        },
        onTranscript: (sender, text) => {
          addTranscript(sender, text);
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onError: (err) => {
          setErrorMessage(err);
          setStatus('error');
        },
      });

      directLiveClientRef.current = client;
      await client.start();
      addTranscript('system', 'Connected to ORA storefront sales agent. Speak or type to test.');
      return client;
    } catch (err: any) {
      console.error('[VoiceTestStudio] Setup error:', err);
      setErrorMessage(err.message || 'Voice stream failed to initialize. Please check microphone permissions.');
      setStatus('error');
      return null;
    }
  };

  const handleToggleVoice = async () => {
    if (status === 'connecting') return;
    if (micBlocked) return;

    if (status === 'idle' || status === 'error') {
      await startSession();
    } else {
      stopSession();
      addTranscript('system', 'Test session ended.');
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (directLiveClientRef.current) {
      directLiveClientRef.current.setMuted(nextMuted);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    let client = directLiveClientRef.current;
    if (!client || status === 'idle' || status === 'error') {
      client = await startSession();
      if (!client) return;
    }

    addTranscript('user', text);
    client.sendTextMessage(text);
    setTextInput('');
  };

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSendMessage(textInput);
  };

  const handleClearTranscript = () => {
    setTranscripts([]);
  };

  const isActive = status === 'listening' || status === 'speaking' || status === 'thinking' || status === 'connected';

  return (
    <div className="space-y-4">
      {/* ── 1. Interactive Test Console Card ── */}
      <div className="rounded-md border border-border/60 bg-surface-lowest/40 p-5 sm:p-6 space-y-4 relative overflow-hidden">
        {/* Ambient background glow when speaking/listening */}
        <div
          className={cn(
            'absolute inset-0 pointer-events-none transition-opacity duration-700 rounded-md',
            isActive ? 'opacity-15' : 'opacity-0',
          )}
          style={{
            background:
              status === 'speaking'
                ? 'radial-gradient(circle at 50% 30%, var(--primary) 0%, transparent 60%)'
                : 'radial-gradient(circle at 50% 30%, var(--status-online) 0%, transparent 60%)',
          }}
        />

        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3.5 border-b border-border/40 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2 h-2 rounded-full flex-shrink-0',
                status === 'speaking' || status === 'listening'
                  ? 'bg-primary animate-pulse'
                  : status === 'connecting'
                    ? 'bg-warning animate-ping'
                    : status === 'error'
                      ? 'bg-error'
                      : 'bg-muted-foreground/50',
              )}
            />
            <h2 className="text-[13.5px] font-semibold text-foreground tracking-tight">
              Storefront Customer Simulation
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {status === 'speaking'
                ? '• ORA Speaking'
                : status === 'listening'
                  ? '• Listening to shopper'
                  : status === 'thinking'
                    ? '• Processing knowledge'
                    : status === 'connecting'
                      ? '• Connecting…'
                      : '• Ready'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isActive && (
              <>
                <button
                  type="button"
                  onClick={toggleMute}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer',
                    isMuted
                      ? 'bg-error/10 border-error/30 text-error'
                      : 'bg-surface-high border-border text-foreground hover:bg-surface-high/80',
                  )}
                >
                  {isMuted ? <MicOff size={11} /> : <Mic size={11} />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopSession();
                    addTranscript('system', 'Session ended.');
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface-high hover:bg-error/10 hover:text-error border border-border transition-colors flex items-center gap-1 text-muted-foreground cursor-pointer"
                >
                  <Square size={11} />
                  <span>End</span>
                </button>
              </>
            )}

            {transcripts.length > 0 && (
              <button
                type="button"
                onClick={handleClearTranscript}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1 cursor-pointer"
              >
                <RotateCcw size={11} />
                <span>Reset chat</span>
              </button>
            )}
          </div>
        </div>

        {micBlocked && <MicrophoneBlockedNotice className="relative z-10" />}

        {/* Center: Living Orb + Quick Voice Trigger */}
        <div className="relative z-10 flex flex-col items-center justify-center py-2 text-center">
          <div className="relative my-2">
            <LivingOrb
              size={110}
              voiceState={status === 'connected' ? 'active' : (status as LivingOrbState)}
              energyLevel={audioLevel}
              onClick={handleToggleVoice}
              ariaLabel={isActive ? 'End Test Conversation' : 'Start Testing ORA'}
              title={isActive ? 'Click to stop test' : 'Click to talk to ORA'}
            />
          </div>

          <p className="text-[12.5px] font-medium text-foreground mt-2">
            {status === 'speaking'
              ? 'ORA is responding in real time…'
              : status === 'listening'
                ? 'Listening… Ask anything about your store'
                : status === 'connecting'
                  ? 'Connecting live audio stream…'
                  : 'Click the orb or press Start Talking to test'}
          </p>
          {/* <p className="text-[11.5px] text-muted-foreground mt-0.5 max-w-md">
            Simulates a real customer visiting your storefront. ORA answers using your store persona, policies, and product catalog.
          </p> */}

          <div className="mt-4 flex items-center gap-2.5">
            {!isActive ? (
              <button
                type="button"
                onClick={handleToggleVoice}
                disabled={micBlocked}
                className="px-4 py-2 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Mic size={13} />
                <span>Start Talking</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleVoice}
                className="px-4 py-2 rounded-md text-[12px] font-semibold bg-surface-high border border-border text-foreground hover:bg-surface-high/80 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Square size={13} />
                <span>Stop Conversation</span>
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="mt-3 p-2.5 rounded-md bg-error/10 border border-error/20 text-xs text-error max-w-md">
              {errorMessage}
            </div>
          )}
        </div>

        {/* ── Suggested Shopper Prompts ── */}
        <div className="relative z-10 pt-3 border-t border-border/40 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles size={11} className="text-primary" />
            <span>Test Common Shopper Questions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUERIES.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => void handleSendMessage(item.query)}
                className="px-2.5 py-1.5 rounded-md text-[11.5px] font-medium bg-surface-high/60 border border-border/50 text-foreground hover:bg-surface-high hover:border-foreground/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>{item.label}</span>
                <ArrowRight size={10} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Live Conversation Dialogue Thread ── */}
      <div className="rounded-md border border-border/60 bg-transparent p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-primary flex-shrink-0" />
            <h3 className="text-[13.5px] font-semibold text-foreground tracking-tight">
              Test Conversation
            </h3>
            {transcripts.length > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">({transcripts.length})</span>
            )}
          </div>

          <span className="text-[11px] text-muted-foreground/80 font-mono tabular-nums">
            Session: {sessionId}
          </span>
        </div>

        {/* Messages container */}
        <div
          ref={messageListRef}
          onScroll={onMessageListScroll}
          className="space-y-3 min-h-[180px] max-h-[340px] overflow-y-auto pr-1 no-scrollbar"
        >
          {transcripts.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground select-none">
              <ShoppingBag size={22} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-medium text-foreground">No test messages yet.</p>
              <p className="text-[11.5px] mt-1 text-muted-foreground/70">
                Press Start Talking or click any test question above to see how ORA responds.
              </p>
            </div>
          ) : (
            transcripts.map((entry) => {
              if (entry.sender === 'system') {
                return (
                  <div key={entry.id} className="text-center my-1.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-[3px] text-[10.5px] bg-surface-low border border-border/40 text-muted-foreground">
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
                    'flex flex-col gap-1 max-w-[88%]',
                    isUser ? 'self-end items-end ml-auto' : 'self-start items-start',
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      className={cn(
                        'font-medium',
                        isUser ? 'text-foreground' : 'text-foreground dark:text-[#C8F031]',
                      )}
                    >
                      {isUser ? 'You (Shopper)' : 'ORA'}
                    </span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="tabular-nums text-[10.5px]">{entry.timestamp}</span>
                  </div>

                  <div
                    className={cn(
                      'p-3.5 rounded-md text-[12.5px] leading-relaxed border',
                      isUser
                        ? 'bg-surface-high/60 border-border/70 text-foreground'
                        : 'bg-surface-low/60 border-border/60 text-foreground',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{entry.text}</p>

                    {!isUser && (
                      <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                        <CheckCircle2 size={11} className="text-primary" />
                        <span>Store Knowledge &amp; Catalog active</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Text Input Bar ── */}
        <form onSubmit={handleSubmitText} className="pt-2 border-t border-border/40 flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a shopper question or click a prompt above…"
            className="flex-1 p-2.5 text-xs rounded-md bg-surface-low border border-border/60 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-foreground leading-relaxed"
          />

          <button
            type="submit"
            disabled={!textInput.trim()}
            className="px-3 py-2.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Send size={12} />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* ── 3. Footer Bridge to Training ── */}
      {onSwitchToTrain && (
        <div className="rounded-md border border-border/50 bg-surface-lowest/30 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen size={13} className="text-foreground flex-shrink-0" />
            <span>Need to update a policy or teach ORA something new?</span>
          </div>

          <button
            type="button"
            onClick={onSwitchToTrain}
            className="text-foreground dark:text-[#C8F031] hover:underline font-semibold flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0"
          >
            <span>Train Knowledge</span>
            <ArrowRight size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
