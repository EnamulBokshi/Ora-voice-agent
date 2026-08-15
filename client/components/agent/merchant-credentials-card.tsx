'use client';

import React, { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  Mail,
  ExternalLink,
  Code2,
  Sparkles,
  ShoppingBag,
  Layers,
  Globe,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resendOnboardingApi } from '@/services/auth-service';

interface MerchantCredentialsCardProps {
  businessName?: string;
  publishableKey?: string;
  onOpenTestModal?: () => void;
}

type PlatformTab = 'html' | 'shopify' | 'woocommerce' | 'react';

export function MerchantCredentialsCard({
  businessName = "enam's Store",
  publishableKey = 'biz_live_982c61c23c07d6df12d49a3c',
  onOpenTestModal,
}: MerchantCredentialsCardProps) {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [activePlatform, setActivePlatform] = useState<PlatformTab>('html');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const apiOrigin = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : window.location.origin)
    : 'http://localhost:5000';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(publishableKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getEmbedCode = (platform: PlatformTab) => {
    switch (platform) {
      case 'html':
        return `<!-- ORA Voice AI Sales Assistant Widget -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`;
      case 'shopify':
        return `<!-- 1. In Shopify Admin, go to Online Store > Themes > Edit Code -->\n<!-- 2. Open layout/theme.liquid and paste before </body> -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`;
      case 'woocommerce':
        return `<!-- Paste in your WordPress Header/Footer scripts or footer.php -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`;
      case 'react':
        return `// layout.tsx (or any component where you want the widget)\nimport Script from 'next/script';\n\nexport default function StoreLayout({ children }) {\n  return (\n    <>\n      {children}\n\n      {/* Step 1: set ORA config BEFORE loading the widget */}\n      <script\n        dangerouslySetInnerHTML={{\n          __html: \`window.ORA_CONFIG={key:"${publishableKey}",api:"${apiOrigin}"};\`\n        }}\n      />\n\n      {/* Step 2: load the widget */}\n      <Script\n        src="${origin}/widget/ora-widget.js"\n        strategy="afterInteractive"\n      />\n    </>\n  );\n}`;
    }
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getEmbedCode(activePlatform));
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleResendCredentials = async () => {
    setIsSendingEmail(true);
    setEmailStatus('idle');
    try {
      await resendOnboardingApi();
      setEmailStatus('success');
      setTimeout(() => setEmailStatus('idle'), 4000);
    } catch (err) {
      console.error('Failed to resend onboarding email:', err);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 4000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-container overflow-hidden shadow-lg transition-all mb-8">
      {/* ── Top Bar ── */}
      <div className="bg-surface-high/60 border-b border-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Key size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Store Access & Integration Hub
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[color:var(--status-online)]/15 text-[color:var(--status-online)] border border-[color:var(--status-online)]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] animate-pulse" />
                ACTIVE TENANT
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Store: <span className="font-semibold text-foreground">{businessName}</span> • Real-time Multimodal Sales Agent
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResendCredentials}
            disabled={isSendingEmail}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-2',
              emailStatus === 'success'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-surface-low border-border text-foreground hover:bg-surface-high',
            )}
          >
            {isSendingEmail ? (
              <Loader2 size={14} className="animate-spin text-primary" />
            ) : emailStatus === 'success' ? (
              <CheckCircle2 size={14} className="text-primary" />
            ) : (
              <Mail size={14} />
            )}
            {emailStatus === 'success' ? 'Manual Sent to Email!' : 'Email User Manual & Key'}
          </button>

          {onOpenTestModal && (
            <button
              onClick={onOpenTestModal}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles size={14} />
              Test Voice Agent
            </button>
          )}
        </div>
      </div>

      {/* ── Key & Embed Content Grid ── */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Key details */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Publishable Widget Key
            </label>
            <div className="flex items-center gap-2 bg-surface-low border border-border rounded-lg p-2.5">
              <span className="font-mono text-xs text-primary truncate flex-1 font-semibold">
                {publishableKey}
              </span>
              <button
                onClick={handleCopyKey}
                className="p-1.5 rounded-md hover:bg-surface-high text-muted-foreground hover:text-foreground transition-colors"
                title="Copy Publishable Key"
              >
                {copiedKey ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Safe for public storefront embedding. Connects your storefront widget to your store catalog, knowledge base, and live voice AI.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-low/60 border border-border/80 space-y-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-primary" /> Storefront Capabilities
            </h4>
            <ul className="text-[11px] text-muted-foreground space-y-1">
              <li>✓ Real-time AI Voice streaming via Gemini Live</li>
              <li>✓ Direct product catalog search with live prices & stock</li>
              <li>✓ Conversational cart building & order handoff</li>
              <li>✓ Merchant brand voice & custom urgency hints</li>
            </ul>
          </div>
        </div>

        {/* Right: Code Embed Generator */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-surface-low border border-border p-1 rounded-lg">
              {(
                [
                  { id: 'html', label: 'HTML / Website', icon: Globe },
                  { id: 'shopify', label: 'Shopify', icon: ShoppingBag },
                  { id: 'woocommerce', label: 'WooCommerce', icon: Layers },
                  { id: 'react', label: 'Next.js / React', icon: Code2 },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePlatform(tab.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                      activePlatform === tab.id
                        ? 'bg-surface-container text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCopySnippet}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-surface-low border border-border text-foreground hover:bg-surface-high transition-colors flex items-center gap-1.5"
            >
              {copiedSnippet ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
              {copiedSnippet ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="relative rounded-lg border border-border bg-[#050505] p-3.5 font-mono text-[11px] text-[#D4F536] overflow-x-auto leading-relaxed">
            <pre className="whitespace-pre">{getEmbedCode(activePlatform)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
