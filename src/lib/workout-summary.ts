import {
  isSessionLogged,
  labelForDayType,
  listSessions,
  sessionVolumeLb,
} from '@/lib/fitness-store';
import type { WorkoutSession, WorkoutSet } from '@/lib/types';

function workingSets(sets: WorkoutSet[]): WorkoutSet[] {
  return sets.filter(
    (s) =>
      (s.completed || (s.weight > 0 && s.reps > 0)) && (s.type ?? 'working') !== 'warmup',
  );
}

function setVolume(s: WorkoutSet): number {
  return s.weight * s.reps * (s.singleArm ? 2 : 1);
}

function est1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

function sessionBest1RM(sets: WorkoutSet[]): number {
  return workingSets(sets).reduce((best, s) => Math.max(best, est1RM(s.weight, s.reps)), 0);
}

function sessionTopWeight(sets: WorkoutSet[]): number {
  const w = workingSets(sets);
  return w.length ? Math.max(...w.map((s) => s.weight)) : 0;
}

export type SummaryExercise = {
  name: string;
  volume: number;
  reps: number;
  topWeight: number;
  est1RM: number;
  volumeDelta: number | null;
  repsDelta: number | null;
  est1RMDelta: number | null;
  weightPR: boolean;
  volumePR: boolean;
  est1RMPR: boolean;
  nextHint: string;
};

export type SummaryGroup = {
  dayType: string;
  label: string;
  volume: number;
  workingSets: number;
  prevDate: string | null;
  prevVolume: number | null;
  volumeDelta: number | null;
  exercises: SummaryExercise[];
};

export type WorkoutSummary = {
  date: string;
  groups: SummaryGroup[];
  totalVolume: number;
  totalWorkingSets: number;
  prCount: number;
  durationSec: number;
};

function priorSession(
  dayType: string,
  beforeDate: string,
  sessions: WorkoutSession[],
): WorkoutSession | null {
  return (
    sessions.find(
      (s) => s.dayType === dayType && s.date < beforeDate && isSessionLogged(s),
    ) ?? null
  );
}

function exerciseFromPrior(
  prior: WorkoutSession | null,
  name: string,
): { volume: number; reps: number; topWeight: number; est1RM: number } | null {
  if (!prior) return null;
  const ex = prior.exercises.find((e) => e.name === name);
  if (!ex) return null;
  const sets = workingSets(ex.sets);
  if (!sets.length) return null;
  return {
    volume: sets.reduce((n, s) => n + setVolume(s), 0),
    reps: sets.reduce((n, s) => n + s.reps, 0),
    topWeight: sessionTopWeight(ex.sets),
    est1RM: sessionBest1RM(ex.sets),
  };
}

function isPR(
  metric: 'weight' | 'volume' | 'est1RM',
  dayType: string,
  name: string,
  date: string,
  value: number,
  sessions: WorkoutSession[],
): boolean {
  if (value <= 0) return false;
  for (const s of sessions) {
    if (s.dayType !== dayType || s.date >= date || !isSessionLogged(s)) continue;
    const ex = s.exercises.find((e) => e.name === name);
    if (!ex) continue;
    const sets = workingSets(ex.sets);
    if (!sets.length) continue;
    let prior = 0;
    if (metric === 'weight') prior = sessionTopWeight(ex.sets);
    else if (metric === 'volume') prior = sets.reduce((n, x) => n + setVolume(x), 0);
    else prior = sessionBest1RM(ex.sets);
    if (prior >= value) return false;
  }
  return true;
}

function nextHint(
  curr: { topWeight: number; reps: number; volume: number },
  prior: { topWeight: number; reps: number; volume: number } | null,
  unit: string,
): string {
  if (!prior) return 'Log a solid baseline — next session, nudge weight or reps.';
  if (curr.volume > prior.volume) {
    return `Keep the wave. Try ${Math.round(curr.topWeight + 2.5)} ${unit} or +1–2 reps.`;
  }
  if (curr.topWeight >= prior.topWeight) {
    return `Hold ${curr.topWeight} ${unit} and chase +1–2 reps.`;
  }
  return `Match last session’s ${prior.topWeight} ${unit}, then add a little.`;
}

export function computeWorkoutSummary(dateIso: string, unit = 'lb'): WorkoutSummary {
  const sessions = listSessions();
  const daySessions = sessions.filter((s) => s.date === dateIso && isSessionLogged(s));
  const groups: SummaryGroup[] = [];
  let totalVolume = 0;
  let totalWorkingSets = 0;
  let prCount = 0;
  let durationSec = 0;

  for (const session of daySessions) {
    durationSec += session.durationSec || 0;
    const prior = priorSession(session.dayType, dateIso, sessions);
    const prevVolume = prior ? sessionVolumeLb(prior) : null;
    const volume = sessionVolumeLb(session);
    const ws = session.exercises.reduce((n, ex) => n + workingSets(ex.sets).length, 0);
    const exercises: SummaryExercise[] = [];

    for (const ex of session.exercises) {
      const sets = workingSets(ex.sets);
      if (!sets.length) continue;
      const volumeEx = sets.reduce((n, s) => n + setVolume(s), 0);
      const reps = sets.reduce((n, s) => n + s.reps, 0);
      const topWeight = sessionTopWeight(ex.sets);
      const e1 = sessionBest1RM(ex.sets);
      const prev = exerciseFromPrior(prior, ex.name);
      const weightPR = isPR('weight', session.dayType, ex.name, dateIso, topWeight, sessions);
      const volumePR = isPR('volume', session.dayType, ex.name, dateIso, volumeEx, sessions);
      const est1RMPR = isPR('est1RM', session.dayType, ex.name, dateIso, e1, sessions);
      if (weightPR || volumePR || est1RMPR) prCount += 1;
      exercises.push({
        name: ex.name,
        volume: volumeEx,
        reps,
        topWeight,
        est1RM: e1,
        volumeDelta: prev ? volumeEx - prev.volume : null,
        repsDelta: prev ? reps - prev.reps : null,
        est1RMDelta: prev ? e1 - prev.est1RM : null,
        weightPR,
        volumePR,
        est1RMPR,
        nextHint: nextHint(
          { topWeight, reps, volume: volumeEx },
          prev,
          unit,
        ),
      });
    }

    if (!exercises.length && volume === 0) continue;

    groups.push({
      dayType: session.dayType,
      label: labelForDayType(session.dayType),
      volume,
      workingSets: ws,
      prevDate: prior?.date ?? null,
      prevVolume,
      volumeDelta: prevVolume != null ? volume - prevVolume : null,
      exercises,
    });
    totalVolume += volume;
    totalWorkingSets += ws;
  }

  return {
    date: dateIso,
    groups,
    totalVolume,
    totalWorkingSets,
    prCount,
    durationSec,
  };
}
