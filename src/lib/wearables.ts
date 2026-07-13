import { readJson, writeJson } from '@/lib/storage';

const WEARABLE_KEY = 'joebod-wearable-snapshot-v1';

export type WearableSnapshot = {
  source: 'demo' | 'fitbit' | 'google-health';
  updatedAt: string;
  restingHr: number | null;
  currentHr: number | null;
  steps: number | null;
  calories: number | null;
  spo2: number | null;
  sleepMinutes: number | null;
  connected: boolean;
};

export const DEMO_WEARABLE: WearableSnapshot = {
  source: 'demo',
  updatedAt: new Date().toISOString(),
  restingHr: 58,
  currentHr: 72,
  steps: 6420,
  calories: 1840,
  spo2: 98,
  sleepMinutes: 420,
  connected: false,
};

export function getWearableSnapshot(): WearableSnapshot {
  return readJson(WEARABLE_KEY, DEMO_WEARABLE);
}

export function saveWearableSnapshot(snapshot: WearableSnapshot): void {
  writeJson(WEARABLE_KEY, snapshot);
}
