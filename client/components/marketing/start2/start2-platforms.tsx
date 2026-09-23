import React from 'react';

/* ─── Platform list ─────────────────────────────────────────────────────────
   SVG logos inline — no external image deps, no flicker, no broken-img risk.
   Each entry: { id, label, logo (JSX SVG) }
   ─────────────────────────────────────────────────────────────────────────── */

const PLATFORMS = [
  {
    id: 'shopify',
    label: 'Shopify',
    logo: (
      <svg viewBox="0 0 110 125" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M95 23.6a1.2 1.2 0 0 0-1.1-1c-.4 0-9.6-.2-9.6-.2s-7.7-7.4-8.5-8.2c-.8-.8-2.4-.6-3-.4l-4.2 1.3A28 28 0 0 0 66.6 11C63.7 2.5 58.5-2 52.8-2c-.4 0-.8 0-1.2.1C50 -3.2 48.1-4 46.1-4c-5.5 0-11 4.1-15.4 11.3C27.6 12.3 25.2 18.5 24.5 23.3l-10.6 3.3C10.8 27.6 10.7 27.7 10.3 30.6 9.9 33 0 110.5 0 110.5l76.1 13.2L109 116.9S95.5 24.1 95 23.6zM68.3 15.3l-6.7 2.1a41 41 0 0 0-2.3-9.4c3.5.7 5.8 4.4 9 7.3zm-14-6.6c1.6 4 2.4 9.5 2.6 13.7l-9.8 3c.9-5.3 3.6-10.5 7.2-16.7zm-3.3-1.5c.4 0 .8.1 1.2.4-4.1 6.8-6.8 13.3-7.7 19.7l-9.4 2.9c1.4-9.7 7.6-23 16-23z" fill="currentColor" opacity=".4"/>
        <path d="M93.9 22.7c-.4 0-9.6-.2-9.6-.2s-7.7-7.4-8.5-8.2c-.3-.3-.7-.5-1.1-.5l-4.6 92.3-31 8.5 37.1 8.1L109 116.9S95.5 24.1 95 23.6a1.2 1.2 0 0 0-1.1-1z" fill="currentColor" opacity=".25"/>
        <path d="M52.8 42.9l-3.8 11.3s-3.4-1.8-7.4-1.8c-6 0-6.3 3.8-6.3 4.7 0 5.2 13.5 7.2 13.5 19.3 0 9.6-6 15.7-14.2 15.7-9.8 0-14.8-6.1-14.8-6.1l2.6-8.7s5.1 4.4 9.5 4.4c2.8 0 4-2.2 4-3.9 0-6.7-11.1-7-11.1-18.2C24.8 50 31.5 41 45 41c5.2 0 7.8 1.9 7.8 1.9z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'woocommerce',
    label: 'WooCommerce',
    logo: (
      <svg viewBox="0 0 148 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect width="148" height="72" rx="10" fill="currentColor" opacity=".12"/>
        <path d="M13 18c1.2-1.7 2.8-2.6 4.8-2.8 3.9-.3 6 1.7 6.4 5.9.9-1.5 2-2.8 3.5-3.7 1.4-.9 2.9-1.4 4.5-1.4 3.8 0 5.8 2.2 6 6.5.1 1.4.2 2.9.4 4.4.4 2.8 1.1 4.3 2.2 4.5.7.1 1.4-.3 2.3-1.1.9-.9 1.7-2 2.5-3.3l.9 1.5c-.8 1.7-1.8 3.2-3 4.4-1.6 1.5-3.2 2.2-4.8 2-1.3-.1-2.3-.8-3-2-.7-1.2-1.1-2.8-1.4-5-.3-2.2-.4-3.9-.5-5.2-.2-2.1-1-3.1-2.5-3-1.5.1-2.8 1-4 2.6-1.2 1.6-2 3.5-2.5 5.7L23 40h-4.5L14 22c-.4-1.8-.8-2.8-1.1-2.9-.3-.1-1.2.2-2.7 1l-1-1.7L13 18zm77 0c1.2-1.7 2.8-2.6 4.8-2.8 3.9-.3 6 1.7 6.4 5.9.9-1.5 2-2.8 3.5-3.7 1.4-.9 2.9-1.4 4.5-1.4 3.8 0 5.8 2.2 6 6.5.1 1.4.2 2.9.4 4.4.4 2.8 1.1 4.3 2.2 4.5.7.1 1.4-.3 2.3-1.1.9-.9 1.7-2 2.5-3.3l.9 1.5c-.8 1.7-1.8 3.2-3 4.4-1.6 1.5-3.2 2.2-4.8 2-1.3-.1-2.3-.8-3-2-.7-1.2-1.1-2.8-1.4-5-.3-2.2-.4-3.9-.5-5.2-.2-2.1-1-3.1-2.5-3-1.5.1-2.8 1-4 2.6-1.2 1.6-2 3.5-2.5 5.7L100 40h-4.5L90.5 22c-.4-1.8-.8-2.8-1.1-2.9-.3-.1-1.2.2-2.7 1l-1-1.7 4.3-1.4zm-24 -3c3.2 0 5.8 1.1 7.9 3.4 2 2.3 3 5.1 3 8.6 0 4.6-1.2 8.4-3.7 11.4-2.5 3-5.6 4.5-9.4 4.5-3.2 0-5.8-1.1-7.8-3.4-2-2.3-3-5.2-3-8.7 0-4.6 1.3-8.4 3.8-11.4 2.5-3 5.6-4.4 9.2-4.4zm-.7 3.7c-2 0-3.6 1-4.7 3-1.1 2-1.7 4.5-1.7 7.6 0 2.2.4 4.1 1.2 5.7.8 1.6 2 2.4 3.5 2.4 2 0 3.5-1 4.6-3 1.1-2 1.7-4.5 1.7-7.6 0-2.3-.4-4.2-1.2-5.7-.8-1.6-1.9-2.4-3.4-2.4z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'bigcommerce',
    label: 'BigCommerce',
    logo: (
      <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22 0C9.85 0 0 9.85 0 22s9.85 22 22 22 22-9.85 22-22S34.15 0 22 0zm-4 30H12V14h6.5c3 0 5 1.6 5 4.2 0 1.5-.7 2.7-2 3.4 1.8.7 3 2.2 3 4 0 2.8-2.3 4.4-6.5 4.4zm8.5-8.5h-3V14H28c3 0 4.8 1.5 4.8 3.8s-1.7 3.7-6.3 3.7z" fill="currentColor" opacity=".15"/>
        <path d="M14 18h4c1.5 0 2.5.7 2.5 2s-1 2-2.5 2h-4v-4zm0 7h4.5c1.6 0 2.5.8 2.5 2.1 0 1.4-1 2.1-2.5 2.1H14v-4.2zM25.5 14H23v5.2h2.5c2 0 3-.8 3-2.6 0-1.7-1-2.6-3-2.6z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'magento',
    label: 'Adobe Commerce',
    logo: (
      <svg viewBox="0 0 50 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M25 0L50 14.3v31.4L43.7 49.5V17.7L25 7.1 6.3 17.7v31.8L0 45.7V14.3L25 0z" fill="currentColor"/>
        <path d="M28.2 52.1L25 54l-3.2-1.9V20.3l-6.5 3.7v32.1L25 60l9.7-3.9V24l-6.5-3.7v31.8z" fill="currentColor" opacity=".55"/>
      </svg>
    ),
  },
  {
    id: 'stripe',
    label: 'Stripe',
    logo: (
      <svg viewBox="0 0 60 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M28.5 6.5c0-2 1.6-2.8 4.3-2.8 3.8 0 8.7 1.2 12.5 3.2V.6C41.4-.5 37.9-.1 33.2.6 27.9.6 24 3.4 24 8.1c0 6.9 9.5 5.8 9.5 8.9 0 2.4-2.1 3.2-5 3.2-4.3 0-9.7-1.8-14-4.2v6.9c4.8 2 9.6 2.9 14 2.9 10.7 0 14.4-5.3 14.4-9.9C42.9 9 28.5 10.2 28.5 6.5zM0 21.1l7.3-1.4L8.7 3.1H1.5L0 21.1zm8.2-20.3L5.9 18.1l-.5 3.3H0L2 0h6.2zm52 0H54l-4.4 21.3H56L60.2.8zm-6.3 0L50 18.1l-.6 3.3H44L46 0h8z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'klaviyo',
    label: 'Klaviyo',
    logo: (
      <svg viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M0 0h7v28H0V0zm13 0h7v15.4L31 0h9L28 16l13 12H32L21 17V28h-8V0zm36 0h7v28h-7V0zm19 0l9 21 9-21H95L84 28h-8L65 0h13zm-9 28h7V0h-7v28z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'zendesk',
    label: 'Zendesk',
    logo: (
      <svg viewBox="0 0 80 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M27 0C27 15.5 15.5 27 0 27V0h27zM0 0c15.5 0 27 12.5 27 27H0V0zM54 0c0 15.5-12.5 27-27 27L40.5 0H54zM27 27c15.5 0 27-12.5 27-27L40.5 27H27z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'gorgias',
    label: 'Gorgias',
    logo: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M18 2C9.2 2 2 9.2 2 18s7.2 16 16 16c8.8 0 16-7.2 16-16H18v-4h18C36 8.1 27.9 2 18 2zm8 20a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'recharge',
    label: 'Recharge',
    logo: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="3.5" strokeDasharray="26 76" strokeDashoffset="-10" strokeLinecap="round"/>
        <path d="M13 18l5-8.5 5 8.5h-4v8.5h-6V18z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'google-analytics',
    label: 'Google Analytics',
    logo: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="24" y="2" width="10" height="32" rx="5" fill="currentColor"/>
        <rect x="13" y="12" width="10" height="22" rx="5" fill="currentColor" opacity=".7"/>
        <rect x="2" y="22" width="10" height="12" rx="5" fill="currentColor" opacity=".45"/>
      </svg>
    ),
  },
  {
    id: 'salesforce',
    label: 'Salesforce',
    logo: (
      <svg viewBox="0 0 60 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M25 5a12 12 0 0 1 8.8 3.9A15 15 0 0 1 57 22a12 12 0 0 1-4.5 22H11A11 11 0 0 1 9 22.3 14 14 0 0 1 25 5z" stroke="currentColor" strokeWidth="4" fill="none"/>
      </svg>
    ),
  },
  {
    id: 'hubspot',
    label: 'HubSpot',
    logo: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M25 11V7a3 3 0 1 0-4 0v4a8.5 8.5 0 0 0-4 2.9l-6-4 .2-.4a3 3 0 1 0-2.6 1.6l.3-.1 6 4A8.5 8.5 0 1 0 25 11zm-7 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="currentColor"/>
      </svg>
    ),
  },
];

/* Duplicate list for seamless infinite scroll */
const DOUBLED = [...PLATFORMS, ...PLATFORMS];

export function Start2Platforms() {
  return (
    <section className="s2-platforms-section" id="platforms" aria-label="Connected platforms and e-commerce engines">
      {/* Label row */}
      <div className="s2-platforms-label-wrap">
        <span className="s2-platforms-label">
          Connected across leading platforms &amp; e-commerce engines
        </span>
      </div>

      {/* Infinite ticker — edge-fade mask applied via CSS */}
      <div className="s2-platforms-track-wrap" aria-hidden="true">
        <ul className="s2-platforms-track">
          {DOUBLED.map((p, i) => (
            <li key={`${p.id}-${i}`} className="s2-platforms-logo" title={p.label}>
              <span className="s2-platforms-icon">{p.logo}</span>
              <span className="s2-platforms-name">{p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
