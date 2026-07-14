'use client';

import { useEffect, useState } from 'react';
import { PulseField } from '@/components/PulseField';
import { getWearableSnapshot, type WearableSnapshot } from '@/lib/wearables';

/** Compact vitals from Google Health / Fitbit sync — lives under Today card on Fitness Home */
export function WearablePulseCard() {
  const [snap, setSnap] = useState<WearableSnapshot | null>(null);

  useEffect(() => {
    const load = () => setSnap(getWearableSnapshot());
    load();
    window.addEventListener('joebod-wearable-updated', load);
    return () => window.removeEventListener('joebod-wearable-updated', load);
  }, []);

  if (!snap) return null;

  const bpm = snap.currentHr ?? snap.restingHr ?? 72;
  const connected = snap.connected || snap.source === 'google-health';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div className="today-pulse-wrap" style={{ margin: 0, flex: '0 0 auto' }}>
          <PulseField bpm={bpm} compact />
          <div className="wearable-bpm wearable-bpm-compact">
            <strong>{bpm}</strong>
            <span>bpm</span>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="today-label" style={{ marginBottom: 2 }}>
            {connected ? 'Google Health' : 'Wearable'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            {snap.updatedAt
              ? `Synced ${new Date(snap.updatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
              : 'Connect in Settings to sync Fitbit vitals'}
          </div>
        </div>
      </div>
      <div className="wearable-stats">
        <div>
          <span className="h-metric-label">Resting</span>
          <div className="wearable-stat-val">{snap.restingHr ?? '—'} bpm</div>
        </div>
        <div>
          <span className="h-metric-label">Steps today</span>
          <div className="wearable-stat-val">{snap.steps?.toLocaleString() ?? '—'}</div>
        </div>
        <div>
          <span className="h-metric-label">SpO₂</span>
          <div className="wearable-stat-val">{snap.spo2 != null ? `${snap.spo2}%` : '—'}</div>
        </div>
      </div>
    </div>
  );
}
