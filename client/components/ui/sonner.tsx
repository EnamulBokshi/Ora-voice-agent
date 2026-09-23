'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

/**
 * Corner toaster for transient feedback.
 *
 * Colors come from the app's own tokens rather than sonner's defaults, so a toast
 * matches the surface it appears over in either theme.
 */
function Toaster({ ...props }: ToasterProps) {
  const { theme = 'dark' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="bottom-right"
      richColors
      closeButton
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--surface-container)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
