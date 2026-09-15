import { getAccentColor, getPrimaryColor, loadAppearanceColors, saveAccentColor, savePrimaryColor } from '@/lib/appearance';
import { getFitnessGoals, saveFitnessGoals } from '@/lib/fitness-goals';
import { getFitnessPrefs, saveFitnessPrefs } from '@/lib/fitness-prefs';
import { listSessions, saveSessions } from '@/lib/fitness-store';
import { readJson, writeJson } from '@/lib/storage';
import {
  exportWeekAssignments,
  getSplitId,
  importExerciseConfigs,
  listAllExerciseConfigs,
  setSplitId,
  type SplitId,
} from '@/lib/training-split';
import { loadWeightLog, saveWeightLog } from '@/lib/weight-log';

export type JoebodBackup = {
  v: number;
  exportedAt: string;
  sessions: ReturnType<typeof listSessions>;
  exerciseConfigs: Record<string, string[]>;
  splitId: string;
  weekAssignments: Record<string, unknown>;
  goals: ReturnType<typeof getFitnessGoals>;
  prefs: ReturnType<typeof getFitnessPrefs>;
  primaryColor: string;
  accentColor: string;
  weightLog: ReturnType<typeof loadWeightLog>;
  brandVariant?: string | null;
};

export function exportBackup(): string {
  const backup: JoebodBackup = {
    v: 6,
    exportedAt: new Date().toISOString(),
    sessions: listSessions(),
    exerciseConfigs: listAllExerciseConfigs(),
    splitId: getSplitId(),
    weekAssignments: exportWeekAssignments(),
    goals: getFitnessGoals(),
    prefs: getFitnessPrefs(),
    primaryColor: getPrimaryColor(),
    accentColor: getAccentColor(),
    weightLog: loadWeightLog(),
    brandVariant: readJson<string | null>('joebod-brand-variant-v1', null),
  };
  return JSON.stringify(backup);
}

export function importBackup(text: string): { ok: true } | { ok: false; error: string } {
  try {
    const backup = JSON.parse(text) as Partial<JoebodBackup> & {
      logs?: Record<string, string>;
      configs?: Record<string, string>;
      colorMode?: string;
      units?: string;
    };

    // Native JOEbod v6 shape
    if (Array.isArray(backup.sessions)) {
      saveSessions(backup.sessions);
    }

    if (backup.exerciseConfigs) {
      importExerciseConfigs(backup.exerciseConfigs);
    }

    // HTML Eclipse configs: config:push → JSON array
    if (backup.configs && typeof backup.configs === 'object') {
      const mapped: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(backup.configs)) {
        const day = k.replace(/^config:/, '');
        try {
          const list = typeof v === 'string' ? JSON.parse(v) : v;
          if (Array.isArray(list)) mapped[day] = list as string[];
        } catch {
          // skip
        }
      }
      importExerciseConfigs(mapped);
    }

    if (backup.splitId && ['ppl', 'arnold', 'upperlower', 'fullbody'].includes(backup.splitId)) {
      setSplitId(backup.splitId as SplitId);
    }

    if (backup.weekAssignments) {
      for (const [k, v] of Object.entries(backup.weekAssignments)) {
        try {
          const parsed = typeof v === 'string' ? JSON.parse(v) : v;
          writeJson(k.includes('eclipse-week') ? k : `eclipse-week-assignment-v1:${k.replace(/^weekAssignment:/, '')}`, parsed);
        } catch {
          // skip
        }
      }
    }

    if (backup.goals) saveFitnessGoals(backup.goals as ReturnType<typeof getFitnessGoals>);
    if (backup.prefs) saveFitnessPrefs(backup.prefs);
    if (backup.units === 'kg' || backup.units === 'lb') {
      saveFitnessPrefs({ unit: backup.units });
    }
    if (backup.primaryColor) savePrimaryColor(backup.primaryColor);
    if (backup.accentColor) saveAccentColor(backup.accentColor);
    if (Array.isArray(backup.weightLog)) saveWeightLog(backup.weightLog);
    if (backup.brandVariant) writeJson('joebod-brand-variant-v1', backup.brandVariant);
    if (backup.colorMode === 'light' || backup.colorMode === 'dark') {
      document.documentElement.setAttribute('data-theme', backup.colorMode);
      writeJson('joebod-theme-v1', backup.colorMode);
    }

    loadAppearanceColors();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('joebod-training-updated'));
      window.dispatchEvent(new Event('joebod-goals-updated'));
      window.dispatchEvent(new Event('joebod-prefs-updated'));
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid backup' };
  }
}
