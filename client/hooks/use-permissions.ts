'use client';

import { useEffect, useState } from 'react';
import { getMeApi } from '@/services/auth-service';
import { canManage, readOnlyReason } from '@/lib/permissions';

interface Permissions {
  role: string | null;
  /** May change configuration, catalog, keys or billing. */
  canManage: boolean;
  /** What to tell this account when it cannot. */
  readOnlyReason: string;
  loading: boolean;
}

/**
 * The signed-in account's role, for deciding what to show.
 *
 * Sourced from `GET /users/me` rather than from the Shopify session context,
 * so the same hook works on the standalone dashboard and inside the embedded
 * app. `getMeApi` de-duplicates and caches, so several components calling this
 * on one screen cost one request.
 *
 * `canManage` starts false and stays false until the role is known. A control
 * that appears and then disables reads as a bug; one that appears once the
 * answer is in does not.
 */
export function usePermissions(): Permissions {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getMeApi()
      .then((res) => {
        if (!cancelled) setRole(res?.user?.role ?? null);
      })
      .catch(() => {
        // An unreadable role is not permission to write. The server refuses
        // either way; this only decides what the screen offers.
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    role,
    canManage: canManage(role),
    readOnlyReason: readOnlyReason(role),
    loading,
  };
}
