'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Braces } from 'lucide-react';

/**
 * Connects to what you already run — port of `ora-integrations.html`.
 *
 * Layout, copy structure and motion follow the design: centred serif heading,
 * one panel split into an arc stage (platform nodes travelling along a
 * parabola, the centre slot lit, far slots collapsed to dots) and a quote
 * area that cross-fades per platform. Nodes carry the real platform marks
 * instead of the design's two-letter initials.
 *
 * Colours come from the page's `--s2-*` tokens, so the dark theme renders as
 * the design does and the light theme follows the rest of /start2. Type uses
 * the project's own fonts: Newsreader (--font-serif) for the heading and
 * quote, Inter for body, JetBrains Mono for the tag and label.
 */

interface Integration {
  id: string;
  name: string;
  tag: string;
  quote: string;
  author: string;
  role: string;
}

// Order matters: the list wraps around the arc, so with Shopify centred the
// neighbours read API · Square | Shopify | WooCommerce · BigCommerce.
const INTEGRATIONS: Integration[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    tag: 'catalogue sync',
    quote: 'Twelve hundred SKUs with variant-level stock. ORA never quotes a size we cannot ship.',
    author: 'Priya Raman',
    role: 'Head of Ecommerce, North Atelier',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    tag: 'live inventory',
    quote: 'Stock changes in WooCommerce reach ORA within seconds. Shoppers hear what is on the shelf now.',
    author: 'David Chen',
    role: 'Founder, Lumina Audio Lab',
  },
  {
    id: 'bigcommerce',
    name: 'BigCommerce',
    tag: 'price sync',
    quote: 'We change prices weekly. ORA has never read out last week’s number.',
    author: 'Sarah Jenkins',
    role: 'Head of Ecommerce, Nordic Apparel Co.',
  },
  {
    id: 'magento',
    name: 'Magento',
    tag: 'b2b catalogue',
    quote: 'Forty thousand parts, tiered pricing per account. ORA answers from the right price list every time.',
    author: 'Claire Sterling',
    role: 'VP Commerce, Sterling Goods',
  },
  {
    id: 'wix',
    name: 'Wix',
    tag: 'one script tag',
    quote: 'One line pasted into our Wix site and the agent was answering questions the same afternoon.',
    author: 'Marcus Vance',
    role: 'Head of Growth, StudioVance',
  },
  {
    id: 'square',
    name: 'Square',
    tag: 'in-store stock',
    quote: 'Online and in-store share one inventory. ORA tells callers which shop has their size.',
    author: 'Elena Rostova',
    role: 'Founder, Sonus Studio',
  },
  {
    id: 'api',
    name: 'Custom API',
    tag: 'manual endpoint',
    quote: 'Our catalogue lives in our own system. One endpoint, and policy and pricing stay in sync.',
    author: 'Liam Gallagher',
    role: 'VP Engineering, OrbitTech',
  },
];

