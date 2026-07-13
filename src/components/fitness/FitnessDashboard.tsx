'use client';

import { BrandMark } from '@/components/BrandMark';
import { WearablePulseCard } from '@/components/WearablePulseCard';
import { RestTimer } from '@/components/fitness/RestTimer';
import { WorkoutTimer } from '@/components/fitness/WorkoutTimer';
import type { WorkoutSession } from '@/lib/types';
import {
  computeStreak,
  countSessionsInRange,
  labelForDayType,
  listSessions,
} from '@/lib/fitness-store';
import { todayKey } from '@/lib/storage';

type Props = {
  session: WorkoutSession;
  onChange: (session: WorkoutSession) => void;
  onOpenLog: () => void;
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
  const recent = sessions
    .filter((s) => s.date !== todayKey() && (s.endedAt || s.exercises.some((e) => e.sets.some((x) => x.completed))))
    .slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
          <BrandMark />
          <div className="sub">Fitness · Today</div>
        </div>
      </div>

      <div className="today-hero glass">
        <div className="today-hero-copy">
          <div className="today-label">Today</div>
          <div className="today-main">{labelForDayType(session.dayType)}</div>
          <div className="today-chips">
            <span className={`chip ${session.dayType}`}>{session.dayType.toUpperCase()}</span>
            <span className="chip">{session.exercises.length} exercises</span>
          </div>
        </div>
        <WearablePulseCard />
      </div>

      <WorkoutTimer session={session} onChange={onChange} />
      <RestTimer />

      <div className="stats-row">
        <div className="stat-card glass">
          <div className="stat-num">{streak}</div>
          <div className="stat-label">Streak</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-num">{weekCount}</div>
          <div className="stat-label">This week</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-num">{monthCount}</div>
          <div className="stat-label">This month</div>
        </div>
      </div>

      <button type="button" className="quick-start" onClick={onOpenLog}>
        <span>
          <strong>Start Today&apos;s Workout</strong>
          <small>{labelForDayType(session.dayType)} · log sets on the floor</small>
        </span>
        <span aria-hidden>→</span>
      </button>

      <div className="section-title">Recent sessions</div>
      {recent.length === 0 ? (
        <p className="empty">No completed sessions yet. Log your first set today.</p>
      ) : (
        recent.map((s) => (
          <div key={s.id} className="log-row">
            <div>
              <strong>{labelForDayType(s.dayType)}</strong>
              <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>{s.date}</div>
            </div>
            <div style={{ color: 'var(--text-dim)' }}>
              {s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.completed).length, 0)} sets
            </div>
          </div>
        ))
      )}
    </div>
  );
}
