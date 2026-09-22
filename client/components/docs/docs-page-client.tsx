'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, Copy, Check, ArrowRight, CheckCircle2 } from 'lucide-react';

// ── Animation helpers ────────────────────────────────────────────────────────

const ANIM_STYLE = `
@keyframes docs-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.docs-animate {
  animation: docs-fade-up 0.38s cubic-bezier(0.22,1,0.36,1) both;
}
@media (prefers-reduced-motion: reduce) {
  .docs-animate { animation: none !important; }
}
`;

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Code Block ───────────────────────────────────────────────────────────────

function CodeBlock({ snippets }: { snippets: CodeSnippet[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const current = snippets[activeTab] ?? snippets[0];

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(current.code);
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
          {current.filename && (
            <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--lp-font-mono)', color: '#71717A' }}>
              {current.filename}
            </span>
          )}
          <button
            type="button"
            className="lp-docs-copy-btn"
            onClick={handleCopy}
            aria-label="Copy code"
          >
            {copied ? (
              <><Check size={12} style={{ color: 'var(--lp-primary)' }} /><span style={{ color: 'var(--lp-primary)' }}>Copied</span></>
            ) : (
              <><Copy size={12} /><span>Copy</span></>
            )}
          </button>
        </div>
      </div>
      <pre className="lp-docs-code-content"><code>{current.code}</code></pre>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DocsPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeSection, setActiveSection] = useState('quickstart');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Hero mount animation
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.animationDelay = '0ms';
      el.classList.add('docs-animate');
    });
  }, []);

  // Section IntersectionObserver animation
  const observerRef = useRef<IntersectionObserver | null>(null);
  const animatedSections = useRef<Set<string>>(new Set());

  const registerSection = useCallback((id: string, el: HTMLElement | null) => {
    if (!el) return;
    sectionRefs.current.set(id, el);
    if (observerRef.current) observerRef.current.observe(el);
  }, []);

  useEffect(() => {
    let staggerIdx = 0;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.sectionId ?? '';
            if (!animatedSections.current.has(id)) {
              animatedSections.current.add(id);
              const delay = staggerIdx * 60;
              staggerIdx++;
              (entry.target as HTMLElement).style.animationDelay = `${delay}ms`;
              entry.target.classList.add('docs-animate');
              observerRef.current?.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionRefs.current.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  // ── Documentation Sections ───────────────────────────────────────────────

  const docSections: DocSection[] = [
    // Getting Started
    {
      id: 'quickstart',
      category: 'Getting Started',
      title: 'Quickstart',
      summary: 'Embed ORA on your site in three steps.',
      content: (
        <>
          <p className="lp-docs-p">
            No programming experience required. Copy your key, paste one script tag, and connect your site.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: '1.5rem 0' }}>
            {[
              {
                n: 1,
                heading: 'Get your widget key',
                body: <>Log in to your <Link href="/dashboard" style={{ color: 'var(--lp-primary)', fontWeight: 600 }}>ORA Dashboard</Link> and copy your <strong>Publishable Widget Key</strong> — it looks like <code>biz_live_xxxx</code>.</>,
              },
              {
                n: 2,
                heading: 'Paste the embed script',
                body: <>Add the one-line script right before the closing <code>&lt;/body&gt;</code> tag of your theme or page template.</>,
              },
              {
                n: 3,
                heading: 'Connect your catalog and go live',
                body: <>In the dashboard, connect your Shopify store or upload a CSV catalog. The widget will appear on your site immediately.</>,
              },
            ].map(({ n, heading, body }) => (
              <div key={n} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '1.625rem', height: '1.625rem', borderRadius: '50%',
                  background: 'var(--lp-dark)', color: 'var(--lp-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8rem', flexShrink: 0, marginTop: '0.15rem'
                }}>
                  {n}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.2rem' }}>{heading}</h4>
                  <p className="lp-docs-p" style={{ marginBottom: 0 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>

          <CodeBlock snippets={[{
            language: 'HTML',
            filename: 'index.html',
            code: `<!-- Paste before the closing </body> tag -->
<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_publishable_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`,
          }]} />
        </>
      ),
    },
    {
      id: 'embed-snippets',
      category: 'Getting Started',
      title: 'Platform embed snippets',
      summary: 'Ready-to-paste code for HTML, Shopify, Next.js, Vue, Webflow, and Wix.',
      content: (
        <>
          <p className="lp-docs-p">
            Pick your platform and paste the snippet exactly as shown. Replace <code>biz_live_your_publishable_key</code> with your actual key.
          </p>
          <CodeBlock snippets={[
            {
              language: 'HTML',
              filename: 'index.html',
              code: `<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_publishable_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`,
            },
            {
              language: 'Shopify',
              filename: 'layout/theme.liquid',
              code: `{% comment %} Before </body> in layout/theme.liquid {% endcomment %}
<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_publishable_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`,
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
          data-ora-key="biz_live_your_publishable_key"
          data-ora-api="https://api.tryora.live"
          data-ora-position="bottom-right"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`,
            },
            {
              language: 'Vue / Nuxt',
              filename: 'app.vue',
              code: `<script setup>
useHead({
  script: [{
    src: 'https://tryora.live/widget/ora-widget.js',
    'data-ora-key': 'biz_live_your_publishable_key',
    'data-ora-api': 'https://api.tryora.live',
    'data-ora-position': 'bottom-right',
    defer: true
  }]
});
</script>`,
            },
            {
              language: 'Webflow / Wix',
              filename: 'Footer Code',
              code: `<!-- Webflow: Project Settings > Custom Code > Footer Code -->
<!-- Wix: Settings > Custom Code > Body - End -->
<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_publishable_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`,
            },
          ]} />
        </>
      ),
    },

    // Platforms
    {
      id: 'shopify-setup',
      category: 'Platforms',
      title: 'Shopify',
      summary: 'Install the ORA Shopify App in under 60 seconds with zero code editing.',
      content: (
        <>
          <h3 className="lp-docs-h3">Method A — ORA Shopify App (Recommended & Zero Code)</h3>
          <p className="lp-docs-p">
            You do not need to touch any code or edit <code>theme.liquid</code>. Simply install the official ORA app and enable the native Theme App Embed:
          </p>
          <ol style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li>Install the <strong>ORA Voice AI</strong> app from the Shopify App Store or connect your site in the ORA dashboard under <strong>Agent Configuration → Sync Catalog</strong>.</li>
            <li>In Shopify Admin, navigate to <strong>Online Store</strong> → <strong>Themes</strong> and click <strong>Customize</strong>.</li>
            <li>In the left sidebar, click the <strong>App embeds</strong> icon (or click &ldquo;Enable in Theme&rdquo; in the ORA Shopify app).</li>
            <li>Toggle the <strong>ORA Voice Widget</strong> switch to <strong>ON</strong>.</li>
            <li>Click <strong>Save</strong> in the top-right corner. The voice agent and live product catalog sync are instantly active!</li>
          </ol>
          <div className="lp-docs-callout tip">
            <strong>Zero Code:</strong> The Shopify App automatically provisions your publishable widget key and syncs your products, inventory, and variants. No theme files are modified.
          </div>

          <h3 className="lp-docs-h3" style={{ marginTop: '2rem' }}>Method B — Manual Script Embed (Optional)</h3>
          <p className="lp-docs-p">
            If you are running a custom or headless theme without App Embeds, you can manually paste the embed snippet:
          </p>
          <ol style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li>In Shopify Admin, go to <strong>Online Store</strong> → <strong>Themes</strong> → <strong>⋯ Actions</strong> → <strong>Edit Code</strong>.</li>
            <li>Open <code>layout/theme.liquid</code>.</li>
            <li>Paste your ORA embed script right before the closing <code>&lt;/body&gt;</code> tag and click <strong>Save</strong>.</li>
          </ol>
        </>
      ),
    },
    {
      id: 'woocommerce-setup',
      category: 'Platforms',
      title: 'WooCommerce & WordPress',
      summary: 'Add ORA via a plugin or by editing your theme template.',
      content: (
        <>
          <h3 className="lp-docs-h3">Method A — Plugin (recommended)</h3>
          <ol style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li>In WordPress Admin, go to <strong>Plugins → Add New</strong>.</li>
            <li>Search for <strong>"WPCode"</strong> or <strong>"Insert Headers and Footers"</strong> and install it.</li>
            <li>Go to <strong>Code Snippets → Header & Footer</strong>.</li>
            <li>Paste the ORA script into the <strong>Footer</strong> box and save.</li>
          </ol>
          <h3 className="lp-docs-h3">Method B — Theme file</h3>
          <p className="lp-docs-p">
            In your child theme's <code>footer.php</code>, paste the script before <code>&lt;?php wp_footer(); ?&gt;</code> or the closing <code>&lt;/body&gt;</code> tag.
          </p>
        </>
      ),
    },
    {
      id: 'nocode-setup',
      category: 'Platforms',
      title: 'Webflow, Wix & Framer',
      summary: 'Embed ORA into no-code site builders.',
      content: (
        <>
          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li><strong>Webflow:</strong> Project Settings → Custom Code → paste into Footer Code → Save & Publish.</li>
            <li><strong>Wix:</strong> Settings → Custom Code → Add Custom Code → paste the script, placement: <strong>Body — End</strong>.</li>
            <li><strong>Squarespace:</strong> Settings → Advanced → Code Injection → Footer → Save.</li>
            <li><strong>Framer:</strong> Site Settings → General → Custom Code → End of &lt;body&gt; → Publish.</li>
          </ul>
        </>
      ),
    },

    // Widget Settings
    {
      id: 'widget-attributes',
      category: 'Widget Settings',
      title: 'Widget attributes',
      summary: 'The full list of data attributes you can set on the script tag.',
      content: (
        <>
          <p className="lp-docs-p">
            All customization is done via <code>data-*</code> attributes on the script tag — no JavaScript required.
          </p>
          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Values</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>data-ora-key</code></td>
                  <td><code>biz_live_xxxx</code></td>
                  <td><em>Required</em></td>
                  <td>Your store's publishable widget key from the dashboard.</td>
                </tr>
                <tr>
                  <td><code>data-ora-api</code></td>
                  <td>API origin URL</td>
                  <td><em>Auto-detected</em></td>
                  <td>Where the widget connects. Derived from the script origin when omitted.</td>
                </tr>
                <tr>
                  <td><code>data-ora-position</code></td>
                  <td><code>bottom-center</code>, <code>bottom-right</code>, <code>bottom-left</code></td>
                  <td><code>bottom-center</code></td>
                  <td>Corner placement of the floating orb.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <CodeBlock snippets={[{
            language: 'HTML',
            filename: 'custom-position.html',
            code: `<script
  src="https://tryora.live/widget/ora-widget.js"
  data-ora-key="biz_live_your_publishable_key"
  data-ora-api="https://api.tryora.live"
  data-ora-position="bottom-right"
  defer>
</script>`,
          }]} />
        </>
      ),
    },
    {
      id: 'voice-language',
      category: 'Widget Settings',
      title: 'Supported languages',
      summary: 'Languages ORA can understand and respond in.',
      content: (
        <>
          <p className="lp-docs-p">
            Language is configured per store from your dashboard under <strong>Agent Settings</strong>. When a visitor speaks a supported language, ORA responds in that language for the session.
          </p>
          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Language</th>
                  <th>Code</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>English (US)</strong></td>
                  <td><code>en-US</code></td>
                  <td>Full support — voice, catalog search</td>
                </tr>
                <tr>
                  <td><strong>English (UK)</strong></td>
                  <td><code>en-GB</code></td>
                  <td>Full support — voice, catalog search</td>
                </tr>
                <tr>
                  <td><strong>Bengali (BD)</strong></td>
                  <td><code>bn-BD</code></td>
                  <td>Full support — voice, bilingual queries, bKash</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ),
    },

    // Catalog & Knowledge
    {
      id: 'catalog-sync',
      category: 'Catalog & Knowledge',
      title: 'Product catalog',
      summary: 'How ORA learns your products and stays up to date.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA answers product questions based on your catalog. Keep it updated so recommendations are accurate.
          </p>
          <ul style={{ paddingLeft: '1.25rem', marginBottom: '1.25rem', color: 'var(--lp-text-secondary)', fontSize: '0.875rem', lineHeight: 1.8 }}>
            <li><strong>Shopify:</strong> Connect your store in the dashboard. ORA reads your product catalog, prices, and variants.</li>
            <li><strong>CSV upload:</strong> For other platforms, upload a product CSV from the dashboard. Changes take effect immediately.</li>
            <li><strong>Product variants:</strong> ORA understands sizes, colors, and other variant options when they are present in your catalog.</li>
          </ul>
          <h3 className="lp-docs-h3">CSV format</h3>
          <p className="lp-docs-p">Use these column headers when uploading a catalog manually:</p>
          <CodeBlock snippets={[{
            language: 'CSV',
            filename: 'products.csv',
            code: `id,title,description,price,stock,category,tags
KB-01,Obsidian Desk Mat,Water-resistant micro-woven cloth with non-slip base,29.99,150,Accessories,"desk mat, waterproof"
KB-02,Mechanical Keyboard 75%,Hot-swappable switches with Bluetooth and 2.4GHz,119.00,24,Keyboards,"wireless, mechanical"
KB-03,Wireless Precision Mouse,26000 DPI optical sensor with 80-hour battery,69.00,12,Mice,"lightweight, wireless"`,
          }]} />
        </>
      ),
    },
    {
      id: 'store-policies',
      category: 'Catalog & Knowledge',
      title: 'Policies & FAQs',
      summary: 'Teach ORA your shipping rules, return policy, and store details.',
      content: (
        <>
          <p className="lp-docs-p">
            You can add store policies directly in the ORA dashboard. Shoppers frequently ask about shipping, returns, and contact details — these answers come from what you write there.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', margin: '1.25rem 0' }}>
            {[
              { label: 'Shipping & delivery', desc: 'Estimated times, free shipping thresholds, and tracking.' },
              { label: 'Returns & refunds', desc: 'Return window, conditions, and refund process.' },
              { label: 'Store information', desc: 'Business hours, contact email, and physical address.' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ padding: '1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-lg)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.35rem' }}>{label}</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--lp-text-secondary)', lineHeight: 1.5, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
          <div className="lp-docs-callout tip">
            ORA stays on-topic. If a visitor asks something unrelated to your store, it redirects the conversation back to your products and policies.
          </div>
        </>
      ),
    },

    // Testing & Launch
    {
      id: 'pre-launch',
      category: 'Testing & Launch',
      title: 'Pre-launch checklist',
      summary: 'Verify the widget is working before announcing it to customers.',
      content: (
        <>
          <p className="lp-docs-p">Run through these checks after installing the widget:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', margin: '1.25rem 0' }}>
            {[
              { label: 'Orb placement', desc: 'The floating orb appears in the correct corner on both desktop and mobile.' },
              { label: 'Microphone prompt', desc: 'Clicking the orb requests microphone permission and ORA speaks a greeting.' },
              { label: 'Product accuracy', desc: 'Asking "What products do you have?" returns items from your actual catalog.' },
            ].map(({ label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-md)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--lp-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                <span style={{ fontSize: '0.875rem', color: 'var(--lp-text-primary)' }}>
                  <strong>{label}:</strong> {desc}
                </span>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      id: 'troubleshooting',
      category: 'Testing & Launch',
      title: 'Troubleshooting',
      summary: 'Quick fixes for the most common setup issues.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '0.5rem' }}>
          {[
            {
              q: "The floating orb isn't appearing.",
              a: <>Make sure you replaced <code>biz_live_your_publishable_key</code> with your actual key from the dashboard. Check the <code>&lt;script&gt;</code> tag is placed before <code>&lt;/body&gt;</code>. Try a hard refresh or incognito window.</>,
            },
            {
              q: "The microphone isn't turning on.",
              a: "Browsers require an HTTPS connection to access the microphone. Make sure your site has a valid SSL certificate. If you previously blocked mic access, click the lock icon in your address bar and allow it.",
            },
            {
              q: "ORA doesn't know about my products.",
              a: "Check that your store is connected in the dashboard, or that your CSV catalog has been uploaded. Product queries only work after the catalog is synced.",
            },
          ].map(({ q, a }, i) => (
            <div key={i} style={i > 0 ? { borderTop: '1px solid var(--lp-border)', paddingTop: '1.5rem' } : undefined}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--lp-text-primary)', marginBottom: '0.35rem' }}>{q}</h4>
              <p className="lp-docs-p" style={{ marginBottom: 0 }}>{a}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  // Group & filter
  const categories = useMemo(() => {
    const map = new Map<string, DocSection[]>();
    docSections.forEach((sec) => {
      if (!map.has(sec.category)) map.set(sec.category, []);
      map.get(sec.category)!.push(sec);
    });
    return Array.from(map.entries()).map(([category, sections]) => ({ category, sections }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allCategoryNames = useMemo(() => ['All', ...categories.map((c) => c.category)], [categories]);

  const filteredSections = useMemo(() => {
    let list = docSections;
    if (selectedCategory !== 'All') list = list.filter((s) => s.category === selectedCategory);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((s) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

  // Scroll spy
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = window.scrollY + 140;
          const sections = filteredSections
            .map((s) => { const el = document.getElementById(s.id); return el ? { id: s.id, top: el.offsetTop } : null; })
            .filter(Boolean) as { id: string; top: number }[];
          if (sections.length > 0) {
            let current = sections[0].id;
            for (const s of sections) { if (s.top <= scrollPos) current = s.id; else break; }
            setActiveSection(current);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [filteredSections]);

  // Sidebar active item scroll-into-view
  useEffect(() => {
    if (!sidebarRef.current) return;
    const active = sidebarRef.current.querySelector('.lp-docs-nav-link.active') as HTMLElement | null;
    if (active) {
      const sidebar = sidebarRef.current;
      const top = active.offsetTop - sidebar.offsetTop;
      if (top < sidebar.scrollTop || top > sidebar.scrollTop + sidebar.clientHeight - 60) {
        sidebar.scrollTo({ top: Math.max(0, top - 40), behavior: 'smooth' });
      }
    }
  }, [activeSection]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(id);
    }
  }, []);

  // Listen for hash changes or programmatic docs-scroll-to events from the voice widget
  useEffect(() => {
    const handleTargetScroll = (rawId: string) => {
      if (!rawId) return;
      const cleanId = rawId.replace(/^#/, '').toLowerCase().trim();
      const aliasMap: Record<string, string> = {
        shopify: 'shopify-setup',
        woocommerce: 'woocommerce-setup',
        woo: 'woocommerce-setup',
        nocode: 'nocode-setup',
        attributes: 'widget-attributes',
        voice: 'voice-language',
        catalog: 'catalog-sync',
        policies: 'store-policies',
        policy: 'store-policies',
        snippets: 'embed-snippets',
        embed: 'embed-snippets',
        launch: 'pre-launch',
        checklist: 'pre-launch',
        troubleshoot: 'troubleshooting',
      };
      const targetId = aliasMap[cleanId] || cleanId;
      const sectionExists = docSections.some((s) => s.id === targetId);
      if (sectionExists) {
        setSelectedCategory('All');
        setSearchQuery('');
        setTimeout(() => {
          scrollToSection(targetId);
        }, 100);
      }
    };

    if (typeof window !== 'undefined' && window.location.hash) {
      handleTargetScroll(window.location.hash);
    }

    const onHashChange = () => {
      if (typeof window !== 'undefined' && window.location.hash) {
        handleTargetScroll(window.location.hash);
      }
    };

    const onCustomScroll = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        handleTargetScroll(customEvent.detail);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('docs-scroll-to', onCustomScroll);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('docs-scroll-to', onCustomScroll);
    };
  }, [docSections, scrollToSection]);

  return (
    <div className="lp-docs-root">
      <style>{ANIM_STYLE}</style>

      {/* Hero */}
      <section className="lp-docs-hero" style={{ textAlign: 'center' }}>
        <div
          ref={heroRef}
          className="lp-container"
          style={{ maxWidth: '48rem', margin: '0 auto', opacity: 0 }}
        >
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--lp-text-tertiary)', marginBottom: '1rem' }}>
            Setup & Integration Guide
          </p>
          <h1
            className="lp-display"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.15, marginBottom: '0.875rem', letterSpacing: '-0.025em', color: 'var(--lp-text-primary)' }}
          >
            Set up ORA on your site
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--lp-text-secondary)', maxWidth: '38rem', lineHeight: 1.65, margin: '0 auto 2rem' }}>
            Step-by-step guides for adding ORA to Shopify, WooCommerce, Next.js, and any custom site.
          </p>

          {/* Search */}
          <div className="lp-docs-search-wrapper">
            <Search className="lp-docs-search-icon" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              className="lp-docs-search-input"
              placeholder="Search guides… (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search documentation"
            />
            {searchQuery ? (
              <button type="button" className="lp-docs-search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Clear search">
                Clear
              </button>
            ) : (
              <div className="lp-docs-search-shortcut">⌘K</div>
            )}
          </div>

          {/* Category pills */}
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

      {/* Mobile select */}
      <div className="lp-docs-mobile-bar">
        <select
          className="lp-docs-mobile-select"
          value={activeSection}
          onChange={(e) => scrollToSection(e.target.value)}
          aria-label="Jump to section"
        >
          {docSections.map((s) => (
            <option key={s.id} value={s.id}>{s.category}: {s.title}</option>
          ))}
        </select>
      </div>

      {/* Layout */}
      <div className="lp-container">
        <div className="lp-docs-layout">

          {/* Sidebar */}
          <aside className="lp-docs-sidebar" ref={sidebarRef} aria-label="Documentation navigation">
            {categories.map(({ category, sections }, catIdx) => (
              <div key={category}>
                <div className="lp-docs-category-title">
                  <span>{category}</span>
                  <span className="lp-docs-category-count">{sections.length}</span>
                </div>
                <ul className="lp-docs-nav-list">
                  {sections.map((sec, secIdx) => (
                    <li
                      key={sec.id}
                      className="docs-animate"
                      style={{ animationDelay: `${(catIdx * 4 + secIdx) * 35}ms`, opacity: 0 }}
                    >
                      <button
                        type="button"
                        className={`lp-docs-nav-link ${activeSection === sec.id ? 'active' : ''}`}
                        onClick={() => scrollToSection(sec.id)}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sec.title}
                        </span>
                        {activeSection === sec.id && (
                          <span style={{ fontSize: '0.5rem', color: 'var(--lp-primary)', flexShrink: 0 }}>●</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          {/* Content */}
          <main className="lp-docs-content">
            {filteredSections.length === 0 ? (
              <div style={{ padding: '4rem 2rem', background: 'var(--lp-bg-white)', border: '1px solid var(--lp-border)', borderRadius: 'var(--lp-radius-xl)', textAlign: 'center' }}>
                <h3 className="lp-docs-h3" style={{ justifyContent: 'center', marginTop: 0 }}>No guides found</h3>
                <p className="lp-docs-p" style={{ maxWidth: '26rem', margin: '0 auto 1.5rem' }}>
                  Nothing matched &ldquo;{searchQuery}&rdquo;{selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                  className="lp-btn-secondary"
                  style={{ fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              filteredSections.map((sec) => (
                <article
                  key={sec.id}
                  id={sec.id}
                  data-section-id={sec.id}
                  ref={(el) => registerSection(sec.id, el)}
                  className="lp-docs-section"
                  style={{ opacity: 0 }}
                >
                  <div className="lp-docs-section-header">
                    <div className="lp-docs-section-category"><span>{sec.category}</span></div>
                    <h2 className="lp-docs-h2">{sec.title}</h2>
                    <p style={{ fontSize: '1rem', color: 'var(--lp-text-secondary)', lineHeight: 1.65 }}>
                      {sec.summary}
                    </p>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>{sec.content}</div>
                </article>
              ))
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
