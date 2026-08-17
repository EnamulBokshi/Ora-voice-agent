'use client';

import React, { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  Mail,
  Code2,
  Sparkles,
  ShoppingBag,
  Layers,
  Globe,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resendOnboardingApi } from '@/services/auth-service';
import {
  deletePublishableKeyApi,
  generatePublishableKeyApi,
} from '@/services/business-service';

interface MerchantCredentialsCardProps {
  businessName?: string;
  publishableKey?: string | null;
  onOpenTestModal?: () => void;
  onKeyChange?: (newKey: string | null) => void;
}

type PlatformTab = 'html' | 'shopify' | 'woocommerce' | 'react';

export function MerchantCredentialsCard({
  businessName = "enam's Store",
  publishableKey = 'biz_live_982c61c23c07d6df12d49a3c',
  onOpenTestModal,
  onKeyChange,
}: MerchantCredentialsCardProps) {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [activePlatform, setActivePlatform] = useState<PlatformTab>('html');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Key lifecycle states
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasActiveKey = Boolean(publishableKey && publishableKey.trim().length > 0);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const apiOrigin =
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : window.location.origin
      : 'http://localhost:5000';

  const handleCopyKey = () => {
    if (!publishableKey) return;
    navigator.clipboard.writeText(publishableKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getEmbedCode = (platform: PlatformTab) => {
    if (!hasActiveKey) {
      return `<!-- ⚠️ NO ACTIVE PUBLISHABLE KEY -->\n<!-- Generate a publishable key above to view and embed your store's live voice widget snippet. -->`;
    }

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
    if (!hasActiveKey) return;
    navigator.clipboard.writeText(getEmbedCode(activePlatform));
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleResendCredentials = async () => {
    if (!hasActiveKey) {
      setErrorMessage('Please generate a publishable key before sending credentials.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    setIsSendingEmail(true);
    setEmailStatus('idle');
    try {
      await resendOnboardingApi();
      setEmailStatus('success');
      setTimeout(() => setEmailStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Failed to resend onboarding email:', err);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 4000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleRevokeKeyConfirm = async () => {
    setIsRevoking(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deletePublishableKeyApi();
      onKeyChange?.(null);
      setShowRevokeModal(false);
      setSuccessMessage('Publishable key has been revoked and invalidated.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to revoke publishable key:', err);
      setErrorMessage(err.message || 'Failed to revoke key. Please try again.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await generatePublishableKeyApi();
      if (res?.publishableKey) {
        onKeyChange?.(res.publishableKey);
        setSuccessMessage('New publishable key generated successfully!');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to generate publishable key:', err);
      setErrorMessage(err.message || 'Failed to generate key. Please try again.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-container overflow-hidden shadow-lg transition-all mb-8">
        {/* ── Top Bar ── */}
        <div className="bg-surface-high/60 border-b border-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                'w-10 h-10 rounded-lg border flex items-center justify-center transition-colors',
                hasActiveKey
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-destructive/10 border-destructive/20 text-destructive',
              )}
            >
              {hasActiveKey ? <Key size={20} /> : <ShieldAlert size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Store Access & Integration Hub
                </h2>
                {hasActiveKey ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[color:var(--status-online)]/15 text-[color:var(--status-online)] border border-[color:var(--status-online)]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)] animate-pulse" />
                    KEY ACTIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                    NO ACTIVE KEY
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Store: <span className="font-semibold text-foreground">{businessName}</span> • Single Active Key Policy
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            {hasActiveKey && (
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
            )}

            {hasActiveKey && onOpenTestModal && (
              <button
                onClick={onOpenTestModal}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles size={14} />
                Test Voice Agent
              </button>
            )}

            {!hasActiveKey && (
              <button
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center gap-1.5 shadow-md shadow-primary/10"
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Generate Publishable Key
              </button>
            )}
          </div>
        </div>

        {/* ── Status Banners ── */}
        {successMessage && (
          <div className="px-6 py-2.5 bg-primary/10 border-b border-primary/20 text-primary text-xs font-medium flex items-center gap-2">
            <CheckCircle2 size={15} />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="px-6 py-2.5 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={15} />
            {errorMessage}
          </div>
        )}

        {/* ── Key & Embed Content Grid ── */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Key details */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Publishable Widget Key
                </label>
              </div>

              {hasActiveKey ? (
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
                  <button
                    onClick={() => setShowRevokeModal(true)}
                    className="p-1.5 rounded-md hover:bg-destructive/20 text-destructive transition-colors"
                    title="Revoke Key"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={16} className="text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        No Active Publishable Key
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Your widget cannot accept incoming shopper sessions or voice requests until an active key is created.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateKey}
                    disabled={isGenerating}
                    className="w-full py-2 px-3 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isGenerating ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    Generate New Key
                  </button>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {hasActiveKey
                  ? 'Safe for public storefront embedding. If this key is leaked or compromised, revoke it immediately to invalidate unauthorized access.'
                  : 'You can hold exactly 1 key at any time. When deleted, all widgets with the previous key are instantly invalidated.'}
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
                <li>✓ Strict single-key authorization & instant revocation</li>
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
                disabled={!hasActiveKey}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors flex items-center gap-1.5',
                  hasActiveKey
                    ? 'bg-surface-low border-border text-foreground hover:bg-surface-high'
                    : 'bg-surface-low/50 border-border/50 text-muted-foreground opacity-50 cursor-not-allowed',
                )}
              >
                {copiedSnippet ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                {copiedSnippet ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            <div className="relative rounded-lg border border-border bg-[#050505] p-3.5 font-mono text-[11px] text-[#D4F536] overflow-x-auto leading-relaxed">
              <pre className={cn('whitespace-pre', !hasActiveKey && 'text-muted-foreground opacity-75')}>
                {getEmbedCode(activePlatform)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* ── Revoke Key Confirmation Modal ── */}
      {showRevokeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isRevoking && setShowRevokeModal(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl border border-border/80 bg-surface-container p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  Revoke publishable key
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to revoke this key?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevoking}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface-high transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed space-y-2.5">
              <p>
                Any live storefront widget or voice connection using{' '}
                <code className="inline-block px-1.5 py-0.5 rounded bg-surface-high border border-border font-mono text-[11px] text-foreground break-all">
                  {publishableKey}
                </code>{' '}
                will be immediately disconnected.
              </p>
              <p className="text-[11px] text-muted-foreground/75">
                You can generate a new publishable key at any time.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevoking}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-surface-low border border-border text-foreground hover:bg-surface-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKeyConfirm}
                disabled={isRevoking}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isRevoking && <Loader2 size={13} className="animate-spin" />}
                Revoke key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
