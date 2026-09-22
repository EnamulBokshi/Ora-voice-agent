'use client';

import React from 'react';
import {
  Code2,
  ShieldCheck,
  Layers,
  Zap,
  Gauge,
} from 'lucide-react';

export function Start2Bento() {
  return (
    <section className="s2b-section" id="features" aria-label="Built for your store">
      <div className="wrap">
        {/* ── Editorial Header (No subheading or CTA button per request) ── */}
        <div className="s2b-header">
          <h2 className="s2b-title">Built for your store</h2>
        </div>

        {/* ── 6-Column Responsive Bento Grid ── */}
        <div className="grid">

          {/* ── CARD 1 (Span 3): Catalogue & inventory sync ── */}
          <div className="c w3">
            <div className="viz">
              <div className="vtop">
                <span className="lbl">Sync</span>
                <span className="mono">webhook &middot; continuous</span>
              </div>
              <div className="fill">
                <svg
                  viewBox="0 0 380 150"
                  fill="none"
                  aria-hidden="true"
                  style={{ maxHeight: '150px' }}
                >
                  <g stroke="var(--s2b-border)" className="s2b-flow-line">
                    <path d="M104 39 H 150 V 75 H 170" />
                    <path d="M104 111 H 150 V 75 H 170" />
                    <path d="M276 39 H 230 V 75 H 210" />
                    <path d="M276 111 H 230 V 75 H 210" />
                  </g>
                  {/* Central ORA Hub */}
                  <circle
                    cx="190"
                    cy="75"
                    r="20"
                    fill="var(--s2b-accent-bg)"
                    stroke="var(--s2b-accent)"
                    strokeWidth="1.5"
                    className="s2b-ora-circle"
                  />
                  <text
                    x="190"
                    y="79"
                    textAnchor="middle"
                    fill="var(--s2b-accent)"
                    fontFamily="var(--font-heading, sans-serif)"
                    fontSize="11"
                    fontWeight="800"
                    letterSpacing="0.08em"
                  >
                    ORA
                  </text>
                  {/* Surrounding Resource Boxes */}
                  <g fill="none" stroke="var(--s2b-border)">
                    <rect x="0" y="24" width="104" height="30" rx="5" />
                    <rect x="0" y="96" width="104" height="30" rx="5" />
                    <rect x="276" y="24" width="104" height="30" rx="5" />
                    <rect x="276" y="96" width="104" height="30" rx="5" />
                  </g>
                  {/* Labels */}
                  <g fill="var(--s2b-text-primary)" fontFamily="var(--font-sans, sans-serif)" fontSize="13" fontWeight="600">
                    <text x="14" y="44">Products</text>
                    <text x="14" y="116">Stock levels</text>
                    <text x="290" y="44">Pricing</text>
                    <text x="290" y="116">Policies</text>
                  </g>
                  {/* Active Terminal Dots */}
                  <g fill="var(--s2b-accent)" className="s2b-dot-pulse">
                    <circle cx="108" cy="39" r="2.5" />
                    <circle cx="108" cy="111" r="2.5" />
                    <circle cx="272" cy="39" r="2.5" />
                    <circle cx="272" cy="111" r="2.5" />
                  </g>
                </svg>
              </div>
            </div>
            <div className="body">
              <h2>Catalogue &amp; inventory sync</h2>
              <p>
                Shopify, WooCommerce, or any product feed. Stock and policies stay current without scheduled imports.
              </p>
            </div>
          </div>

          {/* ── CARD 2 (Span 3): Real-time telemetry ── */}
          <div className="c w3">
            <div className="viz">
              <div className="vtop">
                <span className="lbl">Turn latency</span>
                <span className="fig">
                  312 <small>ms median</small>
                </span>
              </div>
              <div className="fill">
                <svg
                  viewBox="0 0 460 104"
                  fill="none"
                  aria-hidden="true"
                  style={{ maxHeight: '104px' }}
                >
                  <line
                    x1="0"
                    y1="26"
                    x2="460"
                    y2="26"
                    stroke="var(--s2b-border)"
                    strokeDasharray="2 5"
                  />
                  <text
                    x="0"
                    y="19"
                    fill="var(--s2b-text-muted)"
                    fontFamily="var(--font-mono, monospace)"
                    fontSize="11"
                  >
                    350 ms
                  </text>
                  {/* Continuous Telemetry Wave */}
                  <path
                    d="M0 68 C 60 60, 86 78, 142 70 S 232 48, 276 60 S 364 78, 416 66 L 460 72"
                    stroke="var(--s2b-accent)"
                    strokeWidth="2"
                  />
                  <circle cx="460" cy="72" r="3.5" fill="var(--s2b-accent)" className="s2b-beacon" />
                </svg>
                <div className="hrs">
                  <span style={{ left: 0 }}>30 days</span>
                  <span style={{ left: '100%', transform: 'translateX(-100%)' }}>today</span>
                </div>
              </div>
            </div>
            <div className="body">
              <h2>Real-time telemetry</h2>
              <p>
                Speech turn latency, question accuracy, and revenue attributed to voice, measured per session.
              </p>
            </div>
          </div>

          {/* ── CARD 3 (Span 2): In-call checkout ── */}
          <div className="c w2">
            <div className="viz">
              <div className="vtop">
                <span className="lbl">One conversation</span>
                <span className="mono">1:08</span>
              </div>
              <div className="fill">
                <ul className="steps">
                  <li>
                    <i>1</i>
                    <span>Added to cart</span>
                    <em>0:42</em>
                  </li>
                  <li>
                    <i>2</i>
                    <span>Stock confirmed</span>
                    <em>0:55</em>
                  </li>
                  <li>
                    <i>3</i>
                    <span>Checkout link sent</span>
                    <em>1:08</em>
                  </li>
                </ul>
              </div>
            </div>
            <div className="body">
              <h2>In-call checkout</h2>
              <p>
                The agent completes the purchase path without handing the shopper off.
              </p>
            </div>
          </div>

          {/* ── CARD 4 (Span 2): One script tag (KEEPS INSTALL ICONS) ── */}
          <div className="c w2">
            <div className="viz">
              <div className="vtop">
                <span className="lbl">Install</span>
                <span className="mono">18 KB &middot; async</span>
              </div>
              <div className="fill">
                <div className="radial">
                  <div className="arcclip">
                    <div className="arc a2" />
                    <div className="arc a1" />
                  </div>
                  <div className="spokes">
                    <div className="spoke" style={{ transform: 'rotate(-60deg)' }} />
                    <div className="spoke" style={{ transform: 'rotate(-20deg)' }} />
                    <div className="spoke" style={{ transform: 'rotate(20deg)' }} />
                    <div className="spoke" style={{ transform: 'rotate(60deg)' }} />
                  </div>
                  <div className="hub">
                    <Code2 size={20} className="s2b-mono-icon" />
                  </div>
                  {/* Satellite Chips with Identical Accent Coloring */}
                  <div className="node" style={{ ['--dx' as string]: '-59px', ['--dy' as string]: '34px' }}>
                    <span className="chip" title="Shadow DOM isolation">
                      <ShieldCheck size={14} className="s2b-mono-icon" />
                    </span>
                  </div>
                  <div className="node" style={{ ['--dx' as string]: '-23px', ['--dy' as string]: '64px' }}>
                    <span className="chip" title="No theme conflicts">
                      <Layers size={14} className="s2b-mono-icon" />
                    </span>
                  </div>
                  <div className="node" style={{ ['--dx' as string]: '23px', ['--dy' as string]: '64px' }}>
                    <span className="chip" title="Async load">
                      <Zap size={14} className="s2b-mono-icon" />
                    </span>
                  </div>
                  <div className="node" style={{ ['--dx' as string]: '59px', ['--dy' as string]: '34px' }}>
                    <span className="chip" title="No PageSpeed impact">
                      <Gauge size={14} className="s2b-mono-icon" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="body">
              <h2>One script tag</h2>
              <p>
                Shadow DOM isolation, so no theme conflicts. Loads async, with no PageSpeed impact.
              </p>
            </div>
          </div>

          {/* ── CARD 5 (Span 2): After hours ── */}
          <div className="c w2">
            <div className="viz">
              <div className="vtop">
                <span className="lbl">Coverage</span>
                <span className="mono">24 / 7</span>
              </div>
              <div className="fill">
                <div className="hours">
                  <div className="on" title="After-hours auto recovery" />
                  <div className="on" title="After-hours auto recovery" />
                  <div className="on" title="After-hours auto recovery" />
                  <div className="on" title="After-hours auto recovery" />
                  <div className="off" title="Staff hours" />
                  <div className="off" title="Staff hours" />
                  <div className="off" title="Staff hours" />
                  <div className="off" title="Staff hours" />
                  <div className="off" title="Staff hours" />
                  <div className="off" title="Staff hours" />
                  <div className="on" title="Evening sales recovery" />
                  <div className="on" title="Evening sales recovery" />
                </div>
                <div className="hrs">
                  <span style={{ left: 0 }}>12 am</span>
                  <span style={{ left: '33.33%' }}>8 am</span>
                  <span style={{ left: '83.33%' }}>8 pm</span>
                </div>
              </div>
            </div>
            <div className="body">
              <h2>After hours</h2>
              <p>
                Answers questions, recovers sold-out drop-offs, and handles returns when the store is closed.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
