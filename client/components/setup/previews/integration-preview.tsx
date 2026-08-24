'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationPreviewProps {
  publishableKey?: string;
  onCopied?: () => void;
}

type PlatformTab = 'html' | 'shopify' | 'woocommerce' | 'react';

const PLATFORMS: { id: PlatformTab; label: string; tip: string }[] = [
  { id: 'html',        label: 'HTML / JS',      tip: 'Paste before </body> tag.' },
  { id: 'shopify',     label: 'Shopify',         tip: 'layout/theme.liquid → before </body>.' },
  { id: 'woocommerce', label: 'WooCommerce',     tip: 'footer.php or a header/footer plugin.' },
  { id: 'react',       label: 'React / Next.js', tip: 'Root layout or Next.js Script component.' },
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
    html: `<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    shopify: `<!-- layout/theme.liquid before </body> -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    woocommerce: `<!-- footer.php or header/footer plugin -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`,
    react: `import Script from 'next/script';\n\nexport default function Layout({ children }) {\n  return (\n    <>\n      {children}\n      <Script\n        src="${origin}/widget/ora-widget.js"\n        data-ora-key="${publishableKey}"\n        data-ora-api="${apiOrigin}"\n        strategy="lazyOnload"\n      />\n    </>\n  );\n}`,
  };

  const currentSnippet = snippets[platform];
  const currentTip = PLATFORMS.find((p) => p.id === platform)?.tip;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    if (onCopied) onCopied();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Platform tabs + tip row — underline style matching AnalyticsPanel tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-0">
        <div className="flex items-center gap-5 text-[12.5px]">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={cn(
                'pb-2.5 relative transition-colors cursor-pointer whitespace-nowrap',
                platform === p.id
                  ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
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
          className="flex items-center gap-1.5 pb-2.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
        >
          {copied ? <Check size={12} strokeWidth={3} className="text-primary" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Tip */}
      <p className="text-[11.5px] font-mono text-muted-foreground">💡 {currentTip}</p>

      {/* Code block — no black bg, uses surface token */}
      <pre className="p-4 rounded-lg bg-surface-low border border-border/60 text-[11.5px] font-mono text-foreground/80 whitespace-pre overflow-x-auto no-scrollbar leading-relaxed select-text">
        <code>{currentSnippet}</code>
      </pre>

      {/* Footer meta row */}
      <div className="flex items-center justify-between text-[12px] text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>WebSocket gateway ready</span>
        </div>
        <span className="font-mono truncate max-w-[180px] text-foreground/70">{publishableKey}</span>
      </div>
    </div>
  );
}
