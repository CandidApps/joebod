import type { DayType, ExerciseLog, WorkoutSession, WorkoutSet } from '@/lib/types';
import { newId, readJson, todayKey, writeJson } from '@/lib/storage';
import {
  dayTypeLabel,
  getActiveDayTypeKeys,
  getDayExercises,
  plannedTypesForDate,
} from '@/lib/training-split';

const SESSIONS_KEY = 'eclipse-workout-sessions-v1';
const REST_DEFAULT_KEY = 'eclipse-rest-default-v1';

/** @deprecated Prefer getDayExercises from training-split. */
export const TEMPLATES: Record<string, string[]> = {
  push: [],
  pull: [],
  legs: [],
  zone2: ['Zone 2 Walk / Bike'],
};

/** Dynamic log tabs from active split + schedule. */
export function getLogTabs(): string[] {
  return getActiveDayTypeKeys();
}

/** @deprecated use getLogTabs() */
export const LOG_TABS = ['push', 'pull', 'legs'] as const;

export function dayTypeForDate(date = new Date()): DayType {
  const planned = plannedTypesForDate(date).filter((t) => t !== 'rest');
  if (planned.length) return planned[0];
  const tabs = getActiveDayTypeKeys();
  return tabs[0] || 'push';
}

export function labelForDayType(t: DayType): string {
  return dayTypeLabel(t);
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
  if (dayType === 'rest' || dayType === 'custom') return [];
  const names = getDayExercises(dayType);
  return names.map((name) => ({
    id: newId(),
    name,
    notes: '',
    sets: [emptySet(), emptySet(), emptySet()],
  }));
}

/** Prefill sets from the most recent logged session for each exercise when available. */
function exercisesWithLastPrefill(dayType: DayType): ExerciseLog[] {
  const base = emptyExercises(dayType);
  if (!base.length) return base;
  const sessions = listSessions().filter(
    (s) => s.dayType === dayType && isSessionLogged(s) && s.date !== todayKey(),
  );
  if (!sessions.length) return base;
  const last = sessions[0];
  return base.map((ex) => {
    const prev = last.exercises.find((e) => e.name === ex.name);
    if (!prev) return ex;
    const done = prev.sets.filter((s) => s.weight > 0 || s.reps > 0);
    if (!done.length) return ex;
    return {
      ...ex,
      sets: done.map((s) => ({
        ...emptySet(),
        reps: s.reps,
        weight: s.weight,
        type: s.type ?? 'working',
        rpe: null,
        singleArm: Boolean(s.singleArm),
        completed: false,
      })),
    };
  });
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
    if (existing.exercises.length === 0 && dayType !== 'rest' && dayType !== 'custom') {
      const patched = { ...existing, exercises: exercisesWithLastPrefill(dayType) };
      upsertSession(patched);
      return patched;
    }
    return existing;
  }
  const created: WorkoutSession = {
    id: newId(),
    date,
    dayType,
    source: 'template',
    startedAt: null,
    endedAt: null,
    durationSec: 0,
    exercises: exercisesWithLastPrefill(dayType),
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

export function renameExerciseInSessions(dayType: DayType, oldName: string, newName: string): void {
  const sessions = listSessions().map((s) => {
    if (s.dayType !== dayType) return s;
    return {
      ...s,
      exercises: s.exercises.map((ex) => (ex.name === oldName ? { ...ex, name: newName } : ex)),
    };
  });
  saveSessions(sessions);
}

/** Create a new AI/Coach session for today without touching template day sessions. */
export function createSessionFromAiWorkout(input: {
  title: string;
  dayType: DayType;
  notes?: string;
  exercises: { name: string; notes: string; sets: { reps: number; weight: number }[] }[];
}): WorkoutSession {
  const date = todayKey();
  const dayType: DayType = input.dayType === 'rest' ? 'custom' : input.dayType;
  const created: WorkoutSession = {
    id: newId(),
    date,
    dayType,
    source: 'ai',
    title: input.title.trim() || 'Coach workout',
    coachNotes: input.notes?.trim() || '',
    startedAt: null,
    endedAt: null,
    durationSec: 0,
    exercises: input.exercises.map((ex) => ({
      id: newId(),
      name: ex.name,
      notes: ex.notes ?? '',
      sets: (ex.sets.length ? ex.sets : [{ reps: 10, weight: 0 }]).map((s) => ({
        id: newId(),
        reps: s.reps,
        weight: s.weight,
        completed: false,
        type: 'working' as const,
        rpe: null,
        singleArm: false,
      })),
    })),
  };
  upsertSession(created);
  return created;
}

export function deleteSession(sessionId: string): void {
  saveSessions(listSessions().filter((s) => s.id !== sessionId));
}

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

export function sessionVolumeLb(session: WorkoutSession): number {
  let total = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (!s.completed && !(s.weight > 0 && s.reps > 0)) continue;
      if ((s.type ?? 'working') === 'warmup') continue;
      const mult = s.singleArm ? 2 : 1;
      total += s.weight * s.reps * mult;
    }
  }
  return Math.round(total);
}

export function isSessionLogged(session: WorkoutSession): boolean {
  return Boolean(
    session.endedAt ||
      session.durationSec > 0 ||
      session.exercises.some((e) => e.sets.some((x) => x.completed || (x.weight > 0 && x.reps > 0))),
  );
}

export function volumeByDayTypeLastDays(
  sessions: WorkoutSession[],
  days = 30,
): Record<string, number> {
  const out: Record<string, number> = {};
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cut = todayKey(cutoff);
  for (const s of sessions) {
    if (!isSessionLogged(s) || s.date < cut) continue;
    out[s.dayType] = (out[s.dayType] || 0) + sessionVolumeLb(s);
  }
  return out;
}
