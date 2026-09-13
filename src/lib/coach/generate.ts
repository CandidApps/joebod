import { getCoachConfig } from '@/lib/coach/config';

export type CoachGenerateInput = {
  prompt: string;
  focus?: string;
  intensity?: 'tough' | 'very_tough' | 'max';
  durationMin?: number;
  recentSummary?: string;
};

export type CoachExerciseDraft = {
  name: string;
  notes: string;
  sets: { reps: number; weight: number }[];
};

export type CoachWorkoutDraft = {
  title: string;
  dayType: 'push' | 'pull' | 'legs' | 'zone2' | 'custom';
  notes: string;
  exercises: CoachExerciseDraft[];
};

const SYSTEM = `You are JOEbod Coach — a strength coach built into a personal gym app for Joe Dix.

Athlete profile (always apply unless the user overrides):
- Male, 50+ years old, excellent shape, advanced trainee
- Trains with machines, cables, and dumbbells (commercial gym)
- Wants hard, effective sessions — not fluff

Rules:
- Return ONLY valid JSON matching the schema. No markdown fences, no commentary.
- Prefer exercise names similar to JOEbod templates when sensible (Machine Chest Press, Incline Dumbbell Press, Overhead Press, Cable Fly, Tricep Pushdown, Lateral Raise, Lat Pulldown, Seated Cable Row, Assisted Pull-Up, Face Pull, Dumbbell Bicep Curl, Hammer Curl, Leg Press, Leg Extension, Seated Leg Curl, Hip Thrust Machine, Standing Calf Raise, Cable Glute Kickback, Zone 2 Walk / Bike). You may add other gym-standard names when needed.
- 4–8 exercises typically. Each exercise should have 2–4 working sets with suggested reps. Use weight 0 (user will fill loads).
- Put prescription detail in notes (tempo, RPE targets, rest, warm-up cues).
- dayType: push | pull | legs | zone2 | custom (use custom for mixed/specialty).
- No medical diagnosis. This is training programming, not healthcare advice.
- Intensity: tough = hard working sets; very_tough = near-failure emphasis; max = very advanced, high density / optional finishers.

JSON schema:
{
  "title": string,
  "dayType": "push" | "pull" | "legs" | "zone2" | "custom",
  "notes": string,
  "exercises": [
    {
      "name": string,
      "notes": string,
      "sets": [{ "reps": number, "weight": number }]
    }
  ]
}`;

function intensityLabel(i?: CoachGenerateInput['intensity']): string {
  if (i === 'max') return 'MAX effort — advanced density, finishers OK';
  if (i === 'very_tough') return 'Very tough — near failure on working sets';
  return 'Tough — challenging but repeatable';
}

export function buildCoachUserMessage(input: CoachGenerateInput): string {
  const parts = [
    `User request: ${input.prompt.trim()}`,
    input.focus ? `Focus: ${input.focus}` : null,
    `Intensity: ${intensityLabel(input.intensity)}`,
    input.durationMin ? `Target duration: about ${input.durationMin} minutes` : null,
    input.recentSummary ? `Recent training context:\n${input.recentSummary}` : null,
  ];
  return parts.filter(Boolean).join('\n');
}

function asFiniteInt(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.round(v));
}

function sanitizeWorkout(raw: unknown): CoachWorkoutDraft {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid workout payload');
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? 'Coach workout').trim().slice(0, 120) || 'Coach workout';
  const dayRaw = String(o.dayType ?? 'custom');
  const dayType = (['push', 'pull', 'legs', 'zone2', 'custom'].includes(dayRaw)
    ? dayRaw
    : 'custom') as CoachWorkoutDraft['dayType'];
  const notes = String(o.notes ?? '').trim().slice(0, 800);
  const list = Array.isArray(o.exercises) ? o.exercises : [];
  const exercises: CoachExerciseDraft[] = list
    .slice(0, 12)
    .map((ex) => {
      const e = (ex ?? {}) as Record<string, unknown>;
      const name = String(e.name ?? '').trim().slice(0, 80);
      if (!name) return null;
      const setsRaw = Array.isArray(e.sets) ? e.sets : [{ reps: 10, weight: 0 }];
      const sets = setsRaw.slice(0, 6).map((s) => {
        const row = (s ?? {}) as Record<string, unknown>;
        return {
          reps: Math.min(50, Math.max(1, asFiniteInt(row.reps, 10))),
          weight: Math.max(0, asFiniteInt(row.weight, 0)),
        };
      });
      if (sets.length === 0) sets.push({ reps: 10, weight: 0 });
      return {
        name,
        notes: String(e.notes ?? '').trim().slice(0, 400),
        sets,
      };
    })
    .filter((x): x is CoachExerciseDraft => Boolean(x));

  if (exercises.length === 0) throw new Error('Coach returned no exercises');
  return { title, dayType, notes, exercises };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Coach response was not JSON');
  }
}

export async function generateCoachWorkout(input: CoachGenerateInput): Promise<CoachWorkoutDraft> {
  const { apiKey, model, configured } = getCoachConfig();
  if (!configured) {
    throw new Error('Claude Coach is not configured. Set ANTHROPIC_API_KEY.');
  }
  if (!input.prompt.trim()) {
    throw new Error('Describe the workout you want.');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      temperature: 0.4,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildCoachUserMessage(input) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      res.status === 401
        ? 'Anthropic rejected the API key. Check ANTHROPIC_API_KEY.'
        : `Anthropic error (${res.status}): ${body.slice(0, 200) || res.statusText}`,
    );
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (data.content ?? [])
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n');
  if (!text) throw new Error('Empty response from Claude');
  return sanitizeWorkout(extractJson(text));
}
