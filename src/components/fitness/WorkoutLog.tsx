'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RestPill } from '@/components/fitness/RestPill';
import { WorkoutTimer } from '@/components/fitness/WorkoutTimer';
import {
  emptySet,
  getOrCreateSessionForDayType,
  LOG_TABS,
  recentExerciseSessions,
  upsertSession,
} from '@/lib/fitness-store';
import { startRestTimer } from '@/lib/rest-timer-store';
import type { DayType, SetType, WorkoutSession, WorkoutSet } from '@/lib/types';

const SET_TYPES: { id: SetType; label: string }[] = [
  { id: 'working', label: 'Working' },
  { id: 'warmup', label: 'Warm-up' },
  { id: 'drop', label: 'Drop set' },
  { id: 'failure', label: 'To Failure' },
  { id: 'backoff', label: 'Back Off' },
];

const TAB_STYLE: Record<(typeof LOG_TABS)[number], CSSProperties> = {
  push: {
    ['--tab-color' as string]: 'var(--push)',
    ['--tab-glow' as string]: 'var(--push-glow)',
    ['--tab-ink' as string]: '#1a1206',
  },
  pull: {
    ['--tab-color' as string]: 'var(--pull)',
    ['--tab-glow' as string]: 'var(--pull-glow)',
    ['--tab-ink' as string]: '#062020',
  },
  legs: {
    ['--tab-color' as string]: 'var(--legs)',
    ['--tab-glow' as string]: 'var(--legs-glow)',
    ['--tab-ink' as string]: '#160e2a',
  },
};

type Props = {
  session: WorkoutSession;
  onChange: (session: WorkoutSession) => void;
};

