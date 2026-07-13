'use client';

import { useMemo, useState } from 'react';
import { BrandMark } from '@/components/BrandMark';
import {
  ACTIVE_MEDS,
  CONDITIONS,
  GENETICS_NOTES,
  SEED_LABS,
  SUPPLEMENTS,
  addBp,
  addMedCheckin,
  addNutrition,
  addSleep,
  addWeight,
  getAccount,
  latestWeight,
  listBp,
  listMeds,
  listNutrition,
  listSleep,
  listWeights,
  saveAccount,
} from '@/lib/health-store';
import type { AccountProfile, HealthTab } from '@/lib/types';
import { todayKey } from '@/lib/storage';

type Props = {
  tab: HealthTab;
  onTab: (tab: HealthTab) => void;
};

export function HealthViews({ tab, onTab }: Props) {
  if (tab === 'dashboard') return <HealthDashboard onTab={onTab} />;
  if (tab === 'labs') return <LabsView />;
  if (tab === 'genetics') return <GeneticsView />;
  if (tab === 'conditions') return <ConditionsView />;
  if (tab === 'meds') return <MedsView />;
  if (tab === 'sleep') return <SleepView />;
  if (tab === 'nutrition') return <NutritionView />;
  return <AccountView />;
}

function Header({ title, onAccount }: { title: string; onAccount?: () => void }) {
  return (
    <div className="page-header">
      <div>
        <BrandMark />
        <div className="sub">{title}</div>
      </div>
      {onAccount ? (
        <button type="button" className="btn btn-ghost" style={{ minHeight: 40, padding: '8px 12px' }} onClick={onAccount}>
          Account
        </button>
      ) : null}
    </div>
  );
}

function HealthDashboard({ onTab }: { onTab: (t: HealthTab) => void }) {
  const weight = latestWeight();
  const sleep = listSleep()[0];
  return (
    <div>
      <Header title="Health · Today" onAccount={() => onTab('account')} />
      <div className="h-alert warn">
        <div>
          <strong>Blood pressure history — keep monitoring.</strong> Prior spike record exists; recent reading
          context is in Medications. Log BP regularly.
        </div>
      </div>
      <div className="h-g4 mb14">
        <Metric label="Resting HR" value="58" unit="bpm" sub="Athletic baseline" src="HealthEx" />
        <Metric label="Weight" value={String(weight)} unit="lbs" sub="Shared · Fitness log" src="Local" />
        <Metric label="SpO₂" value="97–100" unit="%" sub="Consistently normal" src="HealthEx" />
        <Metric label="TSH" value="1.14" unit="mIU/L" sub="Normal · Jan 2026" src="HealthEx" />
      </div>
      <div className="card glass mb14">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Sleep — Last Night</div>
        {sleep ? (
          <div className="empty" style={{ color: 'var(--text)' }}>
            {sleep.hours}h · quality {sleep.quality}/5{sleep.notes ? ` · ${sleep.notes}` : ''}
          </div>
        ) : (
          <div className="empty">No sleep log yet. Capture it on the Sleep tab.</div>
        )}
        <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => onTab('sleep')}>
          Log sleep
        </button>
      </div>
      <div className="section-title">Daily insights</div>
      <Insight color="var(--h-amber)" title="LDL slightly elevated" note="LDL 121 mg/dL (near-optimal). HbA1c 5.4% excellent. Keep low-glycemic pattern." />
      <Insight color="var(--h-teal)" title="Resting HR — excellent" note="58 bpm athletic sinus bradycardia baseline." />
      <Insight color="var(--h-red)" title="Leukopenia — monitor" note="WBC 3.4 flagged chronically. Recheck with next CBC." />
      <Insight color="var(--h-purple)" title="Today's training" note="Check Fitness tab. Symbicort before training if asthma is active." />
    </div>
  );
}

