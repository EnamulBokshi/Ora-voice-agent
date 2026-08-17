'use client';

import React, { useState } from 'react';
import {
  Store,
  Globe,
  Key,
  Copy,
  Check,
  Trash2,
  Sparkles,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Business } from '@/types/auth';
import { cn } from '@/lib/utils';
import {
  deletePublishableKeyApi,
  generatePublishableKeyApi,
} from '@/services/business-service';

interface BusinessDetailsCardProps {
  business: Business | null;
  onBusinessUpdated?: (updated: Business) => void;
}

export function BusinessDetailsCard({
  business,
  onBusinessUpdated,
}: BusinessDetailsCardProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [localKey, setLocalKey] = useState<string | null | undefined>(
    business?.publishableKey,
  );

  const hasActiveKey = Boolean(localKey && localKey.trim().length > 0);

  if (!business) {
    return (
      <div className="rounded-lg border border-border bg-surface-container p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Business</h2>
        <p className="text-[13px] text-muted-foreground">
          No business associated with this account.
        </p>
      </div>
    );
  }

  const handleCopyKey = () => {
    if (!localKey) return;
    navigator.clipboard.writeText(localKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRevokeKeyConfirm = async () => {
    setIsRevoking(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await deletePublishableKeyApi();
      setLocalKey(null);
      setShowRevokeModal(false);
      setSuccessMessage('Publishable key revoked and invalidated successfully.');
      if (res?.business && onBusinessUpdated) {
        onBusinessUpdated(res.business);
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to revoke publishable key:', err);
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
        setLocalKey(res.publishableKey);
        setSuccessMessage('New publishable key generated successfully!');
        if (res?.business && onBusinessUpdated) {
          onBusinessUpdated(res.business);
        }
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to generate publishable key:', err);
      setErrorMessage(err.message || 'Failed to generate key.');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-container overflow-hidden shadow-xs">
        {/* Card Header */}
        <div className="border-b border-border bg-surface-high/40 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Store Profile & API Access</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your merchant profile and live storefront widget publishable key.
            </p>
          </div>
          <Link
            href="/agent"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Integration Hub <ExternalLink size={12} />
          </Link>
        </div>

        {/* Feedback Banners */}
        {successMessage && (
          <div className="px-5 py-2.5 bg-primary/10 border-b border-primary/20 text-primary text-xs font-medium flex items-center gap-2">
            <ShieldCheck size={15} />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={15} />
            {errorMessage}
          </div>
        )}

        <div className="p-5 space-y-6">
          {/* General Business Info */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
            <div className="p-3.5 rounded-lg bg-surface-low border border-border">
              <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1 text-xs">
                <Store size={14} className="text-primary" /> Store Name
              </dt>
              <dd className="text-foreground font-semibold text-sm">{business.name}</dd>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-low border border-border">
              <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1 text-xs">
                <Globe size={14} className="text-primary" /> Store Domain
              </dt>
              <dd className="text-foreground font-semibold text-sm">{business.domain || '—'}</dd>
            </div>

            <div className="p-3.5 rounded-lg bg-surface-low border border-border">
              <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1 text-xs">
                Status
              </dt>
              <dd className="text-foreground font-semibold text-sm capitalize flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[color:var(--status-online)]" />
                {business.status || 'Active'}
              </dd>
            </div>
          </dl>

          {/* Dedicated Publishable Key Section */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Publishable Widget Key
                </h3>
                {hasActiveKey ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[color:var(--status-online)]/15 text-[color:var(--status-online)] border border-[color:var(--status-online)]/30">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                    Revoked / None
                  </span>
                )}
              </div>

              {hasActiveKey && (
                <button
                  onClick={() => setShowRevokeModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Revoke Key
                </button>
              )}
            </div>

            {hasActiveKey ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-surface-low border border-border rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-primary font-bold break-all">
                    {localKey}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyKey}
                    className="px-3 py-1.5 rounded-md bg-surface-high hover:bg-surface-bright text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5"
                    title="Copy Key"
                  >
                    {copiedKey ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                    {copiedKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert size={18} className="text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-foreground">No Active Publishable Key</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your store widget is currently offline. Generate a new key to re-enable your live voice agent.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGenerateKey}
                  disabled={isGenerating}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                >
                  {isGenerating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Generate Publishable Key
                </button>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Single-Key Security Policy:</strong> You can only possess 1 active key at a time. If this key is leaked or compromised, revoke it immediately to permanently block unauthorized requests.
            </p>
          </div>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
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
                Any active storefront widget or live session using{' '}
                <code className="inline-block px-1.5 py-0.5 rounded bg-surface-high border border-border font-mono text-[11px] text-foreground break-all">
                  {localKey}
                </code>{' '}
                will immediately be disconnected.
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
