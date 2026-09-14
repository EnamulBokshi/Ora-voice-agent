'use client';

import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sliders,
  Code2,
  Play,
  ShoppingBag,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShopifyEmbedCard } from '@/components/shopify/shopify-embed-card';

interface IntegrationPreviewProps {
  /** Null while the merchant's real key is still loading, or if it failed to load. */
  publishableKey?: string | null;
  isWidgetActive?: boolean;
  onCopied?: () => void;
}

type PlatformTab = 'shopify' | 'html' | 'woocommerce' | 'react';
type WidgetPosition = 'bottom-center' | 'bottom-right' | 'bottom-left';
type SnippetFormat = 'attributes' | 'config';

const PLATFORMS: { id: PlatformTab; label: string; fileTarget: string; instructions: string }[] = [
  {
    id: 'shopify',
    label: 'Shopify App',
    fileTarget: 'App embed',
    instructions: 'Enable ORA Voice AI via App embeds in your theme editor.',
  },
  {
    id: 'html',
    label: 'HTML / JS',
    fileTarget: 'index.html',
    instructions: 'Paste before the closing </body> tag.',
  },
  {
    id: 'woocommerce',
    label: 'WooCommerce',
    fileTarget: 'footer.php',
    instructions: 'Paste into footer.php or your scripts plugin.',
  },
  {
    id: 'react',
    label: 'React / Next.js',
    fileTarget: 'layout.tsx',
    instructions: 'Import Next.js Script into your root layout.',
  },
];

