'use client';

import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'joebod-theme-v1';

export function readTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    // ignore
  }
  return 'dark';
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  const color = theme === 'light' ? '#F3F5F8' : '#08090C';
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const stored = readTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const setMode = (next: ThemeMode) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button
        type="button"
        className={`theme-btn${theme === 'light' ? ' active' : ''}`}
        aria-pressed={theme === 'light'}
        onClick={() => setMode('light')}
      >
        Light
      </button>
      <button
        type="button"
        className={`theme-btn${theme === 'dark' ? ' active' : ''}`}
        aria-pressed={theme === 'dark'}
        onClick={() => setMode('dark')}
      >
        Dark
      </button>
    </div>
  );
}
