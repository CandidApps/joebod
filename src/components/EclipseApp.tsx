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
import { FITNESS_GOALS, getFitnessGoals, toggleFitnessGoal, type FitnessGoalsState } from '@/lib/fitness-goals';
import { startGoogleHealthLiveSync } from '@/lib/google-health/sync-client';
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
    // Keep Fitbit / Google Health vitals fresh (30s — as close to watch as the cloud API allows)
    const stopLive = startGoogleHealthLiveSync(30_000);
    return () => {
      cancelled = true;
      stopLive();
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
        <div className="fitness-mode">
          {fitnessTab === 'dashboard' ? (
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
          )}
        </div>
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
          <div className="view-brand">History</div>
          <div className="view-sub">Progress over time</div>
        </div>
      </div>
      {sessions.length === 0 ? (
        <p className="recent-empty">Completed workouts will show up here.</p>
      ) : (
        <div className="history-daylist glass" style={{ padding: '6px 14px' }}>
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
  const [goals, setGoals] = useState<FitnessGoalsState>(() =>
    typeof window === 'undefined' ? { primary: null, secondary: [] } : getFitnessGoals(),
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="view-brand">Settings</div>
          <div className="view-sub">Make it yours</div>
        </div>
      </div>

      <div className="settings-block glass">
        <div className="settings-block-title">Fitness Goals</div>
        <div className="edit-note" style={{ marginBottom: 12 }}>
          Tap once to set as primary goal. Tap any other to add as secondary. Tap again to remove.
        </div>
        <div>
          {FITNESS_GOALS.map((g) => {
            const isPrimary = goals.primary === g.id;
            const isSecondary = goals.secondary.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                className={`goal-opt${isPrimary ? ' goal-primary' : ''}${isSecondary ? ' goal-secondary' : ''}`}
                style={{ width: '100%', textAlign: 'left', border: '1px solid var(--border)', marginBottom: 8 }}
                onClick={() => setGoals(toggleFitnessGoal(g.id))}
              >
                <div className="goal-opt-text">
                  <span className="goal-opt-label">{g.label}</span>
                  <span className="goal-opt-desc">{g.desc}</span>
                </div>
                {isPrimary ? <span className="goal-badge primary">Primary</span> : null}
                {isSecondary ? <span className="goal-badge secondary">Secondary</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="settings-block glass">
        <div className="settings-block-title">Logo variants</div>
        <div className="edit-note" style={{ marginBottom: 12 }}>
          Pick a JOEbod look for the brand mark elsewhere in the app.
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

      <div className="settings-block glass">
        <div className="settings-block-title">Appearance</div>
        <div className="edit-note">
          Use Light / Dark in the top-right on any screen. Your choice is saved on this device.
        </div>
      </div>

      <GoogleHealthConnectCard />

      <div className="settings-block glass">
        <div className="settings-block-title">Rest Timer</div>
        <div className="edit-note">
          Use the Rest Timer presets on Home/Log. Your last choice is remembered automatically. Sound /
          vibrate options work when your phone allows them (system volume + vibration settings).
        </div>
      </div>

      <div className="settings-block glass">
        <div className="settings-block-title">Local-first data</div>
        <div className="edit-note">
          Workouts are stored in this phone&apos;s browser (localStorage). Clearing site data will erase
          logs.
        </div>
      </div>
    </div>
  );
}
