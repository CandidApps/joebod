import { readJson, writeJson } from '@/lib/storage';

export type WeightUnit = 'lb' | 'kg';
export type BadgeCorner = 'tl' | 'tr' | 'bl' | 'br';

export type FitnessPrefs = {
  unit: WeightUnit;
  badgeCorner: BadgeCorner;
  restSound: boolean;
  restVibrate: boolean;
};

const KEY = 'joebod-fitness-prefs-v1';

const DEFAULTS: FitnessPrefs = {
  unit: 'lb',
  badgeCorner: 'bl',
  restSound: true,
  restVibrate: true,
};

export function getFitnessPrefs(): FitnessPrefs {
  return { ...DEFAULTS, ...readJson<Partial<FitnessPrefs>>(KEY, {}) };
}

export function saveFitnessPrefs(next: Partial<FitnessPrefs>): FitnessPrefs {
  const merged = { ...getFitnessPrefs(), ...next };
  writeJson(KEY, merged);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('joebod-prefs-updated'));
  }
  return merged;
}

export function unitLabel(unit: WeightUnit = getFitnessPrefs().unit): string {
  return unit === 'kg' ? 'kg' : 'lb';
}
