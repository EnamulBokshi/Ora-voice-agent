'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Connect, Automate, and Scale — redesigned on the mechanics of
 * `ora-integrations.html` from the ORA Design System.
 *
 * The information is unchanged: the same eight platforms, the same tags,
 * quotes, authors, roles and brand colours that were here before. Only the
 * design changed — per curve is what the layout math sits on, but the nodes
 * are now real HTML buttons positioned by a resize-aware layout function
 * (as the design does it) instead of SVG `<foreignObject>` groups, and each
 * icon goes from grayscale to full colour as it nears the centre, exactly as
 * the source does.
 *
 * The dark card is coloured from the dashboard's own slate-charcoal scale
 * (globals.css `.dark`) rather than the ad-hoc blacks the previous version
 * used, and text follows this project's default type: Space Grotesk for the
 * heading, Inter for everything else, no italics.
 */

interface PlatformItem {
  id: string;
  name: string;
  tag: string;
  quote: string;
  author: string;
  role: string;
  platform: string;
  initials: string;
  color: string;
}

const PLATFORMS: PlatformItem[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    tag: 'Shopify Plus · Direct Voice Checkout',
    quote:
      'ORA has transformed how we engage night visitors. Inquiries get answered in real-time with zero hallucinations, saving our team 15+ hours per week. The best voice AI tool we have used.',
    author: 'Elena Rostova',
    role: 'Founder, Sonus Studio',
    platform: 'Shopify Plus',
    initials: 'ER',
    color: '#95BF47',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    tag: 'Stripe Checkout · Sub-350ms Engine',
    quote:
      'Direct voice-to-checkout via Stripe cut our cart abandonment by 34%. Customers complete purchases directly during the voice call with zero page hops or friction.',
    author: 'John Drove',
    role: 'CEO, GrowthHub',
    platform: 'Stripe Payments',
    initials: 'JD',
    color: '#635BFF',
  },
  {
    id: 'woo',
    name: 'WooCommerce',
    tag: 'WooCommerce · Live Inventory Sync',
    quote:
      'Shoppers ask very specific technical specs before spending $250+ on gear. ORA answers in under 300ms, verifies WooCommerce stock live, and drops instant checkout links.',
    author: 'David Chen',
    role: 'Founder & CEO, Lumina Audio Lab',
    platform: 'WooCommerce',
    initials: 'DC',
    color: '#96588A',
  },
  {
    id: 'webflow',
    name: 'Webflow',
    tag: 'Webflow Store · 1 Script Tag',
    quote:
      'We embedded ORA with one script tag on Webflow. It immediately started qualifying high-ticket design inquiries, booking 38 calls in the first two weeks with zero forms.',
    author: 'Marcus Vance',
    role: 'Head of Growth, StudioVance',
    platform: 'Webflow',
    initials: 'MV',
    color: '#146EF5',
  },
  {
    id: 'klaviyo',
    name: 'Klaviyo',
    tag: 'Klaviyo + Shopify · Intent Retargeting',
    quote:
      'Over 30% of our cart additions now happen between 9 PM and 6 AM when our team is offline. ORA captures customer intent, verifies sizing, and sends shoppers to checkout.',
    author: 'Sarah Jenkins',
    role: 'Head of E-Commerce, Nordic Apparel Co.',
    platform: 'Klaviyo',
    initials: 'SJ',
    color: '#2563EB',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    tag: 'HubSpot CRM · Auto-Deal Sync',
    quote:
      'We synced ORA with our CRM in under 10 minutes. Every voice inquiry automatically logs customer intent, deal size, and preferred delivery dates right into HubSpot.',
    author: 'Liam Gallagher',
    role: 'VP Sales, OrbitTech',
    platform: 'HubSpot',
    initials: 'LG',
    color: '#FF7A59',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    tag: 'Salesforce Commerce · Enterprise B2B',
    quote:
      'For our enterprise wholesale division, ORA handles contract pricing inquiries and routes verified buyers directly to custom checkout flows with zero latency.',
    author: 'Claire Sterling',
    role: 'VP Commerce, Sterling Goods',
    platform: 'Salesforce',
    initials: 'CS',
    color: '#00A1E0',
  },
  {
    id: 'slack',
    name: 'Slack',
    tag: 'Slack Bot · Real-Time Cart Alerts',
    quote:
      'Whenever high-intent voice conversations hit high cart values, ORA drops live alerts into our Slack sales channel so reps can follow up instantly when needed.',
    author: 'Alex Rivera',
    role: 'Operations Lead, Horizon Gear',
    platform: 'Slack',
    initials: 'AR',
    color: '#E01E5A',
  },
];

