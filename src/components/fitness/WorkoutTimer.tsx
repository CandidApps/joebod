'use client';

import { useEffect, useState } from 'react';
import type { WorkoutSession } from '@/lib/types';
import { formatDuration } from '@/lib/storage';
import { upsertSession } from '@/lib/fitness-store';

type Props = {
  session: WorkoutSession;
  onChange: (session: WorkoutSession) => void;
};

export function WorkoutTimer({ session, onChange }: Props) {
  const [tick, setTick] = useState(0);
  const running = Boolean(session.startedAt) && !session.endedAt;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const elapsed = (() => {
    if (!session.startedAt) return session.durationSec;
    const start = new Date(session.startedAt).getTime();
    const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
    void tick;
    return Math.floor((end - start) / 1000) + (session.endedAt ? 0 : 0);
  })();

  const persist = (next: WorkoutSession) => {
    upsertSession(next);
    onChange(next);
  };

  return (
    <div className="timer-card glass">
      <div className="timer-card-head">
        <span className="timer-card-title">Workout Timer</span>
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
          {session.endedAt ? 'Finished' : session.startedAt ? 'In progress' : 'Not started'}
        </span>
      </div>
      <div className="timer-display">{formatDuration(elapsed)}</div>
      <div className="timer-actions">
        {!session.startedAt ? (
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() =>
              persist({
                ...session,
                startedAt: new Date().toISOString(),
                endedAt: null,
              })
            }
          >
            Start Workout
          </button>
        ) : null}
        {session.startedAt && !session.endedAt ? (
          <button
            type="button"
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={() =>
              persist({
                ...session,
                endedAt: new Date().toISOString(),
                durationSec: elapsed,
              })
            }
          >
            End Workout
          </button>
        ) : null}
        {session.endedAt ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={() =>
              persist({
                ...session,
                startedAt: new Date().toISOString(),
                endedAt: null,
                durationSec: 0,
              })
            }
          >
            Start Another
          </button>
        ) : null}
      </div>
    </div>
  );
}
