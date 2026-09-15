import { readJson, writeJson } from '@/lib/storage';

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DayTypeDef = {
  label: string;
  exercises: string[];
};

export type SplitId = 'ppl' | 'arnold' | 'upperlower' | 'fullbody';

export type SplitDef = {
  name: string;
  dayTypes: Record<string, DayTypeDef>;
  defaultWeek: Record<WeekdayKey, string[]>;
};

export const WEEKDAY_KEYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const SPLITS: Record<SplitId, SplitDef> = {
  ppl: {
    name: 'Push / Pull / Legs',
    dayTypes: {
      push: {
        label: 'Push',
        exercises: [
          'Machine Chest Press',
          'Incline Dumbbell Press',
          'Seated Dumbbell Shoulder Press',
          'Cable Lateral Raise',
          'Tricep Rope Pushdown',
          'Overhead Cable Tricep Extension',
        ],
      },
      pull: {
        label: 'Pull',
        exercises: [
          'Lat Pulldown',
          'Seated Cable Row',
          'Assisted Pull-Up',
          'Face Pull',
          'Dumbbell Bicep Curl',
          'Hammer Curl',
        ],
      },
      legs: {
        label: 'Legs',
        exercises: [
          'Leg Press',
          'Leg Extension',
          'Seated Leg Curl',
          'Hip Thrust Machine',
          'Standing Calf Raise',
          'Cable Glute Kickback',
        ],
      },
    },
    defaultWeek: {
      mon: ['push'],
      tue: ['pull'],
      wed: ['legs'],
      thu: ['push'],
      fri: ['pull'],
      sat: ['legs'],
      sun: [],
    },
  },
  arnold: {
    name: 'Arnold Split',
    dayTypes: {
      chestback: {
        label: 'Chest & Back',
        exercises: [
          'Flat Barbell Bench Press',
          'Weighted Pull-Up',
          'Incline Dumbbell Press',
          'Bent-Over Barbell Row',
          'Cable Crossover',
          'Lat Pulldown',
        ],
      },
      shoulderarms: {
        label: 'Shoulders & Arms',
        exercises: [
          'Seated Barbell Press',
          'Barbell Curl',
          'Lateral Raise',
          'Skull Crusher',
          'Cable Lateral Raise',
          'Rope Pushdown',
        ],
      },
      legs: {
        label: 'Legs',
        exercises: [
          'Back Squat',
          'Leg Press',
          'Romanian Deadlift',
          'Leg Extension',
          'Seated Leg Curl',
          'Standing Calf Raise',
        ],
      },
    },
    defaultWeek: {
      mon: ['chestback'],
      tue: ['shoulderarms'],
      wed: ['legs'],
      thu: ['chestback'],
      fri: ['shoulderarms'],
      sat: ['legs'],
      sun: [],
    },
  },
  upperlower: {
    name: 'Upper / Lower',
    dayTypes: {
      upper: {
        label: 'Upper',
        exercises: [
          'Barbell Bench Press',
          'Bent-Over Row',
          'Overhead Press',
          'Lat Pulldown',
          'Barbell Curl',
          'Tricep Pushdown',
        ],
      },
      lower: {
        label: 'Lower',
        exercises: [
          'Back Squat',
          'Romanian Deadlift',
          'Leg Press',
          'Leg Curl',
          'Standing Calf Raise',
          'Hip Thrust',
        ],
      },
    },
    defaultWeek: {
      mon: ['upper'],
      tue: ['lower'],
      wed: [],
      thu: ['upper'],
      fri: ['lower'],
      sat: [],
      sun: [],
    },
  },
  fullbody: {
    name: 'Full Body',
    dayTypes: {
      fullbody: {
        label: 'Full Body',
        exercises: [
          'Back Squat',
          'Barbell Bench Press',
          'Bent-Over Row',
          'Overhead Press',
          'Romanian Deadlift',
          'Lat Pulldown',
        ],
      },
    },
    defaultWeek: {
      mon: ['fullbody'],
      tue: [],
      wed: ['fullbody'],
      thu: [],
      fri: ['fullbody'],
      sat: [],
      sun: [],
    },
  },
};

