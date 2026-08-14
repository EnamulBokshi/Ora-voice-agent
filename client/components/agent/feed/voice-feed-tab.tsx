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
  Sparkles,
} from 'lucide-react';
import { searchRagCombinedApi } from '@/services/rag-service';
import { createKnowledgeDocApi } from '@/services/knowledge-service';
import { DocType } from '@/types/knowledge';
import { cn } from '@/lib/utils';

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

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';
type VoiceMode = 'gemini-live' | 'speech-ai';

export function VoiceFeedTab({ publishableKey = 'biz_live_demo', onFed }: VoiceFeedTabProps) {
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

  // WebSockets and Audio Refs
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
            addTranscript('agent', payload.text);
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

  // Start Real-time WebSocket Voice Stream Session
  const startGeminiLiveSession = async () => {
    try {
      stopSession();
      setErrorMessage(null);
      setStatus('connecting');
      addTranscript('system', 'Connecting to voice streaming gateway...');

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      nextPlayTimeRef.current = audioCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      micSourceRef.current = source;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputBuffer = e.inputBuffer.getChannelData(0);
        const base64Pcm = float32ToInt16Base64(inputBuffer);
        const chunkPayload = JSON.stringify(['audio-chunk', { audio: base64Pcm }]);
        wsRef.current.send(`42/voice,${chunkPayload}`);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      const wsHost = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
      const wsUrl = `${wsHost.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[VoiceAssistant] WebSocket connected');
      };

      ws.onmessage = handleSocketMessage;
      ws.onerror = (err) => {
        console.error('[VoiceAssistant] WebSocket error:', err);
        setErrorMessage('Failed to connect to voice stream gateway.');
        setStatus('error');
      };
      ws.onclose = () => {
        if (status !== 'idle') {
          setStatus('idle');
        }
      };
    } catch (err: any) {
      console.error('[VoiceAssistant] Setup error:', err);
      setErrorMessage(err.message || 'Microphone access denied or audio initialization failed.');
      setStatus('error');
    }
  };

  const handleToggleVoice = () => {
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
      {/* ── Top Visualizer & Interactive Microphone Orb ── */}
      <div className="relative overflow-hidden rounded-md border border-border bg-surface-container p-8 flex flex-col items-center justify-center text-center">
        {/* Background ambient lighting */}
        <div
          className={cn(
            'absolute inset-0 pointer-events-none transition-opacity duration-700',
            isActive ? 'opacity-20' : 'opacity-5',
          )}
          style={{
            background:
              status === 'speaking'
                ? 'radial-gradient(circle at center, var(--primary) 0%, transparent 70%)'
                : status === 'listening'
                ? 'radial-gradient(circle at center, #F59E0B 0%, transparent 70%)'
                : 'radial-gradient(circle at center, var(--primary) 0%, transparent 60%)',
          }}
        />

        {/* Central Glowing Microphone Logo Orb */}
        <div className="relative flex items-center justify-center my-4">
          {/* Speaking ping waves */}
          {status === 'speaking' && (
            <div className="absolute w-44 h-44 rounded-full bg-primary/20 animate-ping pointer-events-none" />
          )}

          {/* Listening audio volume reaction halo */}
          {status === 'listening' && (
            <div
              className="absolute rounded-full bg-amber-500/20 transition-all duration-75 pointer-events-none"
              style={{
                width: `${128 + audioLevel * 0.9}px`,
                height: `${128 + audioLevel * 0.9}px`,
              }}
            />
          )}

          {/* Interactive Button */}
          <button
            onClick={handleToggleVoice}
            className={cn(
              'relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-xl border-2 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/20',
              status === 'speaking'
                ? 'bg-primary/10 border-primary text-primary shadow-primary/30'
                : status === 'listening'
                ? 'bg-amber-950/40 border-amber-400 text-amber-400 shadow-amber-500/30'
                : status === 'connecting'
                ? 'bg-surface-high border-primary/50 text-primary animate-pulse'
                : status === 'error'
                ? 'bg-red-950/40 border-red-500 text-red-400'
                : 'bg-surface-low border-border text-foreground hover:border-primary/60 hover:scale-[1.03]',
            )}
            aria-label={isActive ? 'Stop ORA Voice Assistant' : 'Start ORA Voice Assistant'}
          >
            {status === 'connecting' ? (
              <RefreshCw size={32} className="animate-spin text-primary" />
            ) : status === 'speaking' ? (
              <Volume2 size={32} className="text-primary animate-bounce" />
            ) : status === 'listening' ? (
              <Mic size={32} className="text-amber-400 animate-pulse" />
            ) : status === 'error' ? (
              <Square size={28} className="text-red-400" />
            ) : (
              <Mic size={32} className="text-primary" />
            )}

            <span className="text-[10px] font-bold tracking-wider uppercase mt-1.5 text-foreground">
              {status === 'connecting'
                ? 'Connecting'
                : status === 'speaking'
                ? 'Speaking'
                : status === 'listening'
                ? 'Listening'
                : status === 'error'
                ? 'Retry'
                : 'Tap to Talk'}
            </span>
          </button>
        </div>

        {/* Status Callout & Quick Instructions */}
        <div className="relative z-10 mt-2 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {status === 'speaking'
              ? 'ORA is responding with store context'
              : status === 'listening'
              ? 'Listening to your voice... Speak naturally'
              : status === 'connecting'
              ? 'Establishing secure audio stream...'
              : 'Click the microphone to start talking with ORA'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Test product questions, store policies, discounts, or provide instructions directly via voice.
          </p>
        </div>

        {/* Assistant Controls Bar */}
        {isActive && (
          <div className="relative z-10 mt-5 flex items-center gap-3">
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1.5',
                isMuted
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-surface-low border-border text-foreground hover:bg-surface-high',
              )}
            >
              {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
              {isMuted ? 'Muted' : 'Mute Mic'}
            </button>

            <button
              onClick={stopSession}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-surface-low hover:bg-red-500/10 hover:text-red-400 border border-border transition-colors flex items-center gap-1.5 text-muted-foreground"
            >
              <Square size={12} />
              Stop Call
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="relative z-10 mt-4 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400 max-w-md">
            {errorMessage}
          </div>
        )}
      </div>

      {/* ── Live Conversation Transcript Feed ── */}
      <div className="rounded-md border border-border bg-surface-container overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-surface-low/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={14} className={isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'} />
            <h4 className="text-xs font-semibold text-foreground">
              Conversation Transcript ({transcripts.length})
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {transcripts.some((t) => t.sender === 'user' || t.sender === 'agent') && (
              <button
                onClick={handleSaveToKnowledge}
                disabled={isSavingNote}
                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2 py-1"
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transcript Message Scroll Area */}
        <div className="p-4 space-y-3 min-h-[220px] max-h-[360px] overflow-y-auto">
          {transcripts.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <p>No conversation yet.</p>
              <p className="text-[11px] mt-1 text-muted-foreground/70">
                Click the microphone icon above to talk with ORA in real time.
              </p>
            </div>
          ) : (
            transcripts.map((entry) => {
              if (entry.sender === 'system') {
                return (
                  <div key={entry.id} className="text-center my-1.5">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono bg-surface-low border border-border text-muted-foreground">
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
                    'flex items-end gap-2.5 max-w-[85%]',
                    isUser ? 'self-end ml-auto flex-row-reverse' : 'self-start mr-auto',
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                      isUser
                        ? 'bg-surface-high border border-border text-foreground'
                        : 'bg-primary text-primary-foreground',
                    )}
                  >
                    {isUser ? 'You' : 'ORA'}
                  </span>

                  <div
                    className={cn(
                      'p-3 rounded-md text-xs leading-relaxed',
                      isUser
                        ? 'bg-surface-high border border-border text-foreground'
                        : 'bg-primary/10 border border-primary/20 text-foreground',
                    )}
                  >
                    <p>{entry.text}</p>
                    <p className="text-[9px] text-muted-foreground mt-1 font-mono">{entry.timestamp}</p>
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
