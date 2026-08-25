'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationPreviewProps {
  publishableKey?: string;
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
  publishableKey = 'biz_live_demo_key',
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

  const snippets: Record<PlatformTab, string> = {
    html: `<!-- ORA Voice & Sales Assistant Widget -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    shopify: `<!-- Paste before </body> in layout/theme.liquid -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    woocommerce: `<!-- Paste in footer.php or header/footer scripts -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    react: `import Script from 'next/script';\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>\n        {children}\n        <Script\n          src="${origin}/widget/ora-widget.js"\n          data-ora-key="${publishableKey}"\n          data-ora-api="${apiOrigin}"\n          strategy="lazyOnload"\n        />\n      </body>\n    </html>\n  );\n}`,
  };

  const currentPlatform = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
  const currentSnippet = snippets[platform];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    if (onCopied) onCopied();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Platform Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-lowest border border-border/50">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer',
                platform === p.id
                  ? 'bg-surface-high text-foreground font-semibold shadow-sm'
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
          className="inline-flex items-center gap-2 h-8.5 px-4 rounded-lg bg-foreground text-background font-semibold text-[12.5px] hover:opacity-90 transition-all cursor-pointer shadow-sm"
        >
          {copied ? <Check size={13} strokeWidth={3} className="text-emerald-400 dark:text-[#C8F031]" /> : <Copy size={13} />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
        </button>
      </div>

      {/* Target File & Instructions Callout */}
      <div className="p-3.5 rounded-xl border border-border/50 bg-surface-lowest/60 flex items-start gap-3">
        <div className="w-6 h-6 rounded-md bg-surface-high flex items-center justify-center border border-border/50 flex-shrink-0 mt-0.5">
          <Terminal size={13} className="text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-mono font-semibold text-foreground uppercase tracking-wide">Target:</span>
            <code className="text-[12px] font-mono px-1.5 py-0.2 rounded bg-surface-high text-foreground border border-border/40">
              {currentPlatform.fileTarget}
            </code>
          </div>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            {currentPlatform.instructions}
          </p>
        </div>
      </div>

      {/* Code Block */}
      <div className="relative rounded-2xl bg-surface-lowest border border-border/60 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-surface-high/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-border/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-border/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-border/80" />
            <span className="text-[11.5px] font-mono text-muted-foreground ml-2">ora-widget-snippet.html</span>
          </div>
          <span className="text-[11px] font-mono text-foreground dark:text-[#C8F031] uppercase font-semibold">Async · Sub-85ms</span>
        </div>
        <pre className="p-5 text-[12.5px] font-mono text-foreground/90 whitespace-pre overflow-x-auto no-scrollbar leading-relaxed select-text">
          <code>{currentSnippet}</code>
        </pre>
      </div>

      {/* ── Section Divider ── */}
      <div className="h-px bg-border/40 my-6" />

      {/* Key & Security Metadata Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl border border-border/50 bg-surface-container/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck size={15} className="text-foreground dark:text-[#C8F031] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase text-muted-foreground">Publishable Widget Key</p>
              <p className="text-[12.5px] font-mono font-medium text-foreground truncate">{publishableKey}</p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-surface-container/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Zap size={15} className="text-foreground dark:text-[#C8F031] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase text-muted-foreground">Gateway Status</p>
              <p className="text-[12.5px] font-medium text-foreground">WebSocket Live & Encrypted</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#C8F031] shadow-[0_0_8px_rgba(200,240,49,0.7)] flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