export const ADDON_DAY_TYPES: Record<string, DayTypeDef> = {
  cardio: {
    label: 'Cardio',
    exercises: [
      'Treadmill Incline Walk',
      'Stationary Bike',
      'Rowing Machine',
      'Stair Climber',
      'Jump Rope',
      'Elliptical',
    ],
  },
  abs: {
    label: 'Abs',
    exercises: [
      'Cable Crunch',
      'Hanging Leg Raise',
      'Plank',
      'Weighted Sit-Up',
      'Ab Wheel Rollout',
      'Russian Twist',
    ],
  },
};

const SPLIT_KEY = 'eclipse-split-id-v1';
const WEEK_KEY_PREFIX = 'eclipse-week-assignment-v1:';
const EX_KEY_PREFIX = 'eclipse-day-exercises-v1:';
const ONE_TIME_KEY = 'eclipse-one-time-overrides-v1';

export function allAvailableDayTypes(splitId: SplitId = getSplitId()): Record<string, DayTypeDef> {
  const split = SPLITS[splitId] ?? SPLITS.ppl;
  return { ...split.dayTypes, ...ADDON_DAY_TYPES };
}

export function findDayTypeDefaults(day: string): string[] {
  for (const split of Object.values(SPLITS)) {
    if (split.dayTypes[day]) return split.dayTypes[day].exercises.slice();
  }
  if (ADDON_DAY_TYPES[day]) return ADDON_DAY_TYPES[day].exercises.slice();
  return [];
}

export function getSplitId(): SplitId {
  const raw = readJson<string>(SPLIT_KEY, 'ppl');
  return raw in SPLITS ? (raw as SplitId) : 'ppl';
}

export function setSplitId(splitId: SplitId): void {
  writeJson(SPLIT_KEY, splitId);
  notifyTrainingChanged();
}

export function getWeekAssignment(splitId: SplitId = getSplitId()): Record<WeekdayKey, string[]> {
  const fallback = { ...SPLITS[splitId].defaultWeek };
  const saved = readJson<Record<WeekdayKey, string[]> | null>(WEEK_KEY_PREFIX + splitId, null);
  if (!saved) return fallback;
  const out = { ...fallback };
  for (const k of WEEKDAY_KEYS) {
    if (Array.isArray(saved[k])) out[k] = saved[k].filter((t) => t && t !== 'rest');
  }
  return out;
}

export function saveWeekAssignment(
  week: Record<WeekdayKey, string[]>,
  splitId: SplitId = getSplitId(),
): void {
  writeJson(WEEK_KEY_PREFIX + splitId, week);
  notifyTrainingChanged();
}

export function getOneTimeOverrides(): Record<string, string[]> {
  return readJson<Record<string, string[]>>(ONE_TIME_KEY, {});
}

export function weekdayKeyForDate(date = new Date()): WeekdayKey {
  return WEEKDAY_KEYS[(date.getDay() + 6) % 7];
}

export function plannedTypesForDate(date = new Date()): string[] {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const overrides = getOneTimeOverrides();
  if (overrides[iso]?.length) return overrides[iso].filter((t) => t !== 'rest');
  const week = getWeekAssignment();
  return (week[weekdayKeyForDate(date)] || []).filter((t) => t !== 'rest');
}

/** Log tabs / edit subtabs: scheduled types + always include current split's day-types. */
export function getActiveDayTypeKeys(splitId: SplitId = getSplitId()): string[] {
  const seen: string[] = [];
  const week = getWeekAssignment(splitId);
  for (const wd of WEEKDAY_KEYS) {
    for (const dt of week[wd] || []) {
      if (dt && dt !== 'rest' && !seen.includes(dt)) seen.push(dt);
    }
  }
  for (const types of Object.values(getOneTimeOverrides())) {
    for (const dt of types || []) {
      if (dt && dt !== 'rest' && !seen.includes(dt)) seen.push(dt);
    }
  }
  for (const dt of Object.keys(SPLITS[splitId].dayTypes)) {
    if (!seen.includes(dt)) seen.push(dt);
  }
  // Keep cardio/abs visible once they appear in schedule; also show if ever customized
  for (const addon of Object.keys(ADDON_DAY_TYPES)) {
    const custom = readJson<string[] | null>(EX_KEY_PREFIX + addon, null);
    if (custom && !seen.includes(addon)) {
      // only auto-add addons when scheduled — already handled above
    }
  }
  return seen;
}

