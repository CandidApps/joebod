'use client';

import type { WorkoutSession } from '@/lib/types';
import { newId } from '@/lib/storage';
import { upsertSession } from '@/lib/fitness-store';
import { RestTimer } from '@/components/fitness/RestTimer';

type Props = {
  session: WorkoutSession;
  onChange: (session: WorkoutSession) => void;
};

export function WorkoutLog({ session, onChange }: Props) {
  const persist = (next: WorkoutSession) => {
    upsertSession(next);
    onChange(next);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="view-brand">Log</div>
          <div className="view-sub">Track sets, beat last time</div>
        </div>
      </div>

      <RestTimer />

      {session.exercises.length === 0 ? (
        <p className="empty">Rest / recovery day — no lifts scheduled. Start Zone 2 from Dashboard if you want.</p>
      ) : (
        session.exercises.map((ex) => (
          <div key={ex.id} className="exercise-card glass">
            <div className="exercise-name">{ex.name}</div>
            {ex.sets.map((set, idx) => (
              <div key={set.id} className="set-row">
                <div className="set-idx">#{idx + 1}</div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="lbs"
                  value={set.weight || ''}
                  onChange={(e) => {
                    const weight = Number(e.target.value) || 0;
                    persist({
                      ...session,
                      exercises: session.exercises.map((item) =>
                        item.id !== ex.id
                          ? item
                          : {
                              ...item,
                              sets: item.sets.map((s) => (s.id === set.id ? { ...s, weight } : s)),
                            },
                      ),
                    });
                  }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={set.reps || ''}
                  onChange={(e) => {
                    const reps = Number(e.target.value) || 0;
                    persist({
                      ...session,
                      exercises: session.exercises.map((item) =>
                        item.id !== ex.id
                          ? item
                          : {
                              ...item,
                              sets: item.sets.map((s) => (s.id === set.id ? { ...s, reps } : s)),
                            },
                      ),
                    });
                  }}
                />
                <button
                  type="button"
                  className={set.completed ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ minHeight: 44, padding: '8px 10px', fontSize: 12 }}
                  onClick={() =>
                    persist({
                      ...session,
                      exercises: session.exercises.map((item) =>
                        item.id !== ex.id
                          ? item
                          : {
                              ...item,
                              sets: item.sets.map((s) =>
                                s.id === set.id ? { ...s, completed: !s.completed } : s,
                              ),
                            },
                      ),
                    })
                  }
                >
                  {set.completed ? 'Done' : 'Log'}
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 6 }}
              onClick={() =>
                persist({
                  ...session,
                  exercises: session.exercises.map((item) =>
                    item.id !== ex.id
                      ? item
                      : {
                          ...item,
                          sets: [...item.sets, { id: newId(), reps: 0, weight: 0, completed: false }],
                        },
                  ),
                })
              }
            >
              + Add set
            </button>
          </div>
        ))
      )}
    </div>
  );
}
