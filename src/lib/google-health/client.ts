export type HealthSnapshot = {
  restingHr: number | null;
  currentHr: number | null;
  /** ISO time of the latest HR sample we used (for latency UI). */
  currentHrAt: string | null;
  steps: number | null;
  calories: number | null;
  spo2: number | null;
  spo2AsOf: string | null;
  sleepMinutes: number | null;
};

/** Non-fatal sync notes for Settings / debugging. */
export type HealthFetchMeta = {
  warnings: string[];
  hrCount: number;
  stepSource: 'dailyRollUp' | 'list-fitbit' | 'list-all' | 'none';
  /** Debug: raw totals from Google (helps verify against Fitbit / Health app). */
  stepDebug?: {
    rollupWearables: number | null;
    rollupAll: number | null;
    listFitbit: number | null;
    listAll: number | null;
    civilDay: string;
  };
};

type DataPoint = Record<string, unknown>;
type CivilDate = { year: number; month: number; day: number };

type FetchResult = { points: DataPoint[]; error?: string };

const WEARABLES_FAMILY = 'users/me/dataSourceFamilies/google-wearables';

function localCivilDate(d = new Date()): CivilDate {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function addCivilDays(date: CivilDate, days: number): CivilDate {
  const d = new Date(date.year, date.month - 1, date.day + days);
  return localCivilDate(d);
}

function padDate(d: CivilDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function civilDayRange(isoDate?: string): { start: CivilDate; endExclusive: CivilDate } {
  let start = localCivilDate();
  if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, d] = isoDate.split('-').map(Number);
    start = { year: y, month: m, day: d };
  }
  return { start, endExclusive: addCivilDays(start, 1) };
}

function sameCivilDay(a?: CivilDate | null, b?: CivilDate | null): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function civilFromPointDate(raw: unknown): CivilDate | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const year = num(d.year);
  const month = num(d.month);
  const day = num(d.day);
  if (year == null || month == null || day == null) return null;
  return { year, month, day };
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function asBpm(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const bpm = Math.round(v);
  if (bpm < 35 || bpm > 220) return null;
  return bpm;
}

function asSpo2Percent(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  let x = v;
  if (x > 0 && x <= 1) x *= 100;
  if (x < 50 || x > 100) return null;
  return Math.round(x);
}

function toRfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function getDataPoints(
  accessToken: string,
  dataType: string,
  opts?: {
    pageSize?: number;
    filter?: string;
    /** Prefer Fitbit / Google wearable reconciled stream. */
    wearables?: boolean;
    mode?: 'list' | 'reconcile';
    /** Follow nextPageToken (required for full-day step interval sums). */
    paginate?: boolean;
  },
): Promise<FetchResult> {
  const mode = opts?.mode ?? 'list';
  const pageSize = opts?.pageSize ?? 100;
  const maxPages = opts?.paginate ? 40 : 1;
  const all: DataPoint[] = [];
  let pageToken: string | undefined;
  let lastError: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams();
    params.set('pageSize', String(pageSize));
    if (opts?.filter) params.set('filter', opts.filter);
    if (opts?.wearables) params.set('dataSourceFamily', WEARABLES_FAMILY);
    if (pageToken) params.set('pageToken', pageToken);

    const suffix = mode === 'reconcile' ? ':reconcile' : '';
    const url = `https://health.googleapis.com/v4/users/me/dataTypes/${encodeURIComponent(dataType)}/dataPoints${suffix}?${params}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      lastError = `${mode} ${dataType} → HTTP ${res.status}${body ? `: ${body.slice(0, 180)}` : ''}`;
      break;
    }
    const json = (await res.json()) as { dataPoints?: DataPoint[]; nextPageToken?: string };
    const batch = Array.isArray(json.dataPoints) ? json.dataPoints : [];
    all.push(...batch);
    pageToken = json.nextPageToken || undefined;
    if (!pageToken || batch.length === 0) break;
  }

  return { points: all, error: all.length ? undefined : lastError };
}

/** Try list with wearables family, then plain list, then reconcile — always with a time filter. */
async function queryWithFallback(
  accessToken: string,
  dataType: string,
  filter: string,
  pageSize: number,
): Promise<FetchResult> {
  const attempts: Array<{ wearables?: boolean; mode: 'list' | 'reconcile' }> = [
    { wearables: true, mode: 'list' },
    { mode: 'list' },
    { wearables: true, mode: 'reconcile' },
    { mode: 'reconcile' },
  ];
  const errors: string[] = [];
  for (const attempt of attempts) {
    const result = await getDataPoints(accessToken, dataType, {
      filter,
      pageSize,
      wearables: attempt.wearables,
      mode: attempt.mode,
    });
    if (result.points.length > 0) return result;
    if (result.error) errors.push(result.error);
  }
  return { points: [], error: errors[0] };
}

function extractBeatsPerMinute(point: DataPoint): number | null {
  const hr = point.heartRate as Record<string, unknown> | undefined;
  if (hr && typeof hr === 'object') {
    const bpm = asBpm(num(hr.beatsPerMinute));
    if (bpm != null) return bpm;
  }
  const resting = point.dailyRestingHeartRate as Record<string, unknown> | undefined;
  if (resting && typeof resting === 'object') {
    return asBpm(num(resting.beatsPerMinute));
  }
  return null;
}

function samplePhysicalTime(point: DataPoint): string | null {
  const hr = point.heartRate as Record<string, unknown> | undefined;
  const st = hr?.sampleTime as Record<string, unknown> | undefined;
  const t = st?.physicalTime;
  return typeof t === 'string' ? t : null;
}

function pickLatestHr(
  points: DataPoint[],
  avoid?: number | null,
): { bpm: number | null; at: string | null } {
  // Explicitly sort newest-first — API order is not always reliable.
  const ranked = [...points]
    .map((p) => ({
      bpm: extractBeatsPerMinute(p),
      at: samplePhysicalTime(p),
      t: samplePhysicalTime(p) ? Date.parse(samplePhysicalTime(p)!) : 0,
    }))
    .filter((r) => r.bpm != null)
    .filter((r) => !(avoid != null && r.bpm === avoid && r.bpm! >= 90 && r.bpm! <= 100))
    .sort((a, b) => b.t - a.t);

  const best = ranked[0];
  if (!best?.bpm) return { bpm: null, at: null };
  return { bpm: best.bpm, at: best.at };
}

function pickRestingBpm(points: DataPoint[]): number | null {
  for (const p of points) {
    const resting = p.dailyRestingHeartRate as Record<string, unknown> | undefined;
    if (!resting || typeof resting !== 'object') continue;
    const bpm = asBpm(num(resting.beatsPerMinute));
    if (bpm != null) return bpm;
  }
  return null;
}

type RollupPoint = {
  civilStartTime?: { date?: CivilDate };
  steps?: { countSum?: string | number; count_sum?: string | number };
};

/** dailyRollUp end must be exclusive (start of next civil day). */
async function dailyRollUpSteps(
  accessToken: string,
  start: CivilDate,
  endExclusive: CivilDate,
  dataSourceFamily?: string,
): Promise<{ steps: number | null; error?: string; raw?: unknown }> {
  const body: Record<string, unknown> = {
    range: {
      start: {
        date: start,
        time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
      },
      end: {
        date: endExclusive,
        time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 },
      },
    },
    windowSizeDays: 1,
    pageSize: 7,
  };
  if (dataSourceFamily) body.dataSourceFamily = dataSourceFamily;

  const res = await fetch(
    'https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      steps: null,
      error: `dailyRollUp${dataSourceFamily ? ` (${dataSourceFamily.split('/').pop()})` : ''} → HTTP ${res.status}${text ? `: ${text.slice(0, 140)}` : ''}`,
    };
  }
  const json = (await res.json()) as { rollupDataPoints?: RollupPoint[] };
  const points = json.rollupDataPoints ?? [];
  const matched =
    points.find((p) => sameCivilDay(p.civilStartTime?.date ?? null, start)) ?? points[0];
  const sum = num(matched?.steps?.countSum ?? matched?.steps?.count_sum);
  return { steps: sum != null ? Math.round(sum) : null, raw: matched };
}

function sumStepIntervals(points: DataPoint[]): { fitbit: number | null; all: number | null } {
  let fitbitTotal = 0;
  let fitbitFound = false;
  let allTotal = 0;
  let allFound = false;
  for (const p of points) {
    const steps = p.steps as Record<string, unknown> | undefined;
    const count = num(steps?.count);
    if (count == null) continue;
    allTotal += count;
    allFound = true;
    const src = p.dataSource as { platform?: string } | undefined;
    if (String(src?.platform ?? '').toUpperCase() === 'FITBIT') {
      fitbitTotal += count;
      fitbitFound = true;
    }
  }
  return {
    fitbit: fitbitFound ? Math.round(fitbitTotal) : null,
    all: allFound ? Math.round(allTotal) : null,
  };
}

async function fetchTodaySteps(
  accessToken: string,
  civilDate?: string,
): Promise<{
  steps: number | null;
  source: HealthFetchMeta['stepSource'];
  warning?: string;
  debug: NonNullable<HealthFetchMeta['stepDebug']>;
}> {
  const { start, endExclusive } = civilDayRange(civilDate);
  const day = padDate(start);
  const next = padDate(endExclusive);
  const filter = `steps.interval.civil_start_time >= "${day}" AND steps.interval.civil_start_time < "${next}"`;

  // 1) dailyRollUp — same total Google Health / Fitbit apps use for the day.
  //    End is EXCLUSIVE (tomorrow 00:00). Same-day 23:59:59 was under-counting.
  const [wearablesRoll, allRoll] = await Promise.all([
    dailyRollUpSteps(accessToken, start, endExclusive, WEARABLES_FAMILY),
    dailyRollUpSteps(accessToken, start, endExclusive),
  ]);

  // 2) Paginated interval list as fallback / cross-check
  const wearablesList = await getDataPoints(accessToken, 'steps', {
    filter,
    pageSize: 10000,
    wearables: true,
    mode: 'reconcile',
    paginate: true,
  });
  const listPoints =
    wearablesList.points.length > 0
      ? wearablesList.points
      : (
          await getDataPoints(accessToken, 'steps', {
            filter,
            pageSize: 10000,
            mode: 'list',
            paginate: true,
          })
        ).points;
  const listed = sumStepIntervals(listPoints);

  const debug = {
    rollupWearables: wearablesRoll.steps,
    rollupAll: allRoll.steps,
    listFitbit: listed.fitbit,
    listAll: listed.all,
    civilDay: day,
  };

  const warnings = [wearablesRoll.error, allRoll.error].filter(Boolean) as string[];

  // Prefer wearables rollup (Fitbit watch), then all-sources rollup (matches Health app).
  if (wearablesRoll.steps != null) {
    return {
      steps: wearablesRoll.steps,
      source: 'dailyRollUp',
      warning: warnings[0],
      debug,
    };
  }
  if (allRoll.steps != null) {
    return {
      steps: allRoll.steps,
      source: 'dailyRollUp',
      warning: warnings[0],
      debug,
    };
  }
  if (listed.fitbit != null) {
    return {
      steps: listed.fitbit,
      source: 'list-fitbit',
      warning: warnings[0] ?? 'dailyRollUp empty — used paginated Fitbit intervals',
      debug,
    };
  }
  if (listed.all != null) {
    return {
      steps: listed.all,
      source: 'list-all',
      warning: warnings[0] ?? 'dailyRollUp empty — used paginated step intervals',
      debug,
    };
  }

  return {
    steps: null,
    source: 'none',
    warning: warnings[0] ?? wearablesList.error ?? 'No steps returned for today',
    debug,
  };
}

function pickSpo2(
  dailyPoints: DataPoint[],
  samplePoints: DataPoint[],
  preferDay: CivilDate,
): { spo2: number | null; spo2AsOf: string | null } {
  const dayIso = padDate(preferDay);

  const readDaily = (p: DataPoint): { value: number; asOf: string } | null => {
    const o2 = p.dailyOxygenSaturation as Record<string, unknown> | undefined;
    if (!o2) return null;
    const avg = asSpo2Percent(num(o2.averagePercentage));
    if (avg == null) return null;
    const date = civilFromPointDate(o2.date) ?? preferDay;
    return { value: avg, asOf: padDate(date) };
  };

  // Only today's SpO₂ — never reuse an older overnight reading (misleading if watch wasn't worn).
  for (const p of dailyPoints) {
    const row = readDaily(p);
    if (row && row.asOf === dayIso) return { spo2: row.value, spo2AsOf: row.asOf };
  }

  for (const p of samplePoints) {
    const o2 = p.oxygenSaturation as Record<string, unknown> | undefined;
    if (!o2) continue;
    const v = asSpo2Percent(num(o2.percentage));
    if (v == null) continue;
    const st = o2.sampleTime as Record<string, unknown> | undefined;
    const civil = st?.civilTime as { date?: unknown } | undefined;
    const asOf = civilFromPointDate(civil?.date);
    if (asOf && padDate(asOf) === dayIso) return { spo2: v, spo2AsOf: dayIso };
  }

  return { spo2: null, spo2AsOf: null };
}

function pickSleepMinutes(points: DataPoint[]): number | null {
  for (const p of points) {
    const sleep = p.sleep as Record<string, unknown> | undefined;
    if (!sleep) continue;
    const mins = num(sleep.durationMinutes) ?? num(sleep.minutesAsleep);
    if (mins != null) return Math.round(mins);
    const summary = sleep.summary as Record<string, unknown> | undefined;
    const fromSummary = num(summary?.minutesAsleep);
    if (fromSummary != null) return Math.round(fromSummary);
  }
  return null;
}

export async function fetchHealthSnapshot(
  accessToken: string,
  opts?: { civilDate?: string },
): Promise<{ snapshot: HealthSnapshot; meta: HealthFetchMeta }> {
  const warnings: string[] = [];
  const civilDate = opts?.civilDate;
  const dayCivil =
    civilDate && /^\d{4}-\d{2}-\d{2}$/.test(civilDate)
      ? (() => {
          const [y, m, d] = civilDate.split('-').map(Number);
          return { year: y, month: m, day: d };
        })()
      : localCivilDate();
  const yday = padDate(addCivilDays(dayCivil, -1));

  // Live HR: last 24h window with REQUIRED sample_time filter (snake_case per Google docs).
  // heart-rate queries without a filter often fail / return empty (14-day max range).
  const hrEnd = new Date();
  const hrStart = new Date(hrEnd.getTime() - 24 * 60 * 60 * 1000);
  const hrFilter = `heart_rate.sample_time.physical_time >= "${toRfc3339(hrStart)}" AND heart_rate.sample_time.physical_time < "${toRfc3339(hrEnd)}"`;

  const restingFilterCamel = `dailyRestingHeartRate.date >= "${yday}"`;
  const restingFilterSnake = `daily_resting_heart_rate.date >= "${yday}"`;
  const spo2FilterCamel = `dailyOxygenSaturation.date >= "${yday}"`;
  const spo2FilterSnake = `daily_oxygen_saturation.date >= "${yday}"`;

  const [hrResult, restingResult, stepPack, spo2Daily, spo2Samples, sleepResult] =
    await Promise.all([
      queryWithFallback(accessToken, 'heart-rate', hrFilter, 100),
      (async () => {
        const a = await queryWithFallback(accessToken, 'daily-resting-heart-rate', restingFilterCamel, 14);
        if (a.points.length) return a;
        return queryWithFallback(accessToken, 'daily-resting-heart-rate', restingFilterSnake, 14);
      })(),
      fetchTodaySteps(accessToken, civilDate),
      (async () => {
        const a = await queryWithFallback(accessToken, 'daily-oxygen-saturation', spo2FilterCamel, 14);
        if (a.points.length) return a;
        return queryWithFallback(accessToken, 'daily-oxygen-saturation', spo2FilterSnake, 14);
      })(),
      queryWithFallback(
        accessToken,
        'oxygen-saturation',
        `oxygen_saturation.sample_time.physical_time >= "${toRfc3339(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))}"`,
        40,
      ),
      queryWithFallback(
        accessToken,
        'sleep',
        `sleep.interval.civil_end_time >= "${yday}"`,
        7,
      ),
    ]);

  if (hrResult.error) warnings.push(hrResult.error);
  if (!hrResult.points.length) warnings.push('No heart-rate samples in the last 24 hours from Google Health.');
  if (restingResult.error) warnings.push(restingResult.error);
  if (stepPack.warning) warnings.push(stepPack.warning);
  if (spo2Daily.error) warnings.push(spo2Daily.error);
  if (sleepResult.error) warnings.push(sleepResult.error);

  const { spo2, spo2AsOf } = pickSpo2(spo2Daily.points, spo2Samples.points, dayCivil);
  const latest = pickLatestHr(hrResult.points, spo2);
  const restingHr =
    pickRestingBpm(restingResult.points) ?? pickLatestHr(restingResult.points, spo2).bpm;

  return {
    snapshot: {
      currentHr: latest.bpm,
      currentHrAt: latest.at,
      restingHr,
      steps: stepPack.steps,
      calories: null,
      spo2,
      spo2AsOf,
      sleepMinutes: pickSleepMinutes(sleepResult.points),
    },
    meta: {
      warnings,
      hrCount: hrResult.points.length,
      stepSource: stepPack.source,
      stepDebug: stepPack.debug,
    },
  };
}
