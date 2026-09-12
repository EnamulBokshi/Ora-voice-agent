'use client';

import React, { createContext, useContext } from 'react';
import { Eye } from 'lucide-react';
import { READ_ONLY_REASON } from '@/lib/permissions';

const ReadOnlyContext = createContext(false);

/**
 * Whether the surface around this component is read-only.
 *
 * Write controls call this and set `disabled`; read controls — filters, tab
 * switchers, refresh, anything that opens a detail view — deliberately do not.
 * A view-only account is meant to be able to look at everything.
 *
 * A blanket `<fieldset disabled>` was the obvious implementation and the wrong
 * one: it disables every nested button, which on these screens means the
 * category filters, the page-size select and the inspect buttons as well as
 * the ones that save. Opting in per control is more edits, and it is the only
 * version that leaves reading intact.
 */
export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}

/** Says once, at the top of a surface, that nothing on it can be changed. */
export function ReadOnlyBanner({ message = READ_ONLY_REASON }: { message?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-border bg-surface-high/40 px-3.5 py-2.5 text-[12px] text-muted-foreground">
      <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Marks a subtree read-only and explains why, once, at the top.
 *
 * This is presentation. `RolesGuard` on the server is the enforcement, and it
 * refuses these writes whether or not the button was disabled.
 */
export function ReadOnlyFence({
  active,
  children,
  message,
  banner = true,
}: {
  active: boolean;
  children: React.ReactNode;
  message?: string;
  /** False to mark the subtree without repeating the explanation. */
  banner?: boolean;
}) {
  if (!active) return <>{children}</>;

  return (
    <ReadOnlyContext.Provider value={true}>
      {banner && (
        <div className="px-4 pt-4 sm:px-6">
          <ReadOnlyBanner message={message} />
        </div>
      )}
      {children}
    </ReadOnlyContext.Provider>
  );
}
