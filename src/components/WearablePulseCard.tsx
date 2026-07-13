'use client';

import { useEffect, useState } from 'react';
import { PulseField } from '@/components/PulseField';
import { getWearableSnapshot, type WearableSnapshot } from '@/lib/wearables';

/** Compact pulse (right of day title) + vitals strip under hero */
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

  return (
    <>
      <div className="today-pulse-wrap">
        <PulseField bpm={bpm} compact />
        <div className="wearable-bpm wearable-bpm-compact">
          <strong>{bpm}</strong>
          <span>bpm</span>
        </div>
      </div>
      <div className="wearable-stats wearable-stats-hero">
        <div>
          <span className="h-metric-label">Resting</span>
          <div className="wearable-stat-val">{snap.restingHr ?? '—'} bpm</div>
        </div>
        <div>
          <span className="h-metric-label">Steps</span>
          <div className="wearable-stat-val">{snap.steps?.toLocaleString() ?? '—'}</div>
        </div>
        <div>
          <span className="h-metric-label">SpO₂</span>
          <div className="wearable-stat-val">{snap.spo2 != null ? `${snap.spo2}%` : '—'}</div>
        </div>
      </div>
    </>
  );
}