export function WorkoutLog({ session, onChange }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const dayType = (LOG_TABS.includes(session.dayType as (typeof LOG_TABS)[number])
    ? session.dayType
    : 'push') as (typeof LOG_TABS)[number];

  useEffect(() => {
    if (!LOG_TABS.includes(session.dayType as (typeof LOG_TABS)[number])) {
      onChange(getOrCreateSessionForDayType('push'));
    }
    // Intentionally depend on dayType only — parent setState identity may change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.dayType]);

  const persist = (next: WorkoutSession) => {
    upsertSession(next);
    onChange(next);
  };

  const switchTab = (tab: (typeof LOG_TABS)[number]) => {
    setOpenId(null);
    onChange(getOrCreateSessionForDayType(tab));
  };

  const updateExercise = (
    exId: string,
    updater: (sets: WorkoutSet[], notes: string) => { sets: WorkoutSet[]; notes: string },
  ) => {
    persist({
      ...session,
      exercises: session.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const { sets, notes } = updater(ex.sets, ex.notes ?? '');
        return { ...ex, sets, notes };
      }),
    });
  };

  const logToday = (exId: string) => {
    const next = {
      ...session,
      startedAt: session.startedAt ?? new Date().toISOString(),
      endedAt: new Date().toISOString(),
      exercises: session.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) =>
            s.weight > 0 && s.reps > 0 ? { ...s, completed: true } : s,
          ),
        };
      }),
    };
    const filled = next.exercises
      .find((e) => e.id === exId)
      ?.sets.filter((s) => s.completed).length;
    if (!filled) {
      setSavedFlash('empty');
      window.setTimeout(() => setSavedFlash(null), 1800);
      return;
    }
    persist(next);
    setSavedFlash(exId);
    window.setTimeout(() => setSavedFlash(null), 1600);
  };

  const stripPct = useMemo(() => {
    const i = LOG_TABS.indexOf(dayType);
    return ((i + 1) / LOG_TABS.length) * 100;
  }, [dayType]);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="view-brand">Log</div>
          <div className="view-sub">Track sets, beat last time</div>
        </div>
      </div>

      <WorkoutTimer session={session} onChange={onChange} />

      <div className="tabs" role="tablist" aria-label="Training day">
        {LOG_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={dayType === tab}
            className={`tab${dayType === tab ? ' active' : ''}`}
            style={dayType === tab ? TAB_STYLE[tab] : undefined}
            onClick={() => switchTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="day-strip">
        <div className="day-strip-fill" style={{ width: `${stripPct}%`, background: tabColor(dayType) }} />
      </div>

      {session.exercises.length === 0 ? (
        <p className="recent-empty">No exercises for this day.</p>
      ) : (
        session.exercises.map((ex) => {
          const isOpen = openId === ex.id;
          const history = recentExerciseSessions(ex.name, session.dayType, 5).filter(
            (h) => !(h.date === session.date && !session.endedAt),
          );
          const last = history[0];
          const lastLabel = last
            ? last.sets
                .filter((s) => (s.type ?? 'working') !== 'warmup')
                .map((s) => `${s.weight}×${s.reps}`)
                .slice(0, 3)
                .join('  ')
            : null;

          return (
            <div key={ex.id} className="card glass">
              <button
                type="button"
                className="card-head"
                onClick={() => setOpenId(isOpen ? null : ex.id)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  textAlign: 'left',
                  padding: 0,
                }}
              >
                <div>
                  <div className="ex-name">{ex.name}</div>
                  <div className="ex-last">
                    {lastLabel ? (
                      <>
                        Last: <b>{lastLabel}</b>
                      </>
                    ) : (
                      'No sessions logged yet'
                    )}
                  </div>
                </div>
                <div className={`chevron${isOpen ? ' open' : ''}`} aria-hidden>
                  ▾
                </div>
              </button>

              <div className={`body-panel${isOpen ? ' open' : ''}`}>
                {!last ? (
                  <div className="edit-note" style={{ marginBottom: 12 }}>
                    No sessions logged yet — your first set here sets the baseline.
                  </div>
                ) : null}

                <div
                  className="set-head"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '26px 1fr 1fr 28px',
                    gap: 8,
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

                <div className="sets-container">
                  {ex.sets.map((set, idx) => (
                    <div key={set.id} className="set-row-wrap">
                      <div className="set-row">
                        <div className="set-num">{idx + 1}</div>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="lb"
                          value={set.weight || ''}
                          onChange={(e) => {
                            const weight = Number(e.target.value) || 0;
                            updateExercise(ex.id, (sets, notes) => ({
                              notes,
                              sets: sets.map((s) => (s.id === set.id ? { ...s, weight } : s)),
                            }));
                          }}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="reps"
                          value={set.reps || ''}
                          onChange={(e) => {
                            const reps = Number(e.target.value) || 0;
                            updateExercise(ex.id, (sets, notes) => ({
                              notes,
                              sets: sets.map((s) => (s.id === set.id ? { ...s, reps } : s)),
                            }));
                          }}
                        />
                        <button
                          type="button"
                          className="rm"
                          aria-label="Remove set"
                          onClick={() =>
                            updateExercise(ex.id, (sets, notes) => ({
                              notes,
                              sets: sets.length <= 1 ? sets : sets.filter((s) => s.id !== set.id),
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
                          aria-label="Set type"
                          onChange={(e) => {
                            const type = e.target.value as SetType;
                            updateExercise(ex.id, (sets, notes) => ({
                              notes,
                              sets: sets.map((s) => (s.id === set.id ? { ...s, type } : s)),
                            }));
                          }}
                        >
                          {SET_TYPES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          className="set-rpe-input"
                          placeholder="RPE"
                          value={set.rpe ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const rpe =
                              raw === '' ? null : Math.min(10, Math.max(1, Number(raw) || 0));
                            updateExercise(ex.id, (sets, notes) => ({
                              notes,
                              sets: sets.map((s) => (s.id === set.id ? { ...s, rpe } : s)),
                            }));
                          }}
                        />
                        <div />
                      </div>
                      <div className="set-row-arm">
                        <button
                          type="button"
                          className={`set-arm-btn${set.singleArm ? ' on' : ''}`}
                          onClick={() =>
                            updateExercise(ex.id, (sets, notes) => ({
                              notes,
                              sets: sets.map((s) =>
                                s.id === set.id ? { ...s, singleArm: !s.singleArm } : s,
                              ),
                            }))
                          }
                        >
                          <span className="arm-dot" />
                          Single Arm
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="notes-row">
                  <input
                    className="notes-input"
                    type="text"
                    placeholder="Notes (optional)"
                    value={ex.notes ?? ''}
                    onChange={(e) =>
                      updateExercise(ex.id, (sets) => ({
                        sets,
                        notes: e.target.value,
                      }))
                    }
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button
                    type="button"
                    className="btn btn-add"
                    onClick={() =>
                      updateExercise(ex.id, (sets, notes) => ({
                        notes,
                        sets: [...sets, emptySet()],
                      }))
                    }
                  >
                    + Add Set
                  </button>
                  <button
                    type="button"
                    className={`btn btn-save${savedFlash === ex.id ? ' saved' : ''}`}
                    onClick={() => logToday(ex.id)}
                  >
                    {savedFlash === ex.id
                      ? 'Saved'
                      : savedFlash === 'empty' && openId === ex.id
                        ? 'Enter sets'
                        : 'Log Today'}
                  </button>
                </div>

                <div className="rest-label">Rest Timer</div>
                <div className="rest-presets">
                  {[60, 90, 120, 180].map((sec) => (
                    <button key={sec} type="button" onClick={() => startRestTimer(sec)}>
                      {sec === 60 ? '1:00' : sec === 90 ? '1:30' : sec === 120 ? '2:00' : '3:00'}
                    </button>
                  ))}
                </div>

                <div className="section-title" style={{ marginTop: 18 }}>
                  Recent Sessions
                </div>
                {history.length === 0 ? (
                  <div className="hist-empty">
                    Nothing here yet. Tap Log Today after filling weight &amp; reps.
                  </div>
                ) : (
                  history.map((h) => (
                    <div
                      key={`${ex.name}-${h.date}`}
                      className="hist-row"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 13,
                      }}
                    >
                      <span>{h.date}</span>
                      <b>
                        {h.sets
                          .map((s) => `${s.weight}×${s.reps}`)
                          .slice(0, 4)
                          .join(' · ')}
                      </b>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })
      )}

      <RestPill />
    </div>
  );
}

function tabColor(day: DayType): string {
  if (day === 'push') return 'var(--push)';
  if (day === 'pull') return 'var(--pull)';
  if (day === 'legs') return 'var(--legs)';
  return 'var(--accent-user)';
}
