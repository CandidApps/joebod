'use client';

import { useEffect, useState } from 'react';
import type { WorkoutSession } from '@/lib/types';
import { upsertSession } from '@/lib/fitness-store';
import { readJson, writeJson } from '@/lib/storage';

type TimerPersist = {
  status: 'idle' | 'running' | 'paused' | 'ended';
  segmentStart: number | null;
  accumulatedMs: number;
  startedAtIso: string | null;
  endedAtIso: string | null;
};

const TIMER_KEY = 'eclipse-workout-timer-v1';
const WARN_MS = 90 * 60 * 1000;

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function fmtClock(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const idleState = (): TimerPersist => ({
  status: 'idle',
  segmentStart: null,
  accumulatedMs: 0,
  startedAtIso: null,
  endedAtIso: null,
});

type Props = {
  session: WorkoutSession;
  onChange: (session: WorkoutSession) => void;
};

export function WorkoutTimer({ session, onChange }: Props) {
  const [state, setState] = useState<TimerPersist>(idleState);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setState(readJson(TIMER_KEY, idleState()));
  }, []);

  useEffect(() => {
    if (state.status !== 'running') return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  const persist = (next: TimerPersist) => {
    setState(next);
    writeJson(TIMER_KEY, next);
  };

  void tick;
  let elapsedMs = state.accumulatedMs;
  if (state.status === 'running' && state.segmentStart) {
    elapsedMs += Date.now() - state.segmentStart;
  }

  const syncSession = (patch: Partial<WorkoutSession>) => {
    const next = { ...session, ...patch };
    upsertSession(next);
    onChange(next);
  };

  const start = () => {
    const now = new Date().toISOString();
    persist({
      status: 'running',
      segmentStart: Date.now(),
      accumulatedMs: 0,
      startedAtIso: now,
      endedAtIso: null,
    });
    syncSession({ startedAt: now, endedAt: null, durationSec: 0 });
  };

  const pause = () => {
    const acc = state.accumulatedMs + (state.segmentStart ? Date.now() - state.segmentStart : 0);
    persist({ ...state, status: 'paused', segmentStart: null, accumulatedMs: acc });
  };

  const resume = () => {
    persist({ ...state, status: 'running', segmentStart: Date.now() });
  };

  const stop = () => {
    const acc = state.accumulatedMs + (state.segmentStart ? Date.now() - state.segmentStart : 0);
    const endIso = new Date().toISOString();
    persist({
      status: 'ended',
      segmentStart: null,
      accumulatedMs: acc,
      startedAtIso: state.startedAtIso,
      endedAtIso: endIso,
    });
    syncSession({
      endedAt: endIso,
      durationSec: Math.floor(acc / 1000),
      startedAt: state.startedAtIso ?? session.startedAt,
    });
  };

  const sub =
    state.status === 'idle'
      ? 'Not started'
      : state.status === 'running'
        ? 'In progress'
        : state.status === 'paused'
          ? 'Paused'
          : 'Finished';

  let meta = '';
  if (state.startedAtIso && !state.endedAtIso) {
    meta = `Started ${fmtClock(state.startedAtIso)}`;
  } else if (state.startedAtIso && state.endedAtIso) {
    meta = `${fmtClock(state.startedAtIso)} – ${fmtClock(state.endedAtIso)}`;
  }

  return (
    <div className="timer-card glass" id="workoutTimerCard">
      <div className="timer-card-head">
        <span className="timer-card-title">Workout Timer</span>
        <span className="timer-card-sub">{sub}</span>
      </div>
      <div className={`workout-timer-display${state.status === 'running' ? ' running' : ''}`}>
        {fmtElapsed(elapsedMs)}
      </div>
      <div className="workout-timer-meta">{meta}</div>
      <div className="workout-timer-actions">
        {state.status === 'idle' || state.status === 'ended' ? (
          <button type="button" className="btn btn-save" onClick={start}>
            {state.status === 'ended' ? 'Start Another' : 'Start Workout'}
          </button>
        ) : null}
        {state.status === 'running' ? (
          <>
            <button type="button" className="btn btn-add" onClick={pause}>
              Pause
            </button>
            <button type="button" className="btn btn-danger" onClick={stop}>
              End Workout
            </button>
          </>
        ) : null}
        {state.status === 'paused' ? (
          <>
            <button type="button" className="btn btn-save" onClick={resume}>
              Resume
            </button>
            <button type="button" className="btn btn-danger" onClick={stop}>
              End Workout
            </button>
          </>
        ) : null}
      </div>
      {elapsedMs >= WARN_MS ? (
        <div className="timer-warn">Workout past 90 minutes — consider wrapping up.</div>
      ) : null}
    </div>
  );
}
