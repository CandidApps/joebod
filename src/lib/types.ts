export type FitnessTab = 'dashboard' | 'log' | 'coach' | 'history' | 'settings';

export type DayType = 'push' | 'pull' | 'legs' | 'zone2' | 'rest' | 'custom';

export type SetType = 'working' | 'warmup' | 'drop' | 'failure' | 'backoff';

export type WorkoutSet = {
  id: string;
  reps: number;
  weight: number;
  completed: boolean;
  type?: SetType;
  rpe?: number | null;
  singleArm?: boolean;
  timeSec?: number | null;
};

export type ExerciseLog = {
  id: string;
  name: string;
  notes: string;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: string;
  date: string;
  dayType: DayType;
  /** template = weekly regimen; ai = Claude Coach */
  source?: 'template' | 'ai';
  title?: string;
  coachNotes?: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  exercises: ExerciseLog[];
};
