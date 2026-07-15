import type { DayType, ExerciseLog, WorkoutSession, WorkoutSet } from '@/lib/types';
import { newId, readJson, todayKey, writeJson } from '@/lib/storage';

const SESSIONS_KEY = 'eclipse-workout-sessions-v1';
const REST_DEFAULT_KEY = 'eclipse-rest-default-v1';

/** Exercise lists match Eclipse index.html Log tabs. */
export const TEMPLATES: Record<Exclude<DayType, 'rest'>, string[]> = {
  push: [
    'Machine Chest Press',
    'Incline Dumbbell Press',
    'Overhead Press',
    'Cable Fly',
    'Tricep Pushdown',
    'Lateral Raise',
  ],
  pull: [
    'Lat Pulldown',
    'Seated Cable Row',
    'Assisted Pull-Up',
    'Face Pull',
    'Dumbbell Bicep Curl',
    'Hammer Curl',
  ],
  legs: [
    'Leg Press',
    'Leg Extension',
    'Seated Leg Curl',
    'Hip Thrust Machine',
    'Standing Calf Raise',
    'Cable Glute Kickback',
  ],
  zone2: ['Zone 2 Walk / Bike'],
};

export const LOG_TABS: Exclude<DayType, 'rest' | 'zone2'>[] = ['push', 'pull', 'legs'];

export function dayTypeForDate(date = new Date()): DayType {
  const day = date.getDay(); // 0 Sun
  if (day === 1 || day === 3 || day === 5) return 'push';
  if (day === 2 || day === 4) return 'pull';
  if (day === 6) return 'legs';
  return 'zone2';
}

export function labelForDayType(t: DayType): string {
  switch (t) {
    case 'push':
      return 'Push Day';
    case 'pull':
      return 'Pull Day';
    case 'legs':
      return 'Legs Day';
    case 'zone2':
      return 'Zone 2';
    default:
      return 'Rest';
  }
}

export function emptySet(): WorkoutSet {
  return {
    id: newId(),
    reps: 0,
    weight: 0,
    completed: false,
    type: 'working',
    rpe: null,
    singleArm: false,
  };
}

function emptyExercises(dayType: DayType): ExerciseLog[] {
  if (dayType === 'rest') return [];
  return TEMPLATES[dayType].map((name) => ({
    id: newId(),
    name,
    notes: '',
    sets: [emptySet(), emptySet(), emptySet()],
  }));
}

export function listSessions(): WorkoutSession[] {
  const raw = readJson<unknown>(SESSIONS_KEY, []);
  const sessions = Array.isArray(raw) ? (raw as WorkoutSession[]) : [];
  return [...sessions].sort((a, b) => String(b?.date ?? '').localeCompare(String(a?.date ?? '')));
}

export function saveSessions(sessions: WorkoutSession[]): void {
  writeJson(SESSIONS_KEY, sessions);
}

export function getOrCreateTodaySession(): WorkoutSession {
  return getOrCreateSessionForDayType(dayTypeForDate());
}

export function getOrCreateSessionForDayType(dayType: DayType): WorkoutSession {
  const date = todayKey();
  const sessions = listSessions();
  const existing = sessions.find(
    (s) => s?.date === date && s?.dayType === dayType && s?.id && Array.isArray(s.exercises),
  );
  if (existing) {
    // Ensure template exercises exist if list was empty / migrated
    if (existing.exercises.length === 0 && dayType !== 'rest') {
      const patched = { ...existing, exercises: emptyExercises(dayType) };
      upsertSession(patched);
      return patched;
    }
    return existing;
  }
  const created: WorkoutSession = {
    id: newId(),
    date,
    dayType,
    startedAt: null,
    endedAt: null,
    durationSec: 0,
    exercises: emptyExercises(dayType),
  };
  try {
    saveSessions([created, ...sessions]);
  } catch {
    // ignore persist failure
  }
  return created;
}

export function upsertSession(session: WorkoutSession): void {
  const sessions = listSessions().filter((s) => s.id !== session.id);
  saveSessions([session, ...sessions]);
}

export function deleteSession(sessionId: string): void {
  saveSessions(listSessions().filter((s) => s.id !== sessionId));
}

/** Prior completed sessions for this exercise name (newest first). */
export function recentExerciseSessions(
  exerciseName: string,
  dayType: DayType,
  limit = 5,
): { date: string; sets: WorkoutSet[]; notes?: string }[] {
  const out: { date: string; sets: WorkoutSet[]; notes?: string }[] = [];
  for (const s of listSessions()) {
    if (s.dayType !== dayType) continue;
    const ex = s.exercises.find((e) => e.name === exerciseName);
    if (!ex) continue;
    const done = ex.sets.filter((x) => x.completed && x.weight > 0 && x.reps > 0);
    if (done.length === 0) continue;
    out.push({ date: s.date, sets: done, notes: ex.notes });
    if (out.length >= limit) break;
  }
  return out;
}

export function getDefaultRestSec(): number {
  return readJson(REST_DEFAULT_KEY, 90);
}

export function setDefaultRestSec(sec: number): void {
  writeJson(REST_DEFAULT_KEY, sec);
}

export function computeStreak(sessions: WorkoutSession[]): number {
  const done = new Set(
    sessions
      .filter(
        (s) =>
          s.endedAt ||
          s.durationSec > 0 ||
          s.exercises.some((e) => e.sets.some((x) => x.completed || (x.weight > 0 && x.reps > 0))),
      )
      .map((s) => s.date),
  );
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = todayKey(d);
    if (!done.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function countSessionsInRange(sessions: WorkoutSession[], start: Date, end: Date): number {
  const a = todayKey(start);
  const b = todayKey(end);
  return sessions.filter((s) => {
    const active =
      s.endedAt ||
      s.durationSec > 0 ||
      s.exercises.some((e) => e.sets.some((x) => x.completed || (x.weight > 0 && x.reps > 0)));
    return active && s.date >= a && s.date <= b;
  }).length;
}
