export type HealthSnapshot = {
  restingHr: number | null;
  currentHr: number | null;
  steps: number | null;
  calories: number | null;
  spo2: number | null;
  sleepMinutes: number | null;
};

type DataPoint = Record<string, unknown>;

type CivilDate = { year: number; month: number; day: number };

function localCivilDate(d = new Date()): CivilDate {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function addCivilDays(date: CivilDate, days: number): CivilDate {
  const d = new Date(date.year, date.month - 1, date.day + days);
  return localCivilDate(d);
}

/** Closed-open civil day range. Prefer client-provided YYYY-MM-DD (device local day). */
function civilDayRange(isoDate?: string): { start: { date: CivilDate }; end: { date: CivilDate } } {
  let start = localCivilDate();
  if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-').map(Number);
    start = { year: y, month: m, day: d };
  }
  return { start: { date: start }, end: { date: addCivilDays(start, 1) } };
}

function padDate(d: CivilDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

/** Plausible adult HR window — SpO₂ % can land here (90–100), so we filter that separately. */
function asBpm(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const bpm = Math.round(v);
  if (bpm < 35 || bpm > 220) return null;
  return bpm;
}

/** Normalize SpO2 to whole percent 0–100. */
function asSpo2Percent(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  let x = v;
  if (x > 0 && x <= 1) x *= 100;
  if (x < 50 || x > 100) return null;
  return Math.round(x);
}

async function listDataPoints(
  accessToken: string,
  dataType: string,
  opts?: { pageSize?: number; filter?: string },
): Promise<DataPoint[]> {
  const params = new URLSearchParams();
  params.set('pageSize', String(opts?.pageSize ?? 50));
  if (opts?.filter) params.set('filter', opts.filter);

  const url = `https://health.googleapis.com/v4/users/me/dataTypes/${encodeURIComponent(dataType)}/dataPoints?${params}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { dataPoints?: DataPoint[] };
  return Array.isArray(json.dataPoints) ? json.dataPoints : [];
}

/** Reconciled stream matches what Google Health / Fitbit surfaces after merging sources. */
async function reconcileDataPoints(
  accessToken: string,
  dataType: string,
  opts?: { pageSize?: number; filter?: string },
): Promise<DataPoint[]> {
  const params = new URLSearchParams();
  params.set('pageSize', String(opts?.pageSize ?? 50));
  if (opts?.filter) params.set('filter', opts.filter);

  const url = `https://health.googleapis.com/v4/users/me/dataTypes/${encodeURIComponent(dataType)}/dataPoints:reconcile?${params}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    // Fall back to raw list if reconcile unavailable
    return listDataPoints(accessToken, dataType, opts);
  }
  const json = (await res.json()) as { dataPoints?: DataPoint[] };
  return Array.isArray(json.dataPoints) ? json.dataPoints : [];
}

/**
 * Strict BPM from heart-rate / daily-resting-heart-rate only.
 * Never reads percentage / averagePercentage (those are SpO₂).
 */
function extractBeatsPerMinute(point: DataPoint): number | null {
  const hr = point.heartRate as Record<string, unknown> | undefined;
  if (hr && typeof hr === 'object') {
    // Required field on HeartRate — do not fall back to value/percentage
    const bpm = asBpm(num(hr.beatsPerMinute));
    if (bpm != null) return bpm;
  }

  const resting = point.dailyRestingHeartRate as Record<string, unknown> | undefined;
  if (resting && typeof resting === 'object') {
    const bpm = asBpm(num(resting.beatsPerMinute));
    if (bpm != null) return bpm;
  }

  return null;
}

function pickLatestBpm(points: DataPoint[], avoid?: number | null): number | null {
  for (const p of points) {
    const bpm = extractBeatsPerMinute(p);
    if (bpm == null) continue;
    // Avoid treating a SpO₂ % that leaked into another field as heart rate
    if (avoid != null && bpm === avoid && bpm >= 90 && bpm <= 100) continue;
    return bpm;
  }
  // If every sample matched avoid, return first valid BPM anyway
  for (const p of points) {
    const bpm = extractBeatsPerMinute(p);
    if (bpm != null) return bpm;
  }
  return null;
}

