'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { getCustomersApi } from '@/services/customers-service';
import { Customer } from '@/types/customer';
import { CustomersHeader } from '@/components/customers/customers-header';
import { CustomersTable } from '@/components/customers/customers-table';

export function CustomersClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // An empty result is a real answer, not a reason to show sample data. Falling back
      // to demoCustomers here put fabricated shoppers (names, emails, phone numbers, order
      // counts) into live merchant accounts and made the real empty state unreachable,
      // because customers.length was never 0.
      const res = await getCustomersApi();
      setCustomers(res ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={20} />
          <span className="text-sm font-medium">Loading customers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full w-full bg-background text-sm text-muted-foreground px-6">
        {error}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8 w-full">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <CustomersHeader />
        <CustomersTable customers={customers} onReload={load} />
      </div>
    </div>
  );
}
