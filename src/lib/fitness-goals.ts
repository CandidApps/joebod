import { readJson, writeJson } from '@/lib/storage';

const GOALS_KEY = 'eclipse-fitness-goals-v1';

export type FitnessGoalId =
  | 'muscle'
  | 'fat'
  | 'strength'
  | 'maintain'
  | 'cardio'
  | 'rehab'
  | 'health';

export type FitnessGoal = {
  id: FitnessGoalId;
  label: string;
  desc: string;
};

export const FITNESS_GOALS: FitnessGoal[] = [
  { id: 'muscle', label: 'Build Muscle', desc: 'Focus on hypertrophy and muscle gain' },
  { id: 'fat', label: 'Lose Fat', desc: 'Burn fat while preserving muscle' },
  { id: 'strength', label: 'Get Stronger', desc: 'Maximize strength and power output' },
  { id: 'maintain', label: 'Maintain', desc: 'Keep your current fitness level' },
  { id: 'cardio', label: 'Improve Cardio', desc: 'Build endurance and heart health' },
  { id: 'rehab', label: 'Rehab / Light Training', desc: 'Recover and build back carefully' },
  { id: 'health', label: 'General Health', desc: 'Stay active and feel great' },
];

export type FitnessGoalsState = {
  primary: FitnessGoalId | null;
  secondary: FitnessGoalId[];
};

export function getFitnessGoals(): FitnessGoalsState {
  return readJson<FitnessGoalsState>(GOALS_KEY, { primary: null, secondary: [] });
}

export function saveFitnessGoals(state: FitnessGoalsState): void {
  writeJson(GOALS_KEY, state);
}

export function toggleFitnessGoal(id: FitnessGoalId): FitnessGoalsState {
  const current = getFitnessGoals();
  let { primary, secondary } = current;
  if (!primary || primary === id) {
    primary = primary === id ? null : id;
    secondary = secondary.filter((s) => s !== id);
  } else if (secondary.includes(id)) {
    secondary = secondary.filter((s) => s !== id);
  } else {
    secondary = [...secondary.filter((s) => s !== id), id];
  }
  const next = { primary, secondary };
  saveFitnessGoals(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('joebod-goals-updated'));
  }
  return next;
}

export function goalLabel(id: FitnessGoalId | null): string | null {
  if (!id) return null;
  return FITNESS_GOALS.find((g) => g.id === id)?.label ?? null;
}
