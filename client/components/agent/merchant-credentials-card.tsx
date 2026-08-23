'use client';

import React, { useState } from 'react';
import {
  Key,
  Copy,
  Check,
  Mail,
  Loader2,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
  Radio,
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

const PLATFORMS: { id: PlatformTab; label: string; stepTip: string }[] = [
  {
    id: 'html',
    label: 'HTML / Custom Web',
    stepTip: 'Paste the snippet just before the closing </body> tag of your website.',
  },
  {
    id: 'shopify',
    label: 'Shopify',
    stepTip: 'Go to Online Store > Themes > Edit Code > layout/theme.liquid, paste before </body>.',
  },
  {
    id: 'woocommerce',
    label: 'WooCommerce / WordPress',
    stepTip: 'Add to your theme footer.php or use a header/footer injection plugin.',
  },
  {
    id: 'react',
    label: 'React / Next.js',
    stepTip: 'Include in your root Layout component or use Next.js Script component.',
  },
];

export function MerchantCredentialsCard({
  businessName = 'Store',
  publishableKey = '',
  onOpenTestModal,
  onKeyChange,
}: MerchantCredentialsCardProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activePlatform, setActivePlatform] = useState<PlatformTab>('html');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Key lifecycle states
  const [isRevoking, setIsRevoking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const hasActiveKey = Boolean(publishableKey && publishableKey.trim().length > 0);

  const origin = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000').replace(/\/+$/, '');
  const apiOrigin = (
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : window.location.origin
      : 'http://localhost:5000'
  ).replace(/\/+$/, '');

  const handleCopyKey = () => {
    if (!publishableKey) return;
    navigator.clipboard.writeText(publishableKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getEmbedCode = (platform: PlatformTab) => {
    if (!hasActiveKey) {
      return `<!-- No active publishable key. Generate a key above to view snippet. -->`;
    }

    switch (platform) {
      case 'html':
        return `<!-- ORA Voice & Sales Assistant Widget -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`;
      case 'shopify':
        return `<!-- Shopify Theme Embed (theme.liquid before </body>) -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`;
      case 'woocommerce':
        return `<!-- WooCommerce / WordPress Script Injection -->\n<script \n  src="${origin}/widget/ora-widget.js" \n  data-ora-key="${publishableKey}" \n  data-ora-api="${apiOrigin}" \n  defer>\n</script>`;
      case 'react':
        return `// Next.js (App Router / Pages) or React Layout\nimport Script from 'next/script';\n\nexport default function StoreLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <>\n      {children}\n      <Script\n        src="${origin}/widget/ora-widget.js"\n        data-ora-key="${publishableKey}"\n        data-ora-api="${apiOrigin}"\n        strategy="afterInteractive"\n      />\n    </>\n  );\n}`;
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
      setErrorMessage('Please generate a publishable key first.');
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
      setSuccessMessage('Publishable key revoked.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to revoke key:', err);
      setErrorMessage(err.message || 'Failed to revoke key.');
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
        setSuccessMessage('New publishable key generated.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to generate key:', err);
      setErrorMessage(err.message || 'Failed to generate key.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsGenerating(false);
    }
  };

  const activePlatformMeta = PLATFORMS.find((p) => p.id === activePlatform) || PLATFORMS[0];

  return (
    <>
      <div className="space-y-8">
        {/* ── Status Notifications ── */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-surface-high border border-border text-foreground text-[12.5px]">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[12.5px]">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Section 1: Publishable Key ── */}
        <div className="space-y-3 pb-6 border-b border-border">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">
              Publishable Widget Key
            </h3>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Authorizes your storefront widget to start live shopper sessions. Public and safe for client-side code.
            </p>
          </div>

          {hasActiveKey ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-lg border border-border rounded-md px-3 py-2 bg-surface-high">
                <Key size={13} className="text-muted-foreground shrink-0" />
                <span className="font-mono text-[12.5px] text-foreground truncate flex-1 select-all font-medium">
                  {publishableKey}
                </span>
                <button
                  onClick={handleCopyKey}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-bright transition-colors"
                  title="Copy key"
                >
                  {copiedKey ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRevokeModal(true)}
                  className="h-8 px-3 rounded-md text-[12px] font-medium border border-border text-muted-foreground hover:text-rose-500 hover:border-rose-500/40 hover:bg-rose-500/5 transition-colors"
                >
                  Revoke Key
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                <span>Generate Key</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Section 2: Storefront Embed ── */}
        <div className="space-y-3 pb-6 border-b border-border">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">
              Embed Code Snippet
            </h3>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Add this script tag to your website or e-commerce template to activate ORA on your storefront.
            </p>
          </div>

          {/* Polished Code Window */}
          <div className="rounded-lg border border-border bg-surface-lowest overflow-hidden">
            {/* Header bar with sleek segmented platform tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-surface-high/60 border-b border-border">
              {/* Segmented Tab Control */}
              <div className="flex items-center gap-1 bg-surface-container/90 p-0.5 rounded-md border border-border/60 overflow-x-auto no-scrollbar">
                {PLATFORMS.map((tab) => {
                  const isActive = activePlatform === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActivePlatform(tab.id)}
                      className={cn(
                        'px-2.5 py-1 text-[12px] font-medium rounded transition-all shrink-0',
                        isActive
                          ? 'bg-surface-bright text-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface-high/40',
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Copy snippet button */}
              <button
                onClick={handleCopySnippet}
                disabled={!hasActiveKey}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-[11.5px] font-medium bg-surface-container hover:bg-surface-high text-foreground border border-border transition-colors disabled:opacity-40 self-end sm:self-auto"
              >
                {copiedSnippet ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedSnippet ? 'Copied' : 'Copy Snippet'}</span>
              </button>
            </div>

            {/* Code Body */}
            <div className="p-4 font-mono text-[12.5px] text-foreground overflow-x-auto leading-relaxed select-all bg-surface-lowest">
              <pre className={cn('whitespace-pre', !hasActiveKey && 'text-muted-foreground opacity-60')}>
                {getEmbedCode(activePlatform)}
              </pre>
            </div>

            {/* Instruction Footer Bar */}
            <div className="px-4 py-2 bg-surface-high/30 border-t border-border/60 text-[11.5px] text-muted-foreground flex items-center justify-between">
              <span>{activePlatformMeta.stepTip}</span>
            </div>
          </div>
        </div>

        {/* ── Section 3: Testing & Delivery ── */}
        <div className="space-y-4 pb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">
              Test & Deliver
            </h3>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Verify your widget functionality or send integration credentials to your technical team.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {onOpenTestModal && (
              <button
                onClick={onOpenTestModal}
                disabled={!hasActiveKey}
                className="flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-40"
              >
                <Radio size={13} />
                <span>Test Live Widget</span>
              </button>
            )}

            <button
              onClick={handleResendCredentials}
              disabled={isSendingEmail || !hasActiveKey}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[12px] font-medium border border-border bg-surface-high hover:bg-surface-bright text-foreground transition-colors disabled:opacity-40"
            >
              {isSendingEmail ? (
                <Loader2 size={13} className="animate-spin" />
              ) : emailStatus === 'success' ? (
                <CheckCircle2 size={13} className="text-emerald-500" />
              ) : (
                <Mail size={13} />
              )}
              <span>{emailStatus === 'success' ? 'Sent to Email' : 'Email Integration Manual'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Revoke Key Confirmation Modal ── */}
      {showRevokeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isRevoking && setShowRevokeModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-surface-container p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-semibold text-foreground">
                  Revoke publishable key?
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                  Active storefront widgets and voice sessions using this key will be disconnected immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevoking}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-surface-high transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevoking}
                className="h-8 px-3 text-[12px] font-medium rounded-md border border-border text-foreground hover:bg-surface-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKeyConfirm}
                disabled={isRevoking}
                className="h-8 px-3 text-[12px] font-medium rounded-md bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRevoking && <Loader2 size={12} className="animate-spin" />}
                <span>Revoke</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
