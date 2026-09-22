'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  Zap, 
  Layers, 
  Cpu, 
  Code2, 
  ShoppingBag, 
  Lock 
} from 'lucide-react';
import Link from 'next/link';

export function StartSolutions() {
  const [activePlatform, setActivePlatform] = useState<'shopify' | 'woo' | 'headless'>('shopify');

  const platforms = {
    shopify: {
      name: 'Shopify & Shopify Plus',
      subtitle: 'Native App Embed & Storefront API Integration',
      description: 'Zero code required. Enable ORA directly from your Shopify Theme Customizer. ORA communicates with the Shopify Storefront GraphQL API to manipulate carts, inspect live inventory, and direct shoppers to pre-filled checkouts.',
      metrics: [
        { label: 'Installation Time', value: '45 Seconds' },
        { label: 'Catalog Sync', value: 'Real-time Webhook' },
        { label: 'Theme Compatibility', value: 'Dawn, Prestige & All 2.0' },
        { label: 'Checkout Integration', value: 'Native Shopify Checkout' },
      ],
      features: [
        'Direct Shopify App Embed injection with zero theme file editing',
        'Automatic variant matching (Size, Color, Material, Bundles)',
        'Applies Shopify discount codes & automatic checkout promotions',
        'Customer cart persistence across mobile and desktop devices',
        'Tracks shopper UTM tags and attributes voice-assisted orders',
      ],
      codeSnippet: `<!-- Zero code required: 1-Click Enable in Shopify Theme Editor -->
<ora-sales-agent 
  store-id="aurora-apparel.myshopify.com" 
  theme="dark" 
  position="bottom-right"
  mode="proactive-cart" />`,
    },
    woo: {
      name: 'WooCommerce & WordPress',
      subtitle: 'Official WordPress Plugin with Tokenized Payment Hooks',
      description: 'Designed specifically for WordPress high-traffic e-commerce. Integrates directly into WooCommerce REST API hooks, handling complex variable products, localized shipping zones, and regional payment options like bKash and Stripe.',
      metrics: [
        { label: 'Installation Time', value: '90 Seconds' },
        { label: 'Catalog Sync', value: 'REST API Background Worker' },
        { label: 'Server Load Impact', value: '< 0.02% (Edge CDN Offloaded)' },
        { label: 'Payment Support', value: 'bKash, Nagad, Stripe, COD' },
      ],
      features: [
        'Lightweight WordPress plugin with edge-cached voice payloads',
        'Full compatibility with WooCommerce Variable Products & Swatches',
        'Deep regional support for Bangladesh bKash tokenized checkout',
        'Seamless COD (Cash on Delivery) verbal address confirmation',
        'Compatible with WP Rocket, Cloudflare, and Redis Object Cache',
      ],
      codeSnippet: `// Installed via WordPress Plugin Directory: ORA Voice AI
add_action('woocommerce_after_single_product_summary', function() {
    echo do_shortcode('[ora_voice_assistant trigger="sizing_guide"]');
});`,
    },
    headless: {
      name: 'Headless, Next.js & Mobile SDK',
      subtitle: 'Bi-Directional WebSocket Streaming Engine',
      description: 'Built for modern composable commerce stacks. Integrate ORA into your Next.js, Nuxt, React Native, or custom iOS/Android app with sub-250ms latency using our low-overhead WebSocket SDK and hooks.',
      metrics: [
        { label: 'Turnaround Latency', value: '< 290ms' },
        { label: 'SDK Bundle Size', value: '14.2 kB gzipped' },
        { label: 'Transport Layer', value: 'WSS Binary Audio Stream' },
        { label: 'Frameworks', value: 'Next.js, React, React Native' },
      ],
      features: [
        'React hook: useOraVoiceSession() for custom UI styling',
        'Bi-directional streaming audio with client-side audio visualizer hooks',
        'Direct cart callback hooks: onAddToCart, onDiscountApplied, onCheckoutReady',
        'Full TypeScript definitions and end-to-end type safety',
        'Custom analytics dispatch (Segment, PostHog, Google Tag Manager)',
      ],
      codeSnippet: `import { useOraVoice } from '@ora/react-sdk';

const { isConnected, audioState, startListening } = useOraVoice({
  publishableKey: 'biz_live_94f8a2...',
  onCartAction: (action) => dispatch(syncCart(action))
});`,
    },
  };

  const current = platforms[activePlatform];

  return (
    <section className="start-solutions-section" id="platforms" aria-labelledby="start-solutions-title">
      <div className="lp-container">
        {/* Section Header */}
        <div className="start-section-header">
          <div className="start-badge">
            <Cpu size={13} className="text-[#C8F031]" />
            <span>PLATFORM COMPATIBILITY</span>
          </div>
          <h2 id="start-solutions-title" className="start-section-title">
            Tailored for Your Storefront Stack.
          </h2>
          <p className="start-section-sub">
            Whether you run a Shopify Plus flagship, a high-volume WooCommerce store, 
            or a custom headless Next.js frontend, ORA plugs in effortlessly.
          </p>
        </div>

        {/* Platform Tabs */}
        <div className="start-solutions-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activePlatform === 'shopify'}
            className={`start-tab-btn ${activePlatform === 'shopify' ? 'active' : ''}`}
            onClick={() => setActivePlatform('shopify')}
          >
            <ShoppingBag size={16} />
            <span>Shopify &amp; Plus</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePlatform === 'woo'}
            className={`start-tab-btn ${activePlatform === 'woo' ? 'active' : ''}`}
            onClick={() => setActivePlatform('woo')}
          >
            <Layers size={16} />
            <span>WooCommerce</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePlatform === 'headless'}
            className={`start-tab-btn ${activePlatform === 'headless' ? 'active' : ''}`}
            onClick={() => setActivePlatform('headless')}
          >
            <Code2 size={16} />
            <span>Headless &amp; React SDK</span>
          </button>
        </div>

        {/* Platform Detail Card */}
        <div className="start-solution-card">
          <div className="start-solution-left">
            <div className="start-solution-meta">
              <span className="start-solution-badge">{current.name}</span>
              <span className="start-solution-tag">Production Verified</span>
            </div>

            <h3 className="start-solution-heading">{current.subtitle}</h3>
            <p className="start-solution-desc">{current.description}</p>

            {/* Metrics Row */}
            <div className="start-solution-metrics">
              {current.metrics.map((m, idx) => (
                <div key={idx} className="start-metric-item">
                  <div className="start-metric-val">{m.value}</div>
                  <div className="start-metric-label">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Feature Checklist */}
            <div className="start-solution-features">
              {current.features.map((feat, idx) => (
                <div key={idx} className="start-sol-feat-row">
                  <Check size={15} className="text-[#C8F031] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="start-solution-actions">
              <Link href="/auth" className="start-btn-primary">
                <span>Deploy on {current.name.split('&')[0].trim()}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Right Code/Architecture Window */}
          <div className="start-solution-right">
            <div className="start-code-terminal">
              <div className="start-terminal-header">
                <div className="start-window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <span className="start-terminal-title">integration-snippet.tsx</span>
                <span className="text-[11px] font-mono text-[#C8F031]">VERIFIED</span>
              </div>
              <pre className="start-terminal-code">
                <code>{current.codeSnippet}</code>
              </pre>
              <div className="start-terminal-footer">
                <Lock size={12} className="text-[#C8F031]" />
                <span>AES-256 Encrypted Credential Vault • Zero Token Exposure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
