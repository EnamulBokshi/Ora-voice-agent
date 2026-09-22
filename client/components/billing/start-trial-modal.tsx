'use client';

import { useState } from 'react';
import { Loader2, Globe, ShieldCheck, AlertCircle, X, Sparkles } from 'lucide-react';
import { Plan } from '@/types/billing';
import { startTrialApi } from '@/services/billing-service';

interface StartTrialModalProps {
  isOpen: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function StartTrialModal({
  isOpen,
  plan,
  onClose,
  onSuccess,
}: StartTrialModalProps) {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      setError('Please enter your storefront website host (e.g. yourstore.com)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await startTrialApi({
        websiteDomain: domain.trim(),
        planId: plan.planId,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not activate free trial. Please check domain or select a paid plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-lg border border-border/60 bg-surface-container p-6 shadow-xl space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X size={16} />
        </button>

        <div className="space-y-1.5 pr-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary uppercase tracking-wider font-semibold">
            <Sparkles size={12} />
            <span>14-Day Risk-Free Trial</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground font-serif">
            Activate {plan.name} Trial
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Experience real-time voice sales with zero commitment. Enter your store's verified
            website host to initialize your anti-abuse protected trial.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-foreground">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-destructive" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground block">
              Storefront Website Host / Domain
            </label>
            <div className="relative">
              <Globe
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                required
                placeholder="e.g. acme-apparel.com or store.myshopify.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={loading}
                className="w-full h-9 pl-9 pr-3 rounded-md border border-border/60 bg-surface-high/60 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Note: Strict limit of 1 trial per verified website host across any account.
            </p>
          </div>

          <div className="rounded-md border border-border/40 bg-surface-lowest/40 p-3 space-y-1.5 text-[11.5px] text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <ShieldCheck size={14} className="text-primary" />
              <span>What's included in this 14-day trial:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
              <li>{(plan.limits?.voiceMinutes ?? 500).toLocaleString()} voice conversation minutes</li>
              <li>{(plan.limits?.documentLimit ?? 15).toLocaleString()} knowledge base documents</li>
              <li>Instant WebSocket streaming voice AI agent</li>
              <li>Immediate access with zero credit card required</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-8 px-3 rounded-md text-xs font-medium border border-border/60 hover:bg-surface-high text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="h-8 px-4 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={13} />
                  <span>Verifying & Activating…</span>
                </>
              ) : (
                <span>Start 14-Day Free Trial</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