function renderPlatformIcon(id: string) {
  switch (id) {
    case 'shopify':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19.8 6.4c-.1-.3-.3-.4-.5-.4h-2.1c-.2-1.3-.9-3.7-3.1-4.8C13.2.7 12.3.5 11.5.5c-2.4 0-4.1 1.7-4.6 4.3-.9.3-1.6.5-1.7.5-.5.2-.6.7-.7 1.1L2 21.6c-.1.5.2 1 .7 1.1h15.9c.5 0 1-.4 1.1-1l2.4-15.3c0-.3-.1-.7-.3-1zm-6.2-4.1c1.4.7 1.9 2.4 2.1 3.5H9.6c.4-1.9 1.6-3.5 4-3.5zm-2.4 12.1c-.4.4-1 .4-1.4 0l-2.1-2.1c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0l1.4 1.4 4.3-4.3c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4l-5 5z"
            fill="currentColor"
          />
        </svg>
      );
    case 'stripe':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.976 9.15c0-.86-.684-1.196-1.828-1.196-1.637 0-3.696.53-5.068 1.307l-.76-3.837c1.472-.644 3.738-1.077 5.952-1.077 5.08 0 8.35 2.457 8.35 6.643 0 6.452-8.868 5.419-8.868 8.213 0 .977.854 1.328 2.067 1.328 1.83 0 4.18-.724 5.674-1.603l.764 3.868c-1.666.744-4.04 1.157-6.52 1.157-5.32 0-8.625-2.584-8.625-6.73 0-6.758 8.86-5.59 8.86-8.07z" />
        </svg>
      );
    case 'woo':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M2.2 4h19.6C23 4 24 5 24 6.2v10.5c0 1.3-1 2.3-2.2 2.3H5.8L2 21.8V6.2C2 5 3 4 4.2 4zm4.1 8.8c.4 1 .8 1.8 1.4 2.2.5.4 1.1.5 1.7.2.4-.2.8-.7 1.1-1.3.4.7.8 1.2 1.2 1.4.5.2 1.1.2 1.6-.1.6-.4 1.1-1.2 1.5-2.3l1.9-5.7h-2.2l-1.3 4.4c-.2.7-.4 1.1-.6 1.2-.2.1-.4 0-.6-.3l-1.4-5.3H9.8l-1.4 5.3c-.2.3-.4.4-.6.3-.2-.1-.4-.5-.6-1.2L5.9 7.2H3.7l2.6 5.6z" />
        </svg>
      );
    case 'webflow':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.92 5.5l-3.35 13H8.38L10.9 9.3h-.08L7.75 14H3.5L7.25 5.5h4.84l-2.07 4.67h.08l2.5-4.67h4.32zM20.5 5.5L18.15 14h-3.12l1.9-8.5H20.5z" />
        </svg>
      );
    case 'klaviyo':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.15" />
          <path d="M7 6h3v12H7zm4.5 4.5l5.5-4.5h3.5L14 12l6.5 6h-3.5l-5.5-4.5z" fill="currentColor" />
        </svg>
      );
    case 'hubspot':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.5 7.5a2.5 2.5 0 0 0-2.22 1.36L12.9 7.08a2.5 2.5 0 1 0-1.8 0L7.72 8.86A2.5 2.5 0 1 0 7.5 11.5c.23 0 .45-.03.66-.09l3.34 1.86a2.5 2.5 0 1 0 1 0l3.34-1.86c.21.06.43.09.66.09a2.5 2.5 0 1 0 2-3.5z" />
        </svg>
      );
    case 'salesforce':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>
      );
    case 'slack':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" />
          <path fill="currentColor" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
          <path fill="currentColor" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" />
          <path fill="currentColor" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      );
    default:
      return null;
  }
}

const N = PLATFORMS.length;
const MID = (N - 1) / 2;
const ADVANCE_MS = 4200;

interface Slot {
  x: number;
  y: number;
  size: number;
}