export function IntegrationPreview({
  publishableKey = null,
  isWidgetActive = true,
  onCopied,
}: IntegrationPreviewProps) {
  const [platform, setPlatform] = useState<PlatformTab>('shopify');
  const [position, setPosition] = useState<WidgetPosition>('bottom-center');
  const [format, setFormat] = useState<SnippetFormat>('attributes');
  const [copied, setCopied] = useState(false);
  const [shopifyStoreDomain, setShopifyStoreDomain] = useState('');
  const [showManualShopifyCode, setShowManualShopifyCode] = useState(false);

  // Widget CDN & API origins - always default to production live URLs for copyable snippets
  const origin = (process.env.NEXT_PUBLIC_WIDGET_ORIGIN || 'https://tryora.live').replace(/\/+$/, '');
  const apiOrigin = (process.env.NEXT_PUBLIC_WIDGET_API_URL || 'https://tryora.live').replace(/\/+$/, '');

  /**
   * False through the server render and the first client render on purpose.
   * Reading `location` during render would either throw on the server or
   * produce markup that disagrees with the client's.
   */
  const [isShopifyEmbedded, setIsShopifyEmbedded] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsLocalHost(isLocal);

      const inShopify = window.location.pathname.startsWith('/shopify');
      setIsShopifyEmbedded(inShopify);

      const shopParam = new URLSearchParams(window.location.search).get('shop');
      if (shopParam) {
        setShopifyStoreDomain(shopParam);
      }
    }
  }, []);

  const keyForSnippet = publishableKey ?? 'YOUR_PUBLISHABLE_KEY';

  // Helper to extract clean Shopify handle (e.g. 'my-store' from 'my-store.myshopify.com')
  const cleanShopifyHandle = (input: string): string => {
    return input
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\.myshopify\.com.*$/, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
  };

  const currentHandle = cleanShopifyHandle(shopifyStoreDomain);
  const shopifyThemeEditorUrl = currentHandle
    ? `https://admin.shopify.com/store/${currentHandle}/themes/current/editor?context=apps&template=index`
    : 'https://admin.shopify.com';

  const shopifyAppInstallUrl = currentHandle
    ? `https://admin.shopify.com/store/${currentHandle}/apps/ora-voice-ai`
    : 'https://apps.shopify.com/ora-voice-ai';

  // Build snippet for manual tag injection
  const getSnippet = (): string => {
    const positionAttr = position !== 'bottom-center' ? `\n  data-ora-position="${position}"` : '';

    if (format === 'config') {
      return `<!-- ORA Voice & Sales Assistant Widget -->\n<script>\n  window.ORA_CONFIG = {\n    key: "${keyForSnippet}",\n    api: "${apiOrigin}",\n    position: "${position}"\n  };\n</script>\n<script src="${origin}/widget/ora-widget.js" defer></script>`;
    }

    switch (platform) {
      case 'html':
        return `<!-- ORA Voice & Sales Assistant Widget -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${keyForSnippet}" \n  data-ora-api="${apiOrigin}"${positionAttr} \n  defer>\n</script>`;
      case 'shopify':
        return `<!-- ORA Voice & Sales Assistant Widget - theme.liquid before </body> -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${keyForSnippet}" \n  data-ora-api="${apiOrigin}"${positionAttr} \n  defer>\n</script>`;
      case 'woocommerce':
        return `<!-- ORA Voice & Sales Assistant Widget -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${keyForSnippet}" \n  data-ora-api="${apiOrigin}"${positionAttr} \n  defer>\n</script>`;
      case 'react':
        return `import Script from 'next/script';\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n        <Script\n          src="${origin}/widget/ora-widget.js"\n          data-ora-key="${keyForSnippet}"\n          data-ora-api="${apiOrigin}"${position !== 'bottom-center' ? `\n          data-ora-position="${position}"` : ''}\n          strategy="lazyOnload"\n        />\n      </body>\n    </html>\n  );\n}`;
    }
  };

  const currentPlatform = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
  const currentSnippet = getSnippet();

  const handleCopy = () => {
    if (!publishableKey) return;
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    if (onCopied) onCopied();
    setTimeout(() => setCopied(false), 2000);
  };

  // If already inside Shopify Admin embedded iframe, show the native embed card
  if (isShopifyEmbedded) {
    return <ShopifyEmbedCard isWidgetActive={isWidgetActive} />;
  }

  const localTestApi = isLocalHost
    ? `${typeof window !== 'undefined' ? window.location.protocol : 'http:'}//${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000`
    : apiOrigin;
  const testWidgetUrl = `/test-widget.html?key=${encodeURIComponent(keyForSnippet)}&api=${encodeURIComponent(localTestApi)}`;

  return (
    <div className="w-full space-y-6">
      {/* ── EMBED WORKSPACE CARD ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border/40 gap-2">
          <div className="flex items-center gap-2">
            <Code2 size={15} className="text-primary flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              Storefront Integration
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-muted-foreground">
              Async loader
            </span>
            {publishableKey && (
              <a
                href={testWidgetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-foreground hover:text-primary transition-colors"
                title="Open live widget test"
              >
                <Play size={10} />
                <span>Test Live</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 p-0.5 rounded-md bg-surface-high/40 border border-border/60">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={cn(
                  'px-3 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5',
                  platform === p.id
                    ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p.id === 'shopify' && <ShoppingBag size={12} className="text-foreground" />}
                {p.label}
              </button>
            ))}
          </div>

          {platform !== 'shopify' && (
            <button
              type="button"
              onClick={handleCopy}
              disabled={!publishableKey}
              className="inline-flex items-center gap-1.5 h-9 sm:h-7.5 px-3 rounded-md bg-primary text-primary-foreground font-semibold text-[12px] hover:bg-primary-hover transition-colors cursor-pointer shadow-xs disabled:opacity-50 touch-manipulation"
            >
              {copied ? <Check size={12} strokeWidth={3} className="text-primary-foreground" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy Snippet'}</span>
            </button>
          )}
        </div>

        {/* ── SHOPIFY APP GUIDE ── */}
        {platform === 'shopify' ? (
          <div className="space-y-4">
            {/* Banner: Official Shopify App */}
            <div className="rounded-md border border-border/60 bg-surface-container/50 p-4 sm:p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-md bg-surface-high flex items-center justify-center text-primary flex-shrink-0 border border-border/60">
                  <ShoppingBag size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
                      Shopify App Embed
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-high text-muted-foreground border border-border/60 font-medium">
                      No code required
                    </span>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                    ORA connects through native Shopify App Embeds. Your store key syncs automatically—no theme files to edit.
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-Step Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1: Install App */}
              <div className="p-4 rounded-md border border-border/50 bg-surface-high/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-surface-high text-[11px] font-mono font-bold flex items-center justify-center border border-border/80 text-foreground">
                    1
                  </span>
                  <h4 className="text-[13px] font-semibold text-foreground">Install app</h4>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Enter your store handle to begin:
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="your-store-name"
                      value={shopifyStoreDomain}
                      onChange={(e) => setShopifyStoreDomain(e.target.value)}
                      className="w-full h-9 sm:h-8 px-2.5 pr-28 text-[12px] font-mono rounded-md bg-surface-lowest border border-border/70 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border"
                    />
                    <span className="absolute right-2.5 top-2.5 sm:top-2 text-[11px] font-mono text-muted-foreground pointer-events-none">
                      .myshopify.com
                    </span>
                  </div>
                  <a
                    href={shopifyAppInstallUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11.5px] font-semibold hover:bg-primary-hover transition-colors flex-shrink-0 cursor-pointer shadow-xs touch-manipulation"
                  >
                    <span>Install</span>
                    <ArrowRight size={12} />
                  </a>
                </div>
                <div className="pt-0.5">
                  <a
                    href="https://apps.shopify.com/ora-voice-ai"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-2 transition-colors"
                  >
                    <span>Shopify App Store</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Step 2: Enable App Embed */}
              <div className="p-4 rounded-md border border-border/50 bg-surface-high/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-surface-high text-[11px] font-mono font-bold flex items-center justify-center border border-border/80 text-foreground">
                    2
                  </span>
                  <h4 className="text-[13px] font-semibold text-foreground">Turn on embed</h4>
                </div>
                <ol className="space-y-1.5 text-[12px] text-muted-foreground leading-relaxed list-decimal list-inside">
                  <li>Open your live theme editor.</li>
                  <li>Select <strong>App embeds</strong> on the left.</li>
                  <li>Switch <strong>ORA Voice AI</strong> on and save.</li>
                </ol>
                <div className="pt-0.5">
                  <a
                    href={shopifyThemeEditorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full h-8 px-3 rounded-md bg-surface-high hover:bg-surface-highest text-foreground border border-border/60 text-[12px] font-semibold transition-colors cursor-pointer"
                  >
                    <span>Open Theme Editor</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Collapsible Manual Liquid Option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowManualShopifyCode((o) => !o)}
                className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer font-mono"
              >
                <span>Using a headless or custom theme? View manual script.</span>
                {showManualShopifyCode ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showManualShopifyCode && (
                <div className="mt-3 space-y-3 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Target: layout/theme.liquid (before &lt;/body&gt;)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      disabled={!publishableKey}
                      className="inline-flex items-center gap-1 h-6 px-2.5 rounded bg-surface-high text-foreground text-[11px] font-mono hover:bg-surface-highest border border-border/60 cursor-pointer"
                    >
                      {copied ? <Check size={10} className="text-primary" /> : <Copy size={10} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-md bg-surface-lowest border border-border/60 text-[11.5px] font-mono text-foreground/90 whitespace-pre overflow-x-auto select-text">
                    <code>{currentSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── STANDARD PLATFORMS (HTML, WooCommerce, React) ── */
          <>
            {/* Configuration Controls (Position & Format) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md bg-surface-high/20 border border-border/40">
              {/* Position Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sliders size={11} />
                  Orb Position
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['bottom-center', 'bottom-right', 'bottom-left'] as WidgetPosition[]).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosition(pos)}
                      className={cn(
                        'px-2 py-1 rounded text-[11px] font-medium transition-colors border cursor-pointer capitalize text-center truncate',
                        position === pos
                          ? 'bg-surface-high border-border text-foreground font-semibold'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                      )}
                    >
                      {pos.replace('bottom-', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Snippet Format Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Code2 size={11} />
                  Snippet Format
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormat('attributes')}
                    className={cn(
                      'px-2 py-1 rounded text-[11px] font-medium transition-colors border cursor-pointer text-center truncate',
                      format === 'attributes'
                        ? 'bg-surface-high border-border text-foreground font-semibold'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                    )}
                  >
                    Script Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('config')}
                    className={cn(
                      'px-2 py-1 rounded text-[11px] font-medium transition-colors border cursor-pointer text-center truncate',
                      format === 'config'
                        ? 'bg-surface-high border-border text-foreground font-semibold'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-high/50',
                    )}
                  >
                    window.ORA_CONFIG
                  </button>
                </div>
              </div>
            </div>

            {/* Target File & Instructions Callout */}
            <div className="p-3 rounded-md border border-border/50 bg-surface-high/30 flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-surface-high flex items-center justify-center border border-border/60 flex-shrink-0 mt-0.5">
                <Terminal size={12} className="text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Target:</span>
                  <code className="text-[11.5px] font-mono px-1.5 py-0.2 rounded-[2px] bg-surface-high text-foreground border border-border/60">
                    {currentPlatform.fileTarget}
                  </code>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {currentPlatform.instructions}
                </p>
              </div>
            </div>

            {/* Code Block */}
            <div className="relative rounded-md bg-surface-lowest border border-border/60 overflow-hidden shadow-xs">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/40 bg-surface-high/30">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-[2px] bg-border/80" />
                  <span className="text-[11px] font-mono text-muted-foreground ml-1">ora-widget-snippet.html</span>
                </div>
                <span className="text-[10.5px] font-mono text-foreground uppercase font-semibold">
                  Deferred load
                </span>
              </div>
              <pre className="p-4 text-[12px] font-mono text-foreground/90 whitespace-pre overflow-x-auto no-scrollbar leading-relaxed select-text">
                <code>{currentSnippet}</code>
              </pre>
            </div>
          </>
        )}
      </div>

      {/* ── Key & Security Metadata Card ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-md border border-border/50 bg-transparent flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck size={14} className="text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Publishable Widget Key</p>
              {publishableKey ? (
                <p className="text-[12px] font-mono font-medium text-foreground truncate">{publishableKey}</p>
              ) : (
                <p className="text-[12px] font-mono text-muted-foreground truncate">
                  Not loaded — reload to fetch your key
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-md border border-border/50 bg-transparent flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Zap size={14} className="text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Storefront Status</p>
              <p className="text-[12px] font-medium text-foreground">
                {isWidgetActive !== false ? 'Live on Storefront' : 'Storefront Paused'}
              </p>
            </div>
          </div>
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isWidgetActive !== false ? 'bg-[color:var(--status-online)]' : 'bg-amber-400'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
