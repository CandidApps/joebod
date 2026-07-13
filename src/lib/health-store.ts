import type {
  AccountProfile,
  BpLog,
  LabRow,
  MedCheckin,
  NutritionLog,
  SleepLog,
  WeighIn,
} from '@/lib/types';
import { newId, readJson, writeJson } from '@/lib/storage';

const SLEEP_KEY = 'eclipse-sleep-logs-v1';
const MED_KEY = 'eclipse-med-checkins-v1';
const NUTRITION_KEY = 'eclipse-nutrition-logs-v1';
const BP_KEY = 'eclipse-bp-logs-v1';
const WEIGHT_KEY = 'eclipse-weigh-ins-v1';
const ACCOUNT_KEY = 'eclipse-account-v1';

export const DEFAULT_ACCOUNT: AccountProfile = {
  name: 'Joe',
  goalWeightLbs: 150,
  heightIn: 68,
  primaryGoal: 'Strength + longevity',
};

export const SEED_LABS: LabRow[] = [
  { marker: 'HbA1c', value: '5.4%', reference: '<5.7%', status: 'green', statusLabel: 'Optimal', date: 'Aug 2025' },
  { marker: 'Total Cholesterol', value: '223 mg/dL', reference: '<200', status: 'amber', statusLabel: 'Elevated', date: 'Aug 2025' },
  { marker: 'LDL', value: '121 mg/dL', reference: '<100 optimal', status: 'amber', statusLabel: 'Near-optimal', date: 'Aug 2025' },
  { marker: 'HDL', value: '87 mg/dL', reference: '>40', status: 'green', statusLabel: 'Excellent', date: 'Aug 2025' },
  { marker: 'Chol/HDL Ratio', value: '2.6', reference: '3.5–5.0 avg', status: 'green', statusLabel: 'Excellent', date: 'Aug 2025' },
  { marker: 'Triglycerides', value: '77 mg/dL', reference: '<150', status: 'green', statusLabel: 'Optimal', date: 'Aug 2025' },
  { marker: 'Fasting Glucose', value: '107 mg/dL', reference: '70–99', status: 'amber', statusLabel: 'Watch', date: 'Aug 2025' },
  { marker: 'TSH', value: '1.14 mIU/L', reference: '0.30–5.33', status: 'green', statusLabel: 'Normal', date: 'Jan 2026' },
  { marker: 'Free T4', value: '1.22 ng/dL', reference: '0.54–1.24', status: 'green', statusLabel: 'Normal', date: 'Jan 2026' },
  { marker: 'WBC', value: '3.4 K/µL', reference: '3.6–12.9', status: 'amber', statusLabel: 'Low — chronic', date: 'Aug 2025' },
  { marker: 'Vitamin B12', value: '809 pg/mL', reference: '232–1245', status: 'green', statusLabel: 'Optimal', date: 'Aug 2025' },
  { marker: 'Testosterone Total', value: '391 ng/dL', reference: '300–900', status: 'blue', statusLabel: 'Due for retest', date: '2021' },
  { marker: 'Vitamin D', value: '54.7 ng/mL', reference: '30–80', status: 'blue', statusLabel: 'Due for retest', date: '2021' },
];

export const ACTIVE_MEDS = [
  { name: 'Levothyroxine (Synthroid) 137mcg', detail: '1 tablet every morning on empty stomach · 30 min before food · 6 days/week, ½ tablet Sunday', color: 'var(--h-teal)' },
  { name: 'Budesonide-Formoterol (Symbicort) 160/4.5mcg', detail: '2 puffs inhaled 2x daily · Maintenance for moderate persistent asthma', color: 'var(--h-blue)' },
  { name: 'Albuterol HFA 90mcg', detail: '2 puffs every 4 hrs as needed · Rescue inhaler', color: 'var(--h-blue)' },
  { name: 'Trazodone 50mg', detail: '1 tablet nightly · Primary insomnia', color: 'var(--h-purple)' },
];

