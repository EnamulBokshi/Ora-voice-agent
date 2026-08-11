'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      id="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group"
      style={{
        background: 'var(--toggle-bg)',
        border:     '1px solid var(--toggle-border)',
      }}
    >
      {isDark ? (
        <Sun
          size={16}
          className="transition-all duration-300 group-hover:rotate-45"
          style={{ color: 'var(--secondary)' }}
        />
      ) : (
        <Moon
          size={16}
          className="transition-all duration-300 group-hover:-rotate-12"
          style={{ color: 'var(--primary)' }}
        />
      )}
    </button>
  );
}
