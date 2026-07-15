'use client';

import { useEffect, useState } from 'react';
import { getDefaultRestSec, setDefaultRestSec } from '@/lib/fitness-store';
import {
  formatRestClock,
  getRestTimerState,
  markRestDone,
  remainingRestSec,
  startRestTimer,
  stopRestTimer,
  type RestTimerState,
} from '@/lib/rest-timer-store';

type Props = {
  onComplete?: () => void;
};

export function RestTimer({ onComplete }: Props) {
  const [defaultSec, setDefaultSec] = useState(90);
  const [state, setState] = useState<RestTimerState>(() => getRestTimerState());
  const [tick, setTick] = useState(0);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('90');

  useEffect(() => {
    setDefaultSec(getDefaultRestSec());
    const sync = () => setState(getRestTimerState());
    sync();
    window.addEventListener('joebod-rest-updated', sync);
    return () => window.removeEventListener('joebod-rest-updated', sync);
  }, []);

  useEffect(() => {
    if (state.status !== 'ticking') return;
    const id = window.setInterval(() => {
      const left = remainingRestSec();
      if (left == null || left <= 0) {
        markRestDone();
        onComplete?.();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([120, 60, 120]);
        window.setTimeout(() => stopRestTimer(), 4000);
      }
      setTick((t) => t + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [state.status, onComplete]);

  void tick;
  const remaining = remainingRestSec(state);

  const start = (sec: number) => {
    setDefaultRestSec(sec);
    setDefaultSec(sec);
    setCustomOpen(false);
    startRestTimer(sec);
  };

  const displayClass =
    state.status === 'ticking'
      ? 'rest-timer-display ticking'
      : state.status === 'done'
        ? 'rest-timer-display done'
        : 'rest-timer-display';

  return (
    <div className="timer-card glass">
      <div className="timer-card-head">
        <span className="timer-card-title">Rest Timer</span>
        <span className={displayClass}>
          {state.status === 'ticking' && remaining != null
            ? formatRestClock(remaining)
            : state.status === 'done'
              ? 'Done'
              : 'Ready'}
        </span>
      </div>
      <div className="rest-presets">
        {[60, 90, 120, 180].map((sec) => (
          <button
            key={sec}
            type="button"
            className={defaultSec === sec && state.status === 'idle' ? 'active' : ''}
            onClick={() => start(sec)}
          >
            {sec === 60 ? '1:00' : sec === 90 ? '1:30' : sec === 120 ? '2:00' : '3:00'}
          </button>
        ))}
        <button type="button" onClick={() => setCustomOpen((v) => !v)}>
          Custom
        </button>
      </div>
      {customOpen ? (
        <div className="rest-custom-row">
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={600}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="seconds"
          />
          <button type="button" className="btn btn-save" onClick={() => start(Number(customValue) || 90)}>
            Go
          </button>
        </div>
      ) : null}
      {state.status === 'ticking' ? (
        <button type="button" className="btn btn-add" style={{ width: '100%', marginTop: 10 }} onClick={() => stopRestTimer()}>
          Cancel rest
        </button>
      ) : null}
    </div>
  );
}
