'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

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

// Quadratic Bezier Curve coordinates:
// P0 = (100, 210), P1 = (500, -30), P2 = (900, 210)
// x(t) = 100 + 800 * t
// y(t) = 210 - 480 * t * (1 - t)
function getCurvePoint(t: number) {
  const clampedT = Math.max(0, Math.min(1, t));
  const x = 100 + 800 * clampedT;
  const y = 210 - 480 * clampedT * (1 - clampedT);
  return { x, y };
}

// Slot definitions mapped by relative offset from the middle apex (offset 0)
interface SlotConfig {
  t: number;
  r: number;
  opacity: number;
  scale: number;
  isMiddle: boolean;
}

function getSlotConfig(offset: number): SlotConfig {
  switch (offset) {
    case 0:
      // Middle apex (Active Platform)
      return { t: 0.50, r: 26, opacity: 1, scale: 1, isMiddle: true };
    case -1:
      // Left 1
      return { t: 0.26, r: 19, opacity: 0.85, scale: 0.85, isMiddle: false };
    case 1:
      // Right 1
      return { t: 0.74, r: 19, opacity: 0.85, scale: 0.85, isMiddle: false };
    case -2:
      // Left 2
      return { t: 0.08, r: 16, opacity: 0.5, scale: 0.7, isMiddle: false };
    case 2:
      // Right 2
      return { t: 0.92, r: 16, opacity: 0.5, scale: 0.7, isMiddle: false };
    case -3:
      // Exit Left Wing
      return { t: 0.00, r: 14, opacity: 0, scale: 0.5, isMiddle: false };
    case 3:
      // Entrance Right Wing
      return { t: 1.00, r: 14, opacity: 0, scale: 0.5, isMiddle: false };
    default:
      // Off-screen
      return offset < 0
        ? { t: 0.01, r: 12, opacity: 0, scale: 0.3, isMiddle: false }
        : { t: 0.99, r: 12, opacity: 0, scale: 0.3, isMiddle: false };
  }
}

function renderPlatformIcon(id: string, size = 18) {
  switch (id) {
    case 'shopify':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
          <path
            d="M19.8 6.4c-.1-.3-.3-.4-.5-.4h-2.1c-.2-1.3-.9-3.7-3.1-4.8C13.2.7 12.3.5 11.5.5c-2.4 0-4.1 1.7-4.6 4.3-.9.3-1.6.5-1.7.5-.5.2-.6.7-.7 1.1L2 21.6c-.1.5.2 1 .7 1.1h15.9c.5 0 1-.4 1.1-1l2.4-15.3c0-.3-.1-.7-.3-1zm-6.2-4.1c1.4.7 1.9 2.4 2.1 3.5H9.6c.4-1.9 1.6-3.5 4-3.5zm-2.4 12.1c-.4.4-1 .4-1.4 0l-2.1-2.1c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0l1.4 1.4 4.3-4.3c.4-.4 1-.4 1.4 0 .4.4.4 1 0 1.4l-5 5z"
            fill="currentColor"
          />
        </svg>
      );
    case 'stripe':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
          <path d="M13.976 9.15c0-.86-.684-1.196-1.828-1.196-1.637 0-3.696.53-5.068 1.307l-.76-3.837c1.472-.644 3.738-1.077 5.952-1.077 5.08 0 8.35 2.457 8.35 6.643 0 6.452-8.868 5.419-8.868 8.213 0 .977.854 1.328 2.067 1.328 1.83 0 4.18-.724 5.674-1.603l.764 3.868c-1.666.744-4.04 1.157-6.52 1.157-5.32 0-8.625-2.584-8.625-6.73 0-6.758 8.86-5.59 8.86-8.07z" />
        </svg>
      );
    case 'woo':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
          <path d="M2.2 4h19.6C23 4 24 5 24 6.2v10.5c0 1.3-1 2.3-2.2 2.3H5.8L2 21.8V6.2C2 5 3 4 4.2 4zm4.1 8.8c.4 1 .8 1.8 1.4 2.2.5.4 1.1.5 1.7.2.4-.2.8-.7 1.1-1.3.4.7.8 1.2 1.2 1.4.5.2 1.1.2 1.6-.1.6-.4 1.1-1.2 1.5-2.3l1.9-5.7h-2.2l-1.3 4.4c-.2.7-.4 1.1-.6 1.2-.2.1-.4 0-.6-.3l-1.4-5.3H9.8l-1.4 5.3c-.2.3-.4.4-.6.3-.2-.1-.4-.5-.6-1.2L5.9 7.2H3.7l2.6 5.6z" />
        </svg>
      );
    case 'webflow':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
          <path d="M16.92 5.5l-3.35 13H8.38L10.9 9.3h-.08L7.75 14H3.5L7.25 5.5h4.84l-2.07 4.67h.08l2.5-4.67h4.32zM20.5 5.5L18.15 14h-3.12l1.9-8.5H20.5z" />
        </svg>
      );
    case 'klaviyo':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.15" />
          <path d="M7 6h3v12H7zm4.5 4.5l5.5-4.5h3.5L14 12l6.5 6h-3.5l-5.5-4.5z" fill="currentColor" />
        </svg>
      );
    case 'hubspot':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
          <path d="M18.5 7.5a2.5 2.5 0 0 0-2.22 1.36L12.9 7.08a2.5 2.5 0 1 0-1.8 0L7.72 8.86A2.5 2.5 0 1 0 7.5 11.5c.23 0 .45-.03.66-.09l3.34 1.86a2.5 2.5 0 1 0 1 0l3.34-1.86c.21.06.43.09.66.09a2.5 2.5 0 1 0 2-3.5z" />
        </svg>
      );
    case 'salesforce':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>
      );
    case 'slack':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path fill="currentColor" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
          <path fill="currentColor" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
          <path fill="currentColor" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
          <path fill="currentColor" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
        </svg>
      );
    default:
      return null;
  }
}

