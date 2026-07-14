'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { WearablePulseCard } from '@/components/WearablePulseCard';
import { RestTimer } from '@/components/fitness/RestTimer';
import { Stopwatch } from '@/components/fitness/Stopwatch';
import { WeekCard } from '@/components/fitness/WeekCard';
import { WorkoutTimer } from '@/components/fitness/WorkoutTimer';
import type { WorkoutSession } from '@/lib/types';
import {
  computeStreak,
  countSessionsInRange,
  labelForDayType,
  listSessions,
} from '@/lib/fitness-store';
import { getFitnessGoals, goalLabel } from '@/lib/fitness-goals';
import { todayKey } from '@/lib/storage';

type Props = {
  session: WorkoutSession;
  onChange: (session: WorkoutSession) => void;
  onOpenLog: () => void;
};

const DAY_CSS: Record<string, { color: string; glow: string }> = {
  push: { color: 'var(--push)', glow: 'var(--push-glow)' },
  pull: { color: 'var(--pull)', glow: 'var(--pull-glow)' },
  legs: { color: 'var(--legs)', glow: 'var(--legs-glow)' },
  zone2: { color: 'var(--accent-user)', glow: 'var(--accent-user-glow)' },
};

export function FitnessDashboard({ session, onChange, onOpenLog }: Props) {
  const sessions = listSessions();
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

  const recent = sessions
    .filter(
      (s) =>
        s.date !== todayKey() &&
        (s.endedAt || s.exercises.some((e) => e.sets.some((x) => x.completed))),
    )
    .slice(0, 8);

  const dayStyle = DAY_CSS[session.dayType];
  const todayStyle = dayStyle
    ? ({ '--today-color': dayStyle.color, '--today-glow': dayStyle.glow } as CSSProperties)
    : undefined;

  return (
    <div>
      <header className="page-header">
        <div>
          <div className="view-brand">Eclipse</div>
          <div className="view-sub">Let&apos;s move.</div>
        </div>
      </header>

      <div className="today-card glass" style={todayStyle}>
        <div className="today-pulse-ring" aria-hidden />
        <div className="today-label">Today</div>
        <div className="today-main">{labelForDayType(session.dayType)}</div>
        <div className="today-chips">
          <span className={`today-chip ${session.dayType}`}>
            <span className="dot" style={{ background: dayStyle?.color ?? 'var(--accent-user)' }} />
            {session.dayType.toUpperCase()}
          </span>
          <span className="today-chip">{session.exercises.length} exercises</span>
        </div>
      </div>

      <div className="wearable-strip glass">
        <WearablePulseCard />
      </div>

      {primaryGoal ? (
        <div className="goal-banner glass">
          <div className="goal-banner-text">
            <div className="goal-banner-label">Primary Goal</div>
            <div className="goal-banner-name">{primaryGoal}</div>
          </div>
        </div>
      ) : null}

      <WorkoutTimer session={session} onChange={onChange} />
      <RestTimer />
      <Stopwatch />
      <WeekCard />

      <div className="consistency-row">
        <div className="consist-card glass">
          <div className="consist-num">{streak}</div>
          <div className="consist-label">Streak</div>
          <div className="consist-sub">days</div>
        </div>
        <div className="consist-card glass">
          <div className="consist-num">{weekCount}</div>
          <div className="consist-label">This week</div>
          <div className="consist-sub">sessions</div>
        </div>
        <div className="consist-card glass">
          <div className="consist-num">{monthCount}</div>
          <div className="consist-label">This month</div>
          <div className="consist-sub">sessions</div>
        </div>
      </div>

      <button type="button" className="quick-start" onClick={onOpenLog}>
        <span>
          Start Today&apos;s Workout
          <small>{labelForDayType(session.dayType)}</small>
        </span>
        <span className="arrow" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="18" y2="12" />
            <polyline points="12,6 18,12 12,18" />
          </svg>
        </span>
      </button>

      <div className="section-title">Recent PRs &amp; Lifts</div>
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
                <div className="rname">{labelForDayType(s.dayType)}</div>
                <div className="rmeta">{sets} sets</div>
                <div className="rdate">{s.date}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
