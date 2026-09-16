'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Customer, CreateCustomerPayload } from '@/types/customer';
import { createCustomerApi } from '@/services/customers-service';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCustomer: Customer) => void;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomerModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [budgetTier, setBudgetTier] = useState('Mid-Range');
  const [preferredStyle, setPreferredStyle] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }

    setLoading(true);
    setError(null);

    const extractedPreferences: Record<string, unknown> = {};
    if (budgetTier) extractedPreferences.budgetTier = budgetTier;
    if (preferredStyle.trim()) extractedPreferences.preferredStyle = preferredStyle.trim();
    if (notes.trim()) extractedPreferences.notes = notes.trim();

    const payload: CreateCustomerPayload = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      extractedPreferences:
        Object.keys(extractedPreferences).length > 0 ? extractedPreferences : undefined,
    };

    try {
      const created = await createCustomerApi(payload);
      onSuccess(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-customer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-md border border-border bg-surface-container shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4.5 border-b border-border flex items-start justify-between gap-3 bg-surface-lowest">
          <div>
            <h2 id="add-customer-title" className="text-sm font-semibold text-foreground">
              Add Customer
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter customer contact information and store preferences.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-surface-high transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4.5 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Core Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-surface-high/40 border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-surface-high/40 border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1..."
                  className="w-full bg-surface-high/40 border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="pt-3 border-t border-border/50 space-y-3">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
              Preferences
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] text-muted-foreground mb-1">
                  Budget
                </label>
                <select
                  value={budgetTier}
                  onChange={(e) => setBudgetTier(e.target.value)}
                  className="w-full bg-surface-high/40 border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-foreground transition-colors cursor-pointer"
                >
                  <option value="Budget">Budget</option>
                  <option value="Mid-Range">Mid-Range</option>
                  <option value="Premium">Premium</option>
                  <option value="Luxury">Luxury</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] text-muted-foreground mb-1">
                  Preferred Style
                </label>
                <input
                  type="text"
                  value={preferredStyle}
                  onChange={(e) => setPreferredStyle(e.target.value)}
                  placeholder="e.g. Minimalist"
                  className="w-full bg-surface-high/40 border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] text-muted-foreground mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional customer details or inquiries..."
                className="w-full bg-surface-high/40 border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3.5 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded text-xs text-foreground bg-surface-high hover:bg-surface-highest border border-border transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-1.5 rounded text-xs font-medium text-background bg-foreground hover:bg-foreground/90 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Customer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
