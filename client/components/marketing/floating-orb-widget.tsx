'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { GeminiLiveClient } from '@/services/gemini-live-client';
import { getVoiceTicketApi } from '@/services/voice-service';

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

// ─── Section Tracking Configuration ──────────────────────────────────────────

/** Label used before any section is in view, and after every navigation. */
const TOP_OF_PAGE = 'Top of Page';

/** Candidate sections. Any `section[id]` counts, plus the landing page anchors. */
const SECTION_SELECTOR =
  'section[id], [id="hero"], [id="features"], [id="solutions"], [id="docs"], [id="stats"], [id="testimonials"], [id="pricing"], [id="faq"], [id="cta"]';

/** Spoken-friendly names for the landing page anchors. */
const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero / Introduction Section',
  features: 'Why ORA / Platform Features Section',
  solutions: 'Solutions & Capabilities Section',
  docs: 'Storefront Setup & Docs Section',
  stats: 'Performance Stats & Sub-400ms Metrics Section',
  testimonials: 'Customer Testimonials Section',
  pricing: 'Pricing & Plans Section',
  faq: 'FAQ Section',
  cta: 'Call To Action / Stop Losing Sales Section',
};

/**
 * How long scrolling must be still before the visitor's position is reported.
 * Scrolling the page end to end should tell ORA where the visitor landed, not
 * narrate every section crossed on the way.
 */
const SCROLL_SETTLE_MS = 400;

/**
 * Routes ORA can send a visitor to. router.push does not prefetch, so without
 * warming these the visitor waits on an RSC round trip after ORA has already
 * said "taking you there".
 */
const NAVIGABLE_ROUTES = ['/', '/pricing', '/docs', '/auth'];

/**
 * Anchors ORA may ask for that are not sections of the landing page. Pricing
 * and solutions are their own routes, so scrolling for them would find nothing
 * and the visitor would watch the page sit still.
 */
const ANCHOR_ROUTE_FALLBACKS: Record<string, string> = {
  pricing: '/pricing',
  plans: '/pricing',
  solutions: '/solutions',
  docs: '/docs',
  documentation: '/docs',
};

/** An anchor may not be mounted yet; retry before giving up on it. */
const ANCHOR_RETRY_MS = 250;

/** How long the details review card waits, with no activity, before closing itself. */
const REVIEW_IDLE_MS = 10000;
const ANCHOR_MAX_RETRIES = 2;

/** A page may still be streaming in when the route changes; retry briefly. */
const SECTION_MOUNT_RETRY_MS = 300;
const SECTION_MOUNT_MAX_RETRIES = 5;

// ─── Main Floating Orb Widget Component ──────────────────────────────────────