export function dayTypeLabel(key: string, splitId: SplitId = getSplitId()): string {
  const all = allAvailableDayTypes(splitId);
  if (all[key]?.label) return all[key].label;
  if (key === 'zone2') return 'Zone 2';
  if (key === 'custom') return 'Coach';
  if (key === 'rest') return 'Rest';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function getDayExercises(day: string): string[] {
  const saved = readJson<string[] | null>(EX_KEY_PREFIX + day, null);
  if (saved && Array.isArray(saved) && saved.length >= 0) {
    // empty array is valid (user deleted all)
    if (saved.length > 0 || readJson<boolean>(EX_KEY_PREFIX + day + ':touched', false)) {
      return saved.slice();
    }
  }
  const defaults = findDayTypeDefaults(day);
  if (defaults.length) {
    writeJson(EX_KEY_PREFIX + day, defaults);
    return defaults.slice();
  }
  return [];
}

export function saveDayExercises(day: string, list: string[]): void {
  writeJson(EX_KEY_PREFIX + day, list);
  writeJson(EX_KEY_PREFIX + day + ':touched', true);
  notifyTrainingChanged();
}

/** Returns `{ oldName, newName }` when rename succeeds so callers can update session history. */
export function renameExercise(
  day: string,
  index: number,
  newName: string,
): { oldName: string; newName: string } | null {
  const name = newName.trim();
  if (!name) return null;
  const list = getDayExercises(day);
  const oldName = list[index];
  if (!oldName || name === oldName) return null;
  if (list.some((n, i) => i !== index && n.toLowerCase() === name.toLowerCase())) return null;
  list[index] = name;
  saveDayExercises(day, list);
  return { oldName, newName: name };
}

export function moveExercise(day: string, index: number, dir: -1 | 1): void {
  const list = getDayExercises(day);
  const j = index + dir;
  if (j < 0 || j >= list.length) return;
  const t = list[index];
  list[index] = list[j];
  list[j] = t;
  saveDayExercises(day, list);
}

export function removeExercise(day: string, index: number): void {
  const list = getDayExercises(day);
  list.splice(index, 1);
  saveDayExercises(day, list);
}

export function addExercise(day: string, name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const list = getDayExercises(day);
  if (list.some((n) => n.toLowerCase() === trimmed.toLowerCase())) return false;
  list.push(trimmed);
  saveDayExercises(day, list);
  return true;
}

/** Lightweight muscle tag for Edit Exercises UI (display only). */
export function inferMuscleTag(name: string): string {
  const n = name.toLowerCase();
  if (/chest|bench|fly|press(?!.*shoulder)|pec/.test(n) && !/leg|shoulder|overhead|military/.test(n))
    return 'Chest';
  if (/shoulder|lateral|overhead|military|delt/.test(n)) return 'Shoulders';
  if (/tricep|pushdown|skull|extension/.test(n)) return 'Triceps';
  if (/bicep|curl|hammer/.test(n) && !/leg/.test(n)) return 'Biceps';
  if (/lat|row|pull|face pull|rear/.test(n)) return 'Back';
  if (/leg|squat|lunge|curl|extension|calf|glute|hip|rdl|deadlift/.test(n)) return 'Legs';
  if (/crunch|plank|ab |abs|sit-up|sit up|twist|wheel/.test(n)) return 'Core';
  if (/treadmill|bike|row|stair|jump|elliptical|cardio|walk/.test(n)) return 'Cardio';
  return 'Other';
}

export function listAllExerciseConfigs(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const keys = new Set<string>();
  for (const split of Object.values(SPLITS)) {
    Object.keys(split.dayTypes).forEach((k) => keys.add(k));
  }
  Object.keys(ADDON_DAY_TYPES).forEach((k) => keys.add(k));
  getActiveDayTypeKeys().forEach((k) => keys.add(k));
  for (const k of keys) {
    out[k] = getDayExercises(k);
  }
  return out;
}

export function importExerciseConfigs(configs: Record<string, string[]>): void {
  for (const [day, list] of Object.entries(configs || {})) {
    if (Array.isArray(list)) {
      writeJson(EX_KEY_PREFIX + day, list);
      writeJson(EX_KEY_PREFIX + day + ':touched', true);
    }
  }
  notifyTrainingChanged();
}

export function exportWeekAssignments(): Record<string, Record<WeekdayKey, string[]>> {
  const out: Record<string, Record<WeekdayKey, string[]>> = {};
  for (const id of Object.keys(SPLITS) as SplitId[]) {
    out[WEEK_KEY_PREFIX + id] = getWeekAssignment(id);
  }
  return out;
}

function notifyTrainingChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('joebod-training-updated'));
  }
}