export function Start2Testimonial() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fade, setFade] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const switchIndex = (newIdx: number) => {
    const wrapped = (newIdx + PLATFORMS.length) % PLATFORMS.length;
    if (wrapped === activeIdx) return;
    setFade(true);
    setTimeout(() => {
      setActiveIdx(wrapped);
      setFade(false);
    }, 180);
  };

  const prev = () => switchIndex(activeIdx - 1);
  const next = () => switchIndex(activeIdx + 1);

  // Smooth automatic slideshow cycling every 4.2s
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setActiveIdx((current) => (current + 1) % PLATFORMS.length);
        setFade(false);
      }, 180);
    }, 4200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const currentPlatform = PLATFORMS[activeIdx];

  return (
    <section
      className="s2-cas-section"
      id="reviews"
      role="region"
      aria-label="Connect, automate, and scale with merchant platforms"
    >
      <div className="s2-container">

        {/* ── Section Header (outside the card) ── */}
        <div className="s2-section-head text-center">
          <h2 className="s2-cas-title">
            Connect, Automate, and Scale
          </h2>
          <p className="s2-cas-sub">
            ORA integrates effortlessly with your favorite platforms, ensuring a smooth and automated workflow.
          </p>
        </div>

        {/* ── Main Showcase Card with Smooth Curved Arch Slideshow ── */}
        <div className="s2-arch-showcase-card">

          {/* Interactive Curved Bridge Canvas */}
          <div className="s2-arch-viewport">
            <svg
              className="s2-arch-svg"
              viewBox="0 0 1000 240"
              preserveAspectRatio="xMidYMid meet"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                {/* Arc Gradient: Cyan -> Amber -> Lime -> Emerald -> Cyan */}
                <linearGradient id="s2-arch-curve-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#C8F031" stopOpacity="0.06" />
                  <stop offset="30%" stopColor="#C8F031" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#C8F031" stopOpacity="0.95" />
                  <stop offset="70%" stopColor="#C8F031" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#C8F031" stopOpacity="0.06" />
                </linearGradient>

                {/* Energy Pulse Filter */}
                <filter id="s2-arch-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Parabolic Guide Curve: P0(100, 210) Q(500, -30) P2(900, 210) */}
              <path
                d="M 100 210 Q 500 -30 900 210"
                stroke="url(#s2-arch-curve-gradient)"
                strokeWidth="2"
                fill="none"
              />

              {/* Animated Flow Track */}
              <path
                d="M 100 210 Q 500 -30 900 210"
                stroke="rgba(200, 240, 49, 0.28)"
                strokeWidth="1.5"
                strokeDasharray="6 12"
                className="s2-arch-flow-pulse"
                fill="none"
              />

              {/* Delicate Background Rail */}
              <path
                d="M 100 210 Q 500 -30 900 210"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1"
                fill="none"
              />

              {/* Left Terminal Anchor (Developer API) */}
              <g transform="translate(82, 216)">
                <circle cx="0" cy="0" r="14" fill="#141414" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <path
                  d="M-4 -3 L-7 0 L-4 3 M4 -3 L7 0 L4 3 M1 -4 L-1 4"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* Right Terminal Anchor (Live Sync Webhook) */}
              <g transform="translate(918, 216)">
                <circle cx="0" cy="0" r="14" fill="#141414" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <circle cx="0" cy="0" r="4" fill="#C8F031" />
              </g>

              {/* ── Dynamic Platform Nodes Gliding Along the Curve ── */}
              {PLATFORMS.map((platform, pIdx) => {
                // Compute shortest modular offset from activeIdx: -4, -3, -2, -1, 0, 1, 2, 3
                let offset = ((pIdx - activeIdx + PLATFORMS.length + Math.floor(PLATFORMS.length / 2)) % PLATFORMS.length) - Math.floor(PLATFORMS.length / 2);
                const slot = getSlotConfig(offset);
                const { x, y } = getCurvePoint(slot.t);
                const isMiddle = slot.isMiddle;

                return (
                  <g
                    key={platform.id}
                    className={`s2-arch-platform-node ${isMiddle ? 'middle-active' : 'side-node'}`}
                    style={{
                      transform: `translate(${x}px, ${y}px) scale(${slot.scale})`,
                      opacity: slot.opacity,
                      pointerEvents: slot.opacity > 0.3 ? 'auto' : 'none',
                    }}
                    onClick={() => switchIndex(pIdx)}
                  >
                    {/* Pulsing Aura Rings for Middle Apex Platform */}
                    {isMiddle && (
                      <>
                        <circle
                          cx="0"
                          cy="0"
                          r="36"
                          fill="none"
                          stroke="#C8F031"
                          strokeOpacity="0.2"
                          strokeWidth="1.5"
                          className="s2-hub-aura-pulse"
                        />
                        <circle
                          cx="0"
                          cy="0"
                          r="31"
                          fill="none"
                          stroke="#C8F031"
                          strokeOpacity="0.4"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                          className="s2-hub-aura-spin"
                        />
                      </>
                    )}

                    {/* Node Circle - Centered mathematically on the curve at (0, 0) */}
                    <circle
                      cx="0"
                      cy="0"
                      r={slot.r}
                      fill={isMiddle ? '#1E231B' : '#141518'}
                      stroke={isMiddle ? '#C8F031' : 'rgba(255, 255, 255, 0.18)'}
                      strokeWidth={isMiddle ? 2.5 : 1}
                      filter={isMiddle ? 'drop-shadow(0 2px 10px rgba(0,0,0,0.6))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))'}
                      className="s2-node-bg-circle"
                    />

                    {/* Embedded Platform Logo */}
                    <foreignObject
                      x={-slot.r}
                      y={-slot.r}
                      width={slot.r * 2}
                      height={slot.r * 2}
                      className="pointer-events-none"
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        {renderPlatformIcon(platform.id, isMiddle ? 24 : slot.r > 19 ? 18 : 14)}
                      </div>
                    </foreignObject>

                    {/* Active Middle Platform Title Badge */}
                    {isMiddle && (
                      <g transform="translate(0, 54)" className="s2-middle-badge">
                        <rect
                          x="-44"
                          y="-9"
                          width="88"
                          height="18"
                          rx="3"
                          fill="#0D0D0D"
                          stroke="rgba(200, 240, 49, 0.5)"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill="#C8F031"
                          fontSize="10"
                          fontWeight="700"
                          fontFamily="var(--font-mono, monospace)"
                          letterSpacing="0.05em"
                        >
                          {platform.name.toUpperCase()}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ── Testimonial Quote Card (Synchronized with Middle Active Platform) ── */}
          <div
            className={`s2-arch-quote-card ${fade ? 'fade-out' : 'fade-in'}`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Top Meta Tag */}
            <div className="s2-arch-tag-pill">
              <span className="s2-arch-tag-dot" />
              <span>{currentPlatform.tag}</span>
            </div>

            <p className="s2-arch-quote-text">
              &ldquo;{currentPlatform.quote}&rdquo;
            </p>

            <div className="s2-arch-author-row">
              <div
                className="s2-arch-author-avatar"
                style={{ backgroundColor: currentPlatform.color || '#C8F031' }}
              >
                <span>{currentPlatform.initials}</span>
              </div>
              <div className="s2-arch-author-meta">
                <span className="s2-arch-author-name">{currentPlatform.author}</span>
                <span className="s2-arch-author-role">
                  {currentPlatform.role} &middot;{' '}
                  <strong className="text-lime-400 font-semibold">{currentPlatform.platform}</strong>
                </span>
              </div>

              {/* Navigation Controls: Previous / Next & Live Progress Dots */}
              <div className="s2-arch-controls">
                <button
                  type="button"
                  onClick={prev}
                  className="s2-arch-nav-btn"
                  aria-label="Previous integration review"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="s2-arch-dots">
                  {PLATFORMS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => switchIndex(idx)}
                      className={`s2-arch-dot ${activeIdx === idx ? 'active' : ''}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={next}
                  className="s2-arch-nav-btn"
                  aria-label="Next integration review"
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
