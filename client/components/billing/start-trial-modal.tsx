'use client';

import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Globe, Check, AlertCircle, X } from 'lucide-react';
import { Plan } from '@/types/billing';
import { startTrialApi } from '@/services/billing-service';
import { useModalA11y } from '@/hooks/use-modal-a11y';

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
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const hintId = useId();

  // A request in flight cannot be abandoned half-way, so closing waits for it.
  const requestClose = () => {
    if (!loading) onClose();
  };
  const dialogRef = useModalA11y(isOpen && !!plan, requestClose);

  if (!isOpen || !plan || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) {
      setError('Enter the website ORA will run on, for example yourbusiness.com.');
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
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'The trial could not be started. Check the website address, or choose a paid plan instead.',
      );
    } finally {
      setLoading(false);
    }
  };

  const included = [
    `${(plan.limits?.voiceMinutes ?? 500).toLocaleString()} voice conversation minutes`,
    `${(plan.limits?.documentLimit ?? 15).toLocaleString()} knowledge base documents`,
    'A real-time voice agent on your website',
    'No credit card required',
  ];

  // Portalled to <body>: the marketing layout's `.lp-root *` reset zeroes padding,
  // margins and borders on everything inside it, which flattened this dialog.
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] p-0 sm:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      {/* z above the platform orb (9999), which otherwise floats over the backdrop. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative w-full sm:max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-t-xl sm:rounded-xl border border-border bg-popover text-popover-foreground shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] outline-none animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 sm:zoom-in-95 duration-200 ease-out"
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 pt-6 pb-5">
            <h2
              id={titleId}
              className="pr-10 text-[20px] leading-tight font-semibold text-foreground font-serif tracking-tight text-balance"
            >
              Start your 14-day {plan.name} trial
            </h2>
            <p id={descriptionId} className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Tell us which website ORA will speak on. Each website can hold one free trial.
            </p>

            <div className="mt-5 space-y-1.5">
              <label htmlFor={inputId} className="block text-[12.5px] font-medium text-foreground">
                Website
              </label>
              <div className="relative">
                <Globe
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id={inputId}
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="yourbusiness.com"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={hintId}
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-background text-[13.5px] text-foreground placeholder:text-muted-foreground caret-primary transition-[border-color,box-shadow] focus:outline-none focus:border-foreground/40 focus:ring-3 focus:ring-ring/20 aria-invalid:border-destructive aria-invalid:focus:ring-destructive/20 disabled:opacity-60"
                />
              </div>
              {error ? (
                <p id={hintId} role="alert" className="flex items-start gap-1.5 text-[12px] leading-snug text-destructive">
                  <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              ) : (
                <p id={hintId} className="text-[12px] text-muted-foreground">
                  A domain like acme.com, or a subdomain like shop.acme.com.
                </p>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border/70">
            <p className="text-[12px] font-medium text-foreground">Included in the trial</p>
            <ul className="mt-2.5 grid gap-1.5">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                  <Check size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-foreground dark:text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-border/70 bg-surface-high/40 rounded-b-none sm:rounded-b-xl">
            <button
              type="button"
              onClick={requestClose}
              disabled={loading}
              className="h-10 sm:h-9 px-4 rounded-md text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="h-10 sm:h-9 px-4 rounded-md text-[13px] font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                  <span>Starting trial…</span>
                </>
              ) : (
                <span>Start free trial</span>
              )}
            </button>
          </div>
        </form>

        {/* Last in DOM order so the hook's initial focus lands on the website field. */}
        <button
          type="button"
          onClick={requestClose}
          disabled={loading}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-high transition-colors cursor-pointer disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X size={16} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
