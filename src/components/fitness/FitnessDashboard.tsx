'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { WearablePulseCard } from '@/components/WearablePulseCard';
import { RestTimer } from '@/components/fitness/RestTimer';
import { SessionEditSheet } from '@/components/fitness/SessionEditSheet';
import { Stopwatch } from '@/components/fitness/Stopwatch';
import { WeekCard } from '@/components/fitness/WeekCard';
import { WorkoutTimer } from '@/components/fitness/WorkoutTimer';
import type { WorkoutSession } from '@/lib/types';
import {
  computeStreak,
  countSessionsInRange,
  deleteSession,
  getOrCreateSessionForDayType,
  labelForDayType,
  listSessions,
} from '@/lib/fitness-store';
import { getFitnessGoals, goalLabel } from '@/lib/fitness-goals';

type Props = {
  session: WorkoutSession;
  onChange: (session: WorkoutSession) => void;
  onOpenLog: () => void;
  onOpenSettings?: () => void;
};

const DAY_CSS: Record<string, { color: string; glow: string }> = {
  push: { color: 'var(--push)', glow: 'var(--push-glow)' },
  pull: { color: 'var(--pull)', glow: 'var(--pull-glow)' },
  legs: { color: 'var(--legs)', glow: 'var(--legs-glow)' },
  zone2: { color: 'var(--accent-user)', glow: 'var(--accent-user-glow)' },
};

const PROFILE_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.4 0-9.9 1.7-9.9 5.1v1.3c0 .7.6 1.3 1.3 1.3h17.2c.7 0 1.3-.6 1.3-1.3v-1.3c0-3.4-6.5-5.1-9.9-5.1z" />
  </svg>
);

const GOAL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
    <path d="M5 19h14" />
  </svg>
);

function greetingLine(): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}. You're on a wave — let's train.`;
}

export function FitnessDashboard({ session, onChange, onOpenLog, onOpenSettings }: Props) {
  const [listTick, setListTick] = useState(0);
  const [editing, setEditing] = useState<WorkoutSession | null>(null);
  const sessions = listSessions();
  void listTick;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const streak = computeStreak(sessions);
  const weekCount = countSessionsInRange(sessions, weekStart, now);
  const monthCount = countSessionsInRange(sessions, monthStart, now);
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setPrimaryGoal(goalLabel(getFitnessGoals().primary));
    sync();
    window.addEventListener('joebod-goals-updated', sync);
    return () => window.removeEventListener('joebod-goals-updated', sync);
  }, []);

  const removeRecent = (id: string) => {
    if (!window.confirm('Delete this lift from Recent PRs & Lifts?')) return;
    deleteSession(id);
    if (session.id === id) {
      onChange(getOrCreateSessionForDayType(session.dayType));
    }
    setListTick((t) => t + 1);
  };

  const recent = sessions
    .filter(
      (s) =>
        s.endedAt || s.exercises.some((e) => e.sets.some((x) => x.completed)),
    )
    .slice(0, 8);

  const dayStyle = DAY_CSS[session.dayType];
  const todayStyle = dayStyle
    ? ({ '--today-color': dayStyle.color, '--today-glow': dayStyle.glow } as CSSProperties)
    : undefined;
  const hasStarted = session.exercises.some((e) => e.sets.some((x) => x.completed));
  const metaParts = [
    `${session.exercises.length} exercise${session.exercises.length === 1 ? '' : 's'}`,
    hasStarted ? 'started' : null,
  ].filter(Boolean);

  return (
    <div>
      <header className="page-header">
        <div>
          <BrandMark size="lg" underline />
          <div className="view-sub">{greetingLine()}</div>
        </div>
        <button
          type="button"
          className="profile-btn"
          aria-label="Open settings"
          onClick={() => onOpenSettings?.()}
        >
          {PROFILE_ICON}
        </button>
      </header>

      <button
        type="button"
        className="session-hero glass"
        style={todayStyle}
        onClick={onOpenLog}
      >
        <div className="today-pulse-ring" aria-hidden />
        <div className="activity-wave" aria-hidden />
        <span className="session-kicker">Today</span>
        <span className="session-row">
          <span className="session-title">{labelForDayType(session.dayType)}</span>
          <span className="session-go" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </span>
        </span>
        <span className="session-meta">{metaParts.join(' · ')}</span>
      </button>

      <div className="wearable-strip glass">
        <WearablePulseCard />
      </div>

      {primaryGoal ? (
        <div className="goal-banner glass">
          <span className="goal-icon">{GOAL_ICON}</span>
          <div className="goal-banner-text">
            <div className="goal-banner-label">Primary Goal</div>
            <div className="goal-banner-name">{primaryGoal}</div>
          </div>
        </div>
      ) : null}

      <div className="consistency-row">
        <div className="consist-card glass">
          <div className="consist-num">{streak}</div>
          <div className="consist-label">Streak</div>
          <div className="consist-sub">days</div>
          <div className="consist-spark line" aria-hidden />
        </div>
        <div className="consist-card glass">
          <div className="consist-num">{weekCount}</div>
          <div className="consist-label">This week</div>
          <div className="consist-sub">sessions</div>
          <div className="consist-spark bars" aria-hidden>
            <span /><span /><span /><span /><span />
          </div>
        </div>
        <div className="consist-card glass">
          <div className="consist-num">{monthCount}</div>
          <div className="consist-label">This month</div>
          <div className="consist-sub">sessions</div>
        </div>
      </div>

      <WeekCard />
      <WorkoutTimer session={session} onChange={onChange} />
      <RestTimer />
      <Stopwatch />

      <div className="section-title">Recent PRs &amp; Lifts</div>
      <p className="recent-hint">
        PR = personal record (a best lift). Tap Edit to fix weight, reps, date, or set type.
      </p>
      {recent.length === 0 ? (
        <p className="recent-empty">No completed sessions yet. Log your first set today.</p>
      ) : (
        <div className="recent-scroll">
          {recent.map((s) => {
            const sets = s.exercises.reduce(
              (n, e) => n + e.sets.filter((x) => x.completed).length,
              0,
            );
            return (
              <div key={s.id} className="recent-item glass">
                <button
                  type="button"
                  className="recent-del"
                  aria-label={`Delete ${labelForDayType(s.dayType)} on ${s.date}`}
                  onClick={() => removeRecent(s.id)}
                >
                  ×
                </button>
                <div className="rname">{labelForDayType(s.dayType)}</div>
                <div className="rmeta">{sets} sets</div>
                <div className="rdate">{s.date}</div>
                <button type="button" className="recent-edit" onClick={() => setEditing(s)}>
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing ? (
        <SessionEditSheet
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            if (session.id === next.id) onChange(next);
            setListTick((t) => t + 1);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