function LabsView() {
  return (
    <div>
      <Header title="Health · Labs & Vitals" />
      <div className="h-g4 mb14">
        <Metric label="Heart Rate" value="58" unit="bpm" sub="Range 50–69" src="HealthEx" />
        <Metric label="Blood Pressure" value="100/80" unit="mmHg" sub="Improved" src="HealthEx" />
        <Metric label="Weight" value={String(latestWeight())} unit="lbs" sub="Shared" src="Local" />
        <Metric label="BMI" value="23.6" unit="" sub="Normal range" src="HealthEx" />
      </div>
      <div className="h-sh">
        <h2>Full Lab Panel</h2>
        <span className="h-badge">Seeded from records</span>
      </div>
      <div className="card glass h-table-wrap">
        <table className="h-table">
          <thead>
            <tr>
              <th>Marker</th>
              <th>Value</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {SEED_LABS.map((row) => (
              <tr key={row.marker}>
                <td>{row.marker}</td>
                <td>{row.value}</td>
                <td>{row.reference}</td>
                <td>
                  <span className={`h-pill ${row.status}`}>{row.statusLabel}</span>
                </td>
                <td>{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeneticsView() {
  return (
    <div>
      <Header title="Health · Genetics" />
      {GENETICS_NOTES.map((n) => (
        <div key={n.title} className="h-supp-item">
          <div className="h-supp-name">{n.title}</div>
          <div className="h-supp-note" style={{ marginTop: 6 }}>
            {n.body}
          </div>
        </div>
      ))}
      <div className="card glass">
        <div className="h-supp-name" style={{ marginBottom: 8 }}>
          Counseling reference
        </div>
        <div className="empty">
          Multi-gene cancer panel findings and surveillance plan live here. Keep PSA, colonoscopy, skin checks, and
          endocrinology follow-ups current.
        </div>
      </div>
    </div>
  );
}

function ConditionsView() {
  return (
    <div>
      <Header title="Health · Conditions" />
      <div className="card glass">
        {CONDITIONS.map((c) => (
          <div key={c.name} className="h-item">
            <div className="h-item-dot" style={{ background: c.color }} />
            <div>
              <div className="h-item-name">{c.name}</div>
              <div className="h-item-detail">{c.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MedsView() {
  const [rows, setRows] = useState(() => listMeds());
  const [bpRows, setBpRows] = useState(() => listBp());
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');

  return (
    <div>
      <Header title="Health · Medications" />
      <div className="h-alert danger">
        <div>
          <strong>Critical Levothyroxine timing:</strong> take first thing on an empty stomach, then wait at least 4
          hours before multi/calcium/magnesium/iron.
        </div>
      </div>
      <div className="h-sh">
        <h2>Prescribed — Active</h2>
      </div>
      <div className="card glass mb14">
        {ACTIVE_MEDS.map((m) => (
          <div key={m.name} className="h-item">
            <div className="h-item-dot" style={{ background: m.color }} />
            <div style={{ flex: 1 }}>
              <div className="h-item-name">{m.name}</div>
              <div className="h-item-detail">{m.detail}</div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 8, minHeight: 40 }}
                onClick={() => {
                  addMedCheckin({ date: todayKey(), name: m.name, taken: true });
                  setRows(listMeds());
                }}
              >
                Mark taken today
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="h-sh">
        <h2>Supplement stack</h2>
      </div>
      {SUPPLEMENTS.map((s) => (
        <div key={s.name} className="h-supp-item">
          <div className="h-eyebrow" style={{ color: 'var(--h-teal)', marginTop: 0 }}>
            {s.when}
          </div>
          <div className="h-supp-name">
            {s.name} <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>· {s.dose}</span>
          </div>
          <div className="h-supp-note" style={{ marginTop: 6 }}>
            {s.note}
          </div>
          {s.flag ? <div className={`h-supp-flag ${s.flag}`}>{s.flagText}</div> : null}
        </div>
      ))}

      <div className="h-sh">
        <h2>Blood pressure log</h2>
      </div>
      <div className="card glass mb14">
        <form
          className="log-form"
          onSubmit={(e) => {
            e.preventDefault();
            addBp({
              date: todayKey(),
              systolic: Number(sys),
              diastolic: Number(dia),
            });
            setSys('');
            setDia('');
            setBpRows(listBp());
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label>
              Systolic
              <input value={sys} onChange={(e) => setSys(e.target.value)} inputMode="numeric" required />
            </label>
            <label>
              Diastolic
              <input value={dia} onChange={(e) => setDia(e.target.value)} inputMode="numeric" required />
            </label>
          </div>
          <button type="submit" className="btn btn-primary">
            Save BP reading
          </button>
        </form>
        <div className="log-list">
          {bpRows.slice(0, 8).map((r) => (
            <div key={r.id} className="log-row">
              <span>
                {r.systolic}/{r.diastolic}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{r.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">Recent med check-ins</div>
      <div className="log-list">
        {rows.slice(0, 8).map((r) => (
          <div key={r.id} className="log-row">
            <span>{r.name.split('(')[0]}</span>
            <span style={{ color: 'var(--text-dim)' }}>{r.date}</span>
          </div>
        ))}
        {rows.length === 0 ? <p className="empty">No check-ins yet.</p> : null}
      </div>
    </div>
  );
}

function SleepView() {
  const [rows, setRows] = useState(() => listSleep());
  const [hours, setHours] = useState('7.5');
  const [quality, setQuality] = useState('3');
  const [notes, setNotes] = useState('');

  return (
    <div>
      <Header title="Health · Sleep" />
      <div className="h-alert info">
        <div>
          Primary insomnia is an active condition. You&apos;re prescribed <strong>Trazodone 50mg nightly</strong>. Log
          quality each morning.
        </div>
      </div>
      <div className="card glass mb14">
        <form
          className="log-form"
          onSubmit={(e) => {
            e.preventDefault();
            addSleep({
              date: todayKey(),
              hours: Number(hours),
              quality: Number(quality) as 1 | 2 | 3 | 4 | 5,
              notes: notes.trim() || undefined,
            });
            setNotes('');
            setRows(listSleep());
          }}
        >
          <label>
            Hours slept
            <input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" required />
          </label>
          <label>
            Quality (1–5)
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </label>
          <button type="submit" className="btn btn-primary">
            Save sleep log
          </button>
        </form>
      </div>
      <div className="log-list">
        {rows.slice(0, 14).map((r) => (
          <div key={r.id} className="log-row">
            <span>
              {r.hours}h · Q{r.quality}
              {r.notes ? ` · ${r.notes}` : ''}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>{r.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NutritionView() {
  const [rows, setRows] = useState(() => listNutrition());
  const [meal, setMeal] = useState('Post-workout');
  const [notes, setNotes] = useState('');
  const [protein, setProtein] = useState(true);

  return (
    <div>
      <Header title="Health · Nutrition" />
      <div className="card glass mb14">
        <div className="empty" style={{ color: 'var(--text)', marginBottom: 10 }}>
          Keep it gym-simple: log the meal that matters (especially post-workout protein).
        </div>
        <form
          className="log-form"
          onSubmit={(e) => {
            e.preventDefault();
            addNutrition({ date: todayKey(), meal, notes: notes.trim(), protein });
            setNotes('');
            setRows(listNutrition());
          }}
        >
          <label>
            Meal
            <select value={meal} onChange={(e) => setMeal(e.target.value)}>
              {['Breakfast', 'Lunch', 'Dinner', 'Post-workout', 'Snack'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Whey + banana, etc." required />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={protein} onChange={(e) => setProtein(e.target.checked)} />
            Hit protein target
          </label>
          <button type="submit" className="btn btn-primary">
            Save nutrition log
          </button>
        </form>
      </div>
      <div className="log-list">
        {rows.slice(0, 14).map((r) => (
          <div key={r.id} className="log-row">
            <span>
              {r.meal}
              {r.protein ? ' · protein ✓' : ''} — {r.notes}
            </span>
            <span style={{ color: 'var(--text-dim)' }}>{r.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountView() {
  const [profile, setProfile] = useState<AccountProfile>(() => getAccount());
  const [weight, setWeight] = useState('');
  const weights = useMemo(() => listWeights(), [profile, weight]);

  return (
    <div>
      <Header title="Health · Account" />
      <div className="card glass mb14">
        <form
          className="log-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveAccount(profile);
          }}
        >
          <label>
            Name
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label>
            Primary goal
            <input
              value={profile.primaryGoal}
              onChange={(e) => setProfile({ ...profile, primaryGoal: e.target.value })}
            />
          </label>
          <label>
            Goal weight (lbs)
            <input
              type="number"
              value={profile.goalWeightLbs}
              onChange={(e) => setProfile({ ...profile, goalWeightLbs: Number(e.target.value) || 0 })}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            Save profile
          </button>
        </form>
      </div>

      <div className="card glass mb14">
        <div className="h-supp-name" style={{ marginBottom: 10 }}>
          Weigh-in
        </div>
        <form
          className="log-form"
          onSubmit={(e) => {
            e.preventDefault();
            addWeight({ date: todayKey(), lbs: Number(weight) });
            setWeight('');
          }}
        >
          <label>
            Weight (lbs)
            <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" required />
          </label>
          <button type="submit" className="btn btn-primary">
            Log weight
          </button>
        </form>
        <div className="log-list">
          {weights.slice(0, 10).map((w) => (
            <div key={w.id} className="log-row">
              <span>{w.lbs} lbs</span>
              <span style={{ color: 'var(--text-dim)' }}>{w.date}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card glass">
        <div className="h-supp-name" style={{ marginBottom: 8 }}>
          Install on phone
        </div>
        <div className="empty">
          Use Add to Home Screen so JOEbod opens fullscreen at the gym. Data stays in this browser via localStorage
          until you add cloud sync later.
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  sub,
  src,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  src: string;
}) {
  return (
    <div className="card glass h-metric">
      <div className="h-metric-label">{label}</div>
      <div className="h-metric-val">
        {value}
        {unit ? <span className="h-metric-unit">{unit}</span> : null}
      </div>
      <div className="h-metric-sub">{sub}</div>
      <div className="h-metric-src">{src}</div>
    </div>
  );
}

function Insight({ color, title, note }: { color: string; title: string; note: string }) {
  return (
    <div className="h-supp-item" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="h-supp-name">{title}</div>
      <div className="h-supp-note" style={{ marginTop: 4 }}>
        {note}
      </div>
    </div>
  );
}
