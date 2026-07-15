'use client';

import { useState } from 'react';
import { emptySet, labelForDayType, upsertSession } from '@/lib/fitness-store';
import type { SetType, WorkoutSession, WorkoutSet } from '@/lib/types';

const SET_TYPES: { id: SetType; label: string }[] = [
  { id: 'working', label: 'Working' },
  { id: 'warmup', label: 'Warm-up' },
  { id: 'drop', label: 'Drop set' },
  { id: 'failure', label: 'To Failure' },
  { id: 'backoff', label: 'Back Off' },
];

type Props = {
  session: WorkoutSession;
  onClose: () => void;
  onSaved: (session: WorkoutSession) => void;
};

export function SessionEditSheet({ session, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<WorkoutSession>(() => structuredClone(session));
  const [saved, setSaved] = useState(false);

  const updateSet = (exId: string, setId: string, patch: Partial<WorkoutSet>) => {
    setDraft((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id !== exId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            },
      ),
    }));
  };

  const save = () => {
    const next: WorkoutSession = {
      ...draft,
      endedAt: draft.endedAt ?? new Date().toISOString(),
      exercises: draft.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({
          ...s,
          completed: s.weight > 0 && s.reps > 0 ? true : s.completed,
        })),
      })),
    };
    upsertSession(next);
    setSaved(true);
    onSaved(next);
    window.setTimeout(onClose, 500);
  };

  return (
    <div className="session-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="session-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Edit session"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="session-sheet-head">
          <div>
            <div className="view-brand">Edit</div>
            <div className="view-sub">
              {labelForDayType(draft.dayType)} · {draft.date}
            </div>
          </div>
          <button type="button" className="session-sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="session-sheet-date card glass">
          <span>Date</span>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
          />
        </label>

        <div className="session-sheet-body">
          {draft.exercises.map((ex) => (
            <div key={ex.id} className="card glass session-sheet-ex">
              <div className="ex-name">{ex.name}</div>
              <div
                className="set-head"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '26px 1fr 1fr 28px',
                  gap: 8,
                  marginTop: 12,
                  marginBottom: 8,
                }}
              >
                <span className="set-num">#</span>
                <span className="set-num" style={{ textAlign: 'center' }}>
                  Weight (lb)
                </span>
                <span className="set-num" style={{ textAlign: 'center' }}>
                  Reps
                </span>
                <span />
              </div>
              {ex.sets.map((set, idx) => (
                <div key={set.id} className="set-row-wrap">
                  <div className="set-row">
                    <div className="set-num">{idx + 1}</div>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="lb"
                      value={set.weight || ''}
                      onChange={(e) =>
                        updateSet(ex.id, set.id, { weight: Number(e.target.value) || 0 })
                      }
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="reps"
                      value={set.reps || ''}
                      onChange={(e) =>
                        updateSet(ex.id, set.id, { reps: Number(e.target.value) || 0 })
                      }
                    />
                    <button
                      type="button"
                      className="rm"
                      aria-label="Remove set"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          exercises: prev.exercises.map((e) =>
                            e.id !== ex.id
                              ? e
                              : {
                                  ...e,
                                  sets:
                                    e.sets.length <= 1
                                      ? e.sets
                                      : e.sets.filter((s) => s.id !== set.id),
                                },
                          ),
                        }))
                      }
                    >
                      ×
                    </button>
                  </div>
                  <div className="set-row-extra">
                    <div />
                    <select
                      className="set-type-select"
                      value={set.type ?? 'working'}
                      onChange={(e) =>
                        updateSet(ex.id, set.id, { type: e.target.value as SetType })
                      }
                    >
                      {SET_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="set-rpe-input"
                      placeholder="RPE"
                      min={1}
                      max={10}
                      value={set.rpe ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateSet(ex.id, set.id, {
                          rpe: raw === '' ? null : Math.min(10, Math.max(1, Number(raw) || 0)),
                        });
                      }}
                    />
                    <div />
                  </div>
                </div>
              ))}
              <div className="notes-row">
                <input
                  className="notes-input"
                  placeholder="Notes (optional)"
                  value={ex.notes ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      exercises: prev.exercises.map((x) =>
                        x.id === ex.id ? { ...x, notes: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </div>
              <button
                type="button"
                className="btn btn-add"
                style={{ width: '100%' }}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    exercises: prev.exercises.map((e) =>
                      e.id !== ex.id ? e : { ...e, sets: [...e.sets, emptySet()] },
                    ),
                  }))
                }
              >
                + Add Set
              </button>
            </div>
          ))}
        </div>

        <div className="session-sheet-actions">
          <button type="button" className="btn btn-add" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`btn btn-save${saved ? ' saved' : ''}`} onClick={save}>
            {saved ? 'Saved' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