/** Official brand marks (24x24, single path) from Simple Icons, CC0. */
const LOGO_PATHS: Record<string, string> = {
  shopify:
    'M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z',
  woocommerce:
    'M10.118 8.895c-.562 0-.928.183-1.255.797l-1.49 2.811v-2.496c0-.745-.353-1.111-1.007-1.111s-.928.222-1.255.85l-1.412 2.757v-2.47c0-.797-.327-1.137-1.124-1.137H.954C.34 8.895 0 9.183 0 9.706s.327.837.928.837h.667v3.15c0 .889.601 1.412 1.464 1.412s1.255-.34 1.686-1.137l.941-1.765v1.49c0 .876.575 1.412 1.451 1.412s1.203-.301 1.699-1.137l2.17-3.66c.471-.798.144-1.413-.901-1.413zm4.078 0c-1.778 0-3.124 1.321-3.124 3.112s1.359 3.098 3.124 3.098 3.111-1.32 3.124-3.098c0-1.791-1.359-3.112-3.124-3.112m0 4.301c-.667 0-1.124-.497-1.124-1.19s.458-1.203 1.124-1.203 1.124.51 1.124 1.203-.444 1.19-1.124 1.19m6.68-4.301c-1.765 0-3.124 1.32-3.124 3.111s1.359 3.098 3.124 3.098S24 13.784 24 12.006s-1.359-3.111-3.124-3.111m0 4.301c-.68 0-1.111-.497-1.111-1.19s.444-1.203 1.111-1.203S22 11.313 22 12.006s-.444 1.19-1.124 1.19',
  bigcommerce:
    'M12.645 13.663h3.027c.861 0 1.406-.474 1.406-1.235 0-.717-.545-1.234-1.406-1.234h-3.027c-.1 0-.187.086-.187.172v2.125c.015.1.086.172.187.172zm0 4.896h3.128c.961 0 1.535-.488 1.535-1.35 0-.746-.545-1.35-1.535-1.35h-3.128c-.1 0-.187.087-.187.173v2.34c.015.115.086.187.187.187zM23.72.053l-8.953 8.93h1.464c2.281 0 3.63 1.435 3.63 3 0 1.235-.832 2.14-1.722 2.541-.143.058-.143.259.014.316 1.033.402 1.765 1.48 1.765 2.742 0 1.78-1.19 3.202-3.5 3.202h-6.342c-.1 0-.187-.086-.187-.172V13.85L.062 23.64c-.13.13-.043.359.143.359h23.631a.16.16 0 0 0 .158-.158V.182c.043-.158-.158-.244-.273-.13z',
  magento:
    'M12 24l-4.455-2.572v-12l2.97-1.715v12.001l1.485.902 1.485-.902V7.713l2.971 1.715v12L12 24zM22.391 6v12l-2.969 1.714V7.713L12 3.43 4.574 7.713v12.001L1.609 18V6L12 0l10.391 6z',
  wix:
    'm0 7.354 2.113 9.292h.801a1.54 1.54 0 0 0 1.506-1.218l1.351-6.34a.171.171 0 0 1 .167-.137c.08 0 .15.058.167.137l1.352 6.34a1.54 1.54 0 0 0 1.506 1.218h.805l2.113-9.292h-.565c-.62 0-1.159.43-1.296 1.035l-1.26 5.545-1.106-5.176a1.76 1.76 0 0 0-2.19-1.324c-.639.176-1.113.716-1.251 1.365l-1.094 5.127-1.26-5.537A1.33 1.33 0 0 0 .563 7.354H0zm13.992 0a.951.951 0 0 0-.951.95v8.342h.635a.952.952 0 0 0 .951-.95V7.353h-.635zm1.778 0 3.158 4.66-3.14 4.632h1.325c.368 0 .712-.181.918-.486l1.756-2.59a.12.12 0 0 1 .197 0l1.754 2.59c.206.305.55.486.918.486h1.326l-3.14-4.632L24 7.354h-1.326c-.368 0-.712.181-.918.486l-1.772 2.617a.12.12 0 0 1-.197 0L18.014 7.84a1.108 1.108 0 0 0-.918-.486H15.77z',
  square:
    'M4.01 0A4.01 4.01 0 000 4.01v15.98c0 2.21 1.8 4 4.01 4.01h15.98C22.2 24 24 22.2 24 19.99V4A4.01 4.01 0 0019.99 0H4zm1.62 4.36h12.74c.7 0 1.26.57 1.26 1.27v12.74c0 .7-.56 1.27-1.26 1.27H5.63c-.7 0-1.26-.57-1.26-1.27V5.63a1.27 1.27 0 011.26-1.27zm3.83 4.35a.73.73 0 00-.73.73v5.09c0 .4.32.72.72.72h5.1a.73.73 0 00.73-.72V9.44a.73.73 0 00-.73-.73h-5.1Z',
};