export const SUPPLEMENTS = [
  { when: 'Morning — With Breakfast (4hr+ after Levothyroxine)', name: "Garden of Life Men's Multi", dose: '2 tablets', note: 'Take with fattiest morning meal. 4hr minimum after Levothyroxine.', flag: 'red' as const, flagText: '4hr gap from Levothyroxine' },
  { when: 'Morning — With Breakfast (4hr+ after Levothyroxine)', name: 'Vitamin D3 2000IU', dose: '1 softgel', note: 'Fat-soluble — take with food. Due for retest.', flag: 'amber' as const, flagText: 'Check total D3 across supplements' },
  { when: 'Pre-Workout', name: 'Essential Amino Acids (EAAs)', dose: 'Per label', note: '20–30 min pre-workout on training days.', flag: null, flagText: '' },
  { when: 'Post-Workout', name: 'Levels Grass Fed Whey', dose: '1–2 scoops', note: 'Within 30 min post-workout + banana.', flag: null, flagText: '' },
  { when: 'Evening', name: 'Ashwagandha', dose: 'Per label', note: 'With dinner. May affect thyroid — mention to endocrinology.', flag: 'amber' as const, flagText: 'May affect thyroid hormones' },
];

export const CONDITIONS = [
  { name: 'Post-thyroidectomy (partial)', detail: 'On Levothyroxine replacement · NM Endocrinology', color: 'var(--h-teal)' },
  { name: 'Moderate persistent asthma', detail: 'Symbicort maintenance · Albuterol rescue', color: 'var(--h-blue)' },
  { name: 'Primary insomnia', detail: 'Trazodone 50mg nightly', color: 'var(--h-purple)' },
  { name: 'CHEK2 pathogenic variant', detail: 'Elevated cancer surveillance protocol', color: 'var(--h-amber)' },
  { name: 'Chronic leukopenia', detail: 'WBC ~3.4 — monitored; benign per prior workup', color: 'var(--h-red)' },
];

export const GENETICS_NOTES = [
  { title: 'CHEK2', body: 'Pathogenic variant — follow cancer counseling protocol: PSA, colonoscopy, dermatology, and physician-directed labs.' },
  { title: 'Action items', body: 'Retest testosterone + Vitamin D. Keep sleep consistent — DNA repair pathways matter with CHEK2.' },
];

export function getAccount(): AccountProfile {
  return readJson(ACCOUNT_KEY, DEFAULT_ACCOUNT);
}

export function saveAccount(profile: AccountProfile): void {
  writeJson(ACCOUNT_KEY, profile);
}

function asArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export function listSleep(): SleepLog[] {
  return asArray<SleepLog>(readJson(SLEEP_KEY, [])).sort((a, b) => b.date.localeCompare(a.date));
}

export function addSleep(entry: Omit<SleepLog, 'id'>): SleepLog {
  const row = { ...entry, id: newId() };
  writeJson(SLEEP_KEY, [row, ...listSleep()]);
  return row;
}

export function listMeds(): MedCheckin[] {
  return asArray<MedCheckin>(readJson(MED_KEY, [])).sort((a, b) => b.date.localeCompare(a.date));
}

export function addMedCheckin(entry: Omit<MedCheckin, 'id'>): MedCheckin {
  const row = { ...entry, id: newId() };
  writeJson(MED_KEY, [row, ...listMeds()]);
  return row;
}

export function listNutrition(): NutritionLog[] {
  return asArray<NutritionLog>(readJson(NUTRITION_KEY, [])).sort((a, b) => b.date.localeCompare(a.date));
}

export function addNutrition(entry: Omit<NutritionLog, 'id'>): NutritionLog {
  const row = { ...entry, id: newId() };
  writeJson(NUTRITION_KEY, [row, ...listNutrition()]);
  return row;
}

export function listBp(): BpLog[] {
  return asArray<BpLog>(readJson(BP_KEY, [])).sort((a, b) => b.date.localeCompare(a.date));
}

export function addBp(entry: Omit<BpLog, 'id'>): BpLog {
  const row = { ...entry, id: newId() };
  writeJson(BP_KEY, [row, ...listBp()]);
  return row;
}

export function listWeights(): WeighIn[] {
  return asArray<WeighIn>(readJson(WEIGHT_KEY, [])).sort((a, b) => b.date.localeCompare(a.date));
}

export function addWeight(entry: Omit<WeighIn, 'id'>): WeighIn {
  const row = { ...entry, id: newId() };
  writeJson(WEIGHT_KEY, [row, ...listWeights()]);
  return row;
}

export function latestWeight(): number {
  return listWeights()[0]?.lbs ?? 155;
}
