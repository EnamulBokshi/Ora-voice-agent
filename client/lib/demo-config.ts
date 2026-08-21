/**
 * =============================================================================
 * ORA DEMO MODE CONFIGURATION
 * =============================================================================
 * Master switch for demo fallback data across all dashboard pages.
 *
 * PRODUCTION DYNAMIC MODE: `DEMO_MODE_ENABLED = false`
 * All pages strictly query and display real API data from the backend.
 * =============================================================================
 */

export const DEMO_MODE_ENABLED = false;

/**
 * Returns demoData only if DEMO_MODE_ENABLED is explicitly true and apiData is missing or empty.
 * When DEMO_MODE_ENABLED is false, strictly returns real apiData or empty defaults.
 */
export function withDemoFallback<T>(
  apiData: T | null | undefined,
  demoData: T,
  isEmpty?: (data: T) => boolean,
): T {
  if (!DEMO_MODE_ENABLED) {
    if (apiData !== null && apiData !== undefined) {
      return apiData;
    }
    // Return empty array for array types, otherwise empty object / null
    return (Array.isArray(demoData) ? [] : (null as unknown)) as T;
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
