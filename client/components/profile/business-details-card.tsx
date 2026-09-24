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
  Key,
} from 'lucide-react';
import { Business } from '@/types/auth';
import {
  deletePublishableKeyApi,
  generatePublishableKeyApi,
  updateBusinessApi,
  toggleWidgetStatusApi,
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
  const [supportEmail, setSupportEmail] = useState(business?.supportEmail || '');

  const [localKey, setLocalKey] = useState<string | null | undefined>(
    business?.publishableKey,
  );
  const [isWidgetActive, setIsWidgetActive] = useState<boolean>(
    business?.isWidgetActive !== false,
  );
  const [isTogglingWidget, setIsTogglingWidget] = useState(false);

  React.useEffect(() => {
    if (business) {
      setIsWidgetActive(business.isWidgetActive !== false);
      setLocalKey(business.publishableKey);
    }
  }, [business]);

  const hasActiveKey = Boolean(localKey && localKey.trim().length > 0);

  const handleToggleWidget = async () => {
    const nextState = !isWidgetActive;
    setIsTogglingWidget(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await toggleWidgetStatusApi(nextState);
      setIsWidgetActive(res.business?.isWidgetActive !== false);
      setSuccessMessage(
        nextState
          ? 'ORA storefront widget is now active and visible on your site.'
          : 'ORA storefront widget is now paused and hidden from your site.',
      );
      if (onBusinessUpdated && res.business) {
        onBusinessUpdated(res.business);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update widget visibility status.');
    } finally {
      setIsTogglingWidget(false);
    }
  };

  if (!business) {
    return (
      <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
          <h2 className="text-[13.5px] font-semibold text-foreground font-serif">Store Details</h2>
        </div>
        <p className="text-[12.5px] text-muted-foreground">
          No store associated with this merchant account.
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
        supportEmail: supportEmail.trim(),
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
          <div className="p-3 bg-surface-high border border-border/60 text-foreground text-[12px] font-mono flex items-center justify-between rounded-md">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X size={13} />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[12px] font-mono flex items-center justify-between rounded-md">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-foreground cursor-pointer">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── Card 1: Store Details & Connected Domain ── */}
        <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
              <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
                Storefront Identity
              </h2>
            </div>
            {isEditingDetails ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(false)}
                  className="px-2.5 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStoreDetails}
                  disabled={isSavingDetails}
                  className="px-2.5 py-1 text-[12px] font-semibold bg-foreground text-background rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                  setSupportEmail(business.supportEmail || '');
                  setIsEditingDetails(true);
                }}
                className="px-2.5 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border/60 bg-surface-high/40 rounded-md flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 size={11} />
                Edit
              </button>
            )}
          </div>

          {isEditingDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Store Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full h-8 px-3 text-[13px] bg-surface-high border border-border/60 rounded-md text-foreground focus:outline-none focus:border-foreground"
                  placeholder="e.g. Acme Fashion"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Store Domain / URL
                </label>
                <input
                  type="text"
                  value={storeDomain}
                  onChange={(e) => setStoreDomain(e.target.value)}
                  className="w-full h-8 px-3 text-[13px] bg-surface-high border border-border/60 rounded-md text-foreground focus:outline-none focus:border-foreground font-mono"
                  placeholder="e.g. acmefashion.com"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full h-8 px-3 text-[13px] bg-surface-high border border-border/60 rounded-md text-foreground focus:outline-none focus:border-foreground font-mono"
                  placeholder="e.g. support@acmefashion.com"
                />
                <p className="text-[11.5px] text-muted-foreground">
                  ORA gives this to shoppers who ask how to contact you. Leave it empty and ORA says no email is published.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/40 pt-1">
              <div className="py-2 md:py-0 md:pr-6 space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Store Name
                </span>
                <p className="text-[14px] font-medium text-foreground">{business.name}</p>
              </div>

              <div className="py-2 md:py-0 md:px-6 space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Store Domain
                </span>
                <p className="text-[13.5px] font-mono text-foreground">{business.domain || '—'}</p>
              </div>

              <div className="py-2 md:py-0 md:px-6 space-y-1 min-w-0">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Support Email
                </span>
                <p className="text-[13.5px] font-mono text-foreground truncate">{business.supportEmail || '—'}</p>
              </div>

              <div className="py-2 md:py-0 md:pl-6 space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Status
                </span>
                <p className="text-[13px] font-mono text-foreground flex items-center gap-1.5 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--status-online)]" />
                  {business.status || 'Active'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Card 2: Publishable Widget Key ── */}
        <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border/40">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
                <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
                  Publishable Widget Key
                </h2>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                Client-side key used by your storefront script to initiate ORA live voice & AI sales sessions.
              </p>
            </div>

            {hasActiveKey && (
              <button
                onClick={() => setShowRevokeModal(true)}
                className="self-start sm:self-auto px-3 py-1.5 text-[12px] font-medium rounded-md border border-border/60 bg-surface-high/40 text-muted-foreground hover:text-rose-400 hover:border-rose-400/40 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 touch-manipulation"
              >
                <Trash2 size={12} />
                <span>Revoke Key</span>
              </button>
            )}
          </div>

          <div className="pt-1 space-y-4">
            {hasActiveKey ? (
              <>
                {/* ── Live Storefront Widget Visibility Switch ── */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-md border border-border/60 bg-surface-high/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground font-serif">
                        Storefront Widget Visibility
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-medium border ${
                          isWidgetActive
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 dark:text-[#C8F031]'
                            : 'border-border/60 bg-surface-high/60 text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isWidgetActive ? 'bg-emerald-400 dark:bg-[#C8F031] animate-pulse' : 'bg-muted-foreground'
                          }`}
                        />
                        {isWidgetActive ? 'Live on Store' : 'Paused / Hidden'}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {isWidgetActive
                        ? 'ORA is currently active and helping shoppers on your storefront.'
                        : 'ORA is hidden from your store. Shoppers will not see the orb until you re-enable it.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleWidget}
                      disabled={isTogglingWidget}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring touch-manipulation ${
                        isWidgetActive ? 'bg-foreground dark:bg-[#C8F031]' : 'bg-surface-bright border-border/80'
                      } ${isTogglingWidget ? 'opacity-60 cursor-wait' : ''}`}
                      role="switch"
                      aria-checked={isWidgetActive}
                      title={isWidgetActive ? 'Click to turn ORA OFF on your storefront' : 'Click to turn ORA ON on your storefront'}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background dark:bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isWidgetActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-[11.5px] font-medium text-foreground min-w-[50px]">
                      {isTogglingWidget ? 'Saving...' : isWidgetActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-high/30 border border-border/50 rounded-md p-3.5">
                  <span className="font-mono text-[12px] text-foreground font-medium break-all select-all">
                    {localKey}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="h-9 sm:h-8 px-3 rounded-md bg-surface-high hover:bg-surface-bright border border-border/60 text-[12px] font-medium text-foreground transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer touch-manipulation"
                    title="Copy Key"
                  >
                    {copiedKey ? <Check size={13} className="text-foreground dark:text-[#C8F031]" /> : <Copy size={13} />}
                    <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                <div>
                  <p className="text-[13px] font-semibold text-foreground font-serif">No active publishable key</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Generate a key to connect your storefront widget.
                  </p>
                </div>

                <button
                  onClick={handleGenerateKey}
                  disabled={isGenerating}
                  className="px-3.5 py-1.5 text-[12px] font-semibold rounded-md bg-foreground text-background hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
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
          <div className="w-full max-w-md bg-surface-container border border-border/60 rounded-md p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground font-serif">Revoke Publishable Key?</h3>
                <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                  Revoking this key will immediately disconnect your storefront widget and pause live customer voice interactions until a new key is generated.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                disabled={isRevoking}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-border/60 text-foreground hover:bg-surface-high transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKeyConfirm}
                disabled={isRevoking}
                className="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
