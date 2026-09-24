'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The Command Center — port of `ora-hero-v2.html` from the ORA Design System
 * project, replacing the video-controller dashboard that sat here before.
 *
 * Kept exactly as designed: the three views, the three-second auto-advance, the
 * click-to-switch that restarts the loop, the 500ms opacity-and-lift view
 * transition, and the 1.5s staggered waveform.
 *
 * Changed only as the brief asked: the source's oklch palette is replaced by
 * the dashboard's own slate-charcoal scale from globals.css (.dark) — canvas
 * #131418, sidebar #0E0F12, cards #1A1C22, borders #252831 — and its
 * Google-Fonts stack by Inter and JetBrains Mono. The design set its metric
 * numerals in Newsreader at weight 300; the dashboard uses no serif at all and
 * renders figures as semibold sans with tabular numerals, so these follow the
 * dashboard rather than the design.
 *
 * The figures shown belong to one example account. They are labelled as such
 * beneath the frame, because PRODUCT.md records that ORA has no customer
 * volume or revenue data of its own to publish.
 */

const VIEWS = ['overview', 'livedesk', 'conversations'] as const;
type ViewId = (typeof VIEWS)[number];

const TITLES: Record<ViewId, string> = {
  overview: 'Overview',
  livedesk: 'Live Desk',
  conversations: 'Conversations',
};

const ADVANCE_MS = 3000;

const NAV: { label: string; view?: ViewId; pulse?: boolean }[] = [
  { label: 'Overview', view: 'overview' },
  { label: 'Live Desk', view: 'livedesk', pulse: true },
  { label: 'Conversations', view: 'conversations' },
  { label: 'Agent configuration' },
];

const SUB_ITEMS = ['System prompt', 'Documents', 'Widget embed'];
const TAIL_NAV = ['Orders', 'Customers'];

