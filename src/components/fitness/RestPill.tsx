'use client';

import { useEffect, useState } from 'react';
import {
  formatRestClock,
  getRestTimerState,
  markRestDone,
  remainingRestSec,
  stopRestTimer,
  type RestTimerState,
} from '@/lib/rest-timer-store';

/** Floating rest countdown on Log (matches Eclipse #restPill). */
export function RestPill() {
  const [state, setState] = useState<RestTimerState>(() => getRestTimerState());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sync = () => setState(getRestTimerState());
    sync();
    window.addEventListener('joebod-rest-updated', sync);
    return () => window.removeEventListener('joebod-rest-updated', sync);
  }, []);

  useEffect(() => {
    if (state.status !== 'ticking') return;
    const id = window.setInterval(() => {
      const left = remainingRestSec();
      if (left != null && left <= 0) {
        markRestDone();
      }
      setTick((t) => t + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [state.status]);

  void tick;
  if (state.status === 'idle') return null;

  const remaining = remainingRestSec(state);
  const label =
    state.status === 'done'
      ? 'Rest done'
      : remaining != null
        ? formatRestClock(remaining)
        : formatRestClock(state.totalSec);

  return (
    <button
      type="button"
      className={`rest-pill show${state.status === 'done' ? ' done' : ''}`}
      onClick={() => stopRestTimer()}
      aria-label="Stop rest timer"
    >
      <span>{label}</span>
      <span className="x" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="5" y1="5" x2="19" y2="19" />
          <line x1="19" y1="5" x2="5" y2="19" />
        </svg>
      </span>
    </button>
  );
}
