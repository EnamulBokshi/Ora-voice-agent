'use client';

import { useEffect, useRef } from 'react';

/**
 * Selector for elements that can receive keyboard focus inside a dialog.
 * `[tabindex="-1"]` is excluded: those are programmatic focus targets, not tab stops.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keyboard and focus behaviour every dialog in the dashboard needs.
 *
 * Modals here were inconsistent: some had `aria-modal` and an Escape handler, others
 * had neither, and none trapped focus. Without a trap, Tab walks straight out of the
 * dialog into the page behind it, which for a screen-reader or keyboard-only user
 * means the dialog is effectively unusable — they cannot tell what is still live.
 *
 * Handles: initial focus, Tab/Shift+Tab cycling within the dialog, Escape to close,
 * restoring focus to whatever opened the dialog, and locking background scroll.
 *
 * Attach the returned ref to the dialog container (the element carrying
 * `role="dialog"`), and give that element `tabIndex={-1}` so it can take focus when
 * it holds no focusable children yet.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = containerRef.current;

    // Move focus into the dialog so the next Tab starts inside it.
    const firstFocusable = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? node)?.focus?.();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !node) return;

      const items = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);

      if (items.length === 0) {
        // Nothing to tab to — keep focus on the dialog rather than letting it escape.
        e.preventDefault();
        node.focus?.();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Capture phase so the dialog sees Escape before any page-level handler.
    document.addEventListener('keydown', onKeyDown, true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return containerRef;
}
