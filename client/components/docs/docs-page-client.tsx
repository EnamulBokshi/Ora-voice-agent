'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Search, Copy, Check } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface DocSection {
  id: string;
  category: string;
  title: string;
  summary: string;
  content: React.ReactNode;
}

// ── Minimalist Code Block ───────────────────────────────────────────────────

interface CodeSnippet {
  language: string;
  filename?: string;
  code: string;
}

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

// ── Concise Docs Page Client ────────────────────────────────────────────────

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

  // ── Streamlined Documentation Sections ────────────────────────────────────

  const docSections: DocSection[] = [
    {
      id: 'quickstart',
      category: 'Overview',
      title: 'Quickstart',
      summary: 'Embed the ORA real-time sales agent on your store with a single line of code.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA connects directly to your store catalog and provides 24/7 conversational voice & chat sales. All you need is your merchant <strong>Publishable Widget Key</strong>.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'HTML CDN Script',
                filename: 'index.html',
                code: `<!-- Add before closing </body> tag -->
<script
  src="https://cdn.ora.ai/widget/v2/widget.v4_5.js"
  data-publishable-key="biz_live_your_merchant_key"
  data-position="bottom-right"
  async>
</script>`
              },
              {
                language: 'React / Next.js',
                filename: 'app/layout.tsx',
                code: `import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="https://cdn.ora.ai/widget/v2/widget.v4_5.js"
          data-publishable-key={process.env.NEXT_PUBLIC_ORA_KEY}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'widget-sdk',
      category: 'Widget SDK',
      title: 'Widget Configuration & Events',
      summary: 'Customizing widget placement, voice language, and listening to client events.',
      content: (
        <>
          <p className="lp-docs-p">
            Configure the floating orb widget using HTML attributes or listen to real-time sales and checkout triggers in JavaScript:
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>data-publishable-key</code></td>
                  <td><em>Required</em></td>
                  <td>Your merchant tenant key (e.g. <code>biz_live_xxxx</code>).</td>
                </tr>
                <tr>
                  <td><code>data-position</code></td>
                  <td><code>bottom-right</code></td>
                  <td>Placement: <code>bottom-right</code>, <code>bottom-left</code>.</td>
                </tr>
                <tr>
                  <td><code>data-language</code></td>
                  <td><code>en-US</code></td>
                  <td>Default voice locale (supports English, Bengali, Spanish, etc.).</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="lp-docs-h3">Client Event Listeners</h3>
          <CodeBlock
            snippets={[
              {
                language: 'JavaScript',
                filename: 'events.js',
                code: `// Listen for customer voice transcripts & checkout events
window.addEventListener('ora:transcript', (e) => {
  console.log(\`[\${e.detail.sender}]: \${e.detail.text}\`);
});

window.addEventListener('ora:checkout_trigger', (e) => {
  console.log('Voice order triggered:', e.detail.items, e.detail.total);
});`
              }
            ]}
          />
        </>
      )
    },
    {
      id: 'connectors',
      category: 'Integrations',
      title: 'Store Connectors',
      summary: 'Syncing product catalogs and orders with Shopify, WooCommerce, or custom webhooks.',
      content: (
        <>
          <p className="lp-docs-p">
            ORA auto-indexes your catalog items, inventory levels, and orders via standard e-commerce integrations:
          </p>

          <div className="lp-docs-table-wrapper">
            <table className="lp-docs-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Connection Method</th>
                  <th>Supported Events</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Shopify</strong></td>
                  <td>OAuth 2.0</td>
                  <td><code>orders/create</code>, <code>checkouts/update</code>, <code>inventory_levels/update</code></td>
                </tr>
                <tr>
                  <td><strong>WooCommerce</strong></td>
                  <td>REST Consumer Key</td>
                  <td><code>order.created</code>, <code>product.updated</code></td>
                </tr>
                <tr>
                  <td><strong>Custom API</strong></td>
                  <td>Webhook Secret</td>
                  <td><code>x-ora-signature</code> HMAC-SHA256 verification</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )
    },
    {
      id: 'api-reference',
      category: 'API Reference',
      title: 'REST API & Recovery',
      summary: 'Programmatic catalog querying, cart recovery dispatches, and context telemetry.',
      content: (
        <>
          <p className="lp-docs-p">
            All endpoints require the <code>x-publishable-key</code> header and return standard JSON response envelopes.
          </p>

          <div className="lp-docs-endpoint-row">
            <span className="lp-docs-method-pill get">GET</span>
            <span className="lp-docs-endpoint-path">/api/v1/products</span>
          </div>
          <p className="lp-docs-p" style={{ fontSize: '0.84375rem', marginBottom: '0.75rem' }}>
            Search the synced merchant product catalog by query.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'cURL',
                code: `curl -X GET "https://api.ora.ai/api/v1/products?search=mat&limit=5" \\
  -H "x-publishable-key: biz_live_your_key"`
              },
              {
                language: 'Response (200 OK)',
                code: `{
  "success": true,
  "data": {
    "items": [
      {
        "id": "prod_01",
        "title": "Obsidian Desk Mat",
        "price": 49.00,
        "inStock": true
      }
    ]
  }
}`
              }
            ]}
          />

          <div className="lp-docs-endpoint-row" style={{ marginTop: '2rem' }}>
            <span className="lp-docs-method-pill post">POST</span>
            <span className="lp-docs-endpoint-path">/api/v1/orders/recovery</span>
          </div>
          <p className="lp-docs-p" style={{ fontSize: '0.84375rem', marginBottom: '0.75rem' }}>
            Dispatch an automated personalized recovery sequence for an abandoned cart.
          </p>

          <CodeBlock
            snippets={[
              {
                language: 'cURL',
                code: `curl -X POST "https://api.ora.ai/api/v1/orders/recovery" \\
  -H "x-publishable-key: biz_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionId": "sess_12345",
    "cartTotal": 98.00,
    "currency": "USD"
  }'`
              },
              {
                language: 'Response (200 OK)',
                code: `{
  "success": true,
  "data": {
    "recoveryId": "rec_live_89172",
    "status": "dispatched"
  }
}`
              }
            ]}
          />

          <div className="lp-docs-callout" style={{ marginTop: '2rem' }}>
            <strong>Security & Tenant Isolation:</strong> Every API query is scoped strictly by <code>businessId</code>, customer PII is encrypted at rest (AES-256-GCM), and admin tokens rotate on every session refresh.
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
  }, []);

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
      {/* ── Concise Header ── */}
      <section className="lp-docs-hero">
        <div className="lp-container">
          <div className="lp-docs-badge">
            <span className="lp-docs-badge-dot" />
            <span>DOCUMENTATION</span>
          </div>

          <h1 className="lp-display" style={{ fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)', marginBottom: '0.35rem' }}>
            Developer Documentation
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--lp-text-secondary)', maxWidth: '34rem', lineHeight: 1.5 }}>
            Quickstart guides, widget SDK options, store connectors, and REST API reference.
          </p>

          {/* Quick Search */}
          <div className="lp-docs-search-wrapper">
            <Search className="lp-docs-search-icon" size={15} />
            <input
              ref={searchInputRef}
              type="text"
              className="lp-docs-search-input"
              placeholder="Search documentation..."
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
          {/* ── Sidebar ── */}
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

          {/* ── Content ── */}
          <main className="lp-docs-content">
            {filteredSections.length === 0 ? (
              <div style={{ padding: '3rem 0', color: 'var(--lp-text-secondary)' }}>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                  No documentation found matching &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--lp-border)',
                    borderRadius: 'var(--lp-radius-sm)',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--lp-text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Clear search
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
                    <p style={{ fontSize: '0.875rem', color: 'var(--lp-text-secondary)', lineHeight: 1.5 }}>
                      {sec.summary}
                    </p>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
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
