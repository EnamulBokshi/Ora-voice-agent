'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

/**
 * Voice session states — matching the NestJS VoiceGateway & Gemini Live state machine
 */
export type VoiceState = 'idle' | 'connecting' | 'active' | 'ora-speaking' | 'error';

// ─── Audio Helpers ───────────────────────────────────────────────────────────

/**
 * Converts Float32 audio samples (-1.0 to 1.0) to 16-bit Little-Endian Linear PCM Uint8Array
 */
function floatTo16BitPCM(input: Float32Array): Uint8Array {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

/**
 * Resamples input Float32Array to 16kHz if audio context runs at a different native rate
 */
function downsampleTo16k(input: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === 16000) return input;
  const ratio = sampleRate / 16000;
  const newLength = Math.max(1, Math.floor(input.length / ratio));
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const originIdx = Math.min(input.length - 1, Math.round(i * ratio));
    result[i] = input[originIdx];
  }
  return result;
}

/**
 * Encodes an ArrayBuffer to a standard base64 string
 */
function arrayBufferToBase64(buffer: ArrayBufferLike): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes base64 Little-Endian 16-bit PCM audio directly into a Float32Array for Web Audio playback.
 * Immune to byte offset alignment and odd length errors.
 */
function base64ToFloat32Array(base64Pcm: string): Float32Array {
  try {
    const binary = atob(base64Pcm);
    const sampleCount = Math.floor(binary.length / 2);
    const float32 = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const low = binary.charCodeAt(i * 2);
      const high = binary.charCodeAt(i * 2 + 1);
      let int16 = (high << 8) | low;
      if (int16 >= 0x8000) int16 -= 0x10000;
      float32[i] = int16 / 32768.0;
    }
    return float32;
  } catch (e) {
    console.error('[OrbWidget] base64ToFloat32Array error:', e);
    return new Float32Array(0);
  }
}

/**
 * Merges streaming text chunks cleanly into a single continuous sentence.
 * Eliminates sub-word token splits, duplicate spaces, broken contractions, and misplaced punctuation.
 */
function mergeStreamingText(prevText: string, incomingChunk: string): string {
  if (!incomingChunk) return prevText;
  if (!prevText) return incomingChunk.trimStart();

  const prev = prevText;
  const chunk = incomingChunk;

  // 1. If chunk already starts with or is equal to prev, treat as full replacement
  if (chunk.startsWith(prev)) {
    return chunk;
  }

  // 2. If prev already contains/ends with this chunk (duplicate packet), ignore
  if (prev.endsWith(chunk.trim()) && chunk.trim().length > 3) {
    return prev;
  }

  // 3. Check punctuation and contraction attachment (e.g. "I" + "'ll", "don" + "'t", "word" + ",")
  const isPunctuation = /^[,.!?:;'")\]}]/.test(chunk);
  const isContraction = /^'(s|t|re|ve|m|ll|d)\b/i.test(chunk) || /^n't\b/i.test(chunk);
  const prevEndsWithSpace = prev.endsWith(' ') || prev.endsWith('\n');
  const chunkStartsWithSpace = chunk.startsWith(' ') || chunk.startsWith('\n');

  let merged = '';
  if (isPunctuation || isContraction) {
    merged = `${prev.trimEnd()}${chunk.trimStart()}`;
  } else if (prevEndsWithSpace || chunkStartsWithSpace) {
    merged = `${prev.trimEnd()} ${chunk.trimStart()}`;
  } else {
    // Both lack spaces: check if continuation or new word
    const prevEndsWithPunctuation = /[.!?]$/.test(prev);
    const chunkStartsCapital = /^[A-Z0-9]/.test(chunk);

    if (prevEndsWithPunctuation || chunkStartsCapital) {
      merged = `${prev} ${chunk}`;
    } else {
      merged = `${prev}${chunk}`;
    }
  }

  // 4. Normalize spaces and fix misplaced spaces before punctuation
  return merged
    .replace(/[ \t]+/g, ' ')
    .replace(/ ([.,!?:;])/g, '$1')
    .replace(/ \'/g, "'");
}

// ─── Backend Connection Configuration ────────────────────────────────────────

const getSocketUrl = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_API_URL);
      return `${url.protocol}//${url.host}`;
    } catch {
      // fallback
    }
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

const PUBLISHABLE_KEY = 'biz_live_mock_key_12345';

