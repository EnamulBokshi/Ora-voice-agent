'use client';

import React, { useEffect, useRef, useState } from 'react';

const TARGETS = [
  { name: 'Shopify',     tag: 'App Store · 1-Click' },
  { name: 'WooCommerce', tag: 'Plugin · Instant' },
  { name: 'Webflow',     tag: 'Script tag' },
  { name: 'Headless',    tag: 'API / SDK' },
];

// Coordinate system for right-side visual
// ViewBox: 720 × 440
const HUB_CX   = 110;
const HUB_CY   = 220;
const ORIGIN_X = 142;
const CTRL_X1  = 220;
const CTRL_X2  = 260;
const DOT_X    = 340;
const PILL_X   = 364;
const PILL_W   = 326;
const PILL_H   = 62;
const DOT_R    = 6;
const END_Y    = [65, 168, 272, 375];

function curvePath(y: number) {
  return `M${ORIGIN_X} ${HUB_CY} C ${CTRL_X1} ${HUB_CY}, ${CTRL_X2} ${y}, ${DOT_X} ${y}`;
}

export function Start2Capabilities() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="s2da-section"
      id="deploy"
      aria-label="One agent, any platform"
    >
      <div className="s2-container">
        <div className="s2da-row">
          {/* ── Left Column: Editorial Heading ── */}
          <div className="s2da-col-left">
            <h2 className="s2da-title">
              One agent.<br />
              Any platform.
            </h2>
          </div>

          {/* ── Right Column: Hub + Energy Flow + Platform Pills ── */}
          <div className="s2da-col-right">
            <svg
              className="s2da-svg"
              viewBox="0 0 720 440"
              fill="none"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <defs>
                <filter id="s2da-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* ── Hub: Concentric Circles with animated pulse ── */}
              <circle
                cx={HUB_CX}
                cy={HUB_CY}
                r="105"
                fill="none"
                stroke="#C8F031"
                strokeOpacity="0.12"
                strokeWidth="1.5"
                className="s2da-hub-outer"
              />
              <circle
                cx={HUB_CX}
                cy={HUB_CY}
                r="65"
                fill="none"
                stroke="#C8F031"
                strokeOpacity="0.25"
                strokeWidth="1.5"
                className="s2da-hub-mid"
              />
              <circle
                cx={HUB_CX}
                cy={HUB_CY}
                r="32"
                fill="#C8F031"
                filter="url(#s2da-glow)"
              />

              {/* ── Paths, Animated Energy Flow & Endpoint Dots ── */}
              {END_Y.map((y, i) => (
                <React.Fragment key={`path-${i}`}>
                  {/* Static underlying track */}
                  <path
                    d={curvePath(y)}
                    stroke="#C8F031"
                    strokeOpacity="0.15"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Animated energy flow pulse */}
                  <path
                    className={`s2da-path${visible ? ' animate' : ''}`}
                    d={curvePath(y)}
                    stroke="#C8F031"
                    strokeOpacity="0.85"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="16 16"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                  {/* Endpoint glowing dot */}
                  <circle
                    cx={DOT_X}
                    cy={y}
                    r={DOT_R}
                    fill="#C8F031"
                    className={`s2da-dot${visible ? ' in' : ''}`}
                    style={{ transitionDelay: `${i * 0.18 + 0.25}s` }}
                    filter="url(#s2da-glow)"
                  />
                </React.Fragment>
              ))}

              {/* ── Destination Platform Pills ── */}
              {END_Y.map((y, i) => {
                const pillY = y - PILL_H / 2;
                return (
                  <g
                    key={`pill-${i}`}
                    className={`s2da-pill-g${visible ? ' in' : ''}`}
                    style={{ transitionDelay: `${i * 0.15 + 0.18}s` }}
                  >
                    <rect
                      x={PILL_X}
                      y={pillY}
                      width={PILL_W}
                      height={PILL_H}
                      rx="12"
                      fill="#141413"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                      className="s2da-pill-rect"
                    />
                    <text
                      x={PILL_X + 24}
                      y={y + 6}
                      fontSize="18"
                      fontWeight="700"
                      fontFamily="var(--font-heading, -apple-system, sans-serif)"
                      fill="#FAFAFA"
                      letterSpacing="-0.3"
                    >
                      {TARGETS[i].name}
                    </text>
                    <text
                      x={PILL_X + PILL_W - 22}
                      y={y + 5}
                      fontSize="13"
                      fontWeight="500"
                      fontFamily="var(--font-sans, -apple-system, sans-serif)"
                      fill="rgba(255,255,255,0.38)"
                      textAnchor="end"
                      letterSpacing="0.2"
                    >
                      {TARGETS[i].tag}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
