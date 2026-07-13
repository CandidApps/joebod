'use client';

import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GoogleHealthConnectCard } from '@/components/GoogleHealthConnectCard';
import { BrandMark, BRAND_VARIANTS, readBrandVariant, writeBrandVariant } from '@/components/BrandMark';
import { InstallBanner } from '@/components/InstallBanner';
import { FitnessDashboard } from '@/components/fitness/FitnessDashboard';
import { WorkoutLog } from '@/components/fitness/WorkoutLog';
import { HealthViews } from '@/components/health/HealthViews';
import {
  getOrCreateTodaySession,
  labelForDayType,
  listSessions,
} from '@/lib/fitness-store';
import type { FitnessTab, HealthTab, Mode, WorkoutSession } from '@/lib/types';
import { formatDuration } from '@/lib/storage';

const FITNESS_TABS: { id: FitnessTab; label: string }[] = [
  { id: 'dashboard', label: 'Home' },
  { id: 'log', label: 'Log' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

const HEALTH_TABS: { id: HealthTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'labs', label: 'Labs' },
  { id: 'genetics', label: 'Genetics' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'meds', label: 'Meds' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'account', label: 'Account' },
];

export function EclipseApp() {
  const [mode, setMode] = useState<Mode>('fitness');
  const [fitnessTab, setFitnessTab] = useState<FitnessTab>('dashboard');
  const [healthTab, setHealthTab] = useState<HealthTab>('dashboard');
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = () => {
      try {
        const next = getOrCreateTodaySession();
        if (!cancelled) {
          setSession(next);
          setBootError(null);
        }
      } catch (err) {
        console.error('JOEbod boot failed', err);
        if (!cancelled) {
          // In-memory fallback so the UI never sticks on Loading
          setSession({
            id: `fallback-${Date.now()}`,
            date: new Date().toISOString().slice(0, 10),
            dayType: 'push',
            startedAt: null,
            endedAt: null,
            durationSec: 0,
            exercises: [],
          });
          setBootError(err instanceof Error ? err.message : 'Boot failed');
        }
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!session) {
    return (
      <div className="app-shell">
        <ThemeToggle />
        <BrandMark />
        <div className="sub">Loading…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ThemeToggle />
      {bootError ? (
        <div className="install-banner" style={{ marginBottom: 12 }}>
          <div>
            <strong>Running in memory only</strong>
            <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>{bootError}</div>
          </div>
        </div>
      ) : null}
      <InstallBanner />

      {mode === 'fitness' ? (
        fitnessTab === 'dashboard' ? (
          <FitnessDashboard
            session={session}
            onChange={setSession}
            onOpenLog={() => setFitnessTab('log')}
          />
        ) : fitnessTab === 'log' ? (
          <WorkoutLog session={session} onChange={setSession} />
        ) : fitnessTab === 'history' ? (
          <HistoryView />
        ) : (
          <SettingsView />
        )
      ) : (
        <HealthViews tab={healthTab} onTab={setHealthTab} />
      )}

      <div className="bottom-chrome">
        <div className="mode-switch">
          <button
            type="button"
            className={`modebtn${mode === 'fitness' ? ' active' : ''}`}
            onClick={() => setMode('fitness')}
          >
            Fitness
          </button>
          <button
            type="button"
            className={`modebtn${mode === 'health' ? ' active' : ''}`}
            onClick={() => setMode('health')}
          >
            Health
          </button>
        </div>
        <nav className="bottom-nav" aria-label="Primary">
          {mode === 'fitness'
            ? FITNESS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`navbtn${fitnessTab === t.id ? ' active' : ''}`}
                  onClick={() => setFitnessTab(t.id)}
                >
                  {t.label}
                </button>
              ))
            : HEALTH_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`navbtn${healthTab === t.id ? ' active' : ''}`}
                  onClick={() => setHealthTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
        </nav>
      </div>
    </div>
  );
}

function HistoryView() {
  const sessions = listSessions().filter(
    (s) => s.endedAt || s.exercises.some((e) => e.sets.some((x) => x.completed)),
  );
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="brand">HISTORY</div>
          <div className="sub">Progress over time</div>
        </div>
      </div>
      {sessions.length === 0 ? (
        <p className="empty">Completed workouts will show up here.</p>
      ) : (
        <div className="log-list">
          {sessions.map((s) => (
            <div key={s.id} className="log-row">
              <div>
                <strong>{labelForDayType(s.dayType)}</strong>
                <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 4 }}>{s.date}</div>
              </div>
              <div style={{ color: 'var(--text-dim)', textAlign: 'right' }}>
                <div>{formatDuration(s.durationSec)}</div>
                <div style={{ fontSize: 12 }}>
                  {s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.completed).length, 0)} sets
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsView() {
  const [variant, setVariant] = useState(() =>
    typeof window === 'undefined' ? ('gradient' as const) : readBrandVariant(),
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <BrandMark />
          <div className="sub">Settings</div>
        </div>
      </div>

      <div className="card glass mb14">
        <div className="h-supp-name">Logo variants</div>
        <div className="h-supp-note" style={{ marginTop: 6 }}>
          Pick a JOEbod look. Neon green + blue flavors.
        </div>
        <div className="logo-grid">
          {BRAND_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`logo-pick${variant === v.id ? ' active' : ''}`}
              onClick={() => {
                writeBrandVariant(v.id);
                setVariant(v.id);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.logo} alt={v.label} />
              <div className="logo-pick-meta">
                <strong>{v.label}</strong>
                <span>{v.note}</span>
              </div>
              <div className="logo-pick-live">
                <BrandMark variant={v.id} underline />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card glass mb14">
        <div className="h-supp-name">Appearance</div>
        <div className="h-supp-note" style={{ marginTop: 6 }}>
          Use Light / Dark in the top-right on any screen. Your choice is saved on this device.
        </div>
      </div>

      <GoogleHealthConnectCard />

      <div className="card glass mb14">
        <div className="h-supp-name">Local-first data</div>
        <div className="h-supp-note" style={{ marginTop: 6 }}>
          Workouts, sleep, meds, nutrition, BP, and weight are stored in this phone&apos;s browser
          (localStorage). Clearing site data will erase logs.
        </div>
      </div>
      <div className="card glass mb14">
        <div className="h-supp-name">Rest timer defaults</div>
        <div className="h-supp-note" style={{ marginTop: 6 }}>
          Use the Rest Timer presets on Home/Log. Your last choice is remembered automatically.
        </div>
      </div>
      <div className="card glass">
        <div className="h-supp-name">Vercel hosting</div>
        <div className="h-supp-note" style={{ marginTop: 6 }}>
          Deploy JOEbod to Vercel, then Add to Home Screen from Safari/Chrome for gym use.
        </div>
      </div>
    </div>
  );
}
