'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { GeminiLiveClient } from '@/services/gemini-live-client';

/**
 * Voice session states — matching the NestJS VoiceProxyGateway & Gemini Live state machine
 */
export type VoiceState = 'idle' | 'connecting' | 'active' | 'thinking' | 'ora-speaking' | 'error';

// ─── Socket / API URL Resolution ──────────────────────────────────────────────
const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
  return process.env.NESTJS_BACKEND_URL || 'http://localhost:5000';
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

  // Customer Details Confirmation State
  const [customerDetails, setCustomerDetails] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isDetailsConfirmed, setIsDetailsConfirmed] = useState(false);
  const [highlightField, setHighlightField] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('Top of Page');
  const activeSectionRef = useRef<string>('Top of Page');
  activeSectionRef.current = activeSection;

  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCardHoveredRef = useRef(false);
  const pageHistoryRef = useRef<string[]>([pathname || '/']);
  const lastSentPathRef = useRef<string>(pathname || '/');

  const cancelAutoDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  const armAutoDismiss = useCallback((delayMs = 7000) => {
    cancelAutoDismiss();
    autoDismissTimerRef.current = setTimeout(() => {
      if (!isCardHoveredRef.current) {
        setShowConfirmModal(false);
      }
    }, delayMs);
  }, [cancelAutoDismiss]);

  const handleConfirmSuccess = useCallback((details: any) => {
    setIsDetailsConfirmed(true);
    setIsEditingDetails(false);
    liveClientRef.current?.confirmCustomerDetails(details);
    setToastMsg('Details verified & saved!');
    cancelAutoDismiss();
    setTimeout(() => {
      setShowConfirmModal(false);
      setToastMsg(null);
    }, 1800);
  }, [cancelAutoDismiss]);

  // Viewport IntersectionObserver to track visible sections on the screen in real time
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sectionElements = document.querySelectorAll(
      'section[id], [id="hero"], [id="features"], [id="solutions"], [id="docs"], [id="stats"], [id="testimonials"], [id="pricing"], [id="faq"], [id="cta"]',
    );
    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        }
        if (bestEntry && bestEntry.target && bestEntry.target.id) {
          const sectionId = bestEntry.target.id;
          const labelMap: Record<string, string> = {
            hero: 'Hero / Introduction Section',
            features: 'Why ORA / Platform Features Section',
            solutions: 'Solutions & Capabilities Section',
            docs: 'Storefront Setup & Docs Section',
            stats: 'Performance Stats & Sub-400ms Metrics Section',
            testimonials: 'Customer Testimonials (Rania Sultana / FashionBD)',
            pricing: 'Pricing & Plans Section',
            faq: 'FAQ Section',
            cta: 'Call To Action / Stop Losing Sales Section',
          };
          const prettyLabel = labelMap[sectionId] || `#${sectionId} Section`;
          if (activeSectionRef.current !== prettyLabel) {
            setActiveSection(prettyLabel);
            activeSectionRef.current = prettyLabel;
            if (voiceStateRef.current === 'active' || voiceStateRef.current === 'ora-speaking') {
              liveClientRef.current?.sendContextUpdate({
                currentPath: pathname || '/',
                title: typeof document !== 'undefined' ? document.title : '',
                history: pageHistoryRef.current,
                activeSection: prettyLabel,
              });
            }
          }
        }
      },
      {
        rootMargin: '-20% 0px -40% 0px',
        threshold: [0.1, 0.3, 0.6],
      },
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

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
          activeSection: activeSectionRef.current,
        });
      }
    }
  }, [pathname, voiceState]);

  // ── Auto-sync landing page telemetry on mount ─────────────────────────────
  useEffect(() => {
    try {
      const apiBase = getApiBase();
      const title = document.title || 'ORA AI Platform';
      const headings: Array<{ level: string; text: string }> = [];
      document.querySelectorAll('h1, h2, h3').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt && txt.length < 150) {
          headings.push({ level: el.tagName.toLowerCase(), text: txt });
        }
      });

      const bodyText = (document.body.innerText || document.body.textContent || '')
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

  const isMountedRef = useRef(true);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      liveClientRef.current?.stop(true);
    };
  }, []);

  // ── Initiate full live voice session ───────────────────────────────────────
  const handleStart = useCallback(async () => {
    setVoiceState('connecting');
    setErrorMsg('');
    setLiveUtterance('');
    setLiveSpeaker(null);
    setIsMuted(false);

    const sessionId = `sess_landing_${Math.random().toString(36).slice(2, 9)}`;
    const apiBaseUrl = getApiBase();
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
          activeSection: activeSectionRef.current || 'Top of Page',
        },
        onStatusChange: (status) => {
          if (!isMountedRef.current) return;
          if (status === 'connecting') setVoiceState('connecting');
          else if (status === 'thinking') setVoiceState('thinking');
          else if (status === 'listening' || status === 'connected') setVoiceState('active');
          else if (status === 'speaking') setVoiceState('ora-speaking');
          else if (status === 'error') setVoiceState('error');
          else if (status === 'idle') setVoiceState('idle');
        },
        onTranscript: (sender, text) => {
          if (!isMountedRef.current) return;
          if (sender === 'agent') {
            setLiveSpeaker('agent');
            setLiveUtterance(text);
          } else if (sender === 'user') {
            setLiveSpeaker('user');
            setLiveUtterance(text);
          }
        },
        onAudioLevel: (level) => {
          if (!isMountedRef.current) return;
          if (voiceStateRef.current === 'ora-speaking') {
            setSpeakingLevel(level);
          } else {
            setUserMicLevel(level);
          }
        },
        onAction: (action) => {
          if (!isMountedRef.current) return;
          if (action?.type === 'confirm_details' && action.data) {
            const data = action.data;
            setCustomerDetails((prev) => ({ ...prev, ...data }));
            setHighlightField(Object.keys(data)[0] || null);
            setShowConfirmModal(true);
            setIsEditingDetails(false);
            setIsDetailsConfirmed(false);
            armAutoDismiss(8000);
            setTimeout(() => setHighlightField(null), 1500);
          }
          if (action?.type === 'navigate' && action.destination) {
            let dest = action.destination.trim();
            if (dest === '/register' || dest === '/signup' || dest === '/auth/register') {
              dest = '/auth?mode=register';
            } else if (dest === '/login' || dest === '/signin' || dest === '/auth/login') {
              dest = '/auth?mode=login';
            } else if (dest === '/home' || dest === '/landing') {
              dest = '/';
            } else if (
              dest === '/doc' ||
              dest === '/manual' ||
              dest === '/manuals' ||
              dest === '/guide' ||
              dest === '/guides' ||
              dest === '/documentation'
            ) {
              dest = '/docs';
            }

            if (dest.startsWith('#')) {
              const el = document.querySelector(dest);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else if (pathname !== '/') {
                setTimeout(() => {
                  if (isMountedRef.current) {
                    router.push(`/${dest}`);
                  }
                }, 0);
              }
            } else if (dest.startsWith('/')) {
              if (typeof window !== 'undefined') {
                const currentFull = window.location.pathname + window.location.search;
                if (currentFull !== dest) {
                  setTimeout(() => {
                    if (isMountedRef.current) {
                      router.push(dest);
                    }
                  }, 0);
                }
              }
            }
          }
        },
        onError: (errMessage) => {
          if (!isMountedRef.current) return;
          setErrorMsg(errMessage);
          setVoiceState('error');
        },
      });

      liveClientRef.current = client;
      await client.start();
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('[OrbWidget] Direct GeminiLiveClient start failed:', err);
      setErrorMsg(err.message || 'Could not connect to Voice Gateway');
      setVoiceState('error');
    }
  }, [pathname, router, armAutoDismiss]);

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
    setShowConfirmModal(false);
    cancelAutoDismiss();
  }, [cancelAutoDismiss]);

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
      {/* ── Interactive Customer Details Confirmation Modal ── */}
      {showConfirmModal && (
        <div
          className="lp-orb-confirm-card"
          aria-live="polite"
          onMouseEnter={() => {
            isCardHoveredRef.current = true;
            cancelAutoDismiss();
          }}
          onMouseLeave={() => {
            isCardHoveredRef.current = false;
            if (!isEditingDetails && !isDetailsConfirmed) {
              armAutoDismiss(3500);
            }
          }}
        >
          <div className="lp-orb-card-header">
            <div className="lp-orb-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8F031" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Review Your Information</span>
            </div>
            <div className="lp-orb-card-header-actions">
              <button
                type="button"
                className="lp-orb-icon-btn"
                onClick={() => {
                  const nextEdit = !isEditingDetails;
                  setIsEditingDetails(nextEdit);
                  if (nextEdit) {
                    cancelAutoDismiss();
                  } else {
                    armAutoDismiss(5000);
                  }
                }}
                title="Edit Information"
                aria-label="Edit"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                type="button"
                className="lp-orb-icon-btn"
                onClick={() => {
                  setShowConfirmModal(false);
                  cancelAutoDismiss();
                }}
                title="Dismiss"
                aria-label="Dismiss"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {!isEditingDetails ? (
            <div className="lp-orb-card-view">
              <div className="lp-orb-field-list">
                {customerDetails.name && (
                  <div className="lp-orb-field-row">
                    <span className="lp-orb-field-label">👤 Name</span>
                    <span className={`lp-orb-field-val ${highlightField === 'name' ? 'highlight' : ''}`}>
                      {customerDetails.name}
                    </span>
                  </div>
                )}
                {customerDetails.email && (
                  <div className="lp-orb-field-row">
                    <span className="lp-orb-field-label">✉️ Email</span>
                    <span className={`lp-orb-field-val ${highlightField === 'email' ? 'highlight' : ''}`}>
                      {customerDetails.email}
                    </span>
                  </div>
                )}
                {customerDetails.phone && (
                  <div className="lp-orb-field-row">
                    <span className="lp-orb-field-label">📞 Phone</span>
                    <span className={`lp-orb-field-val ${highlightField === 'phone' ? 'highlight' : ''}`}>
                      {customerDetails.phone}
                    </span>
                  </div>
                )}
                {customerDetails.address && (
                  <div className="lp-orb-field-row">
                    <span className="lp-orb-field-label">📍 Address</span>
                    <span className={`lp-orb-field-val ${highlightField === 'address' ? 'highlight' : ''}`}>
                      {customerDetails.address}
                    </span>
                  </div>
                )}
              </div>

              <div className="lp-orb-card-actions">
                <button
                  type="button"
                  className="lp-orb-action-btn secondary"
                  onClick={() => {
                    setIsEditingDetails(true);
                    cancelAutoDismiss();
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`lp-orb-action-btn ${isDetailsConfirmed ? 'verified' : 'primary'}`}
                  onClick={() => handleConfirmSuccess(customerDetails)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {isDetailsConfirmed ? 'Verified' : 'Confirm & Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="lp-orb-card-edit">
              <div className="lp-orb-form-group">
                <label>Name</label>
                <input
                  type="text"
                  className="lp-orb-input"
                  value={customerDetails.name || ''}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className="lp-orb-form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="lp-orb-input"
                  value={customerDetails.email || ''}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@domain.com"
                />
              </div>
              <div className="lp-orb-form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  className="lp-orb-input"
                  value={customerDetails.phone || ''}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="lp-orb-form-group">
                <label>Address / Shipping</label>
                <input
                  type="text"
                  className="lp-orb-input"
                  value={customerDetails.address || ''}
                  onChange={(e) => setCustomerDetails((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Street, City, Zip"
                />
              </div>

              <div className="lp-orb-card-actions">
                <button
                  type="button"
                  className="lp-orb-action-btn secondary"
                  onClick={() => {
                    setIsEditingDetails(false);
                    armAutoDismiss(5000);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="lp-orb-action-btn primary"
                  onClick={() => handleConfirmSuccess(customerDetails)}
                >
                  Save & Confirm
                </button>
              </div>
            </div>
          )}

          {toastMsg && (
            <div className="lp-orb-toast">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8F031" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{toastMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Unified Floating Island (Status + Controls — Only shown when NOT idle) ── */}
      {voiceState !== 'idle' && (
        <div className="lp-orb-island-container">
          {voiceState === 'connecting' && (
            <div className="lp-orb-island-pill connecting">
              <span className="lp-orb-status-dot connecting" />
              <span className="lp-orb-shimmer-text">Connecting to ORA Live…</span>
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
