'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GoogleHealthConnectCard } from '@/components/GoogleHealthConnectCard';
import { ClaudeCoachCard } from '@/components/ClaudeCoachCard';
import { BrandMark } from '@/components/BrandMark';
import { InstallBanner } from '@/components/InstallBanner';
import { FitnessDashboard } from '@/components/fitness/FitnessDashboard';
import { WorkoutLog } from '@/components/fitness/WorkoutLog';
import { CoachView } from '@/components/fitness/CoachView';
import { TrainingSettings } from '@/components/fitness/TrainingSettings';
import { AppearanceSettings } from '@/components/fitness/AppearanceSettings';
import { BackupSettings } from '@/components/fitness/BackupSettings';
import { WeightHistoryPanel } from '@/components/fitness/WeightHistoryPanel';
import { SessionEditSheet } from '@/components/fitness/SessionEditSheet';
import { WorkoutSummarySheet } from '@/components/fitness/WorkoutSummarySheet';
import {
  deleteSession,
  getOrCreateTodaySession,
  isSessionLogged,
  labelForDayType,
  listSessions,
  sessionVolumeLb,
  volumeByDayTypeLastDays,
} from '@/lib/fitness-store';
import { FITNESS_GOALS, getFitnessGoals, toggleFitnessGoal, type FitnessGoalsState } from '@/lib/fitness-goals';
import {
  getFitnessPrefs,
  saveFitnessPrefs,
  unitLabel,
  type BadgeCorner,
  type FitnessPrefs,
  type WeightUnit,
} from '@/lib/fitness-prefs';
import { loadAppearanceColors } from '@/lib/appearance';
import { startGoogleHealthLiveSync } from '@/lib/google-health/sync-client';
import { todayKey } from '@/lib/storage';
import type { FitnessTab, WorkoutSession } from '@/lib/types';
import { formatDuration } from '@/lib/storage';

const FITNESS_TABS: {
  id: FitnessTab;
  label: string;
  icon: ReactNode;
}[] = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 3.2 3 10.5V20a1 1 0 0 0 1 1h5.5v-6.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V21H20a1 1 0 0 0 1-1v-9.5L12 3.2Z" />
      </svg>
    ),
  },
  {
    id: 'log',
    label: 'Log',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z" />
      </svg>
    ),
  },
  {
    id: 'coach',
    label: 'Coach',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <circle cx="12" cy="12" r="5" />
        <path d="M9.5 10.5h.01M14.5 10.5h.01" />
        <path d="M9.5 14c.8.8 1.7 1.2 2.5 1.2s1.7-.4 2.5-1.2" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12,7 12,12 16,14" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <rect x="3" y="5" width="18" height="2" rx="1" />
        <circle cx="15" cy="6" r="3" />
        <rect x="3" y="11" width="18" height="2" rx="1" />
        <circle cx="9" cy="12" r="3" />
        <rect x="3" y="17" width="18" height="2" rx="1" />
        <circle cx="17" cy="18" r="3" />
      </svg>
    ),
  },
];

const ICON_TRASH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

function fmtShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function EclipseApp() {
  const [tab, setTab] = useState<FitnessTab>('dashboard');
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<FitnessPrefs>(() =>
    typeof window === 'undefined'
      ? { unit: 'lb', badgeCorner: 'bl', restSound: true, restVibrate: true }
      : getFitnessPrefs(),
  );

  const [summaryDate, setSummaryDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = () => {
      try {
        loadAppearanceColors();
        const next = getOrCreateTodaySession();
        if (!cancelled) {
          setSession(next);
          setBootError(null);
        }
      } catch (err) {
        console.error('JOEbod boot failed', err);
        if (!cancelled) {
          setSession({
            id: `fallback-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            dayType: 'push',
            startedAt: null,
            endedAt: null,
            durationSec: 0,
            exercises: [],
          });
          setBootError(err instanceof Error ? err.message : 'Boot failed');
        }
      }
    };
    boot();
    const syncPrefs = () => setPrefs(getFitnessPrefs());
    window.addEventListener('joebod-prefs-updated', syncPrefs);
    // Keep Fitbit / Google Health vitals fresh (wearable sync — not the Health product tab)
    const stopLive = startGoogleHealthLiveSync(30_000);
    return () => {
      cancelled = true;
      stopLive();
      window.removeEventListener('joebod-prefs-updated', syncPrefs);
    };
  }, []);

  const loggedCount = useMemo(() => {
    if (!session) return 0;
    return session.exercises.filter((e) => e.sets.some((s) => s.completed || (s.weight > 0 && s.reps > 0)))
      .length;
  }, [session]);
  const totalExercises = session?.exercises.length ?? 0;
  const ring = 2 * Math.PI * 22;
  const fill = totalExercises > 0 ? (loggedCount / totalExercises) * ring : 0;

  if (!session) {
    return (
      <div className="app-shell">
        <ThemeToggle />
        <BrandMark />
        <div className="sub">Loading…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ThemeToggle />
      {bootError ? (
        <div className="install-banner" style={{ marginBottom: 12 }}>
          <div>
            <strong>Running in memory only</strong>
            <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>{bootError}</div>
          </div>
        </div>
      ) : null}
      <InstallBanner />

      <div className="fitness-mode">
        {tab === 'dashboard' ? (
          <FitnessDashboard
            session={session}
            onChange={setSession}
            onOpenLog={() => setTab('log')}
            onOpenSettings={() => setTab('settings')}
          />
        ) : tab === 'log' ? (
          <WorkoutLog session={session} onChange={setSession} />
        ) : tab === 'coach' ? (
          <CoachView
            onLoaded={(next) => {
              setSession(next);
              setTab('log');
            }}
          />
        ) : tab === 'history' ? (
          <HistoryView
            unit={prefs.unit}
            onOpenSummary={(date) => setSummaryDate(date)}
            onSessionSaved={(next) => {
              if (session.id === next.id) setSession(next);
            }}
          />
        ) : (
          <SettingsView prefs={prefs} onPrefs={setPrefs} />
        )}

        {tab === 'log' || tab === 'dashboard' ? (
          <button
            type="button"
            className={`workout-count-badge corner-${prefs.badgeCorner}`}
            aria-label={`${loggedCount} of ${totalExercises} exercises logged. Open workout summary.`}
            onClick={() => setSummaryDate(todayKey())}
          >
            <svg className="wcb-ring" viewBox="0 0 54 54" aria-hidden>
              <circle className="wcb-ring-track" cx="27" cy="27" r="22" strokeWidth="3" />
              <circle
                className="wcb-ring-fill"
                cx="27"
                cy="27"
                r="22"
                strokeWidth="3"
                strokeDasharray={`${fill} ${ring}`}
                transform="rotate(-90 27 27)"
              />
            </svg>
            <span className="wcb-num">{loggedCount}</span>
          </button>
        ) : null}

        {summaryDate ? (
          <WorkoutSummarySheet dateIso={summaryDate} onClose={() => setSummaryDate(null)} />
        ) : null}
      </div>

      <div className="bottom-chrome">
        <nav className="bottom-nav" aria-label="Primary">
          {FITNESS_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`navbtn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="navicon">{t.icon}</span>
              <span className="navlabel">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function HistoryView({
  unit,
  onOpenSummary,
  onSessionSaved,
}: {
  unit: WeightUnit;
  onOpenSummary: (date: string) => void;
  onSessionSaved: (session: WorkoutSession) => void;
}) {
  const [mode, setMode] = useState<'days' | 'exercise'>('days');
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<WorkoutSession | null>(null);
  void tick;

  const sessions = listSessions().filter(isSessionLogged);
  const vol = volumeByDayTypeLastDays(sessions, 30);
  const volEntries = Object.entries(vol).sort((a, b) => b[1] - a[1]);
  const maxVol = Math.max(...volEntries.map(([, amt]) => amt), 1);
  const unitSuffix = unitLabel(unit);

  const byDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
      const list = map.get(s.date) ?? [];
      list.push(s);
      map.set(s.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sessions]);

  const byExercise = useMemo(() => {
    const map = new Map<string, { name: string; volume: number; sessions: number; last: string }>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        const done = ex.sets.filter((x) => x.completed || (x.weight > 0 && x.reps > 0));
        if (done.length === 0) continue;
        const volEx = done
          .filter((x) => (x.type ?? 'working') !== 'warmup')
          .reduce((n, x) => n + x.weight * x.reps * (x.singleArm ? 2 : 1), 0);
        const cur = map.get(ex.name) ?? { name: ex.name, volume: 0, sessions: 0, last: s.date };
        cur.volume += volEx;
        cur.sessions += 1;
        if (s.date > cur.last) cur.last = s.date;
        map.set(ex.name, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.volume - a.volume);
  }, [sessions]);

  const removeDay = (date: string, ids: string[]) => {
    if (!window.confirm(`Delete workout${ids.length > 1 ? 's' : ''} from ${fmtShortDate(date)}?`)) return;
    for (const id of ids) deleteSession(id);
    setTick((t) => t + 1);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="view-brand">History</div>
          <div className="view-sub">Progress over time</div>
        </div>
      </div>

      <div className="tabs settings-tabs" role="tablist" aria-label="History mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'days'}
          className={`tab${mode === 'days' ? ' active' : ''}`}
          onClick={() => setMode('days')}
        >
          Workout Days
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'exercise'}
          className={`tab${mode === 'exercise' ? ' active' : ''}`}
          onClick={() => setMode('exercise')}
        >
          By Exercise
        </button>
      </div>

      <div className="section-title">Volume Balance · Last 30 Days</div>
      <div className="volume-block glass">
        {volEntries.length === 0 ? (
          <div className="edit-note">No logged volume yet.</div>
        ) : (
          volEntries.map(([key, amt]) => (
            <div key={key} className="vol-row">
              <span
                className="vol-label"
                style={{
                  color:
                    key === 'push' || key === 'pull' || key === 'legs'
                      ? `var(--${key})`
                      : 'var(--accent-user)',
                }}
              >
                {labelForDayType(key)}
              </span>
              <div className="vol-track">
                <div
                  className={`vol-fill ${key === 'push' || key === 'pull' || key === 'legs' ? key : ''}`}
                  style={{
                    width: `${Math.max(4, (amt / maxVol) * 100)}%`,
                    ...(key === 'push' || key === 'pull' || key === 'legs'
                      ? {}
                      : { background: 'var(--accent-user)' }),
                  }}
                />
              </div>
              <span className="vol-amt">
                {amt.toLocaleString()} {unitSuffix}
              </span>
            </div>
          ))
        )}
        <div className="vol-note">
          Cardio / time-based work is tracked on those days. Lift volume for the last 30 days is above.
        </div>
      </div>

      {mode === 'days' ? (
        <>
          <div className="section-title">Recent Workouts</div>
          {byDate.length === 0 ? (
            <p className="recent-empty">Completed workouts will show up here.</p>
          ) : (
            <div className="history-daylist glass">
              {byDate.map(([date, daySessions]) => {
                const types = [...new Set(daySessions.map((s) => labelForDayType(s.dayType)))];
                const volume = daySessions.reduce((n, s) => n + sessionVolumeLb(s), 0);
                const duration = daySessions.reduce((n, s) => n + (s.durationSec || 0), 0);
                return (
                  <div
                    key={date}
                    className="history-day-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenSummary(date)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onOpenSummary(date);
                    }}
                  >
                    <div className="history-day-main">
                      <div className="history-day-date">{fmtShortDate(date)}</div>
                      <div className="history-day-types">{types.join(' + ')}</div>
                    </div>
                    <div className="history-day-right">
                      <div className="history-day-side">
                        <div className="history-day-volume">
                          {volume.toLocaleString()} {unitSuffix}
                        </div>
                        {duration > 0 ? (
                          <div className="history-day-duration">{formatDuration(duration)}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="history-day-edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(daySessions[0]);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="history-day-del"
                        aria-label={`Delete ${fmtShortDate(date)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDay(
                            date,
                            daySessions.map((s) => s.id),
                          );
                        }}
                      >
                        {ICON_TRASH}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="section-title">By Exercise</div>
          {byExercise.length === 0 ? (
            <p className="recent-empty">Log sets to see exercise history.</p>
          ) : (
            <div className="history-daylist glass">
              {byExercise.map((ex) => (
                <div key={ex.name} className="history-day-row">
                  <div className="history-day-main">
                    <div className="history-day-date">{ex.name}</div>
                    <div className="history-day-types">
                      {ex.sessions} session{ex.sessions === 1 ? '' : 's'} · last {fmtShortDate(ex.last)}
                    </div>
                  </div>
                  <div className="history-day-side">
                    <div className="history-day-volume">
                      {Math.round(ex.volume).toLocaleString()} {unitSuffix}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editing ? (
        <SessionEditSheet
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            onSessionSaved(next);
            setTick((t) => t + 1);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

type SettingsPanel = 'general' | 'training' | 'goals' | 'appearance' | 'backup';

function SettingsView({
  prefs,
  onPrefs,
}: {
  prefs: FitnessPrefs;
  onPrefs: (p: FitnessPrefs) => void;
}) {
  const [panel, setPanel] = useState<SettingsPanel>('general');
  const [goals, setGoals] = useState<FitnessGoalsState>(() =>
    typeof window === 'undefined' ? { primary: null, secondary: [] } : getFitnessGoals(),
  );

  const panels: { id: SettingsPanel; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'training', label: 'Training' },
    { id: 'goals', label: 'Goals' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'backup', label: 'Backup' },
  ];

  const setUnit = (unit: WeightUnit) => onPrefs(saveFitnessPrefs({ unit }));
  const setCorner = (badgeCorner: BadgeCorner) => onPrefs(saveFitnessPrefs({ badgeCorner }));
  const setRestSound = (restSound: boolean) => onPrefs(saveFitnessPrefs({ restSound }));
  const setRestVibrate = (restVibrate: boolean) => onPrefs(saveFitnessPrefs({ restVibrate }));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="view-brand">Settings</div>
          <div className="view-sub">Make it yours</div>
        </div>
      </div>

      <div className="tabs settings-tabs" role="tablist" aria-label="Settings sections">
        {panels.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={panel === p.id}
            className={`tab${panel === p.id ? ' active' : ''}`}
            onClick={() => setPanel(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {panel === 'general' ? (
        <>
          <div className="settings-block glass">
            <div className="settings-block-title">Units</div>
            <div className="seg">
              <button type="button" className={prefs.unit === 'lb' ? 'on' : ''} onClick={() => setUnit('lb')}>
                Pounds (lb)
              </button>
              <button type="button" className={prefs.unit === 'kg' ? 'on' : ''} onClick={() => setUnit('kg')}>
                Kilograms (kg)
              </button>
            </div>
          </div>

          <div className="settings-block glass">
            <div className="settings-block-title">Workout Progress Badge</div>
            <div className="edit-note" style={{ marginBottom: 12 }}>
              While logging, a ring shows how many exercises you&apos;ve filled. Pick which corner it sits in.
            </div>
            <div className="corner-picker">
              {(
                [
                  ['tl', 'Top Left'],
                  ['tr', 'Top Right'],
                  ['bl', 'Bottom Left'],
                  ['br', 'Bottom Right'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={prefs.badgeCorner === id ? 'on' : ''}
                  onClick={() => setCorner(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-block glass">
            <div className="settings-block-title">Rest Timer</div>
            <div className="notif-row">
              <div className="notif-label">
                <span>Sound when rest ends</span>
                <div className="notif-sub">Plays a short chime if your phone allows it</div>
              </div>
              <div className="seg notif-seg">
                <button type="button" className={prefs.restSound ? 'on' : ''} onClick={() => setRestSound(true)}>
                  On
                </button>
                <button
                  type="button"
                  className={!prefs.restSound ? 'on' : ''}
                  onClick={() => setRestSound(false)}
                >
                  Off
                </button>
              </div>
            </div>
            <div className="notif-row">
              <div className="notif-label">
                <span>Vibrate when rest ends</span>
                <div className="notif-sub">Uses the system vibrator when available</div>
              </div>
              <div className="seg notif-seg">
                <button
                  type="button"
                  className={prefs.restVibrate ? 'on' : ''}
                  onClick={() => setRestVibrate(true)}
                >
                  On
                </button>
                <button
                  type="button"
                  className={!prefs.restVibrate ? 'on' : ''}
                  onClick={() => setRestVibrate(false)}
                >
                  Off
                </button>
              </div>
            </div>
          </div>

          <GoogleHealthConnectCard />
          <ClaudeCoachCard />

          <div className="settings-block glass">
            <div className="settings-block-title">Local-first data</div>
            <div className="edit-note">
              Workouts are stored in this phone&apos;s browser (localStorage). Clearing site data will erase
              logs.
            </div>
          </div>
        </>
      ) : null}

      {panel === 'training' ? <TrainingSettings /> : null}

      {panel === 'goals' ? (
        <>
          <div className="settings-block glass">
            <div className="settings-block-title">Fitness Goals</div>
            <div className="edit-note" style={{ marginBottom: 12 }}>
              Tap once to set as primary goal. Tap any other to add as secondary. Tap again to remove.
            </div>
            <div>
              {FITNESS_GOALS.map((g) => {
                const isPrimary = goals.primary === g.id;
                const isSecondary = goals.secondary.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`goal-opt${isPrimary ? ' goal-primary' : ''}${isSecondary ? ' goal-secondary' : ''}`}
                    style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)', marginBottom: 8 }}
                    onClick={() => setGoals(toggleFitnessGoal(g.id))}
                  >
                    <div className="goal-opt-text">
                      <span className="goal-opt-label">{g.label}</span>
                      <span className="goal-opt-desc">{g.desc}</span>
                    </div>
                    {isPrimary ? <span className="goal-badge primary">Primary</span> : null}
                    {isSecondary ? <span className="goal-badge secondary">Secondary</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
          <WeightHistoryPanel />
        </>
      ) : null}

      {panel === 'appearance' ? <AppearanceSettings /> : null}

      {panel === 'backup' ? <BackupSettings /> : null}
    </div>
  );
}
