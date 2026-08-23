'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Terminal, Code2, Globe, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationPreviewProps {
  publishableKey?: string;
  onCopied?: () => void;
}

type PlatformTab = 'html' | 'shopify' | 'woocommerce' | 'react';

const PLATFORMS: { id: PlatformTab; label: string; tip: string }[] = [
  {
    id: 'html',
    label: 'HTML / JS',
    tip: 'Paste this snippet right before the closing </body> tag of your website.',
  },
  {
    id: 'shopify',
    label: 'Shopify',
    tip: 'Online Store > Themes > Edit Code > layout/theme.liquid (paste before </body>).',
  },
  {
    id: 'woocommerce',
    label: 'WooCommerce',
    tip: 'Add into theme footer.php or use a Header/Footer script injector plugin.',
  },
  {
    id: 'react',
    label: 'React / Next.js',
    tip: 'Include in your root Layout component or use Next.js Script tag.',
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
      const isLocal =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setApiOrigin(
        isLocal
          ? `${window.location.protocol}//${window.location.hostname}:5000`
          : window.location.origin,
      );
    }
  }, []);

  const snippets: Record<PlatformTab, string> = {
    html: `<!-- ORA Voice & Conversational Sales Assistant -->
<script 
  src="${origin}/widget/ora-widget.js" 
  data-ora-key="${publishableKey}" 
  data-ora-api="${apiOrigin}" 
  defer>
</script>`,
    shopify: `<!-- In layout/theme.liquid before </body> -->
<script 
  src="${origin}/widget/ora-widget.js" 
  data-ora-key="${publishableKey}" 
  data-ora-api="${apiOrigin}" 
  defer>
</script>`,
    woocommerce: `// In functions.php or Header/Footer script injector
<script 
  src="${origin}/widget/ora-widget.js" 
  data-ora-key="${publishableKey}" 
  data-ora-api="${apiOrigin}" 
  defer>
</script>`,
    react: `import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Script
        src="${origin}/widget/ora-widget.js"
        data-ora-key="${publishableKey}"
        data-ora-api="${apiOrigin}"
        strategy="lazyOnload"
      />
    </>
  );
}`,
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
    <div className="w-full h-full min-h-[260px] rounded-xl border border-border/80 bg-surface-lowest/90 p-4 sm:p-5 flex flex-col justify-between select-none relative overflow-hidden group">
      {/* Glow */}
      <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header & Platform Switcher */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/50 gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                  platform === p.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-high',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            title="Copy script snippet"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-98 transition-all flex-shrink-0 cursor-pointer shadow-xs"
          >
            {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
            <span>{copied ? 'Copied Snippet' : 'Copy Snippet'}</span>
          </button>
        </div>

        {/* Tip text */}
        <p className="text-[11px] text-muted-foreground mt-2 font-mono line-clamp-1">
          💡 {currentTip}
        </p>

        {/* Code block */}
        <div className="my-2.5 p-3 rounded-lg bg-black/70 border border-border/60 font-mono text-[11px] text-foreground/90 overflow-x-auto no-scrollbar relative leading-relaxed">
          <pre className="text-muted-foreground whitespace-pre-wrap select-text font-mono">
            <code>{currentSnippet}</code>
          </pre>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-medium text-foreground">WebSocket Gateway Ready</span>
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground">Publishable Key:</span>
          <span className="font-mono text-[10.5px] text-foreground font-semibold bg-surface-high px-2 py-0.5 rounded border border-border/60 truncate max-w-[140px]">
            {publishableKey}
          </span>
        </div>
      </div>
    </div>
  );
}
