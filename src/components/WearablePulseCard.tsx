'use client';

import { useEffect, useState } from 'react';
import { PulseField } from '@/components/PulseField';
import {
  clearWearableSnapshot,
  getWearableSnapshot,
  type WearableSnapshot,
} from '@/lib/wearables';

const LIVE_HR_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Compact vitals from Google Health / Fitbit sync — lives under Today card on Fitness Home */
export function WearablePulseCard() {
  const [snap, setSnap] = useState<WearableSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const load = () => setSnap(getWearableSnapshot());
    load();
    window.addEventListener('joebod-wearable-updated', load);
    return () => window.removeEventListener('joebod-wearable-updated', load);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/google-health/status');
        const json = (await res.json()) as { connected?: boolean };
        if (cancelled) return;
        const ok = Boolean(json.connected);
        setConnected(ok);
        if (!ok) {
          const current = getWearableSnapshot();
          if (current.source === 'google-health' || current.connected) {
            clearWearableSnapshot();
            setSnap(getWearableSnapshot());
            window.dispatchEvent(new Event('joebod-wearable-updated'));
          }
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!snap) return null;

  const hrAgeMs =
    connected && snap.currentHrAt
      ? Date.now() - new Date(snap.currentHrAt).getTime()
      : null;
  const hrIsFresh = hrAgeMs != null && hrAgeMs >= 0 && hrAgeMs <= LIVE_HR_MAX_AGE_MS;
  const liveHr = connected && hrIsFresh ? snap.currentHr : null;
  const spo2Ok = connected && snap.spo2 != null && snap.spo2 >= 50 && snap.spo2 <= 100;

  const hrAgeLabel =
    hrAgeMs == null || !Number.isFinite(hrAgeMs)
      ? null
      : hrAgeMs < 90_000
        ? 'just now'
        : hrAgeMs < 3_600_000
          ? `${Math.round(hrAgeMs / 60_000)}m ago`
          : `${Math.round(hrAgeMs / 3_600_000)}h ago`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div className="today-pulse-wrap" style={{ margin: 0, flex: '0 0 auto' }}>
          <PulseField bpm={liveHr} compact />
          <div className="wearable-bpm wearable-bpm-compact">
            <strong>{liveHr ?? '—'}</strong>
            <span>live</span>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="today-label" style={{ marginBottom: 2 }}>
            {connected ? 'Google Health' : 'Not connected'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {connected && snap.updatedAt
              ? `Polled ${new Date(snap.updatedAt).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}${hrAgeLabel && snap.currentHr != null ? ` · last HR ${hrAgeLabel}` : ''}`
              : 'Settings → Connect Google Health once'}
          </div>
        </div>
      </div>
      <div className="wearable-stats">
        <div>
          <span className="h-metric-label">Live HR</span>
          <div className="wearable-stat-val">
            {liveHr != null ? `${liveHr} bpm` : '—'}
          </div>
        </div>
        <div>
          <span className="h-metric-label">Resting</span>
          <div className="wearable-stat-val">
            {connected && snap.restingHr != null ? `${snap.restingHr} bpm` : '—'}
          </div>
        </div>
        <div>
          <span className="h-metric-label">Steps today</span>
          <div className="wearable-stat-val">
            {connected && snap.steps != null ? snap.steps.toLocaleString() : '—'}
          </div>
        </div>
        <div>
          <span className="h-metric-label">SpO₂</span>
          <div className="wearable-stat-val">{spo2Ok ? `${snap.spo2}%` : '—'}</div>
        </div>
      </div>
      {connected && liveHr == null ? (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>
          {snap.currentHr != null
            ? `No live heart-rate in Google Health yet (last sample ${hrAgeLabel}). Open Fitbit so the watch can upload, then Sync now.`
            : 'No live heart-rate in Google Health. Confirm Fitbit shows recent HR, open the Fitbit app to sync, then Sync now.'}
        </div>
      ) : null}
      {connected && snap.syncMeta?.warnings && snap.syncMeta.warnings.length > 0 ? (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--bad)', lineHeight: 1.4 }}>
          Sync note: {snap.syncMeta.warnings[0]}
        </div>
      ) : null}
    </div>
  );
}
