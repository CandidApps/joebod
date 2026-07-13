'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(ios);
    try {
      setDismissed(localStorage.getItem('eclipse-install-dismissed') === '1');
    } catch {
      setDismissed(false);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Dev: kill any SW so Turbopack HMR / hydration never serve a stale shell
    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => (typeof caches !== 'undefined' ? caches.keys() : []))
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => undefined);
      return;
    }

    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  if (dismissed) return null;
  if (!deferred && !isIos) return null;

  return (
    <div className="install-banner">
      <div>
        <strong>Add JOEbod to Home Screen</strong>
        <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>
          {isIos
            ? 'Safari → Share → Add to Home Screen for gym use.'
            : 'Install for one-tap access at the gym.'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {deferred ? (
          <button
            type="button"
            className="btn btn-primary"
            style={{ minHeight: 40, padding: '8px 12px' }}
            onClick={async () => {
              await deferred.prompt();
              setDeferred(null);
            }}
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ minHeight: 40, padding: '8px 12px' }}
          onClick={() => {
            try {
              localStorage.setItem('eclipse-install-dismissed', '1');
            } catch {
              // ignore
            }
            setDismissed(true);
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
