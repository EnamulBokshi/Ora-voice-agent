'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Copy,
  Check,
  Code,
  ArrowRight,
  ShoppingBag,
  Store,
  Sliders,
  Layers,
  HelpCircle,
  CheckCircle2,
  Globe,
  Settings,
  ShieldCheck,
  ChevronRight,
  BookOpen
} from 'lucide-react';

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

// ── Minimalist Code Block with Copy & Tabs ───────────────────────────────────

function CodeBlock({ snippets }: { snippets: CodeSnippet[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentSnippet = snippets[activeTab] || snippets[0];

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentSnippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check size={12} style={{ color: 'var(--lp-primary)' }} />
                <span style={{ color: 'var(--lp-primary)' }}>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
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

// ── Merchant-Focused Documentation Component ─────────────────────────────────

export function DocsPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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

  const sidebarRef = useRef<HTMLElement | null>(null);

  // ── Merchant Setup Documentation Sections ──────────────────────────────────

  const docSections: DocSection[] = [
    // ── 1. Getting Started ──
    {
      id: 'quickstart',
      category: 'Getting Started',
      title: '3-Step Storefront Quickstart',
      summary: 'Embed ORA onto your online store and start selling with voice in under 2 minutes.',
      content: (
        <>
          <p className="lp-docs-p">
            Adding ORA to your storefront is simple and requires zero programming experience. Follow these three quick steps to launch:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: '1.5rem 0' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: 'var(--lp-dark)',
                  color: 'var(--lp-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}
              >
                1
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.25rem' }}>
                  Get Your Storefront Key
                </h4>
                <p className="lp-docs-p" style={{ marginBottom: 0 }}>
                  Log in to your <Link href="/dashboard" style={{ color: '#65A30D', fontWeight: 600, textDecoration: 'underline' }}>ORA Dashboard</Link> and copy your <strong>Publishable Widget Key</strong> (e.g. <code>biz_live_xxxx</code>).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: 'var(--lp-dark)',
                  color: 'var(--lp-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}
              >
                2
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.25rem' }}>
                  Paste the Embed Script
                </h4>
                <p className="lp-docs-p" style={{ marginBottom: 0 }}>
                  Paste the one-line script right before the closing <code>&lt;/body&gt;</code> tag of your website or theme template.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: 'var(--lp-dark)',
                  color: 'var(--lp-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}
              >
                3
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.25rem' }}>
                  Sync Products &amp; Go Live
                </h4>
                <p className="lp-docs-p" style={{ marginBottom: 0 }}>
                  Connect your store via Shopify or WooCommerce in the dashboard, or upload your product catalog. The voice widget will immediately start guiding shoppers.
                </p>
              </div>
            </div>
          </div>

          <CodeBlock
            snippets={[
              {
                language: 'HTML Embed',
                filename: 'index.html',
                code: `<!-- Paste right before the closing </body> tag -->
<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_merchant_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'embed-snippets',
      category: 'Getting Started',
      title: 'Universal Storefront Embed Snippets',
      summary: 'Copy-paste embed code for HTML, Shopify, WooCommerce, Next.js, and Webflow.',
      content: (
        <>
          <p className="lp-docs-p">
            Choose your website technology below to copy the exact snippet formatted for your platform:
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'HTML / General',
                filename: 'index.html',
                code: `<!-- Universal 1-line script for any website -->
<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_merchant_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`
              },
              {
                language: 'Shopify Liquid',
                filename: 'layout/theme.liquid',
                code: `{% comment %} Insert before </body> in layout/theme.liquid {% endcomment %}
<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_merchant_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`
              },
              {
                language: 'Next.js',
                filename: 'app/layout.tsx',
                code: `import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://tryora.live/widget/ora-widget.js"
          data-ora-key="biz_live_your_merchant_key"
          data-ora-api="https://api.tryora.live"
          data-ora-position="bottom-right"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`
              },
              {
                language: 'Vue / Nuxt',
                filename: 'app.vue',
                code: `<script setup>
useHead({
  script: [
    {
      src: 'https://tryora.live/widget/ora-widget.js',
      'data-ora-key': 'biz_live_your_merchant_key',
      'data-ora-api': 'https://api.tryora.live',
      'data-ora-position': 'bottom-right',
      defer: true
    }
  ]
});
</script>`
              },
              {
                language: 'Webflow / Wix',
                filename: 'Footer Code',
                code: `<!-- Webflow: Project Settings > Custom Code > Footer Code -->
<!-- Wix: Settings > Custom Code > Body - End -->
<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_merchant_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`
              }
            ]}
          />
        </>
      )
    },

    // ── 2. Store Platforms ──
    {
      id: 'shopify-setup',
      category: 'Store Platforms',
      title: 'Shopify Store Integration',
      summary: 'Add ORA to your Shopify theme in less than 2 minutes.',
      content: (
        <>
          <p className="lp-docs-p">
            Integrating ORA with Shopify takes just a few clicks in your Shopify Admin:
          </p>

          <ol style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li>From your <strong>Shopify Admin</strong>, navigate to <strong>Online Store</strong> &rarr; <strong>Themes</strong>.</li>
            <li>On your current live theme, click the <strong>... (Actions)</strong> button and select <strong>Edit Code</strong>.</li>
            <li>In the left file navigator, find and open <code>layout/theme.liquid</code>.</li>
            <li>Scroll down to the bottom and paste the ORA embed script directly above the closing <code>&lt;/body&gt;</code> tag.</li>
            <li>Click <strong>Save</strong> in the top right.</li>
          </ol>

          <div className="lp-docs-callout tip">
            <strong>Automatic Catalog Sync:</strong> Once installed, visit your <Link href="/dashboard" style={{ color: '#65A30D', fontWeight: 600, textDecoration: 'underline' }}>ORA Dashboard</Link> to connect your Shopify store. ORA will automatically synchronize your product inventory, prices, and variants.
          </div>
        </>
      )
    },
    {
      id: 'woocommerce-setup',
      category: 'Store Platforms',
      title: 'WooCommerce & WordPress Setup',
      summary: 'Connect your WooCommerce store via theme template or header/footer plugin.',
      content: (
        <>
          <p className="lp-docs-p">
            You can add ORA to WordPress and WooCommerce using either of these two easy methods:
          </p>

          <h3 className="lp-docs-h3">Method A: Using a Code Header/Footer Plugin (Recommended)</h3>
          <ol style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li>In WordPress Admin, go to <strong>Plugins</strong> &rarr; <strong>Add New</strong>.</li>
            <li>Search for <strong>&ldquo;WPCode&rdquo;</strong> or <strong>&ldquo;Insert Headers and Footers&rdquo;</strong> and click <strong>Install &amp; Activate</strong>.</li>
            <li>Go to <strong>Code Snippets</strong> &rarr; <strong>Header &amp; Footer</strong>.</li>
            <li>Paste your ORA script into the <strong>Footer</strong> box.</li>
            <li>Click <strong>Save Changes</strong>.</li>
          </ol>

          <h3 className="lp-docs-h3">Method B: Direct Theme Template</h3>
          <p className="lp-docs-p">
            Open your child theme&apos;s <code>footer.php</code> file and insert the script right before <code>&lt;?php wp_footer(); ?&gt;</code> or the closing <code>&lt;/body&gt;</code> tag.
          </p>
        </>
      )
    },
    {
      id: 'webflow-wix-setup',
      category: 'Store Platforms',
      title: 'Webflow, Wix & Framer Guide',
      summary: 'Embed ORA into no-code builders and custom CMS sites.',
      content: (
        <>
          <p className="lp-docs-p">
            Follow the simple steps below for your specific website builder:
          </p>

          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li><strong>Webflow:</strong> Open Project Settings &rarr; <strong>Custom Code</strong> &rarr; paste into <strong>Footer Code</strong> &rarr; Save &amp; Publish.</li>
            <li><strong>Wix:</strong> Open Settings &rarr; <strong>Custom Code</strong> &rarr; click <strong>Add Custom Code</strong> &rarr; paste the script, set placement to <strong>Body - End</strong>, and click Apply.</li>
            <li><strong>Squarespace:</strong> Go to Settings &rarr; <strong>Advanced</strong> &rarr; <strong>Code Injection</strong> &rarr; paste into <strong>Footer</strong> &rarr; Save.</li>
            <li><strong>Framer:</strong> Open Site Settings &rarr; <strong>General</strong> &rarr; <strong>Custom Code</strong> &rarr; paste into <strong>End of &lt;body&gt; tag</strong> &rarr; Publish.</li>
          </ul>
        </>
      )
    },

    // ── 3. Widget Settings ──
    {
      id: 'appearance-styling',
      category: 'Widget Settings',
      title: 'Widget Branding, Colors & Placement',
      summary: 'Customize the appearance of the floating voice orb to match your store brand.',
      content: (
        <>
          <p className="lp-docs-p">
            You can customize how the ORA widget looks on your site by simply adding standard HTML attributes to your script tag:
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Options / Values</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>data-ora-key</code></td>
                  <td><code>biz_live_xxxx</code></td>
                  <td><em>Required</em></td>
                  <td>Your store&apos;s unique live widget key from your dashboard.</td>
                </tr>
                <tr>
                  <td><code>data-ora-api</code></td>
                  <td>Your ORA API origin (e.g. <code>https://api.tryora.live</code>)</td>
                  <td><em>Auto-detected</em></td>
                  <td>Where the widget opens its voice session. Derived from the script origin when omitted.</td>
                </tr>
                <tr>
                  <td><code>data-ora-position</code></td>
                  <td><code>bottom-center</code>, <code>bottom-right</code>, <code>bottom-left</code></td>
                  <td><code>bottom-center</code></td>
                  <td>Corner of the screen where the floating orb sits.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="lp-docs-h3">Example Customization</h3>
          <CodeBlock
            snippets={[
              {
                language: 'HTML',
                filename: 'custom-embed.html',
                code: `<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_merchant_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'voice-language',
      category: 'Widget Settings',
      title: 'Voice Persona & Spoken Language',
      summary: 'Configure the spoken language and tone of your voice sales assistant.',
      content: (
        <>
          <p className="lp-docs-p">
            Language is configured per store from your dashboard under{' '}
            <strong>Agent Settings</strong> — there is no script attribute for it. ORA
            also follows the shopper: if someone speaks to it in Bengali, it replies in
            Bengali for the rest of that conversation. Supported languages:
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Code</th>
                  <th>Supported Features</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>English (US)</strong></td>
                  <td><code>en-US</code></td>
                  <td>Real-time voice, catalog search, cart checkout</td>
                </tr>
                <tr>
                  <td><strong>English (UK)</strong></td>
                  <td><code>en-GB</code></td>
                  <td>Real-time voice, catalog search, cart checkout</td>
                </tr>
                <tr>
                  <td><strong>Bengali (BD)</strong></td>
                  <td><code>bn-BD</code></td>
                  <td>Real-time voice, bilingual store queries, bKash</td>
                </tr>
                <tr>
                  <td><strong>Spanish</strong></td>
                  <td><code>es-ES</code></td>
                  <td>Real-time voice, catalog search, cart checkout</td>
                </tr>
                <tr>
                  <td><strong>French</strong></td>
                  <td><code>fr-FR</code></td>
                  <td>Real-time voice, catalog search, cart checkout</td>
                </tr>
                <tr>
                  <td><strong>German</strong></td>
                  <td><code>de-DE</code></td>
                  <td>Real-time voice, catalog search, cart checkout</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="lp-docs-callout tip">
            <strong>Voice Persona:</strong> You can choose your preferred voice style (e.g. Friendly, Executive, Energetic) directly from your merchant dashboard settings under <strong>Agent Settings</strong>.
          </div>
        </>
      )
    },

    // ── 4. Catalog & Knowledge ──
    {
      id: 'catalog-sync',
      category: 'Catalog & Knowledge',
      title: 'Product Catalog Synchronization',
      summary: 'How ORA learns your products, pricing, and live inventory levels.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA stays synchronized with your store catalog in real time so it always recommends available items at current prices:
          </p>

          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li><strong>Live Price &amp; Stock Check:</strong> When a customer asks about a product, ORA checks live availability before answering.</li>
            <li><strong>Low-Stock Urgency Hints:</strong> When an item has 5 or fewer units left in stock, ORA naturally informs the shopper so they don&apos;t miss out.</li>
            <li><strong>Product Variants:</strong> ORA understands sizes, colors, and variant options, guiding shoppers to select the exact item they want.</li>
          </ul>

          <h3 className="lp-docs-h3">Bulk CSV Catalog Upload</h3>
          <p className="lp-docs-p">
            If you don&apos;t use Shopify or WooCommerce, you can upload your product catalog as a CSV in your ORA dashboard with these standard column headers:
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
      id: 'store-policies-faqs',
      category: 'Catalog & Knowledge',
      title: 'Store Policies & FAQ Knowledge',
      summary: 'Teach ORA your shipping rules, return policy, and store details.',
      content: (
        <>
          <p className="lp-docs-p">
            Shoppers frequently ask about shipping times, returns, warranties, and store locations. You can add your store policies directly in the ORA dashboard:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1.25rem 0' }}>
            <div style={{ padding: '1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-lg)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.35rem' }}>📦 Shipping &amp; Delivery</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--lp-text-secondary)', lineHeight: 1.5 }}>Delivery times, free shipping thresholds, and tracking.</p>
            </div>
            <div style={{ padding: '1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-lg)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.35rem' }}>🔄 Returns &amp; Refunds</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--lp-text-secondary)', lineHeight: 1.5 }}>Return window (e.g. 30 days), conditions, and refund process.</p>
            </div>
            <div style={{ padding: '1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-lg)' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.35rem' }}>🏢 Store Information</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--lp-text-secondary)', lineHeight: 1.5 }}>Business hours, contact email/phone, and physical location.</p>
            </div>
          </div>

          <div className="lp-docs-callout tip">
            <strong>Smart Domain Guardrail:</strong> ORA is programmed to answer questions exclusively about your store, products, policies, and voice sales assistance. Off-topic questions (e.g. trivia or cartoons) are politely redirected back to your store.
          </div>
        </>
      )
    },

    // ── 5. Testing & Launch ──
    {
      id: 'testing-verification',
      category: 'Testing & Launch',
      title: 'Pre-Launch Verification Checklist',
      summary: 'Verify your voice assistant before announcing to customers.',
      content: (
        <>
          <p className="lp-docs-p">
            Before launching to your customers, run through this quick 2-minute verification checklist:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1.25rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-md)' }}>
              <CheckCircle2 size={18} style={{ color: '#65A30D', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--lp-text-primary)' }}>
                <strong>Orb Placement:</strong> The floating orb appears in the corner on both desktop and mobile screens.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-md)' }}>
              <CheckCircle2 size={18} style={{ color: '#65A30D', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--lp-text-primary)' }}>
                <strong>Microphone &amp; Audio:</strong> Clicking the orb requests microphone permission and speaks a clear greeting.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-md)' }}>
              <CheckCircle2 size={18} style={{ color: '#65A30D', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--lp-text-primary)' }}>
                <strong>Product Accuracy:</strong> Asking &ldquo;What products do you recommend?&rdquo; returns items from your actual store catalog.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-md)' }}>
              <CheckCircle2 size={18} style={{ color: '#65A30D', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--lp-text-primary)' }}>
                <strong>Cart &amp; Checkout:</strong> Saying &ldquo;Add this to my cart&rdquo; correctly updates your cart or opens the checkout link.
              </span>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'troubleshooting-faqs',
      category: 'Testing & Launch',
      title: 'Troubleshooting & Common Questions',
      summary: 'Quick solutions to common setup and permission questions.',
      content: (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.35rem' }}>
                Why isn&apos;t the floating orb appearing on my site?
              </h4>
              <p className="lp-docs-p" style={{ marginBottom: 0 }}>
                1. Make sure you replaced <code>biz_live_your_merchant_key</code> with your actual key from the dashboard.<br />
                2. Check that the <code>&lt;script&gt;</code> tag is placed before the closing <code>&lt;/body&gt;</code> tag.<br />
                3. Clear your browser cache or try an incognito window.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--lp-border-light)', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.35rem' }}>
                Why is the microphone not turning on?
              </h4>
              <p className="lp-docs-p" style={{ marginBottom: 0 }}>
                Modern browsers require a secure <strong>HTTPS connection</strong> to access the microphone. Make sure your website has an active SSL certificate (https://). If you previously blocked microphone access, click the lock icon next to your URL bar to allow permissions.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--lp-border-light)', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.35rem' }}>
                How quickly do price and product changes update?
              </h4>
              <p className="lp-docs-p" style={{ marginBottom: 0 }}>
                For stores connected via Shopify or WooCommerce, updates sync automatically in real time. For manual CSV uploads, changes take effect immediately upon uploading in your dashboard.
              </p>
            </div>
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

  const allCategoryNames = useMemo(() => {
    return ['All', ...categories.map((c) => c.category)];
  }, [categories]);

  // Filter sections by search query and category
  const filteredSections = useMemo(() => {
    let list = docSections;
    if (selectedCategory !== 'All') {
      list = list.filter((sec) => sec.category === selectedCategory);
    }
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.category.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q)
    );
  }, [searchQuery, selectedCategory, docSections]);

  // Dynamic Scroll Spy: Track which section is currently in view
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = window.scrollY + 140; // Offset for fixed navbar & section headers
          const sections = filteredSections
            .map((sec) => {
              const el = document.getElementById(sec.id);
              return el ? { id: sec.id, top: el.offsetTop } : null;
            })
            .filter(Boolean) as { id: string; top: number }[];

          if (sections.length > 0) {
            let current = sections[0].id;
            for (let i = 0; i < sections.length; i++) {
              if (sections[i].top <= scrollPos) {
                current = sections[i].id;
              } else {
                break;
              }
            }
            setActiveSection(current);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [filteredSections]);

  // Keep the active sidebar item in view as the user scrolls
  useEffect(() => {
    if (sidebarRef.current) {
      const activeEl = sidebarRef.current.querySelector('.lp-docs-nav-link.active') as HTMLElement | null;
      if (activeEl) {
        const sidebar = sidebarRef.current;
        const activeTop = activeEl.offsetTop - sidebar.offsetTop;
        if (activeTop < sidebar.scrollTop || activeTop > sidebar.scrollTop + sidebar.clientHeight - 60) {
          sidebar.scrollTo({ top: Math.max(0, activeTop - 40), behavior: 'smooth' });
        }
      }
    }
  }, [activeSection]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90; // Fixed navbar height offset
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  return (
    <div className="lp-docs-root">
      {/* ── Header ── */}
      <section className="lp-docs-hero" style={{ textAlign: 'center' }}>
        <div className="lp-container" style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
          {/* Section label */}
          <div className="lp-section-label" style={{ marginBottom: '1.25rem', justifyContent: 'center' }}>
            <div className="lp-section-label-line" />
            <span className="lp-section-label-text">Storefront Setup &amp; Integration Guide</span>
            <div className="lp-section-label-line" />
          </div>

          <h1
            className="lp-display lp-text-gradient"
            style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              lineHeight: 1.15,
              marginBottom: '1rem',
              letterSpacing: '-0.025em',
              textAlign: 'center'
            }}
          >
            Set Up ORA on Your Store
          </h1>
          <p
            style={{
              fontSize: '1.0625rem',
              color: 'var(--lp-text-secondary)',
              maxWidth: '42rem',
              lineHeight: 1.7,
              margin: '0 auto',
              textAlign: 'center'
            }}
          >
            Integrate autonomous voice sales in under 2 minutes. Follow our step-by-step guides for Shopify, WooCommerce, Next.js, and custom websites.
          </p>

          {/* Quick Search */}
          <div className="lp-docs-search-wrapper">
            <Search className="lp-docs-search-icon" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              className="lp-docs-search-input"
              placeholder="Search setup guides, platforms, or widget settings... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search documentation"
            />
            {searchQuery ? (
              <button
                type="button"
                className="lp-docs-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕ Clear
              </button>
            ) : (
              <div className="lp-docs-search-shortcut">⌘K / /</div>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="lp-docs-cat-pills">
            {allCategoryNames.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`lp-docs-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mobile Category Floating Selector ── */}
      <div className="lp-docs-mobile-bar">
        <select
          className="lp-docs-mobile-select"
          value={activeSection}
          onChange={(e) => scrollToSection(e.target.value)}
          aria-label="Jump to section"
        >
          {docSections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {sec.category}: {sec.title}
            </option>
          ))}
        </select>
      </div>

      {/* ── Main Docs Layout ── */}
      <div className="lp-container">
        <div className="lp-docs-layout">
          {/* ── Sticky Sidebar ── */}
          <aside className="lp-docs-sidebar" ref={sidebarRef} aria-label="Documentation navigation">
            {categories.map(({ category, sections }) => (
              <div key={category}>
                <div className="lp-docs-category-title">
                  <span>{category}</span>
                  <span className="lp-docs-category-count">{sections.length}</span>
                </div>
                <ul className="lp-docs-nav-list">
                  {sections.map((sec) => (
                    <li key={sec.id}>
                      <button
                        type="button"
                        className={`lp-docs-nav-link ${activeSection === sec.id ? 'active' : ''}`}
                        onClick={() => scrollToSection(sec.id)}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sec.title}
                        </span>
                        {activeSection === sec.id && (
                          <span style={{ fontSize: '0.75rem', color: '#65A30D', flexShrink: 0 }}>●</span>
                        )}
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
              <div
                style={{
                  padding: '4rem 2rem',
                  background: 'var(--lp-bg-white)',
                  border: '1px solid var(--lp-border)',
                  borderRadius: 'var(--lp-radius-xl)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
                <h3 className="lp-docs-h3" style={{ justifyContent: 'center', marginTop: 0 }}>
                  No matching guide found
                </h3>
                <p className="lp-docs-p" style={{ maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
                  No setup guide found matching &ldquo;{searchQuery}&rdquo; in category &ldquo;{selectedCategory}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="lp-btn-secondary"
                  style={{ fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
                >
                  Reset filters
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
                    <div className="lp-docs-section-category">
                      <span>{sec.category}</span>
                    </div>
                    <h2 className="lp-docs-h2">{sec.title}</h2>
                    <p style={{ fontSize: '1rem', color: 'var(--lp-text-secondary)', lineHeight: 1.65 }}>
                      {sec.summary}
                    </p>
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
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
