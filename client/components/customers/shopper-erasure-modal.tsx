'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Customer } from '@/types/customer';
import { shopperErasureApi } from '@/services/customers-service';

interface ShopperErasureModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShopperErasureModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: ShopperErasureModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const customerId = customer._id || customer.id || '';

  const handleConfirmErasure = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      await shopperErasureApi(customerId);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to erase customer data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="erasure-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-md border border-border bg-surface-container shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4.5 border-b border-border flex items-start justify-between gap-3 bg-surface-lowest">
          <div>
            <h2 id="erasure-modal-title" className="text-sm font-semibold text-foreground">
              Erase Customer Data
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete personal information for this customer.
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

        {/* Content */}
        <div className="p-4.5 space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            You are about to delete personal contact details (name, email, phone, and saved preferences) for{' '}
            <strong className="text-foreground">{customer.name}</strong>.
          </p>

          <p>
            Past order counts remain in store totals for accounting purposes. This action cannot be undone.
          </p>

          {error && (
            <div className="p-2.5 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-lowest flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs text-foreground bg-surface-high hover:bg-surface-highest border border-border transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmErasure}
            disabled={loading}
            className="px-3.5 py-1.5 rounded text-xs font-medium text-destructive hover:bg-destructive/10 border border-destructive/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm & Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
