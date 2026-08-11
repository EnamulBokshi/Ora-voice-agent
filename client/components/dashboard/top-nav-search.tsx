'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export function TopNavSearch() {
  const [query, setQuery] = useState('');

  return (
    <div className="relative hidden md:block">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        id="top-nav-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search insights..."
        className="bg-[var(--surface-high)] border border-border text-foreground placeholder:text-muted-foreground pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 w-60 transition-all duration-200"
      />
    </div>
  );
}
