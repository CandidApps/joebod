import { NextResponse } from 'next/server';
import { getCoachConfig } from '@/lib/coach/config';

export async function GET() {
  const { configured, model } = getCoachConfig();
  return NextResponse.json({ configured, model: configured ? model : null });
}