/**
 * FloatingOrbWidget — Siri/Gemini Live style interactive voice assistant on the landing page.
 * Provides real-time bidirectional audio conversation with Gemini Live via NestJS VoiceGateway.
 */
// ─── Procedural Fluid Wave Mesh Engine (Clean Glowing Bluish Center) ─────────

interface OrbFluidWaveProps {
  voiceState: VoiceState;
  energyLevel: number;
}

function OrbFluidWave({ voiceState, energyLevel }: OrbFluidWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const R = w * 0.46;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // 1. Clean solid deep obsidian background (zero bleed through)
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      if (voiceState === 'ora-speaking') {
        bgGrad.addColorStop(0, '#100824');
        bgGrad.addColorStop(0.6, '#080514');
        bgGrad.addColorStop(1, '#050508');
      } else if (voiceState === 'connecting') {
        bgGrad.addColorStop(0, '#041d30');
        bgGrad.addColorStop(0.6, '#06101c');
        bgGrad.addColorStop(1, '#050508');
      } else {
        bgGrad.addColorStop(0, '#0a1024');
        bgGrad.addColorStop(0.6, '#060816');
        bgGrad.addColorStop(1, '#050508');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Animation speed & dynamic energy
      const speed = voiceState === 'connecting' ? 0.05 : voiceState === 'ora-speaking' ? 0.035 : 0.02;
      time += speed;

      const normEnergy = Math.min(100, Math.max(0, energyLevel)) / 100;
      const isSpeaking = voiceState === 'ora-speaking';
      const isConnecting = voiceState === 'connecting';
      const isListening = voiceState === 'active';

      // 2. Multi-Strand Fluid Ribbon Mesh (The Glowing Bluish Wave)
      ctx.globalCompositeOperation = 'screen';

      const xSpan = R * 1.55;
      const xStart = cx - xSpan / 2;
      const xEnd = cx + xSpan / 2;
      const steps = 60;
      const dx = xSpan / steps;

      // Define harmonic strands that form the twisting 3D fluid ribbon
      const strands = [
        {
          freq1: 0.048,
          freq2: 0.024,
          amp1: 10 + normEnergy * (isSpeaking ? 16 : 8),
          amp2: 6 + normEnergy * 5,
          speedMult: 1.0,
          phase: 0,
          color: '#00f0ff',
          shadow: '#00f0ff',
          width: 2.2,
        },
        {
          freq1: 0.040,
          freq2: 0.030,
          amp1: 9 + normEnergy * (isSpeaking ? 14 : 7),
          amp2: 7 + normEnergy * 5,
          speedMult: 0.85,
          phase: Math.PI * 0.45,
          color: '#38bdf8',
          shadow: '#38bdf8',
          width: 2.0,
        },
        {
          freq1: 0.052,
          freq2: 0.020,
          amp1: 11 + normEnergy * (isSpeaking ? 18 : 8),
          amp2: 7 + normEnergy * 6,
          speedMult: 1.15,
          phase: Math.PI * 0.9,
          color: '#818cf8',
          shadow: '#818cf8',
          width: 2.2,
        },
        {
          freq1: 0.036,
          freq2: 0.042,
          amp1: 8 + normEnergy * (isSpeaking ? 14 : 6),
          amp2: 8 + normEnergy * 7,
          speedMult: 0.95,
          phase: Math.PI * 1.35,
          color: '#c084fc',
          shadow: '#a855f7',
          width: 2.0,
        },
        {
          freq1: 0.060,
          freq2: 0.028,
          amp1: (isSpeaking ? 12 : 6) + normEnergy * 10,
          amp2: 5 + normEnergy * 5,
          speedMult: 1.3,
          phase: Math.PI * 1.8,
          color: isSpeaking || isListening ? '#c8f031' : '#a855f7',
          shadow: isSpeaking || isListening ? '#c8f031' : '#a855f7',
          width: 1.6,
        },
      ];

      // Calculate strand points
      const strandPoints: Array<Array<{ x: number; y: number }>> = [];

      strands.forEach((s) => {
        const points: Array<{ x: number; y: number }> = [];
        for (let i = 0; i <= steps; i++) {
          const x = xStart + i * dx;
          const prog = i / steps;
          const env = Math.sin(prog * Math.PI) ** 1.3;

          const t = time * s.speedMult + s.phase;
          const w1 = Math.sin((x - cx) * s.freq1 + t) * s.amp1;
          const w2 = Math.cos((x - cx) * s.freq2 - t * 0.8) * s.amp2;
          const twist = Math.sin(t * 0.7 + prog * Math.PI * 2) * 4;

          const y = cy + (w1 + w2 + twist) * env;
          const hShift = Math.cos(t * 0.5 + prog * Math.PI) * 3 * env;

          points.push({ x: x + hShift, y });
        }
        strandPoints.push(points);
      });

      // 3. Volumetric Translucent Mesh Fills between adjacent strands
      for (let k = 0; k < strandPoints.length - 1; k++) {
        const pts1 = strandPoints[k];
        const pts2 = strandPoints[k + 1];

        ctx.beginPath();
        ctx.moveTo(pts1[0].x, pts1[0].y);
        for (let i = 1; i <= steps; i++) {
          ctx.lineTo(pts1[i].x, pts1[i].y);
        }
        for (let i = steps; i >= 0; i--) {
          ctx.lineTo(pts2[i].x, pts2[i].y);
        }
        ctx.closePath();

        const meshGrad = ctx.createLinearGradient(xStart, 0, xEnd, 0);
        meshGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
        meshGrad.addColorStop(0.3, k % 2 === 0 ? 'rgba(0, 240, 255, 0.18)' : 'rgba(129, 140, 248, 0.18)');
        meshGrad.addColorStop(0.7, k % 2 === 0 ? 'rgba(168, 85, 247, 0.22)' : 'rgba(56, 189, 248, 0.2)');
        meshGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

        ctx.fillStyle = meshGrad;
        ctx.globalAlpha = 0.75;
        ctx.fill();
      }

      // 4. Glowing Filament Lines
      strands.forEach((s, k) => {
        const pts = strandPoints[k];

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i <= steps; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }

        const lineGrad = ctx.createLinearGradient(xStart, 0, xEnd, 0);
        lineGrad.addColorStop(0, 'rgba(0,0,0,0)');
        lineGrad.addColorStop(0.2, s.color);
        lineGrad.addColorStop(0.5, s.color);
        lineGrad.addColorStop(0.8, s.color);
        lineGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = s.width;
        ctx.shadowColor = s.shadow;
        ctx.shadowBlur = isSpeaking ? 14 : 8;
        ctx.globalAlpha = 0.95;
        ctx.stroke();
      });

      // 5. Central Glowing White-Cyan Caustic Core
      ctx.beginPath();
      const midPts = strandPoints[1];
      ctx.moveTo(midPts[0].x, midPts[0].y);
      for (let i = 1; i <= steps; i++) {
        ctx.lineTo(midPts[i].x, midPts[i].y);
      }
      const coreLineGrad = ctx.createLinearGradient(xStart, 0, xEnd, 0);
      coreLineGrad.addColorStop(0, 'rgba(255,255,255,0)');
      coreLineGrad.addColorStop(0.35, 'rgba(255,255,255,0.75)');
      coreLineGrad.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      coreLineGrad.addColorStop(0.65, 'rgba(255,255,255,0.75)');
      coreLineGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = coreLineGrad;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.globalAlpha = 0.85;
      ctx.stroke();

      // 6. Central Radial Energy Bloom (Soft horizontal glow)
      const bloomRadius = 18 + (isSpeaking ? normEnergy * 10 : isListening ? normEnergy * 6 : Math.sin(time) * 2);
      const bloomGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(2, bloomRadius));
      bloomGrad.addColorStop(0, isSpeaking ? 'rgba(216, 180, 254, 0.7)' : 'rgba(56, 189, 248, 0.65)');
      bloomGrad.addColorStop(0.5, isSpeaking ? 'rgba(168, 85, 247, 0.25)' : 'rgba(37, 99, 235, 0.25)');
      bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bloomGrad;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [voiceState, energyLevel]);

  return (
    <canvas
      ref={canvasRef}
      width={140}
      height={140}
      className="lp-orb-canvas"
      aria-hidden="true"
    />
  );
}

