import {
  saveWearableSnapshot,
  clearWearableSnapshot,
  getWearableSnapshot,
  type WearableSnapshot,
} from '@/lib/wearables';

export type SyncClientResult =
  | {
      ok: true;
      updatedAt: string;
      warnings?: string[];
      summary?: string;
    }
  | { ok: false; error: string; reconnect?: boolean };

/** Pull Google Health vitals into localStorage. Clears local cache first so stale UI can't stick. */
export async function syncGoogleHealthToWearable(opts?: {
  clearFirst?: boolean;
}): Promise<SyncClientResult> {
  try {
    if (opts?.clearFirst !== false) {
      const wasConnected = getWearableSnapshot().connected || getWearableSnapshot().source === 'google-health';
      clearWearableSnapshot();
      if (wasConnected) {
        // Keep chrome showing "connected" while loading
        saveWearableSnapshot({
          ...getWearableSnapshot(),
          source: 'google-health',
          connected: true,
          updatedAt: new Date().toISOString(),
        });
        window.dispatchEvent(new Event('joebod-wearable-updated'));
      }
    }

    const now = new Date();
    const civilDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const res = await fetch(`/api/google-health/sync?t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ civilDate }),
      cache: 'no-store',
    });
    const json = (await res.json()) as {
      ok?: boolean;
      error?: string;
      reconnect?: boolean;
      snapshot?: Omit<WearableSnapshot, 'source' | 'updatedAt' | 'connected' | 'syncMeta'>;
      meta?: {
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
      };
      updatedAt?: string;
    };
    if (!res.ok || !json.ok || !json.snapshot) {
      if (json.reconnect) {
        clearWearableSnapshot();
        window.dispatchEvent(new Event('joebod-wearable-updated'));
      }
      return {
        ok: false,
        reconnect: Boolean(json.reconnect),
        error: json.error ?? 'Sync failed',
      };
    }
    const updatedAt = json.updatedAt ?? new Date().toISOString();
    const snap = json.snapshot;
    saveWearableSnapshot({
      source: 'google-health',
      connected: true,
      updatedAt,
      restingHr: snap.restingHr,
      currentHr: snap.currentHr,
      currentHrAt: snap.currentHrAt ?? null,
      steps: snap.steps,
      calories: snap.calories,
      spo2: snap.spo2,
      spo2AsOf: snap.spo2AsOf ?? null,
      sleepMinutes: snap.sleepMinutes,
      syncMeta: json.meta
        ? {
            warnings: json.meta.warnings,
            hrCount: json.meta.hrCount,
            stepSource: json.meta.stepSource,
            stepDebug: json.meta.stepDebug,
          }
        : null,
    });
    window.dispatchEvent(new Event('joebod-wearable-updated'));
    const d = json.meta?.stepDebug;
    const stepDetail = d
      ? ` [wearables ${d.rollupWearables ?? '—'} / all ${d.rollupAll ?? '—'} / list ${d.listFitbit ?? d.listAll ?? '—'} · ${d.civilDay}]`
      : '';
    const summary = [
      `HR ${snap.currentHr ?? '—'}`,
      `steps ${snap.steps ?? '—'}`,
      `SpO₂ ${snap.spo2 ?? '—'}`,
      json.meta?.stepSource ? `(${json.meta.stepSource})` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      ok: true,
      updatedAt,
      warnings: json.meta?.warnings,
      summary: `${summary}${stepDetail}`,
    };
  } catch {
    return { ok: false, error: 'Network error during sync.' };
  }
}

/** Poll Google Health while the tab is open. */
export function startGoogleHealthLiveSync(intervalMs = 30_000): () => void {
  let stopped = false;
  let inFlight = false;

  const run = async () => {
    if (stopped || inFlight || document.visibilityState === 'hidden') return;
    inFlight = true;
    try {
      // Background polls overwrite without wiping UI first (less flicker)
      await syncGoogleHealthToWearable({ clearFirst: false });
    } finally {
      inFlight = false;
    }
  };

  void run();
  const id = window.setInterval(() => void run(), intervalMs);
  const onVisible = () => {
    if (document.visibilityState === 'visible') void run();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);

  return () => {
    stopped = true;
    window.clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
  };
}
