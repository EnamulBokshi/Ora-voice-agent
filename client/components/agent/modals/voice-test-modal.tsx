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
  Volume2,
} from 'lucide-react';
import { searchRagCombinedApi } from '@/services/rag-service';
import { GeminiLiveClient } from '@/services/gemini-live-client';
import { LivingOrb, LivingOrbState } from '@/components/orb/living-orb';

interface VoiceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  publishableKey?: string;
}

interface TranscriptEntry {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
}

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error';
type VoiceMode = 'direct-live' | 'browser-speech';

export function VoiceTestModal({ isOpen, onClose, publishableKey = 'biz_live_demo' }: VoiceTestModalProps) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('direct-live');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [sessionId] = useState<string>(() => `ses_${Math.random().toString(36).substring(2, 9)}`);

  // Direct Live Client Ref
  const directLiveClientRef = useRef<GeminiLiveClient | null>(null);

  // Legacy Proxy WebSockets and Audio Refs
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
      console.error('[VoiceModal] Playback error:', err);
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

  // Stop session
  const stopSession = useCallback(() => {
    if (directLiveClientRef.current) {
      try {
        directLiveClientRef.current.stop();
      } catch (e) { }
      directLiveClientRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
      recognitionRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
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

  // Start Direct Live Session
  const startDirectLiveSession = async () => {
    try {
      setStatus('connecting');
      setErrorMessage(null);
      addTranscript('system', 'Connecting to ORA Neural Voice Gateway...');

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const keyToUse = publishableKey || process.env.NEXT_PUBLIC_ORA_KEY || 'biz_live_ora_platform_system';

      const client = new GeminiLiveClient({
        publishableKey: keyToUse,
        sessionId,
        authToken: token || undefined,
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

  // Start Browser Fallback Session
  const startBrowserSession = async () => {
    try {
      setStatus('connecting');

      const wsHost = (
        process.env.NEXT_PUBLIC_WS_URL ||
        (typeof window !== 'undefined'
          ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
          : 'ws://localhost:5000')
      ).replace(/^http/, 'ws');

      addTranscript('system', `Connecting to ${wsHost}/voice (Server Proxy)...`);

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

      const wsUrl = `${wsHost}/socket.io/?EIO=4&transport=websocket`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = handleSocketMessage;
      ws.onerror = (err) => {
        console.error('[VoiceModal] WebSocket error:', err);
        setErrorMessage(`Failed to connect to backend voice gateway at ${wsHost}/voice`);
        setStatus('error');
      };
      ws.onclose = () => {
        setStatus('idle');
      };
    } catch (err: any) {
      console.error('[VoiceModal] Initialization failed:', err);
      setErrorMessage(err.message || 'Microphone access denied or audio error.');
      setStatus('error');
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

            let answer = "I found some details in your store catalog. How else can I assist you today?";
            if (ragRes && ragRes.knowledge && ragRes.knowledge.length > 0) {
              answer = `Based on your store knowledge: ${ragRes.knowledge[0].text.substring(0, 160)}...`;
            } else if (ragRes && ragRes.products && ragRes.products.length > 0) {
              answer = `Found matching items: ${ragRes.products.map(p => p.text).slice(0, 2).join(', ')}.`;
            }

            addTranscript('agent', answer);
            speakWithBrowserTts(answer);
          } catch (e: any) {
            const fallback = "I received your query and I am checking your store catalog. How can I help further?";
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
      startBrowserSession();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface-lowest border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-surface-container/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-high flex items-center justify-center border border-border/60 shadow-sm">
              <Radio size={15} className="text-foreground" />
            </div>
            <div>
              <h2 className="text-[15.5px] font-semibold text-foreground tracking-tight">
                Test ORA Live
              </h2>
              <p className="text-[12px] font-mono text-muted-foreground">
                Real-time speech & sales conversation preview
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 flex flex-col items-center gap-6">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container border border-border/50">
            <button
              onClick={() => { stopSession(); setVoiceMode('direct-live'); }}
              className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${voiceMode === 'direct-live'
                  ? 'bg-surface-high text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Zap size={13} className={voiceMode === 'direct-live' ? 'text-foreground dark:text-[#C8F031]' : ''} />
              ORA Neural Engine (Direct)
            </button>
            <button
              onClick={() => { stopSession(); setVoiceMode('browser-speech'); }}
              className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${voiceMode === 'browser-speech'
                  ? 'bg-surface-high text-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <SlidersHorizontal size={13} />
              Browser STT/TTS
            </button>
          </div>

          {/* Living Orb Visualizer */}
          <div className="relative flex items-center justify-center my-2">
            <LivingOrb
              size={120}
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
          <div className="w-full flex items-center justify-between text-[12.5px] px-4 py-2.5 rounded-xl bg-surface-container/50 border border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status === 'speaking' || status === 'listening'
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
                {status === 'connecting' && 'Connecting neural audio stream...'}
                {status === 'listening' && 'ORA is listening... Speak clearly into your mic'}
                {status === 'speaking' && 'ORA is speaking in real-time...'}
                {status === 'thinking' && 'Searching store catalog & policies...'}
                {status === 'error' && (errorMessage || 'Connection error')}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {latencyMs !== null && (
                <span className="text-[11px] font-mono text-foreground dark:text-[#C8F031] bg-surface-high dark:bg-[#C8F031]/10 px-2 py-0.5 rounded border border-border dark:border-[#C8F031]/30 font-semibold">
                  {latencyMs}ms RTT
                </span>
              )}
            </div>
          </div>

          {/* Main Control Buttons */}
          <div className="flex items-center gap-3">
            {status === 'idle' || status === 'error' ? (
              <button
                onClick={handleStartSession}
                className="px-6 py-2.5 rounded-xl font-semibold text-[13.5px] flex items-center gap-2 bg-foreground text-background hover:opacity-90 transition-all shadow-md cursor-pointer"
              >
                <Play size={14} fill="currentColor" />
                <span>Test ORA Live</span>
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${isMuted
                      ? 'bg-red-500/20 border-red-500/40 text-red-500 dark:text-red-400'
                      : 'bg-surface-high border-border/80 text-foreground hover:bg-surface-highest'
                    }`}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <button
                  onClick={stopSession}
                  className="px-6 py-2.5 rounded-xl font-semibold text-[13.5px] flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white transition-all shadow-md cursor-pointer"
                >
                  <Square size={14} fill="currentColor" />
                  <span>End Test</span>
                </button>
              </>
            )}
          </div>

          {/* Live Transcript Log Box */}
          <div className="w-full bg-surface-container/30 border border-border/60 rounded-xl p-4 h-48 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={12} className="text-foreground" />
                Live Conversation Feed
              </span>
              <span className="text-[11px] text-muted-foreground/70 font-mono">
                {sessionId}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[12.5px]">
              {transcripts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground/50 text-xs italic">
                  Live speech transcripts and catalog tool queries will stream here...
                </div>
              ) : (
                transcripts.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
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
                      className={
                        item.sender === 'agent'
                          ? 'text-foreground'
                          : item.sender === 'user'
                            ? 'text-foreground/90'
                            : 'text-muted-foreground italic'
                      }
                    >
                      {item.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
