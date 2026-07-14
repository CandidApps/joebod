import { saveWearableSnapshot, type WearableSnapshot } from '@/lib/wearables';

export type SyncClientResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string };

/** Pull Google Health vitals into localStorage. No-ops with ok:false if not connected. */
export async function syncGoogleHealthToWearable(): Promise<SyncClientResult> {
  try {
    const now = new Date();
    const civilDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const res = await fetch('/api/google-health/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ civilDate }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      error?: string;
      snapshot?: Omit<WearableSnapshot, 'source' | 'updatedAt' | 'connected'>;
      updatedAt?: string;
    };
    if (!res.ok || !json.ok || !json.snapshot) {
      return { ok: false, error: json.error ?? 'Sync failed' };
    }
    const updatedAt = json.updatedAt ?? new Date().toISOString();
    saveWearableSnapshot({
      source: 'google-health',
      connected: true,
      updatedAt,
      restingHr: json.snapshot.restingHr,
      currentHr: json.snapshot.currentHr,
      steps: json.snapshot.steps,
      calories: json.snapshot.calories,
      spo2: json.snapshot.spo2,
      sleepMinutes: json.snapshot.sleepMinutes,
    });
    window.dispatchEvent(new Event('joebod-wearable-updated'));
    return { ok: true, updatedAt };
  } catch {
    return { ok: false, error: 'Network error during sync.' };
  }
}
