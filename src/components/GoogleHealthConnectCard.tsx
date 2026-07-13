'use client';

import { useEffect, useState } from 'react';
import { saveWearableSnapshot, type WearableSnapshot } from '@/lib/wearables';

type Status = { configured: boolean; connected: boolean };

export function GoogleHealthConnectCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshStatus = async () => {
    try {
      const res = await fetch('/api/google-health/status');
      const json = (await res.json()) as Status;
      setStatus(json);
    } catch {
      setStatus({ configured: false, connected: false });
    }
  };

  useEffect(() => {
    void refreshStatus();
    const params = new URLSearchParams(window.location.search);
    const gh = params.get('gh');
    if (!gh) return;
    const notes: Record<string, string> = {
      connected: 'Google Health connected. Tap Sync to pull Fitbit vitals.',
      denied: 'Permission was denied.',
      state: 'OAuth state mismatch — try Connect again.',
      error: 'OAuth failed — check env vars and redirect URI.',
      config: 'Server is missing Google Health env vars.',
      norefresh: 'No refresh token returned — reconnect with prompt=consent (already set).',
    };
    setMessage(notes[gh] ?? null);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const sync = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/google-health/sync', { method: 'POST' });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        snapshot?: Omit<WearableSnapshot, 'source' | 'updatedAt' | 'connected'>;
        updatedAt?: string;
      };
      if (!res.ok || !json.snapshot) {
        setMessage(json.error ?? 'Sync failed');
        return;
      }
      saveWearableSnapshot({
        source: 'google-health',
        connected: true,
        updatedAt: json.updatedAt ?? new Date().toISOString(),
        restingHr: json.snapshot.restingHr,
        currentHr: json.snapshot.currentHr,
        steps: json.snapshot.steps,
        calories: json.snapshot.calories,
        spo2: json.snapshot.spo2,
        sleepMinutes: json.snapshot.sleepMinutes,
      });
      setMessage('Synced Fitbit / Google Health vitals to this device.');
      window.dispatchEvent(new Event('joebod-wearable-updated'));
    } catch {
      setMessage('Network error during sync.');
    } finally {
      setBusy(false);
      void refreshStatus();
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch('/api/google-health/disconnect', { method: 'POST' });
      setMessage('Disconnected.');
    } finally {
      setBusy(false);
      void refreshStatus();
    }
  };

  return (
    <div className="card glass mb14">
      <div className="h-supp-name">Fitbit / Google Health</div>
      <div className="h-supp-note" style={{ marginTop: 6 }}>
        Connect the Google account linked to your Fitbit. Bryan sets Vercel secrets; you complete Google
        Cloud + consent. Full walkthrough:{' '}
        <code style={{ fontSize: 11 }}>docs/GOOGLE_HEALTH_BRYAN_HANDOFF.md</code>
      </div>

      <div className="h-supp-note" style={{ marginTop: 10 }}>
        Status:{' '}
        {!status
          ? 'Checking…'
          : !status.configured
            ? 'Not configured (env vars missing)'
            : status.connected
              ? 'Connected'
              : 'Configured — not connected yet'}
      </div>

      {message ? (
        <div className="h-supp-note" style={{ marginTop: 8, color: 'var(--h-teal)' }}>
          {message}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <a
          className="btn btn-primary"
          href="/api/google-health/auth"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          Connect
        </a>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void sync()}>
          Sync now
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void disconnect()}>
          Disconnect
        </button>
      </div>
    </div>
  );
}