export function Start2Testimonial() {
  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const slotsRef = useRef<Slot[]>([]);
  const timer = useRef<number | null>(null);
  const curRef = useRef(0);

  const [cur, setCur] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);

  // Positions every node on the arc and redraws the connecting path — the
  // design's own layout math, run on mount and on resize.
  const place = useCallback(() => {
    const slots = slotsRef.current;
    if (slots.length === 0) return;
    const midIdx = Math.round(MID);

    nodeRefs.current.forEach((n, i) => {
      if (!n) return;
      const slotIdx = (i - curRef.current + midIdx + N * 2) % N;
      const s = slots[slotIdx];
      const far = Math.round(Math.abs(slotIdx - MID));
      const isMid = slotIdx === midIdx;
      const sz = far >= 3 ? 7 : s.size;

      n.style.width = `${sz}px`;
      n.style.height = `${sz}px`;
      n.style.transform = `translate(${s.x - sz / 2}px, ${s.y - sz / 2}px)`;
      n.classList.toggle('mid', isMid);
      n.classList.toggle('dim', far >= 3);
      n.setAttribute('aria-current', isMid ? 'true' : 'false');
    });

    if (labelRef.current) {
      labelRef.current.textContent = PLATFORMS[curRef.current].name;
    }
  }, []);

  const layout = useCallback(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!stage || !svg || !path) return;

    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const pad = Math.max(30, w * 0.055);
    const span = w - pad * 2;
    const amp = Math.min(74, h * 0.36);
    const topY = h * 0.3;

    slotsRef.current = PLATFORMS.map((_, i) => {
      const t = i / (N - 1);
      const x = pad + span * t;
      const y = topY + amp * (4 * (t - 0.5) * (t - 0.5));
      const k = Math.abs(i - MID);
      const size = [54, 32, 26, 22][Math.round(k)] ?? 22;
      return { x, y, size };
    });

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    path.setAttribute(
      'd',
      slotsRef.current.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
    );
    place();
  }, [place]);

  const switchIndex = useCallback((i: number) => {
    const wrapped = ((i % N) + N) % N;
    if (wrapped === curRef.current) return;
    setFading(true);
    window.setTimeout(() => {
      curRef.current = wrapped;
      setCur(wrapped);
      setFading(false);
    }, 220);
  }, []);

  const startLoop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => switchIndex(curRef.current + 1), ADVANCE_MS);
  }, [switchIndex]);

  const stopLoop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    layout();
    window.addEventListener('resize', layout);
    if (!paused) startLoop();
    return () => {
      window.removeEventListener('resize', layout);
      stopLoop();
    };
  }, [layout, startLoop, stopLoop, paused]);

  useEffect(() => {
    place();
  }, [cur, place]);

  const active = PLATFORMS[cur];

  return (
    <section
      className="s2-cas-section"
      id="reviews"
      role="region"
      aria-label="Connect, automate, and scale with merchant platforms"
    >
      <div className="s2-container">
        <div className="s2-section-head text-center">
          <h2 className="s2-cas-title">Connect, Automate, and Scale</h2>
          <p className="s2-cas-sub">
            ORA integrates effortlessly with your favorite platforms, ensuring a smooth and
            automated workflow.
          </p>
        </div>

        <div className="s2-arch-showcase-card">
          <div className="s2-arch-viewport" ref={stageRef}>
            <svg ref={svgRef} className="s2-arch-svg" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="s2-arch-curve-gradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#C8F031" stopOpacity="0.06" />
                  <stop offset="0.5" stopColor="#C8F031" stopOpacity="0.7" />
                  <stop offset="1" stopColor="#C8F031" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              <path ref={pathRef} stroke="url(#s2-arch-curve-gradient)" strokeWidth="1.25" />
            </svg>

            {PLATFORMS.map((p, i) => (
              <button
                type="button"
                key={p.id}
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                className="s2-arch-platform-node"
                aria-label={`Show ${p.name}`}
                onClick={() => {
                  stopLoop();
                  switchIndex(i);
                  if (!paused) startLoop();
                }}
              >
                <span className="s2-node-icon" style={{ color: p.color }} aria-hidden="true">
                  {renderPlatformIcon(p.id)}
                </span>
              </button>
            ))}

            <span className="s2-arch-node-label" ref={labelRef} aria-hidden="true" />
          </div>

          <div
            className={`s2-arch-quote-card${fading ? ' fade-out' : ' fade-in'}`}
            onMouseEnter={() => {
              setPaused(true);
              stopLoop();
            }}
            onMouseLeave={() => {
              setPaused(false);
              startLoop();
            }}
          >
            <div className="s2-arch-tag-pill">
              <span className="s2-arch-tag-dot" />
              <span>{active.tag}</span>
            </div>

            <p className="s2-arch-quote-text">&ldquo;{active.quote}&rdquo;</p>

            <div className="s2-arch-author-row">
              <div className="s2-arch-author-avatar" style={{ backgroundColor: active.color }}>
                <span>{active.initials}</span>
              </div>
              <div className="s2-arch-author-meta">
                <span className="s2-arch-author-name">{active.author}</span>
                <span className="s2-arch-author-role">
                  {active.role} &middot; <strong>{active.platform}</strong>
                </span>
              </div>

              <div className="s2-arch-controls">
                <button
                  type="button"
                  onClick={() => {
                    stopLoop();
                    switchIndex(curRef.current - 1);
                    if (!paused) startLoop();
                  }}
                  className="s2-arch-nav-btn"
                  aria-label="Previous integration"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="s2-arch-dots">
                  {PLATFORMS.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        stopLoop();
                        switchIndex(idx);
                        if (!paused) startLoop();
                      }}
                      className={`s2-arch-dot${cur === idx ? ' active' : ''}`}
                      aria-label={`Go to ${p.name}`}
                      aria-current={cur === idx}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopLoop();
                    switchIndex(curRef.current + 1);
                    if (!paused) startLoop();
                  }}
                  className="s2-arch-nav-btn"
                  aria-label="Next integration"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
