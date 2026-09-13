import { NextRequest, NextResponse } from 'next/server';
import { getCoachConfig } from '@/lib/coach/config';
import { generateCoachWorkout, type CoachGenerateInput } from '@/lib/coach/generate';

export async function POST(req: NextRequest) {
  const { configured } = getCoachConfig();
  if (!configured) {
    return NextResponse.json(
      {
        error:
          'Claude Coach is not configured. Add ANTHROPIC_API_KEY in .env.local (dev) or Vercel Environment Variables (phone).',
      },
      { status: 503 },
    );
  }

  let body: CoachGenerateInput;
  try {
    body = (await req.json()) as CoachGenerateInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const workout = await generateCoachWorkout({
      prompt: String(body.prompt ?? ''),
      focus: body.focus ? String(body.focus) : undefined,
      intensity: body.intensity,
      durationMin: body.durationMin,
      recentSummary: body.recentSummary ? String(body.recentSummary) : undefined,
    });
    return NextResponse.json({ workout });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generate failed';
    const status = /not configured|API key/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
