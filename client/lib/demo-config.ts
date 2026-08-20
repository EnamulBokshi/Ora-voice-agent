/**
 * =============================================================================
 * ORA DEMO MODE CONFIGURATION
 * =============================================================================
 * Master switch for demo fallback data across all dashboard pages.
 *
 * TO SWITCH TO 100% PRODUCTION DYNAMIC MODE:
 * Change `DEMO_MODE_ENABLED` to `false`.
 *
 * When `false`:
 * - All pages strictly display real API data from the backend.
 * - Real empty states will be shown if collections are empty.
 * =============================================================================
 */

export const DEMO_MODE_ENABLED = true;

/**
 * Returns demoData if DEMO_MODE_ENABLED is true and apiData is missing or empty.
 */
export function withDemoFallback<T>(
  apiData: T | null | undefined,
  demoData: T,
  isEmpty?: (data: T) => boolean,
): T {
  if (!DEMO_MODE_ENABLED) {
    return (apiData ?? demoData) as T;
  }

  if (apiData === null || apiData === undefined) {
    return demoData;
  }

  if (isEmpty && isEmpty(apiData)) {
    return demoData;
  }

  if (Array.isArray(apiData) && apiData.length === 0) {
    return demoData;
  }

  return apiData;
}
