'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  X,
  Activity,
  Bot,
  User,
  Zap,
  SlidersHorizontal,
  Radio,
  Brain,
  Compass,
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { searchRagCombinedApi } from '@/services/rag-service';
import { GeminiLiveClient } from '@/services/gemini-live-client';
import { LivingOrb, LivingOrbState } from '@/components/orb/living-orb';
import { useModalA11y } from '@/hooks/use-modal-a11y';

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
type VoiceMode = 'direct-live' | 'browser-speech';
type InspectorTab = 'transcript' | 'memory';

export function VoiceTestModal({ isOpen, onClose, publishableKey }: VoiceTestModalProps) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('direct-live');
  const [activeTab, setActiveTab] = useState<InspectorTab>('transcript');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => `ses_${Math.random().toString(36).substring(2, 9)}`);
  const [activeTools, setActiveTools] = useState<string[]>([
    'navigate_to_page',
    'find_products',
    'get_product_details',
    'add_to_cart',
    'place_order',
    'redirect_to_checkout',
    'search_knowledge_base',
    'get_store_policy',
    'update_customer_profile',
    'get_customer_profile',
  ]);

  // Direct Live Client Ref
  const directLiveClientRef = useRef<GeminiLiveClient | null>(null);
  const recognitionRef = useRef<any>(null);

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

  const speakWithBrowserTts = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    setStatus('speaking');
    utterance.onend = () => {
      setStatus('listening');
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  // Stop session
  const stopSession = useCallback(() => {
    if (directLiveClientRef.current) {
      try {
        directLiveClientRef.current.stop();
      } catch (e) {}
      directLiveClientRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setStatus('idle');
    setAudioLevel(0);
    addTranscript('system', 'Call ended.');
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
      if (!publishableKey) {
        setErrorMessage('Store publishable key is loading. Please try again in a second.');
        setStatus('error');
        return;
      }

      const freshSessionId = `ses_${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(freshSessionId);

      setStatus('connecting');
      setErrorMessage(null);
      addTranscript('system', 'Connecting to the ORA voice service…');

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const keyToUse = publishableKey;

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
        onLatency: (rtt) => {
          setLatencyMs(rtt);
        },
        onAction: (action) => {
          if (action?.type === 'navigate' && action.destination) {
            addTranscript('system', `⚡ Executing Navigation: ${action.destination} (${action.reason || 'Requested'})`);
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
      setErrorMessage(err.message || 'Failed to start voice call');
      addTranscript('system', `Error starting call: ${err.message}`);
    }
  };

  // Start Browser Speech Recognition Assistant Mode
  const startBrowserVoiceAssistant = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Browser Speech Recognition not supported in this browser. Please use Chrome/Edge.');
      setStatus('error');
      return;
    }

    try {
      setErrorMessage(null);
      setStatus('listening');
      addTranscript('system', 'Interactive Voice Assistant active! Speak your query...');

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setStatus('listening');
        addTranscript('system', 'Listening via browser microphone. Speak now...');
      };

      recognition.onresult = async (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const userText = lastResult[0].transcript.trim();
          if (!userText) return;

          addTranscript('user', userText);
          setStatus('thinking');

          try {
            const startT = performance.now();
            const ragRes = await searchRagCombinedApi({ query: userText, limit: 3 });
            const rtt = Math.round(performance.now() - startT);
            setLatencyMs(rtt);

            let answer = 'I found some details in your store catalog. How else can I assist you today?';
            if (ragRes && ragRes.knowledge && ragRes.knowledge.length > 0) {
              answer = `Based on your store knowledge: ${ragRes.knowledge[0].text.substring(0, 160)}...`;
            } else if (ragRes && ragRes.products && ragRes.products.length > 0) {
              answer = `Found matching items: ${ragRes.products.map((p) => p.text).slice(0, 2).join(', ')}.`;
            }

            addTranscript('agent', answer);
            speakWithBrowserTts(answer);
          } catch (e: any) {
            const fallback = 'I received your query and I am checking your store catalog. How can I help further?';
            addTranscript('agent', fallback);
            speakWithBrowserTts(fallback);
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.error('[BrowserRecognition] Error:', e.error);
        if (e.error !== 'no-speech') {
          setStatus('error');
          setErrorMessage(`Speech recognition error: ${e.error}`);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Failed to start browser voice');
      addTranscript('system', `Error: ${err.message}`);
    }
  };

  const handleStartSession = () => {
    if (voiceMode === 'direct-live') {
      startDirectLiveSession();
    } else {
      startBrowserVoiceAssistant();
    }
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
        className="relative w-full max-w-2xl bg-surface-lowest border border-border/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] my-auto"
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border/60 bg-surface-container/40 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-surface-high flex items-center justify-center border border-border/60 shadow-sm flex-shrink-0">
              <Radio size={15} className="text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 id="voice-test-modal-title" className="text-[14.5px] sm:text-[15.5px] font-semibold text-foreground tracking-tight truncate">
                Test ORA Live
              </h2>
              <p className="text-[11px] sm:text-[12px] font-mono text-muted-foreground truncate">
                Real-time multimodal speech & sales intelligence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close voice test modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content - Scrollable on small viewports */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 flex flex-col items-center gap-3.5 sm:gap-4 md:gap-5 min-h-0 custom-scrollbar">
          {/* Mode Switcher */}
          <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 p-1 rounded-xl bg-surface-container border border-border/50 flex-shrink-0">
            <button
              onClick={() => {
                stopSession();
                setVoiceMode('direct-live');
              }}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-[11.5px] sm:text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                voiceMode === 'direct-live'
                  ? 'bg-surface-high text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap size={13} className={voiceMode === 'direct-live' ? 'text-foreground dark:text-[#C8F031]' : ''} />
              <span>Gemini Live (direct)</span>
            </button>
            <button
              onClick={() => {
                stopSession();
                setVoiceMode('browser-speech');
              }}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-[11.5px] sm:text-[12.5px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                voiceMode === 'browser-speech'
                  ? 'bg-surface-high text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Browser STT/TTS</span>
            </button>
          </div>

          {/* Living Orb Visualizer */}
          <div className="relative flex items-center justify-center my-0 sm:my-0.5 flex-shrink-0">
            <LivingOrb
              size={105}
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
          <div className="w-full flex items-center justify-between gap-2 text-[11.5px] sm:text-[12.5px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-surface-container/50 border border-border/60 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  status === 'speaking' || status === 'listening'
                    ? 'bg-emerald-500 dark:bg-[#C8F031] animate-pulse shadow-[0_0_8px_rgba(200,240,49,0.7)]'
                    : status === 'connecting'
                    ? 'bg-amber-400 animate-ping'
                    : status === 'error'
                    ? 'bg-red-400'
                    : 'bg-muted-foreground/40'
                }`}
              />
              <span className="text-foreground/90 font-medium truncate">
                {status === 'idle' && 'Click Test ORA Live to speak with ORA'}
                {status === 'connecting' && 'Connecting audio stream…'}
                {status === 'listening' && 'ORA is listening... Speak clearly into your mic'}
                {status === 'speaking' && 'ORA is speaking in real-time...'}
                {status === 'thinking' && 'Searching store catalog & policies...'}
                {status === 'error' && (errorMessage || 'Connection error')}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {latencyMs !== null && (
                <span className="text-[10px] sm:text-[11px] font-mono text-foreground dark:text-[#C8F031] bg-surface-high dark:bg-[#C8F031]/10 px-1.5 sm:px-2 py-0.5 rounded border border-border dark:border-[#C8F031]/30 font-semibold">
                  {latencyMs}ms RTT
                </span>
              )}
            </div>
          </div>

          {/* Main Control Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {status === 'idle' || status === 'error' ? (
              <button
                onClick={handleStartSession}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold text-[13px] sm:text-[13.5px] flex items-center gap-2 bg-foreground text-background hover:opacity-90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <Play size={14} fill="currentColor" />
                <span>Test ORA Live</span>
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-red-500/20 border-red-500/40 text-red-500 dark:text-red-400'
                      : 'bg-surface-high border-border/80 text-foreground hover:bg-surface-highest'
                  }`}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <button
                  onClick={stopSession}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold text-[13px] sm:text-[13.5px] flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white active:scale-[0.98] transition-all shadow-md cursor-pointer"
                >
                  <Square size={14} fill="currentColor" />
                  <span>End Test</span>
                </button>
              </>
            )}
          </div>

          {/* Tabbed Inspector: Live Feed vs ORA Memory & Context */}
          <div className="w-full bg-surface-container/30 border border-border/60 rounded-xl p-3 sm:p-4 min-h-[160px] max-h-[240px] sm:max-h-[260px] h-48 sm:h-56 flex flex-col space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`text-[10.5px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeTab === 'transcript'
                      ? 'bg-surface-high text-foreground border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Activity size={12} className={activeTab === 'transcript' ? 'text-primary' : ''} />
                  <span>Live Transcript</span>
                </button>
                <button
                  onClick={() => setActiveTab('memory')}
                  className={`text-[10.5px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeTab === 'memory'
                      ? 'bg-surface-high text-foreground border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Brain size={12} className={activeTab === 'memory' ? 'text-primary' : ''} />
                  <span>Memory & State</span>
                </button>
              </div>

              <span className="text-[10px] sm:text-[11px] text-muted-foreground/70 font-mono truncate max-w-[100px] sm:max-w-none">
                {sessionId}
              </span>
            </div>

            {activeTab === 'transcript' ? (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11.5px] sm:text-[12.5px] min-h-0 custom-scrollbar">
                {transcripts.length === 0 ? (
                  <div className="h-full min-h-[80px] flex items-center justify-center text-muted-foreground/50 text-xs italic text-center px-4">
                    Live speech transcripts and catalog tool queries will stream here...
                  </div>
                ) : (
                  transcripts.map((item) => (
                    <div key={item.id} className="flex items-start gap-1.5 sm:gap-2 leading-relaxed">
                      <span className="text-[9.5px] sm:text-[10px] text-muted-foreground/60 font-mono mt-0.5 flex-shrink-0">
                        [{item.timestamp}]
                      </span>
                      {item.sender === 'user' ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 flex-shrink-0">
                          <User size={11} /> You:
                        </span>
                      ) : item.sender === 'agent' ? (
                        <span className="text-emerald-600 dark:text-[#C8F031] font-semibold flex items-center gap-1 flex-shrink-0">
                          <Bot size={11} /> ORA:
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono text-[11px] flex-shrink-0">⚡</span>
                      )}
                      <span
                        className={`break-words flex-1 ${
                          item.sender === 'agent'
                            ? 'text-foreground'
                            : item.sender === 'user'
                            ? 'text-foreground/90'
                            : 'text-muted-foreground italic'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-2.5 pr-1 text-[11px] sm:text-[12px] font-mono min-h-0 custom-scrollbar">
                {/* Identity Block */}
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-lowest border border-border/50">
                  <div className="text-[10.5px] sm:text-[11px] font-semibold text-foreground/90 flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={12} className="text-primary flex-shrink-0" /> Active Identity & Role
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground text-[11px]">
                    <div>User: <span className="text-foreground">Authenticated Merchant Owner</span></div>
                    <div className="truncate">Key: <span className="text-foreground font-mono">{publishableKey ? `${publishableKey.slice(0, 14)}...` : 'Active'}</span></div>
                  </div>
                </div>

                {/* Telemetry & Browsing State */}
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-lowest border border-border/50">
                  <div className="text-[10.5px] sm:text-[11px] font-semibold text-foreground/90 flex items-center gap-1.5 mb-1">
                    <Compass size={12} className="text-primary flex-shrink-0" /> Live Browsing Telemetry
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground text-[11px]">
                    <div>Route: <span className="text-foreground font-semibold">/agent</span></div>
                    <div>Section: <span className="text-foreground">Agent Testing Workspace</span></div>
                  </div>
                </div>

                {/* Preloaded Knowledge & Tools */}
                <div className="p-2 sm:p-2.5 rounded-lg bg-surface-lowest border border-border/50">
                  <div className="text-[10.5px] sm:text-[11px] font-semibold text-foreground/90 flex items-center gap-1.5 mb-1">
                    <Database size={12} className="text-primary flex-shrink-0" /> Preloaded Memory & Tools
                  </div>
                  <div className="text-muted-foreground space-y-1 text-[11px]">
                    <div className="flex items-center gap-1 text-emerald-500 dark:text-[#C8F031]">
                      <CheckCircle2 size={11} className="flex-shrink-0" />
                      <span>Fast-path catalog inventory & store policies preloaded</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {activeTools.map((tool) => (
                        <span
                          key={tool}
                          className="px-1.5 py-0.5 rounded bg-surface-high border border-border/60 text-[10px] sm:text-[10.5px] text-foreground/80"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