async function fetchTodaySteps(accessToken: string, civilDate?: string): Promise<number | null> {
  const range = civilDayRange(civilDate);
  const res = await fetch(
    'https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        windowSizeDays: 1,
        pageSize: 7,
      }),
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    return sumTodayStepIntervals(accessToken, civilDate);
  }
  const json = (await res.json()) as {
    rollupDataPoints?: Array<{ steps?: { countSum?: string | number } }>;
  };
  for (const p of json.rollupDataPoints ?? []) {
    const sum = num(p.steps?.countSum);
    if (sum != null) return Math.round(sum);
  }
  return sumTodayStepIntervals(accessToken, civilDate);
}

async function sumTodayStepIntervals(accessToken: string, civilDate?: string): Promise<number | null> {
  const { start, end } = civilDayRange(civilDate);
  const filter = `steps.interval.civil_start_time >= "${padDate(start.date)}" AND steps.interval.civil_start_time < "${padDate(end.date)}"`;
  const points = await listDataPoints(accessToken, 'steps', { pageSize: 10000, filter });
  let total = 0;
  let found = false;
  for (const p of points) {
    const steps = p.steps as Record<string, unknown> | undefined;
    const count = num(steps?.count);
    if (count != null) {
      total += count;
      found = true;
    }
  }
  return found ? Math.round(total) : null;
}

function pickSpo2(dailyPoints: DataPoint[], samplePoints: DataPoint[]): number | null {
  for (const p of dailyPoints) {
    const o2 = p.dailyOxygenSaturation as Record<string, unknown> | undefined;
    if (!o2) continue;
    const avg = asSpo2Percent(num(o2.averagePercentage));
    if (avg != null) return avg;
  }

  for (const p of samplePoints) {
    const o2 = p.oxygenSaturation as Record<string, unknown> | undefined;
    if (!o2) continue;
    const v = asSpo2Percent(num(o2.percentage));
    if (v != null) return v;
  }
  return null;
}

function pickSleepMinutes(points: DataPoint[]): number | null {
  for (const p of points) {
    const sleep = p.sleep as Record<string, unknown> | undefined;
    if (!sleep) continue;
    const mins = num(sleep.durationMinutes) ?? num(sleep.minutesAsleep);
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
export async function fetchHealthSnapshot(
  accessToken: string,
  opts?: { civilDate?: string },
): Promise<HealthSnapshot> {
  const civilDate = opts?.civilDate;
  const day = civilDate && /^\d{4}-\d{2}-\d{2}$/.test(civilDate) ? civilDate : padDate(localCivilDate());

  const [hrPoints, restingPoints, steps, dailySpo2, sampleSpo2, sleepPoints] = await Promise.all([
    // Recent reconciled BPM — same merged stream Google Health / Fitbit uses
    reconcileDataPoints(accessToken, 'heart-rate', { pageSize: 100 }),
    reconcileDataPoints(accessToken, 'daily-resting-heart-rate', {
      pageSize: 14,
      filter: `dailyRestingHeartRate.date >= "${day}"`,
    }).then(async (pts) =>
      pts.length > 0
        ? pts
        : reconcileDataPoints(accessToken, 'daily-resting-heart-rate', { pageSize: 14 }),
    ),
    fetchTodaySteps(accessToken, civilDate),
    reconcileDataPoints(accessToken, 'daily-oxygen-saturation', { pageSize: 14 }),
    reconcileDataPoints(accessToken, 'oxygen-saturation', { pageSize: 20 }),
    reconcileDataPoints(accessToken, 'sleep', { pageSize: 7 }),
  ]);

  const spo2 = pickSpo2(dailySpo2, sampleSpo2);
  const currentHr = pickLatestBpm(hrPoints, spo2);
  const restingHr = pickLatestBpm(restingPoints, spo2) ?? null;

  return {
    currentHr,
    restingHr,
    steps,
    calories: null,
    spo2,
    sleepMinutes: pickSleepMinutes(sleepPoints),
  };
}
