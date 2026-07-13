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
  const color = theme === 'light' ? '#F3F5F8' : '#07090D';
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
  window.dispatchEvent(new CustomEvent('joebod-theme-updated', { detail: theme }));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    const initial = readTheme();
    setTheme(initial);
    applyTheme(initial);
    const onUpdate = (e: Event) => {
      const next = (e as CustomEvent<ThemeMode>).detail;
      if (next === 'light' || next === 'dark') setTheme(next);
    };
    window.addEventListener('joebod-theme-updated', onUpdate);
    return () => window.removeEventListener('joebod-theme-updated', onUpdate);
  }, []);

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button
        type="button"
        className={`theme-btn${theme === 'light' ? ' active' : ''}`}
        aria-pressed={theme === 'light'}
        onClick={() => {
          applyTheme('light');
          setTheme('light');
        }}
      >
        Light
      </button>
      <button
        type="button"
        className={`theme-btn${theme === 'dark' ? ' active' : ''}`}
        aria-pressed={theme === 'dark'}
        onClick={() => {
          applyTheme('dark');
          setTheme('dark');
        }}
      >
        Dark
      </button>
    </div>
  );
}
