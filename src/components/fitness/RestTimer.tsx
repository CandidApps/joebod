'use client';

import { useEffect, useState } from 'react';
import { getDefaultRestSec, setDefaultRestSec } from '@/lib/fitness-store';

type Props = {
  onComplete?: () => void;
};

export function RestTimer({ onComplete }: Props) {
  const [defaultSec, setDefaultSec] = useState(90);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('90');
  const [justDone, setJustDone] = useState(false);

  useEffect(() => {
    setDefaultSec(getDefaultRestSec());
  }, []);

  useEffect(() => {
    if (remaining == null) return;
    if (remaining <= 0) {
      setRemaining(null);
      setJustDone(true);
      onComplete?.();
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([120, 60, 120]);
      window.setTimeout(() => setJustDone(false), 2000);
      return;
    }
    const id = window.setInterval(() => setRemaining((r) => (r == null ? r : r - 0.25)), 250);
    return () => window.clearInterval(id);
  }, [remaining, onComplete]);

  const start = (sec: number) => {
    setDefaultRestSec(sec);
    setDefaultSec(sec);
    setRemaining(sec);
    setCustomOpen(false);
    setJustDone(false);
  };

  const displayClass =
    remaining != null ? 'rest-timer-display ticking' : justDone ? 'rest-timer-display done' : 'rest-timer-display';

  return (
    <div className="timer-card glass">
      <div className="timer-card-head">
        <span className="timer-card-title">Rest Timer</span>
        <span className={displayClass}>
          {remaining == null ? (justDone ? 'Done' : 'Ready') : formatRestDisplay(remaining)}
        </span>
      </div>
      <div className="rest-presets">
        {[60, 90, 120, 180].map((sec) => (
          <button
            key={sec}
            type="button"
            className={defaultSec === sec && remaining == null ? 'active' : ''}
            onClick={() => start(sec)}
          >
            {sec === 60 ? '1:00' : sec === 90 ? '1:30' : sec === 120 ? '2:00' : '3:00'}
          </button>
        ))}
        <button type="button" id="restCustomBtn" onClick={() => setCustomOpen((v) => !v)}>
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
      {remaining != null ? (
        <button
          type="button"
          className="btn btn-add"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => setRemaining(null)}
        >
          Cancel rest
        </button>
      ) : null}
    </div>
  );
}

function formatRestDisplay(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
