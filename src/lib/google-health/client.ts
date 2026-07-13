export type HealthSnapshot = {
  restingHr: number | null;
  currentHr: number | null;
  steps: number | null;
  calories: number | null;
  spo2: number | null;
  sleepMinutes: number | null;
};

type DataPoint = Record<string, unknown>;

async function listDataPoints(accessToken: string, dataType: string): Promise<DataPoint[]> {
  const url = `https://health.googleapis.com/v4/users/me/dataTypes/${encodeURIComponent(dataType)}/dataPoints?pageSize=20`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    // Missing type / no permission — treat as empty
    return [];
  }
  const json = (await res.json()) as { dataPoints?: DataPoint[] };
  return Array.isArray(json.dataPoints) ? json.dataPoints : [];
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function pickHr(points: DataPoint[]): number | null {
  for (const p of points) {
    const hr = p.heartRate as Record<string, unknown> | undefined;
    if (hr) {
      const bpm =
        num(hr.beatsPerMinute) ??
        num(hr.bpm) ??
        num(hr.value) ??
        num((hr as { averageBeatsPerMinute?: unknown }).averageBeatsPerMinute);
      if (bpm != null) return Math.round(bpm);
    }
  }
  return null;
}

function pickSteps(points: DataPoint[]): number | null {
  let total = 0;
  let found = false;
  for (const p of points) {
    const steps = p.steps as Record<string, unknown> | undefined;
    const count = num(steps?.count) ?? num(steps?.value);
    if (count != null) {
      total += count;
      found = true;
    }
  }
  return found ? Math.round(total) : null;
}

function pickSpo2(points: DataPoint[]): number | null {
  for (const p of points) {
    const o2 = (p.oxygenSaturation ?? p.spo2) as Record<string, unknown> | undefined;
    if (o2) {
      const v = num(o2.percentage) ?? num(o2.value);
      if (v != null) return Math.round(v);
    }
  }
  return null;
}

function pickSleepMinutes(points: DataPoint[]): number | null {
  for (const p of points) {
    const sleep = p.sleep as Record<string, unknown> | undefined;
    if (!sleep) continue;
    const mins = num(sleep.durationMinutes);
    if (mins != null) return Math.round(mins);
    const dur = sleep.duration ?? sleep.activeDuration;
    if (typeof dur === 'string' && dur.endsWith('s')) {
      const sec = Number(dur.slice(0, -1));
      if (!Number.isNaN(sec)) return Math.round(sec / 60);
    }
  }
  return null;
}

/** Pull a compact vitals snapshot for JOEbod UI */
export async function fetchHealthSnapshot(accessToken: string): Promise<HealthSnapshot> {
  const [hrPoints, restingPoints, stepPoints, spo2Points, sleepPoints] = await Promise.all([
    listDataPoints(accessToken, 'heart-rate'),
    listDataPoints(accessToken, 'resting-heart-rate'),
    listDataPoints(accessToken, 'steps'),
    listDataPoints(accessToken, 'oxygen-saturation'),
    listDataPoints(accessToken, 'sleep'),
  ]);

  return {
    currentHr: pickHr(hrPoints),
    restingHr: pickHr(restingPoints) ?? pickHr(hrPoints),
    steps: pickSteps(stepPoints),
    calories: null,
    spo2: pickSpo2(spo2Points),
    sleepMinutes: pickSleepMinutes(sleepPoints),
  };
}
