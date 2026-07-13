export type Mode = 'fitness' | 'health';

export type FitnessTab = 'dashboard' | 'log' | 'history' | 'settings';

export type HealthTab =
  | 'dashboard'
  | 'labs'
  | 'genetics'
  | 'conditions'
  | 'meds'
  | 'sleep'
  | 'nutrition'
  | 'account';

export type DayType = 'push' | 'pull' | 'legs' | 'rest' | 'zone2';

export type WorkoutSet = {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
};

export type ExerciseLog = {
  id: string;
  name: string;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: string;
  date: string; // YYYY-MM-DD
  dayType: DayType;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  exercises: ExerciseLog[];
};

export type SleepLog = {
  id: string;
  date: string;
  hours: number;
  quality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
};

export type MedCheckin = {
  id: string;
  date: string;
  name: string;
  taken: boolean;
};

export type NutritionLog = {
  id: string;
  date: string;
  meal: string;
  notes: string;
  protein?: boolean;
};

export type BpLog = {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
};

export type WeighIn = {
  id: string;
  date: string;
  lbs: number;
};

export type AccountProfile = {
  name: string;
  goalWeightLbs: number;
  heightIn: number;
  primaryGoal: string;
};

export type LabRow = {
  marker: string;
  value: string;
  reference: string;
  status: 'green' | 'amber' | 'blue';
  statusLabel: string;
  date: string;
};
