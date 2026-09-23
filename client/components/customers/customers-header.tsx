'use client';

import { Users } from 'lucide-react';

export function CustomersHeader() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2.5">
        <Users size={18} className="text-muted-foreground" />
        Customers
      </h1>
      <p className="text-[13px] text-muted-foreground mt-1">
        Shoppers who have browsed products, placed orders, or engaged in store conversations.
      </p>
    </div>
  );
}
