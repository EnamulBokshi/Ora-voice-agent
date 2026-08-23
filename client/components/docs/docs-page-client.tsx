'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Search, Copy, Check, Terminal, Cpu, Shield, Zap, Sparkles, Layers, Code, ArrowRight } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface DocSection {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: React.ReactNode;
}

interface CodeSnippet {
  language: string;
  filename?: string;
  code: string;
}

// ── Minimalist Code Block ───────────────────────────────────────────────────

function CodeBlock({ snippets }: { snippets: CodeSnippet[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentSnippet = snippets[activeTab] || snippets[0];

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="lp-docs-code-container">
      <div className="lp-docs-code-header">
        <div className="lp-docs-code-tabs">
          {snippets.map((s, idx) => (
            <button
              key={s.language + idx}
              type="button"
              className={`lp-docs-code-tab ${activeTab === idx ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              {s.language}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {currentSnippet.filename && (
            <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--lp-font-mono)', color: '#71717A' }}>
              {currentSnippet.filename}
            </span>
          )}
          <button
            type="button"
            className="lp-docs-copy-btn"
            onClick={handleCopy}
            aria-label="Copy snippet"
          >
            {copied ? (
              <>
                <Check size={11} style={{ color: 'var(--lp-primary)' }} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="lp-docs-code-content">
        <code>{currentSnippet.code}</code>
      </pre>
    </div>
  );
}

// ── Elaborate Docs Page Client ──────────────────────────────────────────────

export function DocsPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('quickstart');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut listener (Cmd/Ctrl + K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync scroll position with active sidebar section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    const sections = document.querySelectorAll('.lp-docs-section');
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, []);

  // ── Complete Documentation Sections ───────────────────────────────────────

  const docSections: DocSection[] = [
    // ── 1. Getting Started ──
    {
      id: 'quickstart',
      category: 'Getting Started',
      title: 'Quickstart & Storefront Embed',
      summary: 'Embed the ORA real-time sales agent on your storefront with a single script tag.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA is an autonomous multimodal AI sales assistant that interfaces directly with your e-commerce store. It listens, speaks in real-time, browses product catalog vectors, verifies live inventory, and guides shoppers through instant checkout.
          </p>

          <p className="lp-docs-p">
            All storefront integrations require your merchant <strong>Publishable Widget Key</strong> (e.g. <code>biz_live_xxxx</code>), obtainable from your <Link href="/dashboard" style={{ color: 'var(--lp-primary)', textDecoration: 'underline' }}>Merchant Dashboard</Link>.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'HTML / Vanilla',
                filename: 'index.html',
                code: `<!-- Paste before the closing </body> tag on any storefront -->
<script
  src="https://cdn.ora.ai/widget/v2/widget.v4_5.js"
  data-publishable-key="biz_live_your_merchant_key"
  data-position="bottom-right"
  data-language="en-US"
  async>
</script>`
              },
              {
                language: 'Next.js (App Router)',
                filename: 'app/layout.tsx',
                code: `import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://cdn.ora.ai/widget/v2/widget.v4_5.js"
          data-publishable-key={process.env.NEXT_PUBLIC_ORA_PUBLISHABLE_KEY}
          data-position="bottom-right"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`
              },
              {
                language: 'Shopify Liquid',
                filename: 'layout/theme.liquid',
                code: `{% comment %} Insert right before </body> {% endcomment %}
<script
  src="https://cdn.ora.ai/widget/v2/widget.v4_5.js"
  data-publishable-key="{{ settings.ora_publishable_key | default: 'biz_live_your_key' }}"
  data-position="bottom-right"
  data-theme="auto"
  async>
</script>`
              },
              {
                language: 'Vue / Nuxt',
                filename: 'app.vue',
                code: `<script setup>
useHead({
  script: [
    {
      src: 'https://cdn.ora.ai/widget/v2/widget.v4_5.js',
      'data-publishable-key': useRuntimeConfig().public.oraKey,
      'data-position': 'bottom-right',
      async: true
    }
  ]
});
</script>`
              }
            ]}
          />

          <div className="lp-docs-callout">
            <strong>Publishable Key vs Secret Credentials:</strong> Publishable widget keys (<code>biz_live_xxxx</code>) are public-safe and only authorize ephemeral shopper voice/chat sessions. Store secrets (Shopify OAuth tokens, bKash keys) are stored server-side encrypted at rest with AES-256.
          </div>
        </>
      )
    },
    {
      id: 'architecture-overview',
      category: 'Getting Started',
      title: 'System Architecture & Actor Model',
      summary: 'Understanding the ORA multi-actor security taxonomy and real-time processing loop.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA follows a strict 4-actor security and execution architecture designed for enterprise store isolation and ultra-low latency multimodal streaming:
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Actor Type</th>
                  <th>Identity & Auth</th>
                  <th>Primary Context</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Customer (Shopper)</strong></td>
                  <td>Ephemeral Conversation Session (<code>sessionId</code>)</td>
                  <td>Voice Widget runtime & Redis state</td>
                  <td>Voice talk, cart add, live catalog search, checkout redirection</td>
                </tr>
                <tr>
                  <td><strong>AdminUser (Merchant)</strong></td>
                  <td>JWT Access Token (Memory) + Refresh Token (httpOnly Cookie)</td>
                  <td>Merchant Dashboard (<code>/dashboard</code>)</td>
                  <td>Catalog overrides, knowledge uploads, analytics, webhook configs</td>
                </tr>
                <tr>
                  <td><strong>Business (Tenant)</strong></td>
                  <td>Publishable Key (<code>biz_live_xxxx</code>) & Server-side hash</td>
                  <td>Public Gateway & Connectors</td>
                  <td>Tenant isolation scope for all DB queries & VectorIndex</td>
                </tr>
                <tr>
                  <td><strong>SuperAdmin</strong></td>
                  <td>Root JWT + Redis Session (<code>role: super_admin</code>)</td>
                  <td>Command Center (<code>/admin</code>)</td>
                  <td>Global merchants, system metrics, provider health & quotas</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="lp-docs-h3">Real-Time Interaction Loop</h3>
          <p className="lp-docs-p">
            When a shopper clicks the floating orb widget:
          </p>
          <ol style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
            <li>The browser establishes a low-latency WebSocket connection to <code>/ws/voice</code>.</li>
            <li>Microphone audio is captured as 16-bit 24kHz PCM chunks and streamed to ORA Gateway.</li>
            <li>ORA proxies the stream to Gemini 2.0/2.5 Live Multimodal API while intercepting executable function tools (e.g. <code>find_products</code>, <code>add_to_cart</code>).</li>
            <li>Tool calls execute against tenant-scoped VectorIndex & Live Store APIs, returning pre-verified stock & pricing before streaming natural speech back to the shopper.</li>
          </ol>
        </>
      )
    },

    // ── 2. Widget & Client SDK ──
    {
      id: 'widget-sdk',
      category: 'Widget & Client SDK',
      title: 'Widget HTML Configuration',
      summary: 'Customizing widget placement, initial state, locale, and theme appearance.',
      content: (
        <>
          <p className="lp-docs-p">
            The embed script accepts standard HTML data-attributes for zero-code UI customization:
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Type</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>data-publishable-key</code></td>
                  <td><code>string</code></td>
                  <td><em>Required</em></td>
                  <td>Your merchant live widget key (e.g. <code>biz_live_xxxx</code>).</td>
                </tr>
                <tr>
                  <td><code>data-position</code></td>
                  <td><code>string</code></td>
                  <td><code>bottom-right</code></td>
                  <td>Widget screen anchor: <code>bottom-right</code> or <code>bottom-left</code>.</td>
                </tr>
                <tr>
                  <td><code>data-language</code></td>
                  <td><code>string</code></td>
                  <td><code>en-US</code></td>
                  <td>Default voice agent language (e.g. <code>en-US</code>, <code>bn-BD</code>, <code>es-ES</code>).</td>
                </tr>
                <tr>
                  <td><code>data-theme</code></td>
                  <td><code>string</code></td>
                  <td><code>auto</code></td>
                  <td>Theme preset: <code>auto</code>, <code>dark</code>, <code>light</code>.</td>
                </tr>
                <tr>
                  <td><code>data-primary-color</code></td>
                  <td><code>string</code></td>
                  <td><code>#C8F031</code></td>
                  <td>Hex accent color for the floating orb waveform and active voice pulses.</td>
                </tr>
                <tr>
                  <td><code>data-auto-open</code></td>
                  <td><code>boolean</code></td>
                  <td><code>false</code></td>
                  <td>Whether to automatically open voice prompt after initial page load delay.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )
    },
    {
      id: 'client-events',
      category: 'Widget & Client SDK',
      title: 'JavaScript Event Listeners',
      summary: 'Listening to real-time conversation transcripts, cart additions, and checkout triggers.',
      content: (
        <>
          <p className="lp-docs-p">
            The ORA widget emits custom DOM events on the <code>window</code> object, allowing you to update your storefront cart drawer, trigger analytics tracking, or synchronize customer context.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'JavaScript',
                filename: 'ora-listeners.js',
                code: `// 1. Listen for real-time customer and AI voice transcripts
window.addEventListener('ora:transcript', (event) => {
  const { sender, text, timestamp } = event.detail;
  console.log(\`[\${sender.toUpperCase()}]: \${text}\`);
});

// 2. Listen for autonomous cart additions
window.addEventListener('ora:cart_updated', (event) => {
  const { items, cartTotal, currency } = event.detail;
  console.log('Cart updated by ORA:', items, cartTotal, currency);
  // Optional: Trigger your storefront cart drawer refresh
  if (window.refreshStoreCart) window.refreshStoreCart();
});

// 3. Listen for completed voice checkout / order conversion
window.addEventListener('ora:checkout_trigger', (event) => {
  const { sessionId, items, total, checkoutUrl } = event.detail;
  console.log('Checkout triggered for session:', sessionId, 'Total:', total);
  
  // Track conversion in Google Analytics / Meta Pixel
  if (window.gtag) {
    window.gtag('event', 'ora_voice_checkout', {
      session_id: sessionId,
      value: total
    });
  }
});

// 4. Listen for voice state changes (idle, listening, thinking, speaking)
window.addEventListener('ora:voice_state_changed', (event) => {
  const { state } = event.detail; // 'idle' | 'listening' | 'thinking' | 'speaking'
  console.log('ORA agent state:', state);
});`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'programmatic-api',
      category: 'Widget & Client SDK',
      title: 'Programmatic Client API (window.ORA)',
      summary: 'Controlling the widget lifecycle, passing customer metadata, and triggering voice sessions.',
      content: (
        <>
          <p className="lp-docs-p">
            Once loaded, the SDK exposes the global <code>window.ORA</code> object for programmatic interaction:
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'JavaScript',
                filename: 'storefront-actions.js',
                code: `// Open the voice sales assistant
window.ORA.open();

// Start voice listening immediately
window.ORA.startVoice();

// Pass shopper profile context (e.g. logged-in customer info)
window.ORA.setContext({
  customerName: "Alex Mercer",
  customerEmail: "alex@example.com",
  preferredCategory: "Wireless Audio",
  cartTotal: 129.00
});

// Prompt ORA to pitch a specific product
window.ORA.suggestProduct({
  productId: "prod_audio_pro_99",
  title: "Aura Studio Headphones",
  price: 249.00
});

// Mute or close the assistant
window.ORA.close();`
              }
            ]}
          />
        </>
      )
    },

    // ── 3. Data Ingestion & RAG ──
    {
      id: 'store-connectors',
      category: 'Catalog & Ingestion',
      title: 'E-Commerce Store Connectors',
      summary: 'Connecting Shopify, WooCommerce, and custom webhooks for automated catalog synchronization.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA integrates with major e-commerce platforms to automatically mirror product listings, variant options, prices, and inventory counts in real time.
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Auth Method</th>
                  <th>Supported Webhook Events</th>
                  <th>Sync Latency</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Shopify</strong></td>
                  <td>OAuth 2.0 (Custom App)</td>
                  <td><code>products/create</code>, <code>products/update</code>, <code>inventory_levels/update</code>, <code>orders/create</code></td>
                  <td>&lt; 500ms (HMAC Verified)</td>
                </tr>
                <tr>
                  <td><strong>WooCommerce</strong></td>
                  <td>REST API Key (Consumer Secret)</td>
                  <td><code>product.created</code>, <code>product.updated</code>, <code>order.created</code></td>
                  <td>&lt; 1s (REST Webhooks)</td>
                </tr>
                <tr>
                  <td><strong>Custom API / Webhook</strong></td>
                  <td>HMAC-SHA256 Signature (<code>x-ora-signature</code>)</td>
                  <td>Custom inventory sync payload</td>
                  <td>Instantaneous</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="lp-docs-h3">Custom Webhook Ingestion Payload Example</h3>
          <CodeBlock
            snippets={[
              {
                language: 'JSON',
                filename: 'webhook-payload.json',
                code: `{
  "event": "product.updated",
  "businessId": "biz_live_xxxx",
  "product": {
    "externalId": "prod_10023",
    "title": "Ergonomic Mechanical Keyboard",
    "description": "Hot-swappable tactile switches with RGB per-key backlighting.",
    "price": 129.00,
    "currency": "USD",
    "stockQuantity": 14,
    "category": "Peripherals",
    "tags": ["keyboard", "mechanical", "wireless"],
    "inStock": true
  }
}`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'catalog-ingestion',
      category: 'Catalog & Ingestion',
      title: '4-Tier Ingestion & CSV Vectorization',
      summary: 'How ORA handles catalog data across feeds, files, and multi-tier sources.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA features a multi-tiered ingestion engine to ensure no merchant product is left undiscovered:
          </p>

          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li><strong>Tier 1 (Direct Platform Webhooks):</strong> Real-time event streams from Shopify and WooCommerce (Confidence Score: <code>1.0</code>).</li>
            <li><strong>Tier 2 (Catalog Feeds):</strong> Automated daily parsing of Google Merchant XML, RSS, or Atom feeds (Confidence Score: <code>0.7</code>).</li>
            <li><strong>Tier 3 (Passive Crawl):</strong> Storefront sitemap discovery and passive product page scraping (Confidence Score: <code>0.3</code>).</li>
            <li><strong>Tier 4 (Manual Bulk Upload):</strong> CSV, XLSX, TXT, or PDF catalog and knowledge base uploads (Confidence Score: <code>0.5</code>).</li>
          </ul>

          <h3 className="lp-docs-h3">Bulk CSV Upload Format</h3>
          <p className="lp-docs-p">
            Upload CSVs directly in your dashboard or via <code>POST /api/v1/ingestion/upload</code>. Standard header format:
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'CSV',
                filename: 'products.csv',
                code: `id,title,description,price,stock,category,tags
KB-01,Obsidian Desk Mat,Water-resistant micro-woven cloth with non-slip base,29.99,150,Accessories,"desk mat, waterproof, gaming"
KB-02,Mechanical Keyboard 75%,Hot-swappable switches with Bluetooth and 2.4GHz,119.00,24,Keyboards,"wireless, mechanical, RGB"
KB-03,Wireless Precision Mouse,26000 DPI optical sensor with 80-hour battery,69.00,4,Mice,"lightweight, wireless, ergonomic"`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'rag-pipeline',
      category: 'Catalog & Ingestion',
      title: 'Self-Healing RAG & Vector Search',
      summary: 'Semantic vector discovery powered by text-embedding-004 with multi-tier failover.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA transforms product listings and store context into 768-dimensional embeddings using Google&apos;s <code>text-embedding-004</code>. When a shopper asks for a product in natural voice, ORA conducts cosine similarity search with self-healing fallback:
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Fallback Tier</th>
                  <th>Trigger Condition</th>
                  <th>Resolution Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Primary RAG</strong></td>
                  <td>Cosine similarity &ge; <code>0.65</code></td>
                  <td>Instant top-5 vector candidate extraction (&lt; 25ms).</td>
                </tr>
                <tr>
                  <td><strong>Gap A (<code>mongo_regex</code>)</strong></td>
                  <td>Vector miss, but product exists in MongoDB catalog</td>
                  <td>Fuzzy regex matches record, returns data to agent, and asynchronously embeds vector into index.</td>
                </tr>
                <tr>
                  <td><strong>Gap B (<code>live_platform</code>)</strong></td>
                  <td>Product missing from DB (ingestion lag)</td>
                  <td>Direct live API query to merchant platform (Shopify/WooCommerce), returns live price/stock, syncs to DB and embeds vector.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="lp-docs-callout note">
            <strong>Self-Healing Guarantee:</strong> Every vector fallback hit triggers an asynchronous auto-indexing task. The next time a shopper asks for that item, it resolves on the sub-millisecond vector path.
          </div>
        </>
      )
    },

    // ── 4. Voice Streaming Gateway ──
    {
      id: 'voice-websocket',
      category: 'Voice Streaming Gateway',
      title: 'Bidirectional Voice WebSocket Protocol',
      summary: 'Streaming real-time 24kHz PCM audio frames and handling agent state events.',
      content: (
        <>
          <p className="lp-docs-p">
            The voice gateway operates over standard WebSockets at <code>/ws/voice</code>. It accepts 16-bit linear PCM audio sampled at 24kHz (or 16kHz) and streams compressed audio responses back to the browser:
          </p>

          <h3 className="lp-docs-h3">Handshake & Session Initialization</h3>
          <CodeBlock
            snippets={[
              {
                language: 'JavaScript',
                filename: 'voice-client.js',
                code: `// 1. Establish secure WebSocket connection
const socket = new WebSocket('wss://api.ora.ai/ws/voice?publishableKey=biz_live_your_key');

socket.onopen = () => {
  // 2. Send session initiation frame
  socket.send(JSON.stringify({
    type: 'session.initiate',
    data: {
      language: 'en-US',
      customerContext: {
        pageUrl: window.location.href,
        referrer: document.referrer
      }
    }
  }));
};

// 3. Handle incoming server audio & transcript frames
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'audio.stream':
      // Base64 decoded PCM audio chunk -> feed to Web Audio AudioContext
      playAudioChunk(message.data.pcmBase64);
      break;
      
    case 'transcript.delta':
      // Streaming partial transcript
      console.log('AI Speaking:', message.data.text);
      break;
      
    case 'agent.state':
      // 'listening' | 'thinking' | 'speaking' | 'idle'
      updateOrbState(message.data.state);
      break;
  }
};`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'ai-tools-runtime',
      category: 'Voice Streaming Gateway',
      title: 'Autonomous Voice Agent Tools',
      summary: 'Executable tool functions invoked by Gemini 2.5 Live during voice conversations.',
      content: (
        <>
          <p className="lp-docs-p">
            While speaking with shoppers, the AI agent dynamically executes server-side tools to fetch products, add items to cart, or verify stock urgency:
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Tool Name</th>
                  <th>Parameters</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>find_products</code></td>
                  <td><code>query</code>, <code>category</code>, <code>maxPrice</code></td>
                  <td>Semantic vector search + live inventory verification with <code>isLowStock</code> indicator.</td>
                </tr>
                <tr>
                  <td><code>get_product_details</code></td>
                  <td><code>productId</code></td>
                  <td>Retrieves complete product specification, variant list, and stock counts.</td>
                </tr>
                <tr>
                  <td><code>add_to_cart</code></td>
                  <td><code>productId</code>, <code>quantity</code>, <code>variantId</code></td>
                  <td>Adds item to shopper&apos;s Redis session cart (<code>cart:conv:&#123;sessionId&#125;</code>).</td>
                </tr>
                <tr>
                  <td><code>place_order</code></td>
                  <td><code>customerInfo</code>, <code>paymentMethod</code></td>
                  <td>Direct order placement for Tier 1 connected merchants.</td>
                </tr>
                <tr>
                  <td><code>redirect_to_checkout</code></td>
                  <td><code>cartItems</code></td>
                  <td>Generates pre-filled storefront checkout redirect URL.</td>
                </tr>
                <tr>
                  <td><code>get_store_policy</code></td>
                  <td><code>topic</code></td>
                  <td>Searches store knowledge base for shipping, returns, and FAQs.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="lp-docs-callout warning">
            <strong>Low-Stock Urgency Hint:</strong> When an item has &le; 5 units in stock and merchant enables <code>mentionLowStockUrgency</code>, the tool automatically injects an <code>urgencyHint</code> so the voice agent naturally communicates scarcity to boost conversion rates.
          </div>
        </>
      )
    },

    // ── 5. REST API Reference ──
    {
      id: 'api-standards',
      category: 'REST API Reference',
      title: 'API Envelopes & Authentication',
      summary: 'Standardized response envelopes, correlation IDs, and authentication headers.',
      content: (
        <>
          <p className="lp-docs-p">
            All REST API endpoints are served over HTTPS and return standardized JSON envelopes. All endpoints are versioned under <code>/api/v1/</code>.
          </p>

          <h3 className="lp-docs-h3">Success Envelope</h3>
          <CodeBlock
            snippets={[
              {
                language: 'JSON',
                code: `{
  "success": true,
  "data": {
    "id": "prod_89172",
    "title": "Aura Studio Headphones",
    "price": 249.00,
    "stockQuantity": 8
  }
}`
              }
            ]}
          />

          <h3 className="lp-docs-h3">Error Envelope</h3>
          <CodeBlock
            snippets={[
              {
                language: 'JSON',
                code: `{
  "success": false,
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Monthly voice conversation minutes exceeded your plan quota.",
    "correlationId": "req_88a91c2e"
  }
}`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'products-api',
      category: 'REST API Reference',
      title: 'Products & Ingestion API',
      summary: 'Programmatically querying, batch-syncing, and verifying catalog products.',
      content: (
        <>
          <div className="lp-docs-endpoint-row">
            <span className="lp-docs-method-pill get">GET</span>
            <span className="lp-docs-endpoint-path">/api/v1/products</span>
          </div>
          <p className="lp-docs-p" style={{ fontSize: '0.84375rem', marginBottom: '0.75rem' }}>
            List or filter catalog products for your merchant store.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'cURL',
                code: `curl -X GET "https://api.ora.ai/api/v1/products?search=keyboard&limit=10" \\
  -H "Authorization: Bearer <your_jwt_access_token>"`
              },
              {
                language: 'Response (200 OK)',
                code: `{
  "success": true,
  "data": {
    "items": [
      {
        "id": "60d5ec49f1b2c8b1f8e4e1a1",
        "title": "Mechanical Keyboard 75%",
        "price": 119.00,
        "stockQuantity": 24,
        "category": "Keyboards",
        "inStock": true
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}`
              }
            ]}
          />

          <div className="lp-docs-endpoint-row" style={{ marginTop: '2rem' }}>
            <span className="lp-docs-method-pill post">POST</span>
            <span className="lp-docs-endpoint-path">/api/v1/products/batch-sync</span>
          </div>
          <p className="lp-docs-p" style={{ fontSize: '0.84375rem', marginBottom: '0.75rem' }}>
            Bulk upsert product listings with automated vector re-indexing.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'cURL',
                code: `curl -X POST "https://api.ora.ai/api/v1/products/batch-sync" \\
  -H "Authorization: Bearer <your_jwt_access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "products": [
      {
        "externalId": "ext_991",
        "title": "Obsidian Wireless Mouse",
        "price": 79.99,
        "stockQuantity": 50,
        "category": "Mice"
      }
    ]
  }'`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'orders-recovery-api',
      category: 'REST API Reference',
      title: 'Cart Recovery & Orders API',
      summary: 'Dispatching abandoned cart recovery sequences and querying agent-attributed revenue.',
      content: (
        <>
          <div className="lp-docs-endpoint-row">
            <span className="lp-docs-method-pill post">POST</span>
            <span className="lp-docs-endpoint-path">/api/v1/orders/recovery</span>
          </div>
          <p className="lp-docs-p" style={{ fontSize: '0.84375rem', marginBottom: '0.75rem' }}>
            Trigger an autonomous personalized voice/SMS/Email recovery dispatch for an abandoned checkout session.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'cURL',
                code: `curl -X POST "https://api.ora.ai/api/v1/orders/recovery" \\
  -H "x-publishable-key: biz_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "conv_sess_89172",
    "customerEmail": "shopper@example.com",
    "cartItems": [
      { "productId": "prod_01", "quantity": 1, "price": 119.00 }
    ],
    "cartTotal": 119.00,
    "currency": "USD"
  }'`
              },
              {
                language: 'Response (200 OK)',
                code: `{
  "success": true,
  "data": {
    "recoveryId": "rec_live_44912",
    "status": "scheduled",
    "dispatchChannel": "email_and_widget_prompt"
  }
}`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'conversations-api',
      category: 'REST API Reference',
      title: 'Conversations & Telemetry API',
      summary: 'Querying historical customer voice & text transcripts and conversion analytics.',
      content: (
        <>
          <div className="lp-docs-endpoint-row">
            <span className="lp-docs-method-pill get">GET</span>
            <span className="lp-docs-endpoint-path">/api/v1/conversations</span>
          </div>
          <p className="lp-docs-p" style={{ fontSize: '0.84375rem', marginBottom: '0.75rem' }}>
            List conversation sessions with sentiment, duration, order attribution, and transcripts.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'cURL',
                code: `curl -X GET "https://api.ora.ai/api/v1/conversations?limit=5" \\
  -H "Authorization: Bearer <your_jwt_access_token>"`
              },
              {
                language: 'Response (200 OK)',
                code: `{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_9921",
        "channel": "voice",
        "durationSeconds": 142,
        "orderPlaced": true,
        "attributedRevenue": 119.00,
        "customerEmail": "shopper@example.com",
        "createdAt": "2026-08-21T12:00:00Z"
      }
    ],
    "total": 1
  }
}`
              }
            ]}
          />
        </>
      )
    },

    // ── 6. Security & Best Practices ──
    {
      id: 'security-tenant-isolation',
      category: 'Security & Isolation',
      title: 'Tenant Isolation & PII Protection',
      summary: 'Enterprise data scoping, AES-256 field-level encryption, and token rotation.',
      content: (
        <>
          <p className="lp-docs-p">
            Security and merchant privacy are built into ORA from the ground up:
          </p>

          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li><strong>Strict Multi-Tenant Scoping:</strong> Every database query across all collections (<code>Product</code>, <code>Order</code>, <code>Conversation</code>, <code>Customer</code>) is filtered strictly by <code>businessId</code>. No cross-tenant data leaks are physically possible.</li>
            <li><strong>Field-Level PII Encryption:</strong> Customer emails and phone numbers are encrypted at rest using AES-256-GCM before storage in MongoDB.</li>
            <li><strong>JWT Refresh Family Theft Detection:</strong> Refresh tokens are stored in <code>httpOnly</code>, <code>Secure</code>, <code>SameSite=Strict</code> cookies. Replay of an invalidated token revokes the entire session family immediately.</li>
            <li><strong>Dual Payment Gateway Compliance:</strong> Stripe USD billing uses auto-renewing subscriptions, while bKash BDT billing uses Tokenized Checkout agreements managed by isolated BullMQ workers.</li>
          </ul>

          <div className="lp-docs-callout">
            <strong>Compliance Note:</strong> ORA is designed to comply with standard GDPR and e-commerce data privacy requirements. Shoppers can request data deletion at any time via the customer privacy endpoints.
          </div>
        </>
      )
    }
  ];

  // Group sections by category
  const categories = useMemo(() => {
    const map = new Map<string, DocSection[]>();
    docSections.forEach((sec) => {
      if (!map.has(sec.category)) {
        map.set(sec.category, []);
      }
      map.get(sec.category)!.push(sec);
    });
    return Array.from(map.entries()).map(([category, sections]) => ({
      category,
      sections
    }));
  }, [docSections]);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return docSections;
    const q = searchQuery.toLowerCase();
    return docSections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.category.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q)
    );
  }, [searchQuery, docSections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  return (
    <div className="lp-docs-root">
      {/* ── Header ── */}
      <section className="lp-docs-hero">
        <div className="lp-container">
          <div className="lp-docs-badge">
            <span className="lp-docs-badge-dot" />
            <span>DEVELOPER DOCUMENTATION &amp; SPECIFICATIONS</span>
          </div>

          <h1 className="lp-display" style={{ fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)', marginBottom: '0.5rem' }}>
            ORA Integration &amp; API Guide
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--lp-text-secondary)', maxWidth: '42rem', lineHeight: 1.6 }}>
            Comprehensive integration guides for the real-time voice widget SDK, store connectors, self-healing RAG vectors, and REST API reference.
          </p>

          {/* Quick Search */}
          <div className="lp-docs-search-wrapper">
            <Search className="lp-docs-search-icon" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              className="lp-docs-search-input"
              placeholder="Search guides, SDK attributes, WebSockets, or API endpoints... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search documentation"
            />
            <div className="lp-docs-search-shortcut">⌘K / /</div>
          </div>
        </div>
      </section>

      {/* ── Main Docs Layout ── */}
      <div className="lp-container">
        <div className="lp-docs-layout">
          {/* ── Sticky Sidebar ── */}
          <aside className="lp-docs-sidebar" aria-label="Documentation navigation">
            {categories.map(({ category, sections }) => (
              <div key={category}>
                <div className="lp-docs-category-title">{category}</div>
                <ul className="lp-docs-nav-list">
                  {sections.map((sec) => (
                    <li key={sec.id}>
                      <button
                        type="button"
                        className={`lp-docs-nav-link ${activeSection === sec.id ? 'active' : ''}`}
                        onClick={() => scrollToSection(sec.id)}
                      >
                        <span>{sec.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          {/* ── Main Content Canvas ── */}
          <main className="lp-docs-content">
            {filteredSections.length === 0 ? (
              <div style={{ padding: '4rem 0', color: 'var(--lp-text-secondary)' }}>
                <p style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>
                  No documentation found matching &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--lp-border)',
                    borderRadius: 'var(--lp-radius-sm)',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8125rem',
                    color: 'var(--lp-text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Clear search query
                </button>
              </div>
            ) : (
              filteredSections.map((sec) => (
                <article
                  key={sec.id}
                  id={sec.id}
                  className="lp-docs-section"
                >
                  <div className="lp-docs-section-header">
                    <div className="lp-docs-section-category">{sec.category}</div>
                    <h2 className="lp-docs-h2">{sec.title}</h2>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--lp-text-secondary)', lineHeight: 1.6 }}>
                      {sec.summary}
                    </p>
                  </div>

                  <div style={{ marginTop: '1.25rem' }}>
                    {sec.content}
                  </div>
                </article>
              ))
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
