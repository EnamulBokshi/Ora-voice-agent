'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Volume2,
  X,
  Sparkles,
  Activity,
  Bot,
  User,
  Zap,
  RefreshCw,
  SlidersHorizontal,
  Server,
} from 'lucide-react';
import { searchRagCombinedApi } from '@/services/rag-service';
import { GeminiLiveClient } from '@/services/gemini-live-client';

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
type VoiceMode = 'gemini-proxy' | 'browser-speech';

export function VoiceTestModal({ isOpen, onClose, publishableKey = 'biz_live_demo' }: VoiceTestModalProps) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('gemini-proxy');
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

  // Clean up recording and connections
  const stopSession = useCallback(() => {
    if (directLiveClientRef.current) {
      directLiveClientRef.current.stop();
      directLiveClientRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
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
      } catch { }
      wsRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch { }
      audioCtxRef.current = null;
    }
    setStatus('idle');
    setAudioLevel(0);
    setLatencyMs(null);
  }, []);

  // Start Direct Client-Side Gemini Live Session
  const startDirectClientSession = async () => {
    try {
      stopSession();
      setErrorMessage(null);
      setStatus('connecting');

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const keyToUse = publishableKey || process.env.NEXT_PUBLIC_ORA_KEY || 'biz_live_ora_platform_system';

      const client = new GeminiLiveClient({
        publishableKey: keyToUse,
        sessionId,
        authToken: token || undefined,
        onStatusChange: (newStatus) => setStatus(newStatus),
        onTranscript: (sender, text) => addTranscript(sender, text),
        onAudioLevel: (level) => setAudioLevel(level),
        onLatency: (rtt) => setLatencyMs(rtt),
        onError: (err) => {
          setErrorMessage(err);
          setStatus('error');
        },
      });

      directLiveClientRef.current = client;
      await client.start();
    } catch (err: any) {
      console.error('[VoiceModal] Direct session init error:', err);
      setErrorMessage(err.message || 'Direct session failed to start.');
      setStatus('error');
    }
  };

  // Handle Legacy Socket message packet decoding
  const handleSocketMessage = useCallback((event: MessageEvent) => {
    const rawData = event.data;
    if (typeof rawData !== 'string') return;

    if (rawData.startsWith('0')) {
      wsRef.current?.send('40/voice,');
      return;
    }

    if (rawData.startsWith('40/voice,')) {
      setStatus('connected');
      addTranscript('system', 'Connected to ORA Voice Gateway. Starting session...');
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
          addTranscript('system', 'ORA Voice Gateway active! Speak into microphone.');
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
        } else if (eventName === 'voice-session-ended') {
          setStatus('idle');
          addTranscript('system', 'Voice session ended.');
        }
      } catch (err) {
        console.error('[VoiceModal] Failed to parse socket message:', err);
      }
    }
  }, [publishableKey, sessionId, addTranscript, playPcm24kBase64]);

  // Start Legacy Server Voice Gateway WebSockets Session
  const startServerGatewaySession = async () => {
    try {
      stopSession();
      setErrorMessage(null);
      setStatus('connecting');
      addTranscript('system', 'Connecting to ws://localhost:5000/voice (Server Proxy)...');

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

      ws.onmessage = handleSocketMessage;
      ws.onerror = (err) => {
        console.error('[VoiceModal] WebSocket error:', err);
        setErrorMessage('Failed to connect to backend voice gateway at ws://localhost:5000/voice');
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
            answerText = `I heard you ask: "${speechText}". ORA AI Assistant is ready to help with products, stock, and store policies!`;
          }

          addTranscript('agent', answerText);
          speakWithBrowserTts(answerText);
        } catch (err: any) {
          console.error('[VoiceModal] RAG Search Error:', err);
          addTranscript('agent', `I heard: "${speechText}". ORA AI Assistant is active!`);
          speakWithBrowserTts(`I heard: "${speechText}". ORA AI Assistant is active!`);
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error !== 'no-speech') {
          addTranscript('system', `Mic listener notice: ${err.error}`);
        }
      };

      recognition.onend = () => {
        if (status !== 'idle' && recognitionRef.current) {
          try { recognition.start(); } catch { }
        }
      };

      recognition.start();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start browser speech recognition.');
      setStatus('error');
    }
  };

  const handleStartSession = () => {
    if (voiceMode === 'gemini-proxy') {
      startDirectClientSession();
    } else {
      startBrowserVoiceAssistant();
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (directLiveClientRef.current) {
      directLiveClientRef.current.setMuted(nextMuted);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopSession();
    }
  }, [isOpen, stopSession]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in p-4">
      <div className="relative w-full max-w-2xl bg-[#122131] border border-[#273647] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#273647] bg-[#0d1c2d]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
                ORA Voice Agent Sandbox
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1">
                  <Zap size={11} />
                  {voiceMode === 'gemini-proxy'
                    ? 'ORA Voice Proxy'
                    : 'Browser Speech AI'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ultra-Low Latency Bi-directional Voice & Real-Time Tool Calling
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1c2b3c] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center justify-center space-y-6 flex-1 overflow-y-auto">
          {/* Voice Mode Selector */}
          <div className="flex items-center space-x-1.5 bg-[#0d1c2d] p-1.5 rounded-xl border border-[#273647] text-xs">
            <button
              onClick={() => { stopSession(); setVoiceMode('gemini-proxy'); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${voiceMode === 'gemini-proxy'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
              title="Connects via ORA Server Proxy — API key stays on server"
            >
              <Zap size={13} />
              ORA Voice Proxy
            </button>
            <button
              onClick={() => { stopSession(); setVoiceMode('browser-speech'); }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${voiceMode === 'browser-speech'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <SlidersHorizontal size={13} />
              Browser TTS/STT
            </button>
          </div>

          {/* Main Visualizer Orb */}
          <div className="relative flex items-center justify-center my-2">
            {status === 'speaking' && (
              <div className="absolute w-44 h-44 rounded-full bg-emerald-500/20 animate-ping" />
            )}
            {status === 'listening' && (
              <div
                className="absolute rounded-full bg-amber-500/20 transition-all duration-75"
                style={{
                  width: `${120 + audioLevel * 0.8}px`,
                  height: `${120 + audioLevel * 0.8}px`,
                }}
              />
            )}

            <div
              className={`relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xl border-2 transition-all duration-300 ${status === 'speaking'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-400 shadow-emerald-500/30'
                  : status === 'listening'
                    ? 'bg-amber-950/80 border-amber-400 text-amber-400 shadow-amber-500/30'
                    : status === 'connecting'
                      ? 'bg-blue-950/80 border-blue-400 text-blue-400 animate-pulse'
                      : status === 'error'
                        ? 'bg-red-950/80 border-red-400 text-red-400'
                        : 'bg-[#1c2b3c] border-[#273647] text-slate-400'
                }`}
            >
              {status === 'connecting' ? (
                <RefreshCw size={36} className="animate-spin" />
              ) : status === 'speaking' ? (
                <Volume2 size={38} className="animate-bounce" />
              ) : status === 'listening' ? (
                <Mic size={38} />
              ) : (
                <Bot size={38} />
              )}

              <span className="text-[11px] font-semibold tracking-wider uppercase mt-2">
                {status === 'connecting'
                  ? 'Connecting'
                  : status === 'speaking'
                    ? 'ORA Speaking'
                    : status === 'listening'
                      ? 'Listening'
                      : status === 'error'
                        ? 'Error'
                        : 'Ready'}
              </span>
            </div>
          </div>

          {/* Status Bar */}
          <div className="w-full flex items-center justify-between text-xs px-4 py-2 rounded-lg bg-[#0d1c2d] border border-[#273647]">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${status === 'speaking' || status === 'listening'
                    ? 'bg-emerald-400 animate-pulse'
                    : status === 'connecting'
                      ? 'bg-amber-400 animate-ping'
                      : status === 'error'
                        ? 'bg-red-400'
                        : 'bg-slate-500'
                  }`}
              />
              <span className="text-slate-300 font-medium">
                {status === 'idle' && 'Click Start Session to talk with ORA Voice Agent'}
                {status === 'connecting' && 'Bootstrapping & establishing direct stream...'}
                {status === 'listening' && 'ORA is listening... Speak clearly into microphone'}
                {status === 'speaking' && 'Streaming voice response in real-time...'}
                {status === 'error' && (errorMessage || 'Connection error')}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {latencyMs !== null && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ⚡ {latencyMs}ms RTT
                </span>
              )}
              {status !== 'idle' && (
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Activity size={13} />
                  <div className="w-16 h-1.5 bg-[#1c2b3c] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Control Buttons */}
          <div className="flex items-center space-x-4">
            {status === 'idle' || status === 'error' ? (
              <button
                onClick={handleStartSession}
                className="px-6 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all"
              >
                <Play size={16} fill="currentColor" />
                <span>Start Voice Session</span>
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-xl border transition-colors ${isMuted
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-[#1c2b3c] border-[#273647] text-slate-200 hover:bg-[#273647]'
                    }`}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button
                  onClick={stopSession}
                  className="px-6 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition-all"
                >
                  <Square size={16} fill="currentColor" />
                  <span>End Session</span>
                </button>
              </>
            )}
          </div>

          {/* Live Transcript Log Box */}
          <div className="w-full bg-[#0d1c2d] border border-[#273647] rounded-xl p-4 h-48 flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-[#273647] pb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={13} className="text-amber-400" />
                Live Conversation & Tool Execution Log
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Session: {sessionId}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {transcripts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 italic">
                  Transcripts and live actions (find_products, cart, policies) will stream here...
                </div>
              ) : (
                transcripts.map((item) => (
                  <div key={item.id} className="flex items-start space-x-2">
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                      [{item.timestamp}]
                    </span>
                    {item.sender === 'user' ? (
                      <span className="text-amber-300 font-semibold flex items-center gap-1">
                        <User size={11} /> User:
                      </span>
                    ) : item.sender === 'agent' ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Bot size={11} /> ORA:
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">⚡</span>
                    )}
                    <span
                      className={
                        item.sender === 'agent'
                          ? 'text-slate-200'
                          : item.sender === 'user'
                            ? 'text-amber-100'
                            : 'text-slate-400 italic'
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
