'use client';

import { useState } from 'react';
import { deleteWeightEntry, loadWeightLog, type WeightEntry } from '@/lib/weight-log';
import { unitLabel } from '@/lib/fitness-prefs';

export function WeightHistoryPanel() {
  const [entries, setEntries] = useState<WeightEntry[]>(() => loadWeightLog());

  return (
    <div className="settings-block glass">
      <div className="settings-block-title">Weight History</div>
      {entries.length === 0 ? (
        <div className="weight-hist-empty">No weigh-ins logged yet.</div>
      ) : (
        [...entries].reverse().map((e) => (
          <div key={e.ts} className="weight-hist-row">
            <span>{e.date}</span>
            <span>
              <b>
                {e.weight} {unitLabel()}
              </b>
            </span>
            <button
              type="button"
              className="whr-del"
              aria-label="Delete weigh-in"
              onClick={() => setEntries(deleteWeightEntry(e.ts))}
            >
              ✕
            </button>
          </div>
        ))
      )}
      <div className="edit-note" style={{ marginTop: 10 }}>
        Tap an entry&apos;s delete icon to remove it. Log new weigh-ins from Profile when that screen is
        available.
      </div>
    </div>
  );
}
