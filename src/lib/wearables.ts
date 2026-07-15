import { readJson, writeJson } from '@/lib/storage';

const WEARABLE_KEY = 'joebod-wearable-snapshot-v1';

export type WearableSnapshot = {
  source: 'demo' | 'fitbit' | 'google-health';
  updatedAt: string;
  restingHr: number | null;
  currentHr: number | null;
  currentHrAt?: string | null;
  steps: number | null;
  calories: number | null;
  spo2: number | null;
  spo2AsOf?: string | null;
  sleepMinutes: number | null;
  connected: boolean;
  /** Last sync diagnostics (from Google Health fetch). */
  syncMeta?: {
    warnings?: string[];
    hrCount?: number;
    stepSource?: string;
    stepDebug?: {
      rollupWearables: number | null;
      rollupAll: number | null;
      listFitbit: number | null;
      listAll: number | null;
      civilDay: string;
    };
  } | null;
};

export const EMPTY_WEARABLE: WearableSnapshot = {
  source: 'demo',
  updatedAt: new Date().toISOString(),
  restingHr: null,
  currentHr: null,
  currentHrAt: null,
  steps: null,
  calories: null,
  spo2: null,
  spo2AsOf: null,
  sleepMinutes: null,
  connected: false,
  syncMeta: null,
};

/** @deprecated Prefer EMPTY_WEARABLE — demo numbers caused confusion when cache was empty. */
export const DEMO_WEARABLE: WearableSnapshot = EMPTY_WEARABLE;

/** Drop SpO₂ masquerading as BPM (same number in 90–100). */
function sanitizeSnapshot(snap: WearableSnapshot): WearableSnapshot {
  let { currentHr, restingHr, spo2, currentHrAt } = snap;
  if (spo2 != null && (spo2 < 50 || spo2 > 100)) {
    spo2 = null;
  }
  if (spo2 != null && currentHr === spo2 && spo2 >= 90 && spo2 <= 100) {
    currentHr = null;
  }
  if (spo2 != null && restingHr === spo2 && spo2 >= 90 && spo2 <= 100) {
    restingHr = null;
  }
  // Stale "live" HR older than 3h is not live — keep the value but mark age via currentHrAt
  if (currentHrAt) {
    const ageMs = Date.now() - new Date(currentHrAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs < 0) currentHrAt = null;
  }
  return { ...snap, currentHr, restingHr, spo2, currentHrAt };
}

export function getWearableSnapshot(): WearableSnapshot {
  return sanitizeSnapshot(readJson(WEARABLE_KEY, EMPTY_WEARABLE));
}

export function saveWearableSnapshot(snapshot: WearableSnapshot): void {
  writeJson(WEARABLE_KEY, sanitizeSnapshot(snapshot));
}

/** Wipe local vitals cache (does not disconnect Google OAuth cookie). */
export function clearWearableSnapshot(): void {
  writeJson(WEARABLE_KEY, {
    ...EMPTY_WEARABLE,
    updatedAt: new Date().toISOString(),
  });
}
