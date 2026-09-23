'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  X,
  Activity,
  User,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { GeminiLiveClient } from '@/services/gemini-live-client';
import { LivingOrb, LivingOrbState } from '@/components/orb/living-orb';
import { useModalA11y } from '@/hooks/use-modal-a11y';
import { MicrophoneBlockedNotice } from '@/components/voice/microphone-blocked-notice';
import { isMicrophoneBlockedByPolicy } from '@/lib/voice/microphone-access';
import { getSessionStrategy } from '@/lib/session';
import { useRouter } from 'next/navigation';

interface VoiceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Null while the merchant's real key is still loading, or if it failed to load. */
  publishableKey?: string | null;
}

interface TranscriptEntry {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
}

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error';

export function VoiceTestModal({ isOpen, onClose, publishableKey }: VoiceTestModalProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Resolved on open rather than at module scope: it reads the document's
  // Permissions Policy, which does not exist during server rendering.
  const [micBlocked, setMicBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>(() => `ses_${Math.random().toString(36).substring(2, 9)}`);

  // Direct Live Client Ref
  const directLiveClientRef = useRef<GeminiLiveClient | null>(null);

  // Auto-scroll transcript log
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [transcripts]);

  const addTranscript = useCallback((sender: 'user' | 'agent' | 'system', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTranscripts((prev) => [...prev, { id: Math.random().toString(), sender, text, timestamp: time }]);
  }, []);

  // Stop session
  const stopSession = useCallback(() => {
    if (directLiveClientRef.current) {
      try {
        directLiveClientRef.current.stop();
      } catch (e) {}
      directLiveClientRef.current = null;
    }

    setStatus('idle');
    setAudioLevel(0);
    addTranscript('system', 'Session ended.');
  }, [addTranscript]);

  // Clean up on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopSession();
    }
    return () => {
      stopSession();
    };
  }, [isOpen, stopSession]);

  // Escape and scroll lock were handled here by hand; the shared hook adds the focus
  // trap and focus restore this dialog was missing, and keeps all five dialogs
  // behaving identically.
  const dialogRef = useModalA11y(isOpen, onClose);

  // Start Direct Live Session
  const startDirectLiveSession = async () => {
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

      const freshSessionId = `ses_${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(freshSessionId);

      setStatus('connecting');
      setErrorMessage(null);
      addTranscript('system', 'Connecting to the ORA voice service…');

      const sessionToken = await getSessionStrategy().getToken().catch(() => null);
      const token = sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);

      const client = new GeminiLiveClient({
        publishableKey: keyToUse,
        sessionId: freshSessionId,
        authToken: token || undefined,
        clientContext: {
          currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
          title: typeof document !== 'undefined' ? document.title : 'ORA Platform',
          history: [typeof window !== 'undefined' ? window.location.pathname : '/'],
          activeSection: 'Agent Testing Workspace',
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus as SessionStatus);
          if (newStatus === 'listening') {
            addTranscript('system', 'Connected! Start speaking to test ORA.');
          }
        },
        onTranscript: (sender, text) => {
          addTranscript(sender as 'user' | 'agent' | 'system', text);
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
        onAction: (action) => {
          if (action?.type === 'navigate' && action.destination) {
            const dest = action.destination.trim();
            addTranscript('system', `⚡ Navigating to: ${dest}`);
            if (typeof window !== 'undefined' && dest.startsWith('/')) {
              router.push(dest);
            }
          }
          if (action?.type === 'open_quick_setup') {
            addTranscript('system', '⚡ Launching Quick Setup wizard...');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('ora:quick-setup-open-request'));
            }
          }
          if (action?.type === 'shopify_add_to_cart') {
            // The real add runs in the storefront widget, not here. Say so, so a test
            // run is never mistaken for proof that the merchant's cart works.
            addTranscript(
              'system',
              `🛒 Storefront cart add requested (variant ${action.variantId}, qty ${action.quantity ?? 1}). Not executed: the cart only exists on the merchant storefront.`,
            );
          }
        },
        onError: (err) => {
          setStatus('error');
          setErrorMessage(err);
          addTranscript('system', `Error: ${err}`);
        },
      });

      directLiveClientRef.current = client;
      await client.start();
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to start voice session');
      addTranscript('system', `Error starting session: ${err.message}`);
    }
  };



  const handleStartSession = () => {
    // Both modes capture the microphone, so a policy block rules out either.
    if (micBlocked) return;
    startDirectLiveSession();
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (directLiveClientRef.current) {
        directLiveClientRef.current.setMuted(next);
      }
      return next;
    });
  };

  useEffect(() => {
    if (isOpen) setMicBlocked(isMicrophoneBlockedByPolicy());
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-test-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-2xl bg-surface-lowest border border-border/80 rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] my-auto"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border/60 bg-surface-container/40 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-surface-high flex items-center justify-center border border-border/60 shadow-xs flex-shrink-0">
              <Radio size={15} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h2 id="voice-test-modal-title" className="text-[14px] sm:text-[15px] font-semibold text-foreground tracking-tight truncate">
                Test Voice Assistant
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                Real-time storefront voice conversation session
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close voice test modal"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Content - Scrollable on small viewports */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 flex flex-col items-center gap-3.5 sm:gap-4 md:gap-5 min-h-0 custom-scrollbar">
          {/* Living Orb Visualizer */}
          <div className="relative flex items-center justify-center my-1 flex-shrink-0">
            <LivingOrb
              size={110}
              voiceState={status === 'connected' ? 'active' : (status as LivingOrbState)}
              energyLevel={audioLevel}
              onClick={() => {
                if (status === 'idle' || status === 'error') {
                  handleStartSession();
                } else {
                  stopSession();
                }
              }}
              title={status === 'idle' ? 'Click to Test ORA Live' : 'Click to End Test'}
            />
          </div>

          {/* Status Bar */}
          <div className="w-full flex items-center justify-between gap-2 text-[12px] px-3.5 py-2.5 rounded-md bg-surface-container/60 border border-border/60 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  status === 'speaking' || status === 'listening'
                    ? 'bg-emerald-500 dark:bg-[#C8F031] animate-pulse'
                    : status === 'connecting'
                    ? 'bg-amber-400 animate-ping'
                    : status === 'error'
                    ? 'bg-red-400'
                    : 'bg-muted-foreground/40'
                }`}
              />
              <span className="text-foreground/90 font-medium truncate">
                {status === 'idle' && 'Click Test ORA Live to start customer voice simulation'}
                {status === 'connecting' && 'Connecting audio stream…'}
                {status === 'listening' && 'ORA is listening… Speak as a storefront customer'}
                {status === 'speaking' && 'ORA is speaking in real time…'}
                {status === 'thinking' && 'Searching store catalog & policies…'}
                {status === 'error' && (errorMessage || 'Connection error')}
              </span>
            </div>

            <span className="text-[10.5px] text-muted-foreground/70 font-mono flex-shrink-0">
              {sessionId}
            </span>
          </div>

          {/* Main Control Buttons */}
          {micBlocked && <MicrophoneBlockedNotice className="flex-shrink-0" />}

          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {micBlocked ? null : status === 'idle' || status === 'error' ? (
              <button
                onClick={handleStartSession}
                className="px-5 py-2 rounded-md font-semibold text-[13px] flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98] transition-all shadow-xs cursor-pointer"
              >
                <Play size={13} fill="currentColor" />
                <span>Test ORA Live</span>
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-md font-semibold text-[12px] flex items-center gap-2 border transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-error/10 text-error border-error/30'
                      : 'bg-surface-high text-foreground border-border hover:bg-surface-high/80'
                  }`}
                >
                  {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  onClick={stopSession}
                  className="px-4 py-2 rounded-md font-semibold text-[12px] flex items-center gap-2 bg-surface-high hover:bg-error/10 hover:text-error text-muted-foreground border border-border transition-all cursor-pointer"
                >
                  <Square size={13} fill="currentColor" />
                  <span>End Test</span>
                </button>
              </>
            )}
          </div>

          {/* Suggested Shopper Prompts */}
          <div className="w-full flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {[
              'What is your return policy?',
              'How long does shipping take?',
              'Do you offer any discounts?',
            ].map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => {
                  if (status === 'idle' || status === 'error') {
                    handleStartSession();
                  }
                  if (directLiveClientRef.current) {
                    addTranscript('user', query);
                    directLiveClientRef.current.sendTextMessage(query);
                  }
                }}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-surface-high/50 border border-border/50 text-foreground hover:bg-surface-high transition-colors cursor-pointer"
              >
                {query}
              </button>
            ))}
          </div>

          {/* Conversation Panel */}
          <div className="w-full bg-surface-container/30 border border-border/60 rounded-md p-3.5 min-h-[160px] max-h-[260px] h-52 flex flex-col space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Activity size={12} className="text-primary" />
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                  Live Conversation
                </span>
                {transcripts.length > 0 && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">({transcripts.length})</span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[10.5px] text-emerald-500 font-medium">
                <CheckCircle2 size={11} />
                <span>Store Knowledge Grounding Active</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-[12px] min-h-0 custom-scrollbar">
              {transcripts.length === 0 ? (
                <div className="h-full min-h-[100px] flex flex-col items-center justify-center text-muted-foreground/60 text-xs text-center px-4">
                  <p className="font-medium text-foreground">Ready to test storefront dialogue.</p>
                  <p className="text-[11px] mt-0.5">Click Test ORA Live or a prompt above to speak with ORA.</p>
                </div>
              ) : (
                transcripts.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-[9.5px] text-muted-foreground/60 tabular-nums mt-0.5 flex-shrink-0">
                      [{item.timestamp}]
                    </span>
                    {item.sender === 'user' ? (
                      <span className="text-foreground font-semibold flex items-center gap-1 flex-shrink-0">
                        <User size={11} /> You:
                      </span>
                    ) : item.sender === 'agent' ? (
                      <span className="text-foreground dark:text-[#C8F031] font-semibold flex items-center gap-1 flex-shrink-0">
                        <Radio size={11} className="text-primary" /> ORA:
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px] flex-shrink-0">•</span>
                    )}
                    <span
                      className={`break-words flex-1 ${
                        item.sender === 'agent'
                          ? 'text-foreground'
                          : item.sender === 'user'
                          ? 'text-foreground/90'
                          : 'text-muted-foreground text-[11px]'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
