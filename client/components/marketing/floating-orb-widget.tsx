'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { GeminiLiveClient } from '@/services/gemini-live-client';

/**
 * Voice session states — matching the NestJS VoiceProxyGateway & Gemini Live state machine
 */
export type VoiceState = 'idle' | 'connecting' | 'active' | 'thinking' | 'ora-speaking' | 'error';

// ─── Socket / API URL Resolution ──────────────────────────────────────────────
const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window === 'undefined') {
    return 'http://localhost:5000';
  }
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_ORA_KEY || 'biz_live_ora_platform_system';

// ─── Procedural Fluid Wave Mesh Engine (Clean Glowing Bluish Center) ─────────

interface OrbFluidWaveProps {
  voiceState: VoiceState;
  energyLevel: number;
}

function OrbFluidWave({ voiceState, energyLevel }: OrbFluidWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = 140);
    let height = (canvas.height = 140);
    const cx = width / 2;
    const cy = height / 2;

    const render = () => {
      timeRef.current += 0.035;
      const t = timeRef.current;

      ctx.clearRect(0, 0, width, height);

      // Base radius calculation
      const baseRadius = 40;
      const isIdle = voiceState === 'idle';
      const isConnecting = voiceState === 'connecting';
      const isThinking = voiceState === 'thinking';
      const isSpeaking = voiceState === 'ora-speaking';
      const isActive = voiceState === 'active' || isSpeaking || isThinking;

      // Audio reactive amplitude
      const amp = isSpeaking
        ? 6 + (energyLevel / 100) * 14
        : isThinking
        ? 5
        : isActive
        ? 3 + (energyLevel / 100) * 8
        : isConnecting
        ? 4
        : 1.5;

      const speedMult = isSpeaking ? 1.8 : isThinking ? 1.6 : isConnecting ? 1.5 : 1.0;

      // ── Draw Outer Fluid Glow ──
      const outerGlow = ctx.createRadialGradient(cx, cy, baseRadius * 0.4, cx, cy, baseRadius * 1.5);
      if (isSpeaking) {
        outerGlow.addColorStop(0, 'rgba(200, 240, 49, 0.45)'); // Electric Lime Center
        outerGlow.addColorStop(0.5, 'rgba(0, 229, 255, 0.25)'); // Cyan Edge
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isThinking) {
        outerGlow.addColorStop(0, 'rgba(180, 120, 255, 0.45)'); // Purple / Violet Thinking
        outerGlow.addColorStop(0.6, 'rgba(0, 210, 255, 0.30)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isActive) {
        outerGlow.addColorStop(0, 'rgba(0, 210, 255, 0.40)'); // Cyan Active
        outerGlow.addColorStop(0.6, 'rgba(100, 150, 255, 0.15)'); // Blue
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isConnecting) {
        outerGlow.addColorStop(0, 'rgba(150, 100, 255, 0.35)'); // Purple Connecting
        outerGlow.addColorStop(0.7, 'rgba(0, 220, 255, 0.15)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        outerGlow.addColorStop(0, 'rgba(0, 200, 255, 0.20)'); // Subtle Cyan Idle
        outerGlow.addColorStop(0.7, 'rgba(50, 100, 200, 0.08)');
        outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw Organic Multilayer Wave Mesh (Layer 1: Deep Plasma) ──
      ctx.save();
      ctx.beginPath();
      const points = 36;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const n1 = Math.sin(theta * 3 + t * speedMult * 1.2);
        const n2 = Math.cos(theta * 2 - t * speedMult * 0.9);
        const r = baseRadius + (n1 + n2) * (amp * 0.7);
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const innerGrad1 = ctx.createLinearGradient(0, 0, width, height);
      if (isSpeaking) {
        innerGrad1.addColorStop(0, '#C8F031'); // Lime
        innerGrad1.addColorStop(0.5, '#00E5FF'); // Cyan
        innerGrad1.addColorStop(1, '#0055FF'); // Deep Blue
      } else if (isActive) {
        innerGrad1.addColorStop(0, '#00F5D4'); // Mint/Cyan
        innerGrad1.addColorStop(0.6, '#00BBF9'); // Electric Blue
        innerGrad1.addColorStop(1, '#3A0CA3'); // Deep Violet
      } else {
        innerGrad1.addColorStop(0, '#00B4D8');
        innerGrad1.addColorStop(0.7, '#0077B6');
        innerGrad1.addColorStop(1, '#03045E');
      }
      ctx.fillStyle = innerGrad1;
      ctx.fill();
      ctx.restore();

      // ── Layer 2: Fast Shifting Surface Ripple ──
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const n3 = Math.sin(theta * 4 - t * speedMult * 1.5);
        const n4 = Math.cos(theta * 3 + t * speedMult * 1.1);
        const r = baseRadius * 0.82 + (n3 + n4) * (amp * 0.5);
        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const innerGrad2 = ctx.createRadialGradient(cx, cy, 5, cx, cy, baseRadius * 0.9);
      if (isSpeaking) {
        innerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); // Pure Bright Center
        innerGrad2.addColorStop(0.4, 'rgba(200, 240, 49, 0.85)');
        innerGrad2.addColorStop(1, 'rgba(0, 229, 255, 0.1)');
      } else {
        innerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        innerGrad2.addColorStop(0.4, 'rgba(0, 245, 212, 0.7)');
        innerGrad2.addColorStop(1, 'rgba(0, 119, 182, 0.1)');
      }
      ctx.fillStyle = innerGrad2;
      ctx.fill();
      ctx.restore();

      // ── Layer 3: Central Glowing Energy Nucleus ──
      ctx.save();
      const nucleusRadius = 8 + (energyLevel / 100) * 10;
      const nucleusGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusRadius);
      nucleusGrad.addColorStop(0, '#FFFFFF');
      nucleusGrad.addColorStop(0.5, isSpeaking ? 'rgba(200, 240, 49, 0.8)' : 'rgba(0, 255, 255, 0.8)');
      nucleusGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = nucleusGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, nucleusRadius, 0, Math.PI * 2);
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
  const router = useRouter();
  const pathname = usePathname();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [liveUtterance, setLiveUtterance] = useState<string>('');
  const [liveSpeaker, setLiveSpeaker] = useState<'user' | 'agent' | null>(null);
  const [userMicLevel, setUserMicLevel] = useState(0);
  const [speakingLevel, setSpeakingLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const pageHistoryRef = useRef<string[]>([pathname || '/']);
  const lastSentPathRef = useRef<string>(pathname || '/');

  // Real-time dynamic page & browsing context sync (only when route actually changes)
  useEffect(() => {
    const current = pathname || '/';
    const history = pageHistoryRef.current;
    if (history[history.length - 1] !== current) {
      history.push(current);
      if (history.length > 8) history.shift();
    }

    if (lastSentPathRef.current !== current) {
      lastSentPathRef.current = current;
      if (voiceState === 'active' || voiceState === 'ora-speaking') {
        liveClientRef.current?.sendContextUpdate({
          currentPath: current,
          title: typeof document !== 'undefined' ? document.title : '',
          history: pageHistoryRef.current,
        });
      }
    }
  }, [pathname, voiceState]);

  // ── Auto-sync landing page telemetry on mount ─────────────────────────────
  useEffect(() => {
    try {
      const apiBase = getApiUrl();
      const title = document.title || 'ORA AI Platform';
      const headings: Array<{ level: string; text: string }> = [];
      document.querySelectorAll('h1, h2, h3').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt && txt.length < 150) {
          headings.push({ level: el.tagName.toLowerCase(), text: txt });
        }
      });

      const bodyText = (document.body.innerText || '')
        .replace(/\s+/g, ' ')
        .slice(0, 4000);

      fetch(`${apiBase}/api/v1/ingestion/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-key': PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          url: window.location.href,
          pathname: window.location.pathname,
          title,
          headings,
          bodyTextSnippet: bodyText,
          contacts: {
            emails: ['sales@ora.ai', 'support@ora.ai'],
            links: ['https://github.com/enamul/ora'],
          },
        }),
      }).catch(() => {});
    } catch {}
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      liveClientRef.current?.stop();
    };
  }, []);

  // ── Initiate full live voice session ───────────────────────────────────────
  const handleStart = useCallback(async () => {
    setVoiceState('connecting');
    setErrorMsg('');
    setLiveUtterance('');
    setLiveSpeaker(null);
    setIsMuted(false);
    setShowTranscript(true);

    const sessionId = `sess_landing_${Math.random().toString(36).slice(2, 9)}`;
    const apiBaseUrl = getApiUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    try {
      const client = new GeminiLiveClient({
        publishableKey: PUBLISHABLE_KEY,
        sessionId,
        apiBaseUrl,
        authToken: token || undefined,
        clientContext: {
          currentPath: pathname || '/',
          title: typeof document !== 'undefined' ? document.title : '',
          history: pageHistoryRef.current,
        },
        onStatusChange: (status) => {
          if (status === 'connecting') setVoiceState('connecting');
          else if (status === 'thinking') setVoiceState('thinking');
          else if (status === 'listening' || status === 'connected') setVoiceState('active');
          else if (status === 'speaking') setVoiceState('ora-speaking');
          else if (status === 'error') setVoiceState('error');
          else if (status === 'idle') setVoiceState('idle');
        },
        onTranscript: (sender, text) => {
          if (sender === 'agent') {
            setLiveSpeaker('agent');
            setLiveUtterance(text);
            setShowTranscript(true);
          } else if (sender === 'user') {
            setLiveSpeaker('user');
            setLiveUtterance(text);
            setShowTranscript(true);
          }
        },
        onAudioLevel: (level) => {
          if (voiceState === 'ora-speaking') {
            setSpeakingLevel(level);
          } else {
            setUserMicLevel(level);
          }
        },
        onAction: (action) => {
          if (action?.type === 'navigate' && action.destination) {
            let dest = action.destination.trim();
            if (dest === '/register' || dest === '/signup' || dest === '/auth/register') {
              dest = '/auth?mode=register';
            } else if (dest === '/login' || dest === '/signin' || dest === '/auth/login') {
              dest = '/auth?mode=login';
            } else if (dest === '/home' || dest === '/landing') {
              dest = '/';
            }

            if (dest.startsWith('#')) {
              const el = document.querySelector(dest);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            } else if (dest.startsWith('/')) {
              if (typeof window !== 'undefined') {
                const currentFull = window.location.pathname + window.location.search;
                if (currentFull !== dest) {
                  router.push(dest);
                }
              }
            }
          }
        },
        onError: (errMessage) => {
          setErrorMsg(errMessage);
          setVoiceState('error');
        },
      });

      liveClientRef.current = client;
      await client.start();
    } catch (err: any) {
      console.error('[OrbWidget] Direct GeminiLiveClient start failed:', err);
      setErrorMsg(err.message || 'Could not connect to Voice Gateway');
      setVoiceState('error');
    }
  }, [pathname, router, voiceState]);

  // ── Global event trigger support (e.g. from Hero CTA button) ───────────────
  const voiceStateRef = useRef<VoiceState>(voiceState);
  voiceStateRef.current = voiceState;

  useEffect(() => {
    const handleTrigger = () => {
      if (voiceStateRef.current === 'idle' || voiceStateRef.current === 'error') {
        handleStart();
      }
    };
    window.addEventListener('ora-trigger-voice', handleTrigger);
    return () => window.removeEventListener('ora-trigger-voice', handleTrigger);
  }, [handleStart]);

  const handleStop = useCallback(() => {
    liveClientRef.current?.stop();
    setVoiceState('idle');
    setLiveUtterance('');
    setLiveSpeaker(null);
    setUserMicLevel(0);
    setSpeakingLevel(0);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    liveClientRef.current?.setMuted(nextMuted);
  }, [isMuted]);

  // ── Toggle orb click ───────────────────────────────────────────────────────
  const handleOrbClick = () => {
    if (voiceState === 'idle' || voiceState === 'error') {
      handleStart();
    } else {
      handleStop();
    }
  };

  const isThinking = voiceState === 'thinking';
  const isConnecting = voiceState === 'connecting';
  const isSpeaking = voiceState === 'ora-speaking';
  const isActive = voiceState === 'active' || isSpeaking || isThinking;

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
            <div className={`lp-orb-island-pill active ${isSpeaking ? 'speaking' : voiceState === 'thinking' ? 'thinking' : ''}`}>
              <div className="lp-orb-island-status">
                <span
                  className={`lp-orb-status-dot ${
                    isSpeaking
                      ? 'speaking'
                      : voiceState === 'thinking'
                      ? 'thinking'
                      : isMuted
                      ? 'muted'
                      : 'listening'
                  }`}
                />
                <span className="lp-orb-island-status-text">
                  {isSpeaking
                    ? 'ORA is speaking…'
                    : voiceState === 'thinking'
                    ? 'Thinking…'
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
                  onClick={handleToggleMute}
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
                  onClick={handleStop}
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
