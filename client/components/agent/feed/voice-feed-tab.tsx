'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  RefreshCw,
  SlidersHorizontal,
  Zap,
  Radio,
  Trash2,
  Save,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { searchRagCombinedApi } from '@/services/rag-service';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';
import { cn } from '@/lib/utils';
import { GeminiLiveClient } from '@/services/gemini-live-client';
import { LivingOrb, LivingOrbState } from '@/components/orb/living-orb';

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
type VoiceMode = 'gemini-live' | 'speech-ai';

export function VoiceFeedTab({ publishableKey, onFed }: VoiceFeedTabProps) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('gemini-live');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [sessionId] = useState<string>(() => `ses_${Math.random().toString(36).substring(2, 9)}`);

  // Saving state for note archiving
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [savedNoteSuccess, setSavedNoteSuccess] = useState<boolean>(false);

  // Direct Client Ref
  const directClientRef = useRef<GeminiLiveClient | null>(null);

  // Fallback WebSockets and Audio Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Append log entry helper
  const addTranscript = useCallback((sender: 'user' | 'agent' | 'system', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTranscripts((prev) => [...prev, { id: Math.random().toString(), sender, text, timestamp: time }]);
  }, []);

  // Intelligently merge streaming text chunks
  const mergeStreaming = (prevText: string, incomingChunk: string): string => {
    if (!incomingChunk) return prevText;
    if (!prevText) return incomingChunk.trimStart();
    if (incomingChunk.startsWith(prevText)) return incomingChunk;
    if (prevText.endsWith(incomingChunk.trim()) && incomingChunk.trim().length > 3) return prevText;

    const isPunctuation = /^[,.!?:;'")\]}]/.test(incomingChunk);
    const isContraction = /^'(s|t|re|ve|m|ll|d)\b/i.test(incomingChunk) || /^n't\b/i.test(incomingChunk);
    const prevEndsWithSpace = prevText.endsWith(' ') || prevText.endsWith('\n');
    const chunkStartsWithSpace = incomingChunk.startsWith(' ') || incomingChunk.startsWith('\n');

    let merged = '';
    if (isPunctuation || isContraction) {
      merged = `${prevText.trimEnd()}${incomingChunk.trimStart()}`;
    } else if (prevEndsWithSpace || chunkStartsWithSpace) {
      merged = `${prevText.trimEnd()} ${incomingChunk.trimStart()}`;
    } else {
      const prevEndsWithPunctuation = /[.!?]$/.test(prevText);
      const chunkStartsCapital = /^[A-Z0-9]/.test(incomingChunk);
      merged = (prevEndsWithPunctuation || chunkStartsCapital) ? `${prevText} ${incomingChunk}` : `${prevText}${incomingChunk}`;
    }
    return merged.replace(/[ \t]+/g, ' ').replace(/ ([.,!?:;])/g, '$1').replace(/ \'/g, "'");
  };

  // Helper: Convert Float32 audio to Int16 Base64
  const float32ToInt16Base64 = (float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    let binary = '';
    const bytes = new Uint8Array(int16Array.buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper: Convert Base64 PCM24k to AudioBuffer & Play
  const playPcm24kBase64 = useCallback((base64Pcm: string) => {
    try {
      if (!audioCtxRef.current) return;
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const numSamples = int16Array.length;
      const float32Array = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 32768 : 32767);
      }

      const audioBuffer = audioCtx.createBuffer(1, numSamples, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      sourceNode.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      setStatus('speaking');
      sourceNode.onended = () => {
        if (audioCtxRef.current && audioCtxRef.current.currentTime >= nextPlayTimeRef.current - 0.05) {
          setStatus('listening');
        }
      };
    } catch (err: any) {
      console.error('[VoiceAssistant] Playback error:', err);
    }
  }, []);

  // Browser Speech Synthesis Assistant Mode (Fallback)
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

  // Handle Socket message packet decoding
  const handleSocketMessage = useCallback((event: MessageEvent) => {
    const rawData = event.data;
    if (typeof rawData !== 'string') return;

    if (rawData.startsWith('0')) {
      wsRef.current?.send('40/voice,');
      return;
    }

    if (rawData.startsWith('40/voice,')) {
      setStatus('connected');
      addTranscript('system', 'Connected to ORA Voice Stream. Initializing session...');
      const startPayload = JSON.stringify([
        'start-voice-session',
        { publishableKey, sessionId },
      ]);
      wsRef.current?.send(`42/voice,${startPayload}`);
      return;
    }

    if (rawData.startsWith('42/voice,')) {
      try {
        const jsonStr = rawData.substring('42/voice,'.length);
        const [eventName, payload] = JSON.parse(jsonStr);

        if (eventName === 'voice-session-started') {
          setStatus('listening');
          addTranscript('system', 'ORA Voice Assistant active. Speak into your microphone.');
        } else if (eventName === 'audio-stream') {
          if (payload?.audio) {
            playPcm24kBase64(payload.audio);
          }
        } else if (eventName === 'text-stream') {
          if (payload?.text) {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'agent') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: mergeStreaming(last.text, payload.text) },
                ];
              }
              const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return [...prev, { id: Math.random().toString(), sender: 'agent', text: payload.text.trimStart(), timestamp: time }];
            });
          }
        } else if (eventName === 'user-text-stream') {
          if (payload?.text) {
            setTranscripts((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'user') {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: mergeStreaming(last.text, payload.text) },
                ];
              }
              const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return [...prev, { id: Math.random().toString(), sender: 'user', text: payload.text.trimStart(), timestamp: time }];
            });
          }
        } else if (eventName === 'voice-error') {
          const msg = payload?.message || 'Voice connection error';
          setErrorMessage(msg);
          setStatus('error');
          addTranscript('system', `Error: ${msg}`);

          // Automatic fallback if bidi streaming is unsupported on current key
          if (msg.includes('code: 1008') || msg.includes('not supported for bidiGenerateContent')) {
            addTranscript('system', 'Switched to interactive voice speech mode. Click microphone to talk!');
            setVoiceMode('speech-ai');
          }
        } else if (eventName === 'voice-session-ended') {
          setStatus('idle');
          addTranscript('system', 'Voice session ended.');
        }
      } catch (err) {
        console.error('[VoiceAssistant] Failed to parse socket message:', err);
      }
    }
  }, [publishableKey, sessionId, addTranscript, playPcm24kBase64]);

  // Clean up recording and connections
  const stopSession = useCallback(() => {
    if (directClientRef.current) {
      directClientRef.current.stop();
      directClientRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.send('42/voice,["stop-voice-session",{}]');
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    setStatus('idle');
    setAudioLevel(0);
  }, []);

  // Start Browser Speech Recognition Assistant Mode
  const startBrowserVoiceAssistant = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('Browser speech recognition not supported. Please use Chrome or Edge.');
      setStatus('error');
      return;
    }

    try {
      setErrorMessage(null);
      setStatus('listening');
      addTranscript('system', 'Interactive Voice Assistant active. Speak your query...');

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = async (event: any) => {
        const lastIdx = event.results.length - 1;
        const speechText = event.results[lastIdx][0].transcript;
        if (!speechText.trim()) return;

        addTranscript('user', speechText);
        setStatus('speaking');

        try {
          // Perform RAG search for store product & policy info
          const ragResult = await searchRagCombinedApi({ query: speechText, limit: 3 });
          let answerText = "I found matching information for you in the store database.";

          if (ragResult.products.length > 0) {
            const p = ragResult.products[0];
            const pTitle = p.metadata?.title || p.text;
            const pPrice = p.metadata?.price ? `$${p.metadata.price}` : '';
            answerText = `We have ${pTitle} ${pPrice ? `priced at ${pPrice}` : ''}.`;
          } else if (ragResult.knowledge.length > 0) {
            answerText = ragResult.knowledge[0].text;
          } else {
            answerText = `I heard your query: "${speechText}". ORA is ready to assist shoppers with store catalog, shipping, and returns.`;
          }

          addTranscript('agent', answerText);
          speakWithBrowserTts(answerText);
        } catch (err: any) {
          console.error('[VoiceAssistant] Search error:', err);
          addTranscript('agent', `I heard: "${speechText}".`);
          speakWithBrowserTts(`I heard: "${speechText}".`);
        }
      };

      recognition.onerror = (err: any) => {
        console.error('[VoiceAssistant] Speech recognition error:', err);
        if (err.error !== 'no-speech') {
          addTranscript('system', `Notice: ${err.error}`);
        }
      };

      recognition.onend = () => {
        if (status !== 'idle' && recognitionRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start microphone speech recognition.');
      setStatus('error');
    }
  };

  // Start Real-time Direct Gemini Live Voice Stream Session
  const startGeminiLiveSession = async () => {
    try {
      if (!publishableKey) {
        setErrorMessage('Store publishable key is loading. Please try again in a second.');
        setStatus('error');
        return;
      }

      stopSession();
      setErrorMessage(null);
      setStatus('connecting');

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const keyToUse = publishableKey;

      const client = new GeminiLiveClient({
        publishableKey: keyToUse,
        sessionId,
        authToken: token || undefined,
        onStatusChange: (newStatus) => setStatus(newStatus),
        onTranscript: (sender, text) => addTranscript(sender, text),
        onAudioLevel: (level) => setAudioLevel(level),
        onError: (err) => {
          setErrorMessage(err);
          setStatus('error');
        },
      });

      directClientRef.current = client;
      await client.start();
    } catch (err: any) {
      console.error('[VoiceAssistant] Direct session setup error:', err);
      setErrorMessage(err.message || 'Direct voice stream failed to initialize.');
      setStatus('error');
    }
  };

  const handleToggleVoice = () => {
    if (status === 'connecting') return;
    if (status === 'idle' || status === 'error') {
      if (voiceMode === 'gemini-live') {
        startGeminiLiveSession();
      } else {
        startBrowserVoiceAssistant();
      }
    } else {
      stopSession();
    }
  };

  // Save the current transcript as a store knowledge note
  const handleSaveToKnowledge = async () => {
    const userMessages = transcripts
      .filter((t) => t.sender === 'user' || t.sender === 'agent')
      .map((t) => `${t.sender === 'user' ? 'Merchant' : 'ORA'}: ${t.text}`)
      .join('\n');

    if (!userMessages.trim()) return;

    setIsSavingNote(true);
    try {
      await createKnowledgeDocApi({
        title: `Voice Note - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        docType: DocType.BRAND_RULE,
        content: userMessages,
        metadata: { source: 'voice_feed' },
      });
      setSavedNoteSuccess(true);
      setTimeout(() => setSavedNoteSuccess(false), 3000);
      if (onFed) onFed();
    } catch (err) {
      console.error('Failed to save voice note to knowledge base:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  const isActive = status === 'listening' || status === 'speaking' || status === 'connecting';

  return (
    <div className="space-y-6">
      {/* ── Mic orb Card ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-6 relative flex flex-col items-center justify-center text-center">
        {/* Ambient glow — very subtle */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-700 rounded-md ${isActive ? 'opacity-10' : 'opacity-0'}`}
          style={{
            background:
              status === 'speaking'
                ? 'radial-gradient(circle at center, var(--primary) 0%, transparent 70%)'
                : 'radial-gradient(circle at center, var(--status-warning) 0%, transparent 70%)',
          }}
        />

        {/* Central Living Crystal Fluid Wave Orb */}
        <div className="relative flex flex-col items-center justify-center my-4">
          <LivingOrb
            size={110}
            voiceState={status === 'connected' ? 'active' : (status as LivingOrbState)}
            energyLevel={audioLevel}
            onClick={handleToggleVoice}
            ariaLabel={isActive ? 'Stop ORA Voice Assistant' : 'Start ORA Voice Assistant'}
            title={isActive ? 'Click to stop voice session' : 'Click to talk to ORA'}
          />
        </div>

        {/* Status text */}
        <div className="relative z-10 mt-2">
          <p className="text-[12.5px] font-medium text-muted-foreground font-mono">
            {status === 'speaking'
              ? 'Responding...'
              : status === 'listening'
              ? 'Listening...'
              : status === 'connecting'
              ? 'Connecting...'
              : 'Click the microphone to start training'}
          </p>
        </div>

        {/* Assistant Controls Bar */}
        {isActive && (
          <div className="relative z-10 mt-5 flex items-center gap-3">
            <button
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

            <button
              onClick={stopSession}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-surface-low hover:bg-error/10 hover:text-error border border-border transition-colors flex items-center gap-1.5 text-muted-foreground cursor-pointer"
            >
              <Square size={12} />
              Stop Call
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="relative z-10 mt-4 p-2.5 rounded-md bg-error/10 border border-error/20 text-xs text-error max-w-md">
            {errorMessage}
          </div>
        )}
      </div>

      {/* ── Transcript Card ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <span className="text-[13px] font-semibold text-foreground font-serif">
              Training Transcript
            </span>
            {transcripts.length > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground">({transcripts.length})</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {transcripts.some((t) => t.sender === 'user' || t.sender === 'agent') && (
              <button
                onClick={handleSaveToKnowledge}
                disabled={isSavingNote}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSavingNote ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : savedNoteSuccess ? (
                  <CheckCircle2 size={11} />
                ) : (
                  <Save size={11} />
                )}
                <span>{savedNoteSuccess ? 'Saved to Knowledge' : 'Save as Knowledge Note'}</span>
              </button>
            )}

            {transcripts.length > 0 && (
              <button
                onClick={() => setTranscripts([])}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1 cursor-pointer font-mono"
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transcript scroll area */}
        <div className="space-y-3 min-h-[180px] max-h-[360px] overflow-y-auto pt-3.5 no-scrollbar">
          {transcripts.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground select-none">
              <p className="font-medium text-foreground">No conversation yet.</p>
              <p className="text-[11px] mt-1 text-muted-foreground/70">
                Click the microphone icon above to speak with ORA and teach it store knowledge.
              </p>
            </div>
          ) : (
            transcripts.map((entry) => {
              if (entry.sender === 'system') {
                return (
                  <div key={entry.id} className="text-center my-1.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-[3px] text-[10px] font-mono bg-surface-low border border-border/40 text-muted-foreground">
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
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                    <span className={cn('font-medium', isUser ? 'text-foreground' : 'text-foreground dark:text-[#C8F031]')}>
                      {isUser ? 'You' : 'ORA'}
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
    </div>
  );
}
