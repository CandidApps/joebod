import type { DayType, ExerciseLog, WorkoutSession } from '@/lib/types';
import { newId, readJson, todayKey, writeJson } from '@/lib/storage';

const SESSIONS_KEY = 'eclipse-workout-sessions-v1';
const REST_DEFAULT_KEY = 'eclipse-rest-default-v1';

const TEMPLATES: Record<Exclude<DayType, 'rest'>, string[]> = {
  push: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Tricep Pushdown', 'Lateral Raise'],
  pull: ['Deadlift', 'Barbell Row', 'Lat Pulldown', 'Face Pull', 'Dumbbell Curl'],
  legs: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Walking Lunge', 'Calf Raise'],
  zone2: ['Zone 2 Walk / Bike'],
};

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

function emptyExercises(dayType: DayType): ExerciseLog[] {
  if (dayType === 'rest') return [];
  return TEMPLATES[dayType].map((name) => ({
    id: newId(),
    name,
    sets: [
      { id: newId(), reps: 0, weight: 0, completed: false },
      { id: newId(), reps: 0, weight: 0, completed: false },
      { id: newId(), reps: 0, weight: 0, completed: false },
    ],
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
  const date = todayKey();
  const sessions = listSessions();
  const existing = sessions.find((s) => s?.date === date && s?.id && Array.isArray(s.exercises));
  if (existing) return existing;
  const dayType = dayTypeForDate();
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

export function getDefaultRestSec(): number {
  return readJson(REST_DEFAULT_KEY, 90);
}

export function setDefaultRestSec(sec: number): void {
  writeJson(REST_DEFAULT_KEY, sec);
}

export function computeStreak(sessions: WorkoutSession[]): number {
  const done = new Set(
    sessions.filter((s) => s.endedAt || s.durationSec > 0 || s.exercises.some((e) => e.sets.some((x) => x.completed))).map((s) => s.date),
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
    const active = s.endedAt || s.durationSec > 0 || s.exercises.some((e) => e.sets.some((x) => x.completed));
    return active && s.date >= a && s.date <= b;
  }).length;
}
