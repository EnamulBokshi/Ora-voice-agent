'use client';

import { ShoppingBag } from 'lucide-react';

export function OrdersHeader() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2.5">
        <ShoppingBag size={18} className="text-muted-foreground" />
        Orders
      </h1>
      <p className="text-[13px] text-muted-foreground mt-1">
        Orders created through ORA conversations and the widget.
      </p>
    </div>
  );
}