export function FloatingOrbWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Detect if running inside any iframe (e.g., Shopify Admin embedded app)
  const [isIframe, setIsIframe] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return window.top !== window.self;
      } catch {
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (window.top !== window.self) {
          setIsIframe(true);
        }
      } catch {
        setIsIframe(true);
      }
    }
  }, []);

  const isShopifyEmbedded =
    pathname?.startsWith('/shopify') ||
    Boolean(searchParams?.get('shop')) ||
    Boolean(searchParams?.get('embedded')) ||
    Boolean(searchParams?.get('id_token')) ||
    Boolean(searchParams?.get('host')) ||
    isIframe;

  const isDashboardOrPortal =
    isShopifyEmbedded ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/setup') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/live-desk') ||
    pathname?.startsWith('/agent') ||
    pathname?.startsWith('/conversations') ||
    pathname?.startsWith('/orders') ||
    pathname?.startsWith('/customers') ||
    pathname?.startsWith('/billing') ||
    pathname?.startsWith('/usage') ||
    pathname?.startsWith('/profile') ||
    pathname?.startsWith('/verify-otp') ||
    pathname?.startsWith('/reset-password');

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [liveUtterance, setLiveUtterance] = useState<string>('');
  const [liveSpeaker, setLiveSpeaker] = useState<'user' | 'agent' | null>(null);
  const [userMicLevel, setUserMicLevel] = useState(0);
  const [speakingLevel, setSpeakingLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  // The island above the orb shows only what needs the visitor's attention:
  // connecting, an error, a session-ending warning, or that the session ended.
  const [sessionNotice, setSessionNotice] = useState<{ kind: 'warning' | 'ended'; text: string } | null>(null);
  const sessionNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  // Not state: the label is never rendered, only read when a context update is
  // sent, so a ref keeps it current without re-rendering the orb on scroll.
  const activeSectionRef = useRef<string>(TOP_OF_PAGE);

  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCardHoveredRef = useRef(false);
  // Read when the auto-dismiss timer fires, and by `close_details` from ORA,
  // both of which run outside the render that set them.
  const isEditingDetailsRef = useRef(false);
  const customerDetailsRef = useRef(customerDetails);
  useEffect(() => {
    isEditingDetailsRef.current = isEditingDetails;
    customerDetailsRef.current = customerDetails;
  }, [isEditingDetails, customerDetails]);
  const pageHistoryRef = useRef<string[]>([pathname || '/']);
  const lastSentPathRef = useRef<string>(pathname || '/');

  const cancelAutoDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  /**
   * The review card is closed by the visitor or by ORA (`close_details`). This
   * is only the fallback: it closes the card after REVIEW_IDLE_MS with no
   * activity. Pointer over the card, an open editor, or conversation keeps it
   * up — each fire while the card is in use simply re-arms.
   */
  const armAutoDismiss = useCallback(() => {
    cancelAutoDismiss();
    const tick = () => {
      if (isCardHoveredRef.current || isEditingDetailsRef.current) {
        autoDismissTimerRef.current = setTimeout(tick, REVIEW_IDLE_MS);
        return;
      }
      autoDismissTimerRef.current = null;
      setShowConfirmModal(false);
    };
    autoDismissTimerRef.current = setTimeout(tick, REVIEW_IDLE_MS);
  }, [cancelAutoDismiss]);

  /** Activity while the card is up restarts its idle countdown. */
  const bumpAutoDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) armAutoDismiss();
  }, [armAutoDismiss]);

  /**
   * Scroll to an in-page anchor, and fall back rather than doing nothing when
   * it is absent. ORA is told the page moved either way, so an anchor that
   * quietly resolves to nothing is the one failure the visitor actually
   * notices: she says "jumping to pricing" and the page sits still.
   */
  const goToAnchor = useCallback(
    (rawDest: string) => {
      if (typeof document === 'undefined') return;
      const id = rawDest.replace(/^#/, '').trim();
      if (!id) return;

      // If we are on /docs, dispatch custom event so DocsPageClient un-filters categories and scrolls
      if (pathname === '/docs' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('docs-scroll-to', { detail: id }));
      }

      let attempt = 0;

      function tryScroll() {
        const docAliases: Record<string, string> = {
          shopify: 'shopify-setup',
          woocommerce: 'woocommerce-setup',
          woo: 'woocommerce-setup',
          nocode: 'nocode-setup',
          attributes: 'widget-attributes',
          voice: 'voice-language',
          catalog: 'catalog-sync',
          policies: 'store-policies',
          policy: 'store-policies',
          snippets: 'embed-snippets',
          embed: 'embed-snippets',
          launch: 'pre-launch',
          checklist: 'pre-launch',
          troubleshoot: 'troubleshooting',
        };
        const resolvedId = docAliases[id.toLowerCase()] || id;

        const el =
          document.getElementById(id) ||
          document.getElementById(id.toLowerCase()) ||
          document.getElementById(resolvedId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        // The section may still be streaming in after a navigation.
        if (attempt++ < ANCHOR_MAX_RETRIES) {
          setTimeout(tryScroll, ANCHOR_RETRY_MS);
          return;
        }

        // Not on this page at all: it either lives on its own route, or on the
        // landing page the visitor came from.
        const route = ANCHOR_ROUTE_FALLBACKS[id.toLowerCase()];
        if (route) {
          router.push(route);
          return;
        }

        // CRITICAL: Only fall back to landing page if the anchor actually exists on the landing page!
        // Never kick the visitor back to the home page for a non-landing-page anchor.
        const LANDING_PAGE_ANCHORS = new Set([
          'hero',
          'features',
          'solutions',
          'docs',
          'stats',
          'testimonials',
          'cta',
        ]);
        if (pathname !== '/' && LANDING_PAGE_ANCHORS.has(id.toLowerCase())) {
          router.push(`/#${id}`);
        }
      }

      tryScroll();
    },
    [router, pathname],
  );

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

  // Viewport section tracking. Whichever section fills most of the reading band
  // is reported to ORA as browsing context, so it has to survive navigation,
  // late-mounting pages and fast scrolling without spamming the live session.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // A new route means the previous page's section is no longer where the
    // visitor is. Without this reset the stale label rides along on the next
    // context update and tells ORA the visitor is somewhere they already left.
    activeSectionRef.current = TOP_OF_PAGE;

    let observer: IntersectionObserver | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let mountTimer: ReturnType<typeof setTimeout> | null = null;
    let retriesLeft = SECTION_MOUNT_MAX_RETRIES;

    // How much of the reading band each section currently covers, keyed by id.
    // Height, not intersectionRatio: a full-height hero covers the whole band
    // while occupying only a small fraction of itself, and would otherwise
    // always lose to a short block that fits entirely inside the band.
    const bandCoverage = new Map<string, number>();

    const publishActiveSection = () => {
      settleTimer = null;
      let bestId = '';
      let bestHeight = 0;
      bandCoverage.forEach((height, id) => {
        if (height > bestHeight) {
          bestHeight = height;
          bestId = id;
        }
      });
      if (!bestId) return;

      const label = SECTION_LABELS[bestId] || `#${bestId} Section`;
      if (activeSectionRef.current === label) return;

      activeSectionRef.current = label;
      if (voiceStateRef.current === 'active' || voiceStateRef.current === 'ora-speaking') {
        liveClientRef.current?.sendContextUpdate({
          currentPath: pathname || '/',
          title: typeof document !== 'undefined' ? document.title : '',
          history: pageHistoryRef.current,
          activeSection: label,
        });
      }
    };

    const handleEntries = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        const id = entry.target.id;
        if (!id) continue;
        if (entry.isIntersecting && entry.intersectionRect.height > 0) {
          bandCoverage.set(id, entry.intersectionRect.height);
        } else {
          bandCoverage.delete(id);
        }
      }
      // Report where the visitor settled, not every section crossed on the way.
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(publishActiveSection, SCROLL_SETTLE_MS);
    };

    const attach = () => {
      mountTimer = null;
      const sectionElements = document.querySelectorAll(SECTION_SELECTOR);
      if (sectionElements.length === 0) {
        // The route may have changed before the new page finished streaming in.
        if (retriesLeft-- > 0) {
          mountTimer = setTimeout(attach, SECTION_MOUNT_RETRY_MS);
        }
        return;
      }
      const io = new IntersectionObserver(handleEntries, {
        rootMargin: '-20% 0px -40% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      });
      sectionElements.forEach((el) => io.observe(el));
      observer = io;
    };

    attach();

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      if (mountTimer) clearTimeout(mountTimer);
      observer?.disconnect();
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

  // ── Warm the routes ORA can navigate to ───────────────────────────────────
  useEffect(() => {
    const warmRoutes = () => {
      for (const route of NAVIGABLE_ROUTES) {
        try {
          router.prefetch(route);
        } catch {
          // Prefetch is an optimisation; a failure must never break the orb.
        }
      }
    };

    // Never compete with the first paint or with connecting the voice session.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (typeof idle === 'function') {
      idle(warmRoutes);
      return;
    }
    const timer = setTimeout(warmRoutes, 1500);
    return () => clearTimeout(timer);
  }, [router]);

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
      }).catch(() => { });
    } catch { }
  }, []);

  const isMountedRef = useRef(true);

  const clearSessionNotice = useCallback(() => {
    if (sessionNoticeTimerRef.current) {
      clearTimeout(sessionNoticeTimerRef.current);
      sessionNoticeTimerRef.current = null;
    }
    setSessionNotice(null);
  }, []);

  const showSessionNotice = useCallback((kind: 'warning' | 'ended', text: string) => {
    if (sessionNoticeTimerRef.current) clearTimeout(sessionNoticeTimerRef.current);
    setSessionNotice({ kind, text });
    sessionNoticeTimerRef.current = setTimeout(
      () => {
        sessionNoticeTimerRef.current = null;
        if (isMountedRef.current) setSessionNotice(null);
      },
      kind === 'warning' ? 12000 : 5000,
    );
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (sessionNoticeTimerRef.current) clearTimeout(sessionNoticeTimerRef.current);
      liveClientRef.current?.stop(true);
    };
  }, []);

  // ── Initiate full live voice session ───────────────────────────────────────
  const userStoppedRef = useRef(false);
  const autoStartedRef = useRef(false);

  const handleStart = useCallback(async (isAutoOption?: boolean | React.MouseEvent) => {
    const isAuto = isAutoOption === true;
    setVoiceState('connecting');
    setErrorMsg('');
    setLiveUtterance('');
    setLiveSpeaker(null);
    clearSessionNotice();

    const sessionId = `sess_landing_${Math.random().toString(36).slice(2, 9)}`;
    try {
      sessionStorage.setItem('ora_landing_session_id', sessionId);
    } catch { }
    const apiBaseUrl = getApiBase();
    // A logged-in merchant gets a `visitor` ticket so the platform assistant can
    // greet them by name. Anyone else, or a failed request, is a plain visitor.
    const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
    const ticket = isLoggedIn ? await getVoiceTicketApi('visitor').catch(() => undefined) : undefined;
    try {
      const client = new GeminiLiveClient({
        publishableKey: PUBLISHABLE_KEY,
        sessionId,
        apiBaseUrl,
        ticket,
        clientContext: {
          currentPath: pathname || '/',
          title: typeof document !== 'undefined' ? document.title : '',
          history: pageHistoryRef.current,
          activeSection: activeSectionRef.current || TOP_OF_PAGE,
        },
        onStatusChange: (status) => {
          if (!isMountedRef.current) return;
          if (status === 'connecting') setVoiceState('connecting');
          else if (status === 'thinking') setVoiceState('thinking');
          else if (status === 'listening' || status === 'connected') setVoiceState('active');
          else if (status === 'speaking') setVoiceState('ora-speaking');
          else if (status === 'error') {
            try { sessionStorage.removeItem('ora_landing_session_id'); } catch { }
            if (isAuto) {
              setVoiceState('idle');
            } else {
              setVoiceState('error');
            }
          }
          else if (status === 'idle') {
            try { sessionStorage.removeItem('ora_landing_session_id'); } catch { }
            setVoiceState('idle');
          }
        },
        onTranscript: (sender, text) => {
          if (!isMountedRef.current) return;
          if (sender === 'agent' || sender === 'user') {
            // Talk while the review card is up is most likely about the card.
            bumpAutoDismiss();
          }
          if (sender === 'agent') {
            setLiveSpeaker('agent');
            setLiveUtterance(text);
          } else if (sender === 'user') {
            setLiveSpeaker('user');
            setLiveUtterance(text);
            // The visitor answered, so an "are you still there?" is moot.
            setSessionNotice((current) => (current?.kind === 'warning' ? null : current));
          }
        },
        onSessionNotice: ({ kind, message }) => {
          if (!isMountedRef.current) return;
          showSessionNotice(kind, message);
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
          if (action?.type === 'shopify_add_to_cart') {
            // ORA's own marketing site has no Shopify cart. The client already reports
            // the miss back to the server so the agent corrects itself; nothing to do
            // here but stay out of the way.
            console.info(
              '[ORA] Ignoring shopify_add_to_cart: this page is not a merchant storefront.',
            );
            return;
          }
          if (action?.type === 'apply_coupon' && action.couponCode) {
            // The agent only carries the code across; the checkout page revalidates it
            // against the server and shows the real total. Parking it in localStorage
            // means a visitor who still has to sign up keeps their code.
            const code = String(action.couponCode).toUpperCase();
            try {
              window.localStorage.setItem('ora.pendingCoupon', code);
            } catch { }

            const planId = action.planId ? String(action.planId) : '';
            const dest = `/billing/checkout?${planId ? `planId=${encodeURIComponent(planId)}&` : ''}coupon=${encodeURIComponent(code)}`;

            if (window.location.pathname === '/billing/checkout') {
              // Already on the form: let the page pick the code up without a reload.
              document.dispatchEvent(
                new CustomEvent('ora:coupon:apply', { detail: { couponCode: code } }),
              );
            } else {
              try {
                router.prefetch(dest);
              } catch { }
              router.push(dest);
            }
            return;
          }
          if (action?.type === 'close_details') {
            // ORA heard the visitor confirm, or ask to close the card.
            if (action.confirmed) {
              handleConfirmSuccess(customerDetailsRef.current);
            } else {
              setShowConfirmModal(false);
              setIsEditingDetails(false);
              cancelAutoDismiss();
            }
            return;
          }
          if (action?.type === 'confirm_details' && action.data) {
            const data = action.data;
            setCustomerDetails((prev) => ({ ...prev, ...data }));
            setHighlightField(Object.keys(data)[0] || null);
            setShowConfirmModal(true);
            setIsEditingDetails(false);
            setIsDetailsConfirmed(false);
            armAutoDismiss();
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
              goToAnchor(dest);
            } else if (dest.startsWith('/')) {
              if (dest.includes('#')) {
                const [pathPart, hashPart] = dest.split('#');
                if (typeof window !== 'undefined') {
                  const currentPath = window.location.pathname;
                  if (pathPart && pathPart !== currentPath) {
                    try {
                      router.prefetch(pathPart);
                    } catch { }
                    router.push(dest);
                    setTimeout(() => goToAnchor(hashPart), 350);
                  } else {
                    goToAnchor(hashPart);
                  }
                }
              } else {
                if (typeof window !== 'undefined') {
                  const currentFull = window.location.pathname + window.location.search;
                  if (currentFull !== dest) {
                    try {
                      router.prefetch(dest);
                    } catch { }
                    router.push(dest);
                  }
                }
              }
            }
          }
        },
        onError: (errMessage) => {
          if (!isMountedRef.current) return;
          if (isAuto) {
            console.warn('[OrbWidget] Auto-start mic/audio deferred until user gesture:', errMessage);
            setVoiceState('idle');
          } else {
            setErrorMsg(errMessage);
            setVoiceState('error');
          }
        },
      });

      liveClientRef.current = client;
      await client.start();
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('[OrbWidget] Direct GeminiLiveClient start failed:', err);
      if (isAuto) {
        setVoiceState('idle');
      } else {
        setErrorMsg(err.message || 'Could not connect to Voice Gateway');
        setVoiceState('error');
      }
    }
  }, [
    pathname,
    router,
    armAutoDismiss,
    bumpAutoDismiss,
    cancelAutoDismiss,
    handleConfirmSuccess,
    goToAnchor,
    clearSessionNotice,
    showSessionNotice,
  ]);

  // ── Auto-greet visitor on landing page visit or reload ──────────────────────
  useEffect(() => {
    // Only auto-greet on the public landing page root ('/'), and never in dashboard/admin/shopify
    if (pathname !== '/' || isDashboardOrPortal) {
      autoStartedRef.current = false;
      return;
    }

    // Do not re-auto-start if user explicitly stopped ORA or if already started for this visit
    if (userStoppedRef.current || autoStartedRef.current) {
      return;
    }

    autoStartedRef.current = true;

    const timer = setTimeout(() => {
      if (!isMountedRef.current || userStoppedRef.current) return;
      if (voiceStateRef.current === 'idle') {
        handleStart(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [pathname, isDashboardOrPortal, handleStart]);

  // ── AudioContext Gesture Unlocker for browser autoplay policies ────────────
  useEffect(() => {
    const unlockAudio = () => {
      liveClientRef.current?.resumeAudio();
    };
    window.addEventListener('click', unlockAudio, { capture: true, once: true });
    window.addEventListener('touchstart', unlockAudio, { capture: true, once: true });
    window.addEventListener('pointerdown', unlockAudio, { capture: true, once: true });
    window.addEventListener('keydown', unlockAudio, { capture: true, once: true });
    return () => {
      window.removeEventListener('click', unlockAudio, { capture: true });
      window.removeEventListener('touchstart', unlockAudio, { capture: true });
      window.removeEventListener('pointerdown', unlockAudio, { capture: true });
      window.removeEventListener('keydown', unlockAudio, { capture: true });
    };
  }, []);

  // ── Global event trigger support (e.g. from Hero CTA button) ───────────────
  const voiceStateRef = useRef<VoiceState>(voiceState);
  voiceStateRef.current = voiceState;

  useEffect(() => {
    const handleTrigger = () => {
      if (voiceStateRef.current === 'idle' || voiceStateRef.current === 'error') {
        userStoppedRef.current = false;
        handleStart(false);
      }
    };
    window.addEventListener('ora-trigger-voice', handleTrigger);
    return () => window.removeEventListener('ora-trigger-voice', handleTrigger);
  }, [handleStart]);

  const handleStop = useCallback(() => {
    // Cancelling a connection that never opened is not the end of a session.
    const wasLive = voiceStateRef.current !== 'connecting' && voiceStateRef.current !== 'idle';
    userStoppedRef.current = true;
    try {
      sessionStorage.removeItem('ora_landing_session_id');
    } catch { }

    // A live session ends with ORA saying goodbye. The orb stays live while
    // it does, and the client reports `idle` and the "ended" notice once the
    // goodbye has played. A second click while ORA is signing off, or a
    // session with no open socket, stops at once.
    const client = liveClientRef.current;
    if (wasLive && client && !client.isEnding && client.endWithGoodbye()) {
      setShowConfirmModal(false);
      cancelAutoDismiss();
      return;
    }

    liveClientRef.current?.stop();
    setVoiceState('idle');
    setLiveUtterance('');
    setLiveSpeaker(null);
    setUserMicLevel(0);
    setSpeakingLevel(0);
    setShowConfirmModal(false);
    cancelAutoDismiss();
    if (wasLive) showSessionNotice('ended', 'Session ended');
  }, [cancelAutoDismiss, showSessionNotice]);

  // ── Toggle orb click ───────────────────────────────────────────────────────
  const handleOrbClick = () => {
    if (voiceState === 'idle' || voiceState === 'error') {
      userStoppedRef.current = false;
      handleStart(false);
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

  // Only hide inside Shopify Admin iframe or when embedded in an external iframe
  if (isShopifyEmbedded) {
    return null;
  }

  return (
    <div className="lp-orb-root" aria-label="ORA AI Voice Assistant">
      {/* ── Interactive Customer Details Confirmation Modal ── */}
      {showConfirmModal && (
        <div
          className="lp-orb-confirm-card"
          aria-live="polite"
          onMouseEnter={() => {
            isCardHoveredRef.current = true;
          }}
          onMouseLeave={() => {
            isCardHoveredRef.current = false;
            bumpAutoDismiss();
          }}
          onInput={bumpAutoDismiss}
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
                  bumpAutoDismiss();
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
                    bumpAutoDismiss();
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
                    bumpAutoDismiss();
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

      {/* ── Floating Island: only states that need attention. While the
          session is live the orb itself shows who is speaking, and a click on
          it ends the session. ── */}
      {(isConnecting || voiceState === 'error' || sessionNotice) && (
        <div className="lp-orb-island-container">
          {isConnecting ? (
            <div className="lp-orb-island-pill connecting">
              <span className="lp-orb-status-dot connecting" />
              <span className="lp-orb-shimmer-text">Connecting to ORA</span>
            </div>
          ) : voiceState === 'error' ? (
            <button
              type="button"
              className="lp-orb-island-pill error"
              onClick={() => handleStart(false)}
              aria-label="Retry connection"
            >
              <span className="lp-orb-status-dot error" />
              <span>{errorMsg ? (errorMsg.length > 40 ? errorMsg.slice(0, 40) + '…' : errorMsg) : 'Connection error — Click to retry'}</span>
            </button>
          ) : sessionNotice ? (
            <div className="lp-orb-island-pill" role="status" aria-live="polite">
              <span className={`lp-orb-status-dot ${sessionNotice.kind === 'warning' ? 'muted' : 'idle'}`} />
              <span className="lp-orb-island-status-text">{sessionNotice.text}</span>
            </div>
          ) : null}
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
