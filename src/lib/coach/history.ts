import { readJson, writeJson } from '@/lib/storage';
import type { CoachWorkoutDraft } from '@/lib/coach/generate';

const RECENT_KEY = 'eclipse-coach-recent-v1';

export type SavedCoachWorkout = CoachWorkoutDraft & {
  id: string;
  savedAt: string;
};

export function listRecentCoachWorkouts(): SavedCoachWorkout[] {
  const raw = readJson<unknown>(RECENT_KEY, []);
  return Array.isArray(raw) ? (raw as SavedCoachWorkout[]) : [];
}

export function saveCoachWorkout(draft: CoachWorkoutDraft): SavedCoachWorkout {
  const item: SavedCoachWorkout = {
    ...draft,
    id: `coach-${Date.now()}`,
    savedAt: new Date().toISOString(),
  };
  const next = [item, ...listRecentCoachWorkouts().filter((w) => w.title !== draft.title)].slice(
    0,
    12,
  );
  writeJson(RECENT_KEY, next);
  return item;
}

export function recentTrainingSummary(
  sessions: { date: string; dayType: string; title?: string; exercises: { name: string }[] }[],
): string {
  return sessions
    .slice(0, 5)
    .map((s) => {
      const names = s.exercises
        .map((e) => e.name)
        .slice(0, 6)
        .join(', ');
      return `${s.date} · ${s.title ?? s.dayType}: ${names || '—'}`;
    })
    .join('\n');
}
