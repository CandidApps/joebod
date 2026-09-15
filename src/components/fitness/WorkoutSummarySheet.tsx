'use client';

import { useMemo } from 'react';
import { formatDuration } from '@/lib/storage';
import { computeWorkoutSummary } from '@/lib/workout-summary';
import { unitLabel } from '@/lib/fitness-prefs';

type Props = {
  dateIso: string;
  onClose: () => void;
};

function fmtTitleDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}

export function WorkoutSummarySheet({ dateIso, onClose }: Props) {
  const unit = unitLabel();
  const summary = useMemo(() => computeWorkoutSummary(dateIso, unit), [dateIso, unit]);

  return (
    <div
      className="summary-backdrop open"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="summary-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Workout summary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="summary-sheet-head">
          <div>
            <div className="view-brand">Workout Summary</div>
            <div className="view-sub">{fmtTitleDate(dateIso)}</div>
          </div>
          <button type="button" className="session-sheet-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {summary.groups.length === 0 ? (
          <div className="summary-empty">Nothing logged this day yet.</div>
        ) : (
          <>
            <div className="summary-stats">
              <div className="summary-stat">
                <b>{round1(summary.totalVolume)}</b>
                <span>Total Volume ({unit})</span>
              </div>
              <div className="summary-stat">
                <b>{summary.totalWorkingSets}</b>
                <span>Working Sets</span>
              </div>
              <div className="summary-stat">
                <b>{summary.prCount}</b>
                <span>PRs Hit</span>
              </div>
            </div>
            {summary.durationSec > 0 ? (
              <div className="edit-note" style={{ marginTop: 0, marginBottom: 12 }}>
                Time in workout: <b style={{ color: 'var(--text)' }}>{formatDuration(summary.durationSec)}</b>
              </div>
            ) : null}

            {summary.groups.map((g) => {
              let compare = `First time logging ${g.label}`;
              let dir = '';
              if (g.prevVolume != null && g.volumeDelta != null) {
                const sign = g.volumeDelta > 0 ? '+' : '';
                dir = g.volumeDelta > 0 ? 'up' : g.volumeDelta < 0 ? 'down' : '';
                compare = `vs last ${g.label} (${g.prevDate}): ${sign}${round1(g.volumeDelta)} ${unit}`;
              }
              return (
                <div key={g.dayType} className="summary-group">
                  <div className="summary-group-head">
                    <div className="summary-group-title">
                      <span>{g.label}</span>
                      <span className={`summary-group-compare ${dir}`}>{compare}</span>
                    </div>
                  </div>
                  {g.exercises.map((ex) => {
                    const chips: string[] = [];
                    if (ex.weightPR) chips.push('Weight PR');
                    if (ex.est1RMPR) chips.push('1RM PR');
                    if (ex.volumePR) chips.push('Volume PR');
                    const delta =
                      ex.volumeDelta != null
                        ? `Volume ${ex.volumeDelta > 0 ? '+' : ''}${round1(ex.volumeDelta)} ${unit} · Reps ${
                            (ex.repsDelta ?? 0) > 0 ? '+' : ''
                          }${ex.repsDelta ?? 0} · 1RM ${(ex.est1RMDelta ?? 0) > 0 ? '+' : ''}${round1(
                            ex.est1RMDelta ?? 0,
                          )} ${unit}`
                        : 'First session logged';
                    return (
                      <div key={ex.name} className="summary-ex">
                        <div className="summary-ex-name-row">
                          <span className="summary-ex-name">{ex.name}</span>
                          {chips.length ? (
                            <span className="summary-pr">{chips.join(' · ')}</span>
                          ) : null}
                        </div>
                        <div className="summary-ex-meta">{delta}</div>
                        <div className="summary-ex-target">Next time: {ex.nextHint}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
