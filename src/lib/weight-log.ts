import { readJson, writeJson } from '@/lib/storage';

export type WeightEntry = {
  date: string;
  ts: number;
  weight: number;
};

const KEY = 'eclipse-weight-log-v1';

export function loadWeightLog(): WeightEntry[] {
  const raw = readJson<WeightEntry[]>(KEY, []);
  return Array.isArray(raw) ? raw.slice().sort((a, b) => a.ts - b.ts) : [];
}

export function saveWeightLog(list: WeightEntry[]): void {
  writeJson(KEY, list);
}

export function addWeightEntry(value: number): WeightEntry[] {
  const list = loadWeightLog();
  const now = new Date();
  list.push({
    date: now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    ts: Date.now(),
    weight: value,
  });
  list.sort((a, b) => a.ts - b.ts);
  saveWeightLog(list);
  return list;
}

export function deleteWeightEntry(ts: number): WeightEntry[] {
  const next = loadWeightLog().filter((e) => e.ts !== ts);
  saveWeightLog(next);
  return next;
}