function PlatformMark({ id }: { id: string }) {
  if (id === 'api') return <Braces strokeWidth={1.75} aria-hidden="true" />;
  const d = LOGO_PATHS[id];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const N = INTEGRATIONS.length;
const MID = (N - 1) / 2;
const SIZES = [60, 34, 28];
const DOT = 7;
const ADVANCE_MS = 4200;
const FADE_MS = 300;

interface Slot {
  x: number;
  y: number;
}

export function Start2Testimonial() {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slotsRef = useRef<Slot[]>([]);
  const curRef = useRef(0);
  const timer = useRef<number | null>(null);
  const pausedRef = useRef(false);

  const [cur, setCur] = useState(0);
  const [fading, setFading] = useState(false);

  // Puts every node in its slot for the current index and pins the label
  // under the centre node.
  const place = useCallback(() => {
    const slots = slotsRef.current;
    if (slots.length === 0) return;
    const midIdx = Math.round(MID);

    nodeRefs.current.forEach((n, i) => {
      if (!n) return;
      const slotIdx = (i - curRef.current + midIdx + N * 2) % N;
      const s = slots[slotIdx];
      const far = Math.round(Math.abs(slotIdx - MID));
      const sz = SIZES[far] ?? DOT;

      n.style.width = `${sz}px`;
      n.style.height = `${sz}px`;
      n.style.transform = `translate(${s.x - sz / 2}px, ${s.y - sz / 2}px)`;
      n.classList.toggle('mid', far === 0);
      n.classList.toggle('dim', far >= SIZES.length);
      n.tabIndex = far >= SIZES.length ? -1 : 0;
      n.setAttribute('aria-current', far === 0 ? 'true' : 'false');
    });

    const label = labelRef.current;
    if (label) {
      const c = slots[midIdx];
      label.style.top = `${c.y + SIZES[0] / 2 + 12}px`;
    }
  }, []);

  // The design's arc: a parabola peaking at the centre, recomputed on resize.
  const layout = useCallback(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!stage || !svg || !path) return;

    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const pad = Math.max(28, w * 0.055);
    const span = w - pad * 2;
    const topY = h * 0.3;
    const amp = Math.min(84, h * 0.36);

    slotsRef.current = INTEGRATIONS.map((_, i) => {
      const t = i / (N - 1);
      return { x: pad + span * t, y: topY + amp * 4 * (t - 0.5) * (t - 0.5) };
    });

    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    path.setAttribute(
      'd',
      slotsRef.current.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
    );
    place();
  }, [place]);

  const go = useCallback((i: number) => {
    const next = ((i % N) + N) % N;
    if (next === curRef.current) return;
    setFading(true);
    window.setTimeout(() => {
      curRef.current = next;
      setCur(next);
      setFading(false);
    }, FADE_MS);
  }, []);

  const restart = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      if (!pausedRef.current) go(curRef.current + 1);
    }, ADVANCE_MS);
  }, [go]);

  useEffect(() => {
    layout();
    window.addEventListener('resize', layout);
    restart();
    return () => {
      window.removeEventListener('resize', layout);
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [layout, restart]);

  useEffect(() => {
    place();
  }, [cur, place]);

  const active = INTEGRATIONS[cur];

  return (
    <section className="s2-itg-section" id="integrations" aria-labelledby="s2-itg-title">
      <div className="s2-container">
        <div className="s2-itg-head">
          <h2 className="s2-itg-title" id="s2-itg-title">
            Connects to what you already run.
          </h2>
          {/* <p className="s2-itg-sub">
            One integration per platform. Stock, pricing and policy stay in sync.
          </p> */}
        </div>

        <div
          className="s2-itg-panel"
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
        >
          <div className="s2-itg-stage" ref={stageRef}>
            <svg ref={svgRef} className="s2-itg-svg" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="s2-itg-curve" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" style={{ stopColor: 'var(--s2-itg-line)', stopOpacity: 0.25 }} />
                  <stop offset="0.5" style={{ stopColor: 'var(--s2-itg-line)', stopOpacity: 0.85 }} />
                  <stop offset="1" style={{ stopColor: 'var(--s2-itg-line)', stopOpacity: 0.25 }} />
                </linearGradient>
              </defs>
              <path ref={pathRef} stroke="url(#s2-itg-curve)" strokeWidth="1.25" />
            </svg>

            {INTEGRATIONS.map((p, i) => (
              <button
                type="button"
                key={p.id}
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                className="s2-itg-node"
                aria-label={`Show ${p.name}`}
                onClick={() => {
                  go(i);
                  restart();
                }}
              >
                <span className="s2-itg-mark">
                  <PlatformMark id={p.id} />
                </span>
              </button>
            ))}

            <span
              className={`s2-itg-label${fading ? ' out' : ''}`}
              ref={labelRef}
              aria-hidden="true"
            >
              {active.name}
            </span>
          </div>

          <div className={`s2-itg-quote${fading ? ' out' : ''}`} aria-live="polite">
            <span className="s2-itg-tag">{active.tag}</span>
            <p className="s2-itg-line">{active.quote}</p>
            <p className="s2-itg-by">
              <span className="s2-itg-author">{active.author}</span>
              <span className="s2-itg-role"> · {active.role}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
