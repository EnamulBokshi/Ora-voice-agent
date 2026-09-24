'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Three steps to launch — port of `ora-launch.html` from the ORA Design System.
 *
 * The scroll behaviour is the design's, kept exactly: an IntersectionObserver
 * at threshold 0.2 fades each step in, a rAF-throttled scroll handler fills
 * the rail from the viewport's 62% line, and the step whose centre of mass
 * sits nearest the 42% line becomes active. All easings, durations and the
 * 82% track fill are carried over unchanged.
 *
 * Colour and type are this project's rather than the design's: the source is a
 * dark page in Newsreader and Archivo; this section follows start2's light/dark
 * ground and uses the same tokens as the sections around it, with Space
 * Grotesk headings per globals.css and Inter for everything else.
 */

const STEPS = [
  { n: '01', phase: 'Connect', title: 'Connect your catalogue', body: 'Link Shopify, WooCommerce or a product feed.', win: 'catalogue' },
  { n: '02', phase: 'Configure', title: 'Set the rules', body: 'Choose your brand voice and stock rules.', win: 'rules' },
  { n: '03', phase: 'Launch', title: 'Paste one tag', body: 'One snippet on your site. No theme changes.', win: 'embed' },
];

const TAG_SNIPPET =
  '<script src="cdn.ora.ai/widget/loader.js" data-ora-id="biz_live_891" async></script>';

export function Start2Steps() {
  const lineRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const line = lineRef.current;
    const steps = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!line || steps.length === 0) return;

    // Fade each step in once it enters the viewport.
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('in');
        }),
      { threshold: 0.2 },
    );
    steps.forEach((s) => io.observe(s));

    let ticking = false;

    const frame = () => {
      ticking = false;
      const r = line.getBoundingClientRect();
      const h = window.innerHeight;

      // Rail fills relative to the viewport's 62% line.
      const p = Math.min(1, Math.max(0, (h * 0.62 - r.top) / r.height));
      line.classList.add('p');
      line.style.setProperty('--p', `${p * (r.height - 16)}px`);

      // The active step is whichever sits nearest the 42% line.
      let best = 0;
      let bd = 1e9;
      steps.forEach((s, i) => {
        const b = s.getBoundingClientRect();
        const d = Math.abs(b.top + b.height * 0.3 - h * 0.42);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      steps.forEach((s, i) => s.classList.toggle('on', i === best));
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section className="lch-section" id="how-it-works" aria-label="Three steps to launch">
      <div className="s2-container">
        <div className="lch-head">
          <h2 className="lch-title">Three steps to launch.</h2>
          {/* <p className="lch-sub">From catalogue to live voice answers in about three minutes.</p> */}
        </div>

        <div className="lch-line" ref={lineRef}>
          {STEPS.map((s, i) => (
            <div
              className={`lch-step${i === 0 ? ' on' : ''}`}
              key={s.n}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
            >
              <span className="lch-dot" aria-hidden="true">
                {s.n}
              </span>
              <div className="lch-grid">
                <div className="lch-txt">
                  <span className="lch-phase">{s.phase}</span>
                  <h3 className="lch-h">{s.title}</h3>
                  <p>{s.body}</p>
                </div>

                <div className="lch-viz">
                  <div className="lch-win" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <span>ora · {s.win}</span>
                  </div>
                  {i === 0 && <ConnectViz />}
                  {i === 1 && <RulesViz />}
                  {i === 2 && <TagViz />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConnectViz() {
  return (
    <>
      <div className="lch-tabs">
        <span className="on">Shopify</span>
        <span>WooCommerce</span>
        <span>Custom feed</span>
      </div>
      <div className="lch-field">
        yourstore.myshopify.com<em>Sync</em>
      </div>
      <div className="lch-prog">
        <span>Catalogue sync</span>
        <span>248 of 302 items</span>
        <span className="lch-track">
          <i />
        </span>
      </div>
    </>
  );
}

function RulesViz() {
  return (
    <div className="lch-rows">
      {[
        ['Stock urgency', true],
        ['Checkout links', true],
        ['Off-catalogue answers', false],
      ].map(([t, on]) => (
        <div className="lch-r" key={t as string}>
          <b>{t}</b>
          <span className={`lch-sw${on ? ' on' : ''}`} aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

function TagViz() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TAG_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); leave the label as is.
    }
  };

  return (
    <>
      <div className="lch-code">
        {'<script '}
        <b>src</b>
        {'="cdn.ora.ai/widget/loader.js"\n  '}
        <b>data-ora-id</b>
        {'="biz_live_891" async></script>'}
      </div>
      <button type="button" className="lch-copy" onClick={copy}>
        {copied ? 'Copied' : 'Copy tag'}
      </button>
    </>
  );
}
