'use client';

import { useCallback, useEffect, useRef } from 'react';

/** How close to the bottom, in pixels, still counts as reading the latest line. */
const STICK_THRESHOLD_PX = 48;

/**
 * Keeps a scrollable list pinned to its newest entry.
 *
 * Scrolls the list element itself, never the page. `scrollIntoView` on a
 * sentinel scrolls every scrollable ancestor too, so each new transcript line
 * dragged the page away from whatever the user was looking at. It also stops
 * following once the user scrolls up to read, and resumes when they return to
 * the bottom.
 *
 * Attach `ref` and `onScroll` to the scrolling element and pass whatever
 * changes when an entry is added as `dependency`.
 */
export function useStickToBottom<T extends HTMLElement>(dependency: unknown) {
  const ref = useRef<T | null>(null);
  const stuck = useRef(true);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el && stuck.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [dependency]);

  return { ref, onScroll };
}
