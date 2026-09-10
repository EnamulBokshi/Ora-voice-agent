'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationPreviewProps {
  /** Null while the merchant's real key is still loading, or if it failed to load. */
  publishableKey?: string | null;
  isWidgetActive?: boolean;
  onCopied?: () => void;
}

type PlatformTab = 'html' | 'shopify' | 'woocommerce' | 'react';

const PLATFORMS: { id: PlatformTab; label: string; fileTarget: string; instructions: string }[] = [
  {
    id: 'html',
    label: 'Standard HTML / JS',
    fileTarget: 'index.html',
    instructions: 'Paste this snippet right before the closing </body> tag of your website.',
  },
  {
    id: 'shopify',
    label: 'Shopify Store',
    fileTarget: 'layout/theme.liquid',
    instructions: 'In Shopify Admin, go to Online Store → Themes → Edit Code → layout/theme.liquid and paste before </body>.',
  },
  {
    id: 'woocommerce',
    label: 'WooCommerce / WP',
    fileTarget: 'footer.php',
    instructions: 'Paste into footer.php of your active child theme or using the WPCode / Header and Footer Scripts plugin.',
  },
  {
    id: 'react',
    label: 'React / Next.js',
    fileTarget: 'app/layout.tsx',
    instructions: 'Import Next.js Script and embed in your root layout component.',
  },
];

export function IntegrationPreview({
  publishableKey = null,
  isWidgetActive = true,
  onCopied,
}: IntegrationPreviewProps) {
  const [platform, setPlatform] = useState<PlatformTab>('html');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://ora.hype.app');
  const [apiOrigin, setApiOrigin] = useState('https://api.ora.hype.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setApiOrigin(isLocal ? `${window.location.protocol}//${window.location.hostname}:5000` : window.location.origin);
    }
  }, []);

  // Without a real key the snippet is worse than useless: it installs a widget that
  // logs "data-ora-key is required" and disables itself. The default used to be the
  // literal 'biz_live_demo_key', which shipped exactly that outcome to any merchant
  // whose profile call failed.
  const keyForSnippet = publishableKey ?? 'YOUR_PUBLISHABLE_KEY';

  const snippets: Record<PlatformTab, string> = {
    html: `<!-- ORA Voice & Sales Assistant Widget -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${keyForSnippet}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    shopify: `<!-- Paste before </body> in layout/theme.liquid -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${keyForSnippet}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    woocommerce: `<!-- Paste in footer.php or header/footer scripts -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${keyForSnippet}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    react: `import Script from 'next/script';\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n        <Script\n          src="${origin}/widget/ora-widget.js"\n          data-ora-key="${keyForSnippet}"\n          data-ora-api="${apiOrigin}"\n          strategy="lazyOnload"\n        />\n      </body>\n    </html>\n  );\n}`,
  };

  const currentPlatform = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
  const currentSnippet = snippets[platform];

  const handleCopy = () => {
    if (!publishableKey) return;
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    if (onCopied) onCopied();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6">
      {/* ── EMBED WORKSPACE CARD ── */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
            <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
              Storefront Script Tag
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Async · Zero-Latency CDN
          </span>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-1.5 p-0.5 rounded-md bg-surface-high/40 border border-border/60">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={cn(
                  'px-3 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer',
                  platform === p.id
                    ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-md bg-foreground text-background font-semibold text-[12px] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            {copied ? <Check size={12} strokeWidth={3} className="text-foreground dark:text-[#C8F031]" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
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
            <span className="text-[10.5px] font-mono text-foreground uppercase font-semibold">Deferred load</span>
          </div>
          <pre className="p-4 text-[12px] font-mono text-foreground/90 whitespace-pre overflow-x-auto no-scrollbar leading-relaxed select-text">
            <code>{currentSnippet}</code>
          </pre>
        </div>
      </div>

      {/* ── Key & Security Metadata Card ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-md border border-border/50 bg-transparent flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck size={14} className="text-foreground flex-shrink-0" />
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
            <Zap size={14} className="text-foreground flex-shrink-0" />
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
