'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

/**
 * Voice session states — matches the flow in VoiceGateway & GeminiVoiceService
 */
type VoiceState = 'idle' | 'connecting' | 'active' | 'ora-speaking' | 'error';

// ─── Audio helpers ────────────────────────────────────────────────────────────

function floatTo16BitPCM(input: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

function downsampleTo16k(input: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === 16000) return input;
  const ratio = sampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const originIdx = Math.round(i * ratio);
    result[i] = input[originIdx];
  }
  return result;
}

function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ─── Backend Connection Configuration ───────────────────────────────────────

const getSocketUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  const envUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    try {
      const url = new URL(envUrl.replace(/^ws/, 'http'), window.location.origin);
      return `${url.protocol}//${url.host}`;
    } catch {
      // fallback to localhost
    }
  }
  return 'http://localhost:5000';
};

const PUBLISHABLE_KEY = 'biz_live_mock_key_12345';

/**
 * FloatingOrbWidget — Siri-style floating ORA AI orb on the marketing landing page.
 * Clicking the orb starts a real voice session via the NestJS voice gateway.
 * Matches the exact ora_widget_design spec. Position: bottom-center.
 */
export function FloatingOrbWidget() {
  const [visible, setVisible] = useState(true);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Refs — hold mutable session objects without re-rendering
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioQueueTimeRef = useRef(0);
  const isConnectedRef = useRef(false);
  const currentSessionIdRef = useRef<string>('');

  // ── Scroll visibility ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      // Keep visible by default, but check scroll threshold if page is scrolled
      setVisible(true);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => { stopSession(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Playback: PCM16 audio from server → speaker ────────────────────────────
  const playIncomingAudioPcm = useCallback((base64Pcm: string) => {
    try {
      if (!playbackContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        playbackContextRef.current = new AudioCtx({ sampleRate: 24000 });
      }
      const ctx = playbackContextRef.current;
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (!ctx) return;

      const bytes = base64ToUint8Array(base64Pcm);
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

      const buffer = ctx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      if (audioQueueTimeRef.current < now) audioQueueTimeRef.current = now;
      source.start(audioQueueTimeRef.current);
      audioQueueTimeRef.current += buffer.duration;

      setVoiceState('ora-speaking');
      source.onended = () => {
        if (ctx.currentTime >= audioQueueTimeRef.current - 0.1 && isConnectedRef.current) {
          setVoiceState('active');
        }
      };
    } catch (e) {
      console.error('[OrbWidget] Audio playback error:', e);
    }
  }, []);

  // ── Microphone capture → base64 PCM16 → socket ────────────────────────────
  const startMicrophoneCapture = useCallback(async () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!isConnectedRef.current || !socketRef.current) return;

        const rawInput = e.inputBuffer.getChannelData(0);
        const inputData = downsampleTo16k(rawInput, audioCtx.sampleRate);

        // Volume meter calculation
        let sum = 0;
        for (let i = 0; i < rawInput.length; i++) sum += rawInput[i] * rawInput[i];
        const rms = Math.sqrt(sum / rawInput.length);
        setMicLevel(Math.min(100, Math.floor(rms * 400)));

        // Noise gate — skip silent frames
        if (rms < 0.005) return;

        const pcm16 = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcm16.buffer);
        socketRef.current.emit('audio-chunk', { audio: base64Audio });
      };
    } catch (err: any) {
      console.error('[OrbWidget] Microphone error:', err);
      setErrorMsg(`Mic error: ${err.message || 'Permission denied'}`);
      setVoiceState('error');
    }
  }, []);

  // ── Stop session — tears down everything cleanly ───────────────────────────
  const stopSession = useCallback(() => {
    isConnectedRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('stop-voice-session');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    audioQueueTimeRef.current = 0;
    setMicLevel(0);
    setVoiceState('idle');
  }, []);

  // ── Start session ──────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setVoiceState('connecting');
    setErrorMsg('');
    setTranscript([]);

    const newSessionId = `sess_orb_${Math.random().toString(36).slice(2, 9)}`;
    currentSessionIdRef.current = newSessionId;

    const socketUrl = getSocketUrl();
    const socket = io(`${socketUrl}/voice`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('start-voice-session', {
        publishableKey: PUBLISHABLE_KEY,
        sessionId: currentSessionIdRef.current,
      });
    });

    socket.on('voice-session-started', async () => {
      isConnectedRef.current = true;
      setVoiceState('active');
      await startMicrophoneCapture();
    });

    socket.on('audio-stream', (data: { audio: string }) => {
      playIncomingAudioPcm(data.audio);
    });

    socket.on('text-stream', (data: { text: string }) => {
      setTranscript((prev) => [...prev.slice(-4), data.text]);
    });

    socket.on('voice-error', (err: { message: string }) => {
      const msg = err.message || 'Voice session error';
      setErrorMsg(msg);
      setVoiceState('error');
      stopSession();
    });

    socket.on('voice-session-ended', () => {
      stopSession();
    });

    socket.on('disconnect', () => {
      if (isConnectedRef.current) stopSession();
    });
  }, [startMicrophoneCapture, playIncomingAudioPcm, stopSession]);

  // ── Toggle on click ────────────────────────────────────────────────────────
  const handleOrbClick = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      startSession();
    } else {
      stopSession();
    }
  }, [voiceState, startSession, stopSession]);

  if (!visible) return null;

  // ── Derived UI state ───────────────────────────────────────────────────────
  const isActive = voiceState === 'active' || voiceState === 'ora-speaking';
  const isConnecting = voiceState === 'connecting';
  const isOraSpeeaking = voiceState === 'ora-speaking';

  return (
    <div className="lp-orb-root" aria-label="Talk to ORA AI assistant">
      {/* Transcript bubble — shows ORA's responses above the orb */}
      {transcript.length > 0 && (
        <div className="lp-orb-transcript" aria-live="polite">
          {transcript.map((line, i) => (
            <p key={i} className="lp-orb-transcript-line">{line}</p>
          ))}
        </div>
      )}

      {/* Error bubble */}
      {voiceState === 'error' && errorMsg && (
        <div className="lp-orb-error-bubble" role="alert">
          ⚠️ {errorMsg.length > 60 ? errorMsg.slice(0, 60) + '…' : errorMsg}
          <br /><span className="lp-orb-error-hint">Tap orb to retry</span>
        </div>
      )}

      {/* Status label */}
      <div className={`lp-orb-status-label ${isActive ? 'lp-orb-status-active' : ''} ${isConnecting ? 'lp-orb-status-connecting' : ''}`}>
        {voiceState === 'idle' && 'Tap to talk'}
        {voiceState === 'connecting' && 'Connecting…'}
        {voiceState === 'active' && 'Listening…'}
        {voiceState === 'ora-speaking' && 'ORA speaking…'}
        {voiceState === 'error' && 'Tap to retry'}
      </div>

      {/* Mic level ring — glows when mic is picking up audio */}
      {isActive && (
        <div
          className="lp-orb-mic-ring"
          style={{ opacity: 0.3 + (micLevel / 100) * 0.7 }}
        />
      )}

      {/* Main orb container */}
      <div
        className={`lp-orb-container ${isActive ? 'lp-orb-container--active' : ''} ${isConnecting ? 'lp-orb-container--connecting' : ''}`}
        data-purpose="orb-wrapper"
      >
        {/* Floor reflection */}
        <div className="lp-orb-floor-reflection" data-purpose="bottom-reflection" />

        {/* Outer glass sphere — clickable */}
        <button
          aria-label={isActive ? 'Stop voice session' : 'Start voice session with ORA'}
          className={`lp-orb-glass-sphere lp-orb-btn ${isOraSpeeaking ? 'lp-orb-speaking' : ''}`}
          data-purpose="glass-shell"
          onClick={handleOrbClick}
          type="button"
        >
          {/* Top glass highlight */}
          <div className="lp-orb-top-highlight" />

          {/* Subtle inner rim lighting */}
          <div className="lp-orb-inner-rim-light" />

          {/* Ambient inner glow */}
          <div className="lp-orb-ambient-aura" />

          {/* Wave image — rotates when active, static when idle */}
          <div
            className={`lp-orb-wave-img-wrapper ${isActive ? 'lp-orb-wave-img-wrapper--spinning' : ''}`}
            data-purpose="wave-content"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="ORA AI glowing wave energy orb"
              className="lp-orb-wave-img"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiiHohwyyA_AYKIz0FqIi4lPhglG4dGwSbGydUlHEFcCUM5D4yOQD-RJduetkXycHsfXCpjKD1V6i1Ek4Zmm0SOmvvLn_3yXdEptG2uCrTB1O6TgxzJRmH_pj3OAdpkvd7RoFK6hGg_wsyBjWnmR1a58wAIhaVAeWaiT5787U3fMOsKHQRqRt7z_RXy7bLI8nl0AFq-er2vKD0G1eZAhCcOPbFtAiT0mFdoN1yorZVMMmgRuw7D7j-PbK4xBOs2NjWnzA"
            />
          </div>

          {/* Connecting spinner overlay */}
          {isConnecting && (
            <div className="lp-orb-connecting-overlay">
              <div className="lp-orb-spinner" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
