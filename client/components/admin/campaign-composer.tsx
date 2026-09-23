'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Send, Tag, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminCoupons,
  previewCampaignAudience,
  sendCampaign,
} from '@/services/admin-service';
import { CampaignAudiencePreview } from '@/types/admin';
import { Coupon } from '@/types/billing';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-lg border border-border bg-surface-high px-3 py-2 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const AUDIENCES = [
  { value: 'all_merchants', label: 'All merchants' },
  { value: 'active_merchants', label: 'Active merchants' },
  { value: 'pending_merchants', label: 'Pending merchants' },
];

interface CampaignComposerProps {
  /** Tenants picked in the table. Empty means the audience selector decides. */
  selectedBusinessIds: string[];
  /** Shown instead of the audience selector when a selection exists. */
  selectionLabel?: string;
  onClose: () => void;
  onSent?: () => void;
}

/**
 * Composes and sends one promotional email.
 *
 * The audience is resolved by the server and previewed here before anything goes
 * out, because a send cannot be undone. Opt-outs are counted separately so an admin
 * can see that the list they picked is not the list that will be written to.
 */
export function CampaignComposer({
  selectedBusinessIds,
  selectionLabel,
  onClose,
  onSent,
}: CampaignComposerProps) {
  const hasSelection = selectedBusinessIds.length > 0;

  const [audience, setAudience] = useState('all_merchants');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [preview, setPreview] = useState<CampaignAudiencePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchAdminCoupons()
      .then((rows) => setCoupons(rows.filter((c: Coupon) => c.isActive)))
      .catch(() => setCoupons([]));
  }, []);

  const loadPreview = useCallback(async () => {
    setPreviewing(true);
    try {
      setPreview(
        await previewCampaignAudience(
          hasSelection ? { businessIds: selectedBusinessIds } : { audience },
        ),
      );
    } catch (err) {
      toast.error('Could not resolve the audience', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setPreviewing(false);
    }
  }, [audience, hasSelection, selectedBusinessIds]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await sendCampaign({
        subject: subject.trim(),
        message: message.trim(),
        ...(couponCode ? { couponCode } : {}),
        ...(ctaUrl.trim() ? { ctaUrl: ctaUrl.trim() } : {}),
        ...(hasSelection ? { businessIds: selectedBusinessIds } : { audience }),
      });

      if (res.failedCount > 0) {
        toast.warning(`${res.deliveredCount} delivered, ${res.failedCount} failed`, {
          description: res.failures[0]
            ? `First failure: ${res.failures[0].email} — ${res.failures[0].reason || 'unknown reason'}`
            : undefined,
        });
      } else {
        toast.success(`Sent to ${res.deliveredCount} merchant${res.deliveredCount === 1 ? '' : 's'}`, {
          description: res.skippedOptOutCount
            ? `${res.skippedOptOutCount} skipped (opted out)`
            : undefined,
        });
      }

      onSent?.();
      onClose();
    } catch (err) {
      toast.error('Campaign not sent', {
        description: err instanceof Error ? err.message : 'Nothing was delivered.',
      });
    } finally {
      setSending(false);
      setConfirming(false);
    }
  };

  const sendable = preview?.sendable ?? 0;
  const canSend = Boolean(subject.trim() && message.trim() && sendable > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface-container p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold font-heading text-foreground">
              Promotional Campaign
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {hasSelection
                ? selectionLabel || `${selectedBusinessIds.length} merchants selected`
                : 'Sent to one contact per merchant — the store owner.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Audience */}
        <div className="rounded-lg border border-border bg-surface-high/40 p-3.5 space-y-3">
          {!hasSelection && (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Audience</span>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className={inputClass}
              >
                {AUDIENCES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex items-center gap-2 text-xs">
            <Users size={13} className="text-primary" />
            {previewing ? (
              <span className="text-muted-foreground">Resolving audience…</span>
            ) : (
              <span className="text-foreground">
                <strong className="tabular-nums">{sendable}</strong> will receive this
                {preview?.optedOut ? (
                  <span className="text-muted-foreground">
                    {' '}· {preview.optedOut} opted out and will be skipped
                  </span>
                ) : null}
              </span>
            )}
          </div>

          {preview && preview.sample.length > 0 && (
            <p className="font-mono text-[11px] text-muted-foreground">
              e.g. {preview.sample.map((s) => s.email).join(', ')}
              {sendable > preview.sample.length ? ` +${sendable - preview.sample.length} more` : ''}
            </p>
          )}
        </div>

        {/* Message */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              placeholder="A special discount for you"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Coupon (optional)
            </span>
            <select
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className={inputClass}
            >
              <option value="">No coupon</option>
              {coupons.map((coupon) => (
                <option key={coupon._id} value={coupon.code}>
                  {coupon.code} —{' '}
                  {coupon.discountType === 'percent'
                    ? `${coupon.percentOff}% off`
                    : `$${(coupon.amountOffUsdCents / 100).toFixed(2)} off`}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Button link (optional)
            </span>
            <input
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://tryora.live/pricing"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              maxLength={4000}
              placeholder="Hey — a special discount for you. Use the code below to get your next month at a reduced rate."
              className={cn(inputClass, 'resize-y leading-relaxed')}
            />
          </label>
        </div>

        {couponCode && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Tag size={12} className="text-primary" />
            <span>
              {couponCode} is shown in its own block with the discount and expiry — you do
              not need to repeat it in the message.
            </span>
          </p>
        )}

        {/* Send */}
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            Every email carries an unsubscribe link. Sending cannot be undone.
          </p>

          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <AlertTriangle size={13} />
                Send to {sendable}?
              </span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-border bg-surface-high px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-bright"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>{sending ? 'Sending…' : 'Yes, send now'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!canSend || previewing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send size={13} />
              <span>Review and send</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
