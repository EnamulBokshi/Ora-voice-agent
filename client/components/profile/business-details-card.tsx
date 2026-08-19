'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Edit2,
  Save,
} from 'lucide-react';
import { Business } from '@/types/auth';
import {
  deletePublishableKeyApi,
  generatePublishableKeyApi,
  updateBusinessApi,
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

  // Edit store details states
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [storeName, setStoreName] = useState(business?.name || '');
  const [storeDomain, setStoreDomain] = useState(business?.domain || '');

  const [localKey, setLocalKey] = useState<string | null | undefined>(
    business?.publishableKey,
  );

  const hasActiveKey = Boolean(localKey && localKey.trim().length > 0);

  if (!business) {
    return (
      <div className="pt-2">
        <h2 className="text-[13.5px] font-semibold text-foreground mb-1">Store Information</h2>
        <p className="text-[12px] text-muted-foreground">
          No store associated with this account.
        </p>
      </div>
    );
  }

  const handleSaveStoreDetails = async () => {
    setIsSavingDetails(true);
    setErrorMessage(null);
    try {
      const res = await updateBusinessApi({
        name: storeName.trim(),
        domain: storeDomain.trim(),
      });
      setIsEditingDetails(false);
      setSuccessMessage('Store details updated successfully.');
      if (res?.business && onBusinessUpdated) {
        onBusinessUpdated(res.business);
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update store details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

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
      setSuccessMessage('Publishable key revoked successfully.');
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
        setSuccessMessage('New publishable key generated successfully.');
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
      <div className="space-y-6">
        {/* Feedback Banners */}
        {successMessage && (
          <div className="px-4 py-2.5 bg-surface-high border border-border text-foreground text-xs font-medium flex items-center justify-between rounded">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center justify-between rounded">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-foreground">
              <X size={12} />
            </button>
          </div>
        )}

        {/* ── Section 1: Store Information ── */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-[13.5px] font-semibold text-foreground">Store Details</h2>
            {isEditingDetails ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(false)}
                  className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStoreDetails}
                  disabled={isSavingDetails}
                  className="px-2.5 py-1 text-xs font-medium bg-primary text-primary-foreground rounded flex items-center gap-1"
                >
                  {isSavingDetails ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStoreName(business.name);
                  setStoreDomain(business.domain || '');
                  setIsEditingDetails(true);
                }}
                className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded flex items-center gap-1"
              >
                <Edit2 size={11} />
                Edit
              </button>
            )}
          </div>

          {isEditingDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-border">
              <div className="space-y-1">
                <label className="text-[11.5px] font-medium text-muted-foreground block">Store Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-surface-high border border-border rounded text-foreground focus:outline-none focus:border-primary"
                  placeholder="e.g. Acme Fashion"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11.5px] font-medium text-muted-foreground block">Store Domain / URL</label>
                <input
                  type="text"
                  value={storeDomain}
                  onChange={(e) => setStoreDomain(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-surface-high border border-border rounded text-foreground focus:outline-none focus:border-primary font-mono"
                  placeholder="e.g. acmefashion.com"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border py-4">
              <div className="py-2 md:py-0 md:pr-6 space-y-1">
                <span className="text-[11.5px] font-medium text-muted-foreground block">Store Name</span>
                <p className="text-[14px] font-medium text-foreground">{business.name}</p>
              </div>

              <div className="py-2 md:py-0 md:px-6 space-y-1">
                <span className="text-[11.5px] font-medium text-muted-foreground block">Store Domain</span>
                <p className="text-[14px] font-mono text-foreground">{business.domain || '—'}</p>
              </div>

              <div className="py-2 md:py-0 md:pl-6 space-y-1">
                <span className="text-[11.5px] font-medium text-muted-foreground block">Status</span>
                <p className="text-[14px] font-medium text-foreground flex items-center gap-1.5 capitalize">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
                  {business.status || 'Active'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Storefront Widget Key ── */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-[13.5px] font-semibold text-foreground">
                Publishable Widget Key
              </h2>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                Client-side key used by your storefront to connect to the ORA voice & chat gateway.
              </p>
            </div>

            {hasActiveKey && (
              <button
                onClick={() => setShowRevokeModal(true)}
                className="px-3 py-1.5 text-xs font-medium rounded border border-border bg-surface-high text-foreground hover:text-rose-400 hover:border-rose-400/40 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                <span>Revoke Key</span>
              </button>
            )}
          </div>

          <div className="py-4 border-b border-border">
            {hasActiveKey ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-lowest border border-border rounded p-3">
                <span className="font-mono text-xs text-foreground font-medium break-all select-all">
                  {localKey}
                </span>
                <button
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 rounded bg-surface-high hover:bg-surface-bright text-xs font-medium text-foreground transition-colors flex items-center gap-1.5 shrink-0"
                  title="Copy Key"
                >
                  {copiedKey ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-[13px] font-medium text-foreground">No active publishable key</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Generate a key to connect your storefront widget.
                  </p>
                </div>

                <button
                  onClick={handleGenerateKey}
                  disabled={isGenerating}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-foreground text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {isGenerating && <Loader2 size={12} className="animate-spin" />}
                  Generate Key
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Revocation Confirmation Modal ── */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-surface-container border border-border rounded-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Revoke Publishable Key?</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Revoking this key will immediately disconnect your storefront widget and pause live customer interactions until a new key is generated.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevoking}
                className="px-3 py-1.5 rounded text-xs font-medium border border-border text-foreground hover:bg-surface-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKeyConfirm}
                disabled={isRevoking}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRevoking && <Loader2 size={12} className="animate-spin" />}
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
