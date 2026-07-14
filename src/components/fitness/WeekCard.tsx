'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { dayTypeForDate, labelForDayType, listSessions } from '@/lib/fitness-store';
import { todayKey } from '@/lib/storage';
import type { DayType } from '@/lib/types';

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const DAY_COLORS: Partial<Record<DayType, string>> = {
  push: 'var(--push)',
  pull: 'var(--pull)',
  legs: 'var(--legs)',
  zone2: 'var(--accent-user)',
};

export function WeekCard() {
  const [offset, setOffset] = useState(0);
  const sessions = listSessions();
  const done = useMemo(
    () =>
      new Set(
        sessions
          .filter(
            (s) =>
              s.endedAt ||
              s.durationSec > 0 ||
              s.exercises.some((e) => e.sets.some((x) => x.completed)),
          )
          .map((s) => s.date),
      ),
    [sessions],
  );

  const weekStart = addDays(startOfWeek(new Date()), offset * 7);
  const weekEnd = addDays(weekStart, 6);
  const today = todayKey();
  const rangeLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const title = offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : offset === 1 ? 'Next Week' : 'Week';

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = todayKey(d);
    const type = dayTypeForDate(d);
    return { d, key, type, letter: d.toLocaleDateString(undefined, { weekday: 'narrow' }) };
  });

  return (
    <div className="week-card glass">
      <div className="week-head">
        <button
          type="button"
          className="week-nav-btn"
          aria-label="Previous week"
          onClick={() => setOffset((o) => o - 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,4 8,12 15,20" />
          </svg>
        </button>
        <div className="week-head-center">
          <div className="week-title">{title}</div>
          <div className="week-range">{rangeLabel}</div>
        </div>
        <button
          type="button"
          className="week-nav-btn"
          aria-label="Next week"
          onClick={() => setOffset((o) => o + 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,4 16,12 9,20" />
          </svg>
        </button>
      </div>
      <div className="week-grid">
        {days.map(({ d, key, type, letter }) => {
          const isToday = key === today;
          const active = done.has(key);
          const color = DAY_COLORS[type];
          const className = [
            'day-dot',
            isToday ? 'today' : '',
            active && color ? 'active-color' : '',
            type === 'rest' ? 'rest' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div
              key={key}
              className={className}
              title={`${d.toLocaleDateString()} · ${labelForDayType(type)}`}
              style={
                active && color
                  ? ({ '--dot-color': color, '--dot-ink': '#0b0c10' } as CSSProperties)
                  : undefined
              }
            >
              {letter}
            </div>
          );
        })}
      </div>
    </div>
  );
}
