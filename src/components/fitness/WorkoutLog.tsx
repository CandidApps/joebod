'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RestPill } from '@/components/fitness/RestPill';
import {
  emptySet,
  getOrCreateSessionForDayType,
  LOG_TABS,
  recentExerciseSessions,
  upsertSession,
} from '@/lib/fitness-store';
import { getFitnessPrefs, unitLabel } from '@/lib/fitness-prefs';
import { startRestTimer } from '@/lib/rest-timer-store';
import type { DayType, SetType, WorkoutSession, WorkoutSet } from '@/lib/types';

function est1RM(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

function fmtShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
}

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

  const isCoachSession = session.source === 'ai' || session.dayType === 'custom';

  const dayType = (
    LOG_TABS.includes(session.dayType as (typeof LOG_TABS)[number])
      ? session.dayType
      : 'push'
  ) as (typeof LOG_TABS)[number];

  useEffect(() => {
    if (isCoachSession) return;
    if (!LOG_TABS.includes(session.dayType as (typeof LOG_TABS)[number])) {
      onChange(getOrCreateSessionForDayType('push'));
    }
    // Intentionally depend on dayType only — parent setState identity may change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.dayType, session.source]);

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

  const unit = unitLabel(getFitnessPrefs().unit);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="view-brand">Log</div>
          <div className="view-sub">
            {isCoachSession
              ? session.title || 'Claude Coach session'
              : 'Track sets, beat last time'}
          </div>
        </div>
      </div>

      {isCoachSession && session.coachNotes ? (
        <div className="card glass mb14">
          <div className="h-supp-note">{session.coachNotes}</div>
        </div>
      ) : null}

      <div className="date-nav">
        <button type="button" className="date-nav-btn" aria-label="Previous day" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,6 9,12 15,18" />
          </svg>
        </button>
        <div className="date-nav-pill">Today</div>
        <button type="button" className="date-nav-btn" aria-label="Next day" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,6 15,12 9,18" />
          </svg>
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Training day">
        {LOG_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={!isCoachSession && dayType === tab}
            className={`tab${!isCoachSession && dayType === tab ? ' active' : ''}`}
            style={!isCoachSession && dayType === tab ? TAB_STYLE[tab] : undefined}
            onClick={() => switchTab(tab)}
          >
            {tab}
          </button>
        ))}
        {isCoachSession ? (
          <button type="button" role="tab" aria-selected className="tab active" disabled>
            coach
          </button>
        ) : null}
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
          const workingLast = last?.sets.filter((s) => (s.type ?? 'working') !== 'warmup') ?? [];
          const lastLabel = workingLast.length
            ? `${workingLast[workingLast.length - 1].weight} ${unit} × ${workingLast[workingLast.length - 1].reps}`
            : null;
          const lastSetsLine = workingLast
            .map((s) => {
              const fail = (s.type ?? 'working') === 'failure' ? ' (Failure)' : '';
              return `${s.weight}${unit} × ${s.reps}${fail}`;
            })
            .join(', ');
          const lastVol = workingLast.reduce(
            (n, s) => n + s.weight * s.reps * (s.singleArm ? 2 : 1),
            0,
          );
          const best1 = workingLast.reduce((best, s) => Math.max(best, est1RM(s.weight, s.reps)), 0);
          const topWorking = workingLast.length
            ? Math.max(...workingLast.map((s) => s.weight))
            : 0;
          const wuBase = topWorking > 0 ? Math.round(topWorking * 1.05) : 0;

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
                {last ? (
                  <div className="compare-panel">
                    <div className="compare-title">
                      Last Time · {fmtShortDate(last.date)}
                    </div>
                    <div className="compare-setsline">{lastSetsLine}</div>
                    <div className="compare-stats">
                      <div className="compare-stat">
                        <span className="compare-stat-label">Volume</span>
                        <span className="compare-stat-value">
                          {Math.round(lastVol)} {unit}
                        </span>
                      </div>
                      <div className="compare-stat">
                        <span className="compare-stat-label">Best Est. 1RM</span>
                        <span className="compare-stat-value">
                          {Math.round(best1)} {unit}
                        </span>
                      </div>
                    </div>
                    <div className="compare-target">
                      Target today: Beat last session&apos;s best working set. Try{' '}
                      {wuBase || topWorking || '—'} {unit} for 8+ reps next time.
                    </div>
                  </div>
                ) : (
                  <div className="edit-note" style={{ marginBottom: 12 }}>
                    No sessions logged yet — your first set here sets the baseline.
                  </div>
                )}

                {wuBase > 0 ? (
                  <div className="compare-panel">
                    <div className="compare-title">Warm-up Suggestion · Based on {wuBase} {unit}</div>
                    <div className="compare-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      {[0.4, 0.6, 0.8].map((pct) => (
                        <div key={pct} className="compare-stat" style={{ textAlign: 'center' }}>
                          <span className="compare-stat-label">{Math.round(pct * 100)}%</span>
                          <span className="compare-stat-value">
                            {Math.round((wuBase * pct) / 2.5) * 2.5} × {pct === 0.4 ? 8 : pct === 0.6 ? 5 : 3}
                          </span>
                        </div>
                      ))}
                    </div>
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
                    Weight ({unit})
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
                    <div key={`${ex.name}-${h.date}`} className="hist-row">
                      <span>{fmtShortDate(h.date)}</span>
                      <b>
                        {h.sets
                          .map((s) => {
                            const fail = (s.type ?? 'working') === 'failure' ? ' (Failure)' : '';
                            return `${s.weight}x${s.reps}${fail}`;
                          })
                          .slice(0, 4)
                          .join(', ')}
                      </b>
                      <span className="hist-edit">Edit</span>
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
