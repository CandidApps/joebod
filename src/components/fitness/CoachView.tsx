'use client';

import { useEffect, useState } from 'react';
import type { CoachWorkoutDraft } from '@/lib/coach/generate';
import {
  listRecentCoachWorkouts,
  recentTrainingSummary,
  saveCoachWorkout,
  type SavedCoachWorkout,
} from '@/lib/coach/history';
import { createSessionFromAiWorkout, listSessions } from '@/lib/fitness-store';
import type { WorkoutSession } from '@/lib/types';

type Intensity = 'tough' | 'very_tough' | 'max';

const FOCUS_CHIPS = ['Push', 'Pull', 'Legs', 'Core', 'Upper back', 'Shoulders', 'Conditioning'] as const;

type Props = {
  onLoaded: (session: WorkoutSession) => void;
};

export function CoachView({ onLoaded }: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState(
    'Build a brutal upper-back and rear-delt session. Make it really tough.',
  );
  const [focus, setFocus] = useState('');
  const [intensity, setIntensity] = useState<Intensity>('very_tough');
  const [durationMin, setDurationMin] = useState(55);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CoachWorkoutDraft | null>(null);
  const [recent, setRecent] = useState<SavedCoachWorkout[]>([]);

  useEffect(() => {
    setRecent(listRecentCoachWorkouts());
    void (async () => {
      try {
        const res = await fetch('/api/coach/status');
        const json = (await res.json()) as { configured: boolean };
        setConfigured(json.configured);
      } catch {
        setConfigured(false);
      }
    })();
  }, []);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/coach/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          focus: focus || undefined,
          intensity,
          durationMin,
          recentSummary: recentTrainingSummary(listSessions().slice(0, 6)),
        }),
      });
      const json = (await res.json()) as { workout?: CoachWorkoutDraft; error?: string };
      if (!res.ok || !json.workout) {
        setError(json.error ?? 'Could not generate workout');
        return;
      }
      setDraft(json.workout);
    } catch {
      setError('Network error talking to Coach');
    } finally {
      setBusy(false);
    }
  };

  const loadDraft = (workout: CoachWorkoutDraft) => {
    const session = createSessionFromAiWorkout({
      title: workout.title,
      dayType: workout.dayType,
      notes: workout.notes,
      exercises: workout.exercises,
    });
    onLoaded(session);
  };

  const saveDraft = (workout: CoachWorkoutDraft) => {
    saveCoachWorkout(workout);
    setRecent(listRecentCoachWorkouts());
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="view-brand">Coach</div>
          <div className="view-sub">Ask Claude for a tough session</div>
        </div>
      </div>

      {configured === false ? (
        <div className="card glass mb14">
          <div className="h-supp-name">Claude not configured</div>
          <div className="h-supp-note" style={{ marginTop: 6 }}>
            Add <code>ANTHROPIC_API_KEY</code> on the server (Vercel for phone, <code>.env.local</code>{' '}
            for PC), then reload. Get a key from{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
              console.anthropic.com
            </a>
            .
          </div>
        </div>
      ) : null}

      <div className="card glass mb14">
        <div className="h-supp-name">What do you want today?</div>
        <textarea
          className="coach-prompt"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Brutal legs finisher, 45 minutes, machines only…"
        />

        <div className="coach-chips" aria-label="Focus">
          {FOCUS_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className={focus === chip ? 'on' : ''}
              onClick={() => setFocus((f) => (f === chip ? '' : chip))}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="settings-block-title" style={{ marginTop: 12 }}>
          Intensity
        </div>
        <div className="seg">
          {(
            [
              ['tough', 'Tough'],
              ['very_tough', 'Very tough'],
              ['max', 'Max'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={intensity === id ? 'on' : ''}
              onClick={() => setIntensity(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="settings-block-title" style={{ marginTop: 12 }}>
          About {durationMin} min
        </div>
        <input
          type="range"
          min={30}
          max={90}
          step={5}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          style={{ width: '100%' }}
        />

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 14 }}
          disabled={busy || !prompt.trim() || configured === false}
          onClick={() => void generate()}
        >
          {busy ? 'Building workout…' : 'Generate with Claude'}
        </button>
        {error ? (
          <div className="h-supp-note" style={{ marginTop: 10, color: 'var(--legs)' }}>
            {error}
          </div>
        ) : null}
      </div>

      {draft ? (
        <div className="card glass mb14">
          <div className="h-supp-name">{draft.title}</div>
          <div className="h-supp-note" style={{ marginTop: 4 }}>
            {draft.dayType.toUpperCase()}
            {draft.notes ? ` · ${draft.notes}` : ''}
          </div>
          <ul className="coach-ex-list">
            {draft.exercises.map((ex) => (
              <li key={ex.name}>
                <strong>{ex.name}</strong>
                <span>
                  {ex.sets.map((s) => `${s.reps}`).join(' / ')} reps
                  {ex.notes ? ` — ${ex.notes}` : ''}
                </span>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={() => loadDraft(draft)}>
              Load into Log
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => saveDraft(draft)}>
              Save for later
            </button>
          </div>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <>
          <div className="section-title">Saved Coach workouts</div>
          {recent.map((w) => (
            <div key={w.id} className="card glass mb14">
              <div className="h-supp-name">{w.title}</div>
              <div className="h-supp-note" style={{ marginTop: 4 }}>
                {w.exercises.length} exercises · {w.dayType}
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 10 }}
                onClick={() => loadDraft(w)}
              >
                Load into Log
              </button>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
