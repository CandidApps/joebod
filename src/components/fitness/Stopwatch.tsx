'use client';

import { useEffect, useState } from 'react';

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

type Props = {
  /** Skip outer glass card + title (for dashboard accordion). */
  embedded?: boolean;
};

export function Stopwatch({ embedded = false }: Props) {
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulated, setAccumulated] = useState(0);
  const [tick, setTick] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 50);
    return () => window.clearInterval(id);
  }, [running]);

  void tick;
  const elapsed =
    accumulated + (running && startedAt != null ? Date.now() - startedAt : 0);

  const start = () => {
    setStartedAt(Date.now());
    setRunning(true);
  };
  const pause = () => {
    if (startedAt != null) setAccumulated((a) => a + (Date.now() - startedAt));
    setStartedAt(null);
    setRunning(false);
  };
  const reset = () => {
    setRunning(false);
    setStartedAt(null);
    setAccumulated(0);
    setLaps([]);
  };
  const lap = () => setLaps((prev) => [elapsed, ...prev].slice(0, 20));

  const body = (
    <>
      <div className="timer-card-head" style={embedded ? { marginBottom: 10 } : undefined}>
        {embedded ? null : <span className="timer-card-title">Stopwatch</span>}
        <span className="timer-card-sub">{running ? 'Running' : elapsed > 0 ? 'Paused' : 'Ready'}</span>
      </div>
      <div className={`workout-timer-display${running ? ' running' : ''}`}>{fmt(elapsed)}</div>
      <div className="workout-timer-actions">
        {!running && elapsed === 0 ? (
          <button type="button" className="btn btn-save" onClick={start}>
            Start
          </button>
        ) : null}
        {running ? (
          <>
            <button type="button" className="btn btn-add" onClick={pause}>
              Pause
            </button>
            <button type="button" className="btn btn-add" onClick={lap}>
              Lap
            </button>
          </>
        ) : null}
        {!running && elapsed > 0 ? (
          <>
            <button type="button" className="btn btn-save" onClick={start}>
              Resume
            </button>
            <button type="button" className="btn btn-danger" onClick={reset}>
              Reset
            </button>
          </>
        ) : null}
      </div>
      {laps.length > 0 ? (
        <div className="stopwatch-laps">
          {laps.map((ms, i) => (
            <div key={`${ms}-${i}`} className="stopwatch-lap-row">
              <span>Lap {laps.length - i}</span>
              <span>{fmt(ms)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );

  if (embedded) return <div className="timer-card-inner">{body}</div>;
  return <div className="timer-card glass">{body}</div>;
}
