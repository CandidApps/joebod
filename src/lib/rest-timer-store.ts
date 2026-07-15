import { readJson, writeJson } from '@/lib/storage';

const REST_KEY = 'eclipse-rest-timer-v1';

export type RestTimerState = {
  status: 'idle' | 'ticking' | 'done';
  endAt: number | null;
  totalSec: number;
};

const IDLE: RestTimerState = { status: 'idle', endAt: null, totalSec: 90 };

export function getRestTimerState(): RestTimerState {
  return readJson(REST_KEY, IDLE);
}

export function setRestTimerState(state: RestTimerState): void {
  writeJson(REST_KEY, state);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('joebod-rest-updated', { detail: state }));
  }
}

export function startRestTimer(sec: number): void {
  setRestTimerState({
    status: 'ticking',
    endAt: Date.now() + sec * 1000,
    totalSec: sec,
  });
}

export function stopRestTimer(): void {
  setRestTimerState({ ...IDLE, totalSec: getRestTimerState().totalSec || 90 });
}

export function markRestDone(): void {
  const cur = getRestTimerState();
  setRestTimerState({ ...cur, status: 'done', endAt: null });
}

export function remainingRestSec(state = getRestTimerState()): number | null {
  if (state.status !== 'ticking' || state.endAt == null) return null;
  return Math.max(0, (state.endAt - Date.now()) / 1000);
}

export function formatRestClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