// ─── Main Floating Orb Widget Component ──────────────────────────────────────

export function FloatingOrbWidget() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [liveUtterance, setLiveUtterance] = useState<string>('');
  const [liveSpeaker, setLiveSpeaker] = useState<'user' | 'agent' | null>(null);
  const [userMicLevel, setUserMicLevel] = useState(0);
  const [speakingLevel, setSpeakingLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  // Mutable refs across async callbacks
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const muteGainNodeRef = useRef<GainNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioQueueTimeRef = useRef(0);
  const isConnectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const currentSessionIdRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const lastSpeakerRef = useRef<'user' | 'agent' | null>(null);

  // Keep isMutedRef synced and manage speech recognition
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted && recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    } else if (!isMuted && isConnectedRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
  }, [isMuted]);

  // ── Global event trigger support (e.g. from Hero CTA button) ───────────────
  useEffect(() => {
    const handleTrigger = () => {
      if (voiceState === 'idle' || voiceState === 'error') {
        handleStart();
      }
    };
    window.addEventListener('ora-trigger-voice', handleTrigger);
    return () => window.removeEventListener('ora-trigger-voice', handleTrigger);
  });

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      teardownAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Teardown audio session cleanly ─────────────────────────────────────────
  const teardownAudio = useCallback(() => {
    isConnectedRef.current = false;

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }
    if (muteGainNodeRef.current) {
      try {
        muteGainNodeRef.current.disconnect();
      } catch {}
      muteGainNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      try {
        playbackContextRef.current.close().catch(() => {});
      } catch {}
      playbackContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (socketRef.current) {
      try {
        socketRef.current.emit('stop-voice-session');
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    lastSpeakerRef.current = null;
    setLiveUtterance('');
    setLiveSpeaker(null);
    audioQueueTimeRef.current = 0;
    setUserMicLevel(0);
    setSpeakingLevel(0);
    setVoiceState('idle');
  }, []);

  // ── Play incoming PCM audio chunks from Gemini ─────────────────────────────
  const playIncomingAudioPcm = useCallback((base64Pcm: string) => {
    try {
      if (!playbackContextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        playbackContextRef.current = new AudioCtx({ sampleRate: 24000 });
      }
      const ctx = playbackContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const float32Array = base64ToFloat32Array(base64Pcm);
      if (float32Array.length === 0) return;

      const buffer = ctx.createBuffer(1, float32Array.length, 24000);
      buffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      if (audioQueueTimeRef.current < now) {
        audioQueueTimeRef.current = now;
      }

      source.start(audioQueueTimeRef.current);
      audioQueueTimeRef.current += buffer.duration;

      setVoiceState('ora-speaking');

      // Calculate audio amplitude for dynamic pulsing visualizer
      let sum = 0;
      const step = Math.max(1, Math.floor(float32Array.length / 64));
      for (let i = 0; i < float32Array.length; i += step) {
        sum += float32Array[i] * float32Array[i];
      }
      const rms = Math.sqrt(sum / (float32Array.length / step));
      setSpeakingLevel(Math.min(100, Math.floor(rms * 450)));

      source.onended = () => {
        if (ctx.currentTime >= audioQueueTimeRef.current - 0.05 && isConnectedRef.current) {
          setVoiceState('active');
          setSpeakingLevel(0);
        }
      };
    } catch (e) {
      console.error('[OrbWidget] Audio playback error:', e);
    }
  }, []);

  // ── Start microphone capture and stream to backend ─────────────────────────
  const startMicrophoneCapture = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      const muteNode = audioCtx.createGain();
      muteNode.gain.value = 0;
      muteGainNodeRef.current = muteNode;

      source.connect(processor);
      processor.connect(muteNode);
      muteNode.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (!isConnectedRef.current || !socketRef.current || isMutedRef.current) return;

        const rawInput = e.inputBuffer.getChannelData(0);
        const inputData = downsampleTo16k(rawInput, audioCtx.sampleRate);

        let sum = 0;
        for (let i = 0; i < rawInput.length; i++) {
          sum += rawInput[i] * rawInput[i];
        }
        const rms = Math.sqrt(sum / rawInput.length);
        const level = Math.min(100, Math.floor(rms * 400));
        setUserMicLevel(level);

        const pcm16 = floatTo16BitPCM(inputData);
        const base64Audio = arrayBufferToBase64(pcm16.buffer);
        socketRef.current.emit('audio-chunk', { audio: base64Audio });
      };

      const SpeechRec = typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

      if (SpeechRec) {
        try {
          if (recognitionRef.current) {
            recognitionRef.current.onend = null;
            try { recognitionRef.current.abort(); } catch {}
          }
          const recognition = new SpeechRec();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;
          recognition.lang = typeof navigator !== 'undefined' ? (navigator.language || 'en-US') : 'en-US';

          recognition.onresult = (event: any) => {
            if (!isConnectedRef.current || isMutedRef.current) return;
            
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = 0; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res && res[0] && res[0].transcript) {
                if (res.isFinal) {
                  finalTranscript += res[0].transcript;
                } else {
                  interimTranscript += res[0].transcript;
                }
              }
            }

            const cleanText = (finalTranscript + ' ' + interimTranscript).trim();
            if (cleanText) {
              const formatted = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
              lastSpeakerRef.current = 'user';
              setLiveSpeaker('user');
              setLiveUtterance(formatted);
              setShowTranscript(true);
            }
          };

          recognition.onerror = (err: any) => {
            if (err.error !== 'no-speech' && err.error !== 'aborted') {
              console.debug('[OrbWidget] SpeechRecognition:', err.error);
            }
          };

          recognition.onend = () => {
            if (isConnectedRef.current && !isMutedRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.debug('[OrbWidget] SpeechRecognition init failed:', e);
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('[OrbWidget] Microphone capture error:', error);
      setErrorMsg(`Microphone error: ${error.message || 'Permission denied'}`);
      setVoiceState('error');
    }
  }, []);

  // ── Initiate full live voice session ───────────────────────────────────────
  const handleStart = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioCtx({ sampleRate: 24000 });
      }
      if (playbackContextRef.current.state === 'suspended') {
        playbackContextRef.current.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[OrbWidget] Pre-initializing AudioContext:', e);
    }

    setVoiceState('connecting');
    setErrorMsg('');
    setLiveUtterance('');
    setLiveSpeaker(null);
    lastSpeakerRef.current = null;
    setIsMuted(false);
    setShowTranscript(true);

    const newSessionId = `sess_landing_${Math.random().toString(36).slice(2, 9)}`;
    currentSessionIdRef.current = newSessionId;

    const socketUrl = getSocketUrl();
    const socket = io(`${socketUrl}/voice`, {
      transports: ['websocket'],
      reconnection: false,
    });
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

    socket.on('user-text-stream', (data: { text: string }) => {
      if (data.text?.trim()) {
        lastSpeakerRef.current = 'user';
        setLiveSpeaker('user');
        setLiveUtterance((prev) => {
          if (lastSpeakerRef.current !== 'user') {
            return data.text.trim();
          }
          return mergeStreamingText(prev, data.text);
        });
        setShowTranscript(true);
      }
    });

    socket.on('text-stream', (data: { text: string }) => {
      if (!data.text) return;

      if (lastSpeakerRef.current === 'user' && recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      setLiveSpeaker('agent');
      setLiveUtterance((prev) => {
        if (lastSpeakerRef.current !== 'agent') {
          lastSpeakerRef.current = 'agent';
          return data.text.trimStart();
        }
        return mergeStreamingText(prev, data.text);
      });
      setShowTranscript(true);
    });

    socket.on('voice-interrupted', () => {
      if (playbackContextRef.current) {
        audioQueueTimeRef.current = playbackContextRef.current.currentTime;
      }
      setVoiceState('active');
      lastSpeakerRef.current = 'user';
      setLiveSpeaker('user');
      setLiveUtterance('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    });

    socket.on('voice-error', (err: { message?: string }) => {
      const msg = err.message || 'Voice session error';
      setErrorMsg(msg);
      setVoiceState('error');
      teardownAudio();
    });

    socket.on('voice-session-ended', () => {
      teardownAudio();
    });

    socket.on('disconnect', () => {
      if (isConnectedRef.current) {
        teardownAudio();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[OrbWidget] Socket connect error:', err);
      setErrorMsg('Could not connect to Voice Gateway (Port 5000)');
      setVoiceState('error');
      teardownAudio();
    });
  }, [startMicrophoneCapture, playIncomingAudioPcm, teardownAudio]);

  // ── Toggle orb click ───────────────────────────────────────────────────────
  const handleOrbClick = () => {
    if (voiceState === 'idle' || voiceState === 'error') {
      handleStart();
    } else {
      teardownAudio();
    }
  };

  const isActive = voiceState === 'active' || voiceState === 'ora-speaking';
  const isConnecting = voiceState === 'connecting';
  const isSpeaking = voiceState === 'ora-speaking';

  // Dynamic visual reactivity level
  const energyLevel = isSpeaking ? speakingLevel : userMicLevel;

  return (
    <div className="lp-orb-root" aria-label="ORA AI Voice Assistant">
        {/* ── Gemini Mobile Style Live Transcribe Overlay (Pill) ── */}
        {showTranscript && liveUtterance && (
          <div
            className={`lp-orb-gemini-transcript ${liveSpeaker === 'user' ? 'user-turn' : 'agent-turn'}`}
            aria-live="polite"
          >
            <div className="lp-orb-gemini-content">
              <p className="lp-orb-gemini-text">
                {liveUtterance}
                {liveSpeaker === 'user' && (
                  <span className="lp-orb-typing-cursor" aria-hidden="true" />
                )}
              </p>
            </div>
            <button
              aria-label="Dismiss transcript"
              className="lp-orb-gemini-close"
              onClick={() => setShowTranscript(false)}
              type="button"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Unified Floating Island (Status + Controls — Only shown when NOT idle) ── */}
        {voiceState !== 'idle' && (
          <div className="lp-orb-island-container">
            {voiceState === 'connecting' && (
              <div className="lp-orb-island-pill connecting">
                <span className="lp-orb-status-dot connecting" />
                <span className="lp-orb-shimmer-text">Connecting to Gemini Live…</span>
              </div>
            )}

            {isActive && (
              <div className={`lp-orb-island-pill active ${isSpeaking ? 'speaking' : ''}`}>
                <div className="lp-orb-island-status">
                  <span
                    className={`lp-orb-status-dot ${
                      isSpeaking ? 'speaking' : isMuted ? 'muted' : 'listening'
                    }`}
                  />
                  <span className="lp-orb-island-status-text">
                    {isSpeaking
                      ? 'ORA is speaking…'
                      : isMuted
                      ? 'Microphone muted'
                      : 'Listening… Speak now'}
                  </span>
                </div>

                <div className="lp-orb-island-divider" />

                <div className="lp-orb-island-actions">
                  <button
                    type="button"
                    className={`lp-orb-island-btn ${isMuted ? 'muted' : ''}`}
                    onClick={() => setIsMuted((m) => !m)}
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    className="lp-orb-island-btn stop"
                    onClick={teardownAudio}
                    aria-label="End conversation"
                    title="End Call"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="5" y="5" width="14" height="14" rx="2.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {voiceState === 'error' && (
              <button
                type="button"
                className="lp-orb-island-pill error"
                onClick={handleStart}
                aria-label="Retry connection"
              >
                <span className="lp-orb-status-dot error" />
                <span>{errorMsg ? (errorMsg.length > 40 ? errorMsg.slice(0, 40) + '…' : errorMsg) : 'Connection error — Click to retry'}</span>
              </button>
            )}
          </div>
        )}

        {/* ── Main Stationary Crystal Orb Container ── */}
        <div
          className={`lp-orb-container ${isActive ? 'active' : ''} ${isSpeaking ? 'speaking' : ''} ${isConnecting ? 'connecting' : ''}`}
        >
          {/* Siri/Gemini Fluid Outer Glow & Reactive Ring (Centered strictly inside orb container) */}
          {isActive && (
            <div
              className={`lp-orb-reactive-aura ${isSpeaking ? 'speaking' : 'listening'}`}
              style={{
                transform: `scale(${1 + (energyLevel / 100) * 0.35})`,
                opacity: 0.45 + (energyLevel / 100) * 0.55,
              }}
            />
          )}

          {/* Floor ambient reflection */}
          <div className="lp-orb-floor-reflection" />

          {/* Outer crystal glass sphere button */}
          <button
            aria-label={
              isActive
                ? 'Click to end voice conversation'
                : 'Click to start real-time voice conversation with ORA'
            }
            className={`lp-orb-glass-sphere lp-orb-btn ${isSpeaking ? 'speaking-active' : ''} ${isConnecting ? 'connecting-active' : ''}`}
            onClick={handleOrbClick}
            type="button"
          >
            {/* Dynamic Living Bluish Plasma Wave (Pure fluid wave inside crystal glass sphere — no double orb) */}
            <OrbFluidWave voiceState={voiceState} energyLevel={energyLevel} />

            {/* Inner rim lighting reflection */}
            <div className="lp-orb-inner-rim-light" />

            {/* Top glass glossy highlight */}
            <div className="lp-orb-top-highlight" />

            {/* Futuristic quantum charging rings on connecting state */}
            {isConnecting && (
              <div className="lp-orb-connecting-rings" aria-hidden="true">
                <div className="lp-orb-quantum-ring ring-1" />
                <div className="lp-orb-quantum-ring ring-2" />
              </div>
            )}
          </button>
        </div>
      </div>
  );
}