export function Start2CommandCenter() {
  const [active, setActive] = useState(0);
  const timer = useRef<number | null>(null);

  const startLoop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = window.setInterval(
      () => setActive((i) => (i + 1) % VIEWS.length),
      ADVANCE_MS,
    );
  }, []);

  useEffect(() => {
    startLoop();
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [startLoop]);

  // Clicking a nav item switches immediately and restarts the timer, so the
  // next auto-advance is a full interval away rather than whatever remained.
  const go = (i: number) => {
    setActive(i);
    startLoop();
  };

  const stopLoop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const currentId = VIEWS[active];

  return (
    <div
      className="cc"
      id="live-desk-simulation"
      onMouseEnter={stopLoop}
      onMouseLeave={startLoop}
      onFocusCapture={stopLoop}
      onBlurCapture={startLoop}
    >
      <div className="cc-app">
        {/* ── Sidebar ── */}
        <aside className="cc-side">
          <div className="cc-brand" aria-hidden="true">
            <span className="cc-logo">O</span>
            <span>
              <b>ORA</b>
              <span>Command Center</span>
            </span>
          </div>

          <nav className="cc-nav">
            {NAV.map((n) => {
              const idx = n.view ? VIEWS.indexOf(n.view) : -1;
              if (idx < 0) {
                // Decorative: no handler, so it is chrome rather than a control.
                return (
                  <div className="cc-item cc-item-static" key={n.label} aria-hidden="true">
                    {n.label}
                  </div>
                );
              }
              const on = idx === active;
              return (
                <button
                  type="button"
                  key={n.label}
                  className={`cc-item${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => go(idx)}
                >
                  {n.label}
                  {n.pulse && <span className="cc-pulse" aria-hidden="true" />}
                </button>
              );
            })}

            <div className="cc-sub" aria-hidden="true">
              {SUB_ITEMS.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>

            {TAIL_NAV.map((t) => (
              <div className="cc-item cc-item-static" key={t} aria-hidden="true">
                {t}
              </div>
            ))}
          </nav>

          <div className="cc-user" aria-hidden="true">
            <span className="cc-av">A</span>
            <span>
              <b>Auni</b>
              <span>Acme Home Goods</span>
            </span>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="cc-main">
          <div className="cc-bar">
            <h3>{TITLES[currentId]}</h3>
            <div className="cc-status">
              <span className="cc-pulse" />
              Voice agent online · 3 live sessions
            </div>
            <span className="cc-date">Tuesday, 22 September</span>
          </div>

          <div className="cc-stage">
            {/* Overview */}
            <div
              className={`cc-view${currentId === 'overview' ? ' on' : ''}`}
              inert={currentId !== 'overview' ? true : undefined}
            >
              <div className="cc-kpis">
                {[
                  ['Attributed revenue', '$18,420', '+14.8% this week'],
                  ['Assisted orders', '212', '+9.1% this week'],
                  ['Conversations', '1,420', 'Last 7 days'],
                  ['Catalogue items', '1,204', 'Synced 14 s ago'],
                ].map(([l, v, e]) => (
                  <div className="cc-k" key={l}>
                    <span className="cc-lbl">{l}</span>
                    <b>{v}</b>
                    <em>{e}</em>
                  </div>
                ))}
              </div>

              <div className="cc-chart">
                <div className="cc-ctop">
                  <span className="cc-lbl">Attributed revenue</span>
                  <div className="cc-seg">
                    <span className="on">Daily</span>
                    <span>Weekly</span>
                  </div>
                </div>
                <div className="cc-plot">
                  <svg viewBox="0 0 700 180" preserveAspectRatio="none" fill="none" aria-hidden="true">
                    <g stroke="var(--cc-grid)">
                      <line x1="0" y1="45" x2="700" y2="45" />
                      <line x1="0" y1="90" x2="700" y2="90" />
                      <line x1="0" y1="135" x2="700" y2="135" />
                    </g>
                    <path
                      d="M0 150 C 70 142, 110 128, 175 132 S 280 104, 350 96 S 470 78, 525 62 S 640 40, 700 28"
                      stroke="var(--cc-chart)"
                      strokeWidth="1.6"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      d="M0 150 C 70 142, 110 128, 175 132 S 280 104, 350 96 S 470 78, 525 62 S 640 40, 700 28 L 700 180 L 0 180 Z"
                      fill="var(--cc-accent-wash)"
                    />
                  </svg>
                  <div className="cc-axis">
                    <span>Sep 16</span>
                    <span>Sep 18</span>
                    <span>Sep 20</span>
                    <span>Sep 22</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Desk */}
            <div
              className={`cc-view${currentId === 'livedesk' ? ' on' : ''}`}
              inert={currentId !== 'livedesk' ? true : undefined}
            >
              <div className="cc-desk">
                <div className="cc-shoppers">
                  <div className="cc-dhead">
                    <span className="cc-lbl">Active shoppers</span>
                    <span className="cc-mono">3</span>
                  </div>
                  {[
                    ['Joe R.', '02:14', 'Dining tables · Seattle', true],
                    ['Mara K.', '00:38', 'Rugs · 3×5 runner', false],
                    ['Devon L.', '00:11', 'Lighting · returns', false],
                  ].map(([n, t, d, on]) => (
                    <div className={`cc-srow${on ? ' on' : ''}`} key={n as string}>
                      <b>{n}</b>
                      <time>{t}</time>
                      <p>{d}</p>
                    </div>
                  ))}
                </div>

                <div className="cc-session">
                  <div className="cc-thtop">
                    <b>Joe R. · voice</b>
                    <span className="cc-mono">298 ms turn</span>
                  </div>
                  <div className="cc-wave" aria-hidden="true">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <i key={i} style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }} />
                    ))}
                  </div>
                  <span className="cc-who">Shopper</span>
                  <div className="cc-msg">Can you deliver the oak table to Seattle by Friday?</div>
                  <span className="cc-who">ORA</span>
                  <div className="cc-msg">
                    Freight arrives in three to five business days, so yes. White-glove delivery is
                    included.
                  </div>
                  <div className="cc-order">
                    <span>Oak Table, 6-seater · checkout link sent</span>
                    <b>$890</b>
                  </div>
                </div>

                <div className="cc-rail">
                  <div className="cc-dhead">
                    <span className="cc-lbl">Live conversions</span>
                    <span className="cc-mono">today</span>
                  </div>
                  {[
                    ['Recommendations', '48', '80%'],
                    ['Items added', '31', '62%'],
                    ['Checkouts', '19', '38%'],
                    ['Orders placed', '12', '24%'],
                  ].map(([l, v, w]) => (
                    <div className="cc-m" key={l}>
                      <span>{l}</span>
                      <em>{v}</em>
                      <span className="cc-track">
                        <i style={{ width: w }} />
                      </span>
                    </div>
                  ))}
                  <div className="cc-dhead cc-dhead-gap">
                    <span className="cc-lbl">Service health</span>
                    <span className="cc-mono">operational</span>
                  </div>
                  {[
                    ['Voice gateway', '27 ms'],
                    ['Stream engine', '27 ms'],
                    ['Catalogue', '7 ms'],
                  ].map(([l, v]) => (
                    <div className="cc-h" key={l}>
                      <span>{l}</span>
                      <em>{v}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Conversations */}
            <div
              className={`cc-view${currentId === 'conversations' ? ' on' : ''}`}
              inert={currentId !== 'conversations' ? true : undefined}
            >
              <div className="cc-convs">
                <div className="cc-list">
                  <div className="cc-tabs">
                    <b>All 10</b>
                    <span>Live 3</span>
                    <span>Archived 7</span>
                  </div>
                  {[
                    ['Joe R.', '4 d', 'Can you deliver the oak table to Seattle?', true],
                    ['Mara K.', 'Sep 19', 'Does the runner come in a 3 by 5?', false],
                    ['Devon L.', 'Sep 18', 'Return window on the floor lamp.', false],
                    ['Priya S.', 'Sep 18', 'Is the walnut finish back in stock?', false],
                    ['Tom A.', 'Sep 17', 'Shipping to Canada on two chairs.', false],
                  ].map(([n, t, p, on]) => (
                    <div className={`cc-row${on ? ' on' : ''}`} key={n as string}>
                      <b>{n}</b>
                      <time>{t}</time>
                      <p>{p}</p>
                    </div>
                  ))}
                </div>

                <div className="cc-thread">
                  <div className="cc-thtop">
                    <b>Joe R.</b>
                    <span className="cc-mono">#CONV-1GRN6 · closed</span>
                  </div>
                  <span className="cc-who">ORA</span>
                  <div className="cc-msg">
                    Standard freight to Seattle takes three to five business days, so it arrives
                    before Friday.
                  </div>
                  <span className="cc-who r">Joe</span>
                  <div className="cc-msg me">And white-glove delivery?</div>
                  <span className="cc-who">ORA</span>
                  <div className="cc-msg">
                    Included at no extra charge on orders over $500. I can send a checkout link now.
                  </div>
                  <div className="cc-mono cc-thread-foot">
                    Shipping matrix · SKU OAK-6S · 14 messages
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
