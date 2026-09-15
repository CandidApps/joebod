'use client';

import { useCallback, useEffect, useState } from 'react';
import { renameExerciseInSessions } from '@/lib/fitness-store';
import {
  ADDON_DAY_TYPES,
  SPLITS,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  addExercise,
  allAvailableDayTypes,
  dayTypeLabel,
  getActiveDayTypeKeys,
  getDayExercises,
  getSplitId,
  getWeekAssignment,
  inferMuscleTag,
  moveExercise,
  removeExercise,
  renameExercise,
  saveWeekAssignment,
  setSplitId,
  type SplitId,
  type WeekdayKey,
} from '@/lib/training-split';

export function TrainingSettings() {
  const [splitId, setSplit] = useState<SplitId>('ppl');
  const [week, setWeek] = useState(getWeekAssignment('ppl'));
  const [editDay, setEditDay] = useState('push');
  const [exercises, setExercises] = useState<string[]>([]);
  const [newName, setNewName] = useState('');
  const [scheduleDay, setScheduleDay] = useState<WeekdayKey | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    const id = getSplitId();
    setSplit(id);
    setWeek(getWeekAssignment(id));
    const tabs = getActiveDayTypeKeys(id);
    setEditDay((d) => (tabs.includes(d) ? d : tabs[0] || 'push'));
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refresh();
    const onUp = () => refresh();
    window.addEventListener('joebod-training-updated', onUp);
    return () => window.removeEventListener('joebod-training-updated', onUp);
  }, [refresh]);

  useEffect(() => {
    setExercises(getDayExercises(editDay));
  }, [editDay, tick]);

  const tabs = getActiveDayTypeKeys(splitId);
  const available = allAvailableDayTypes(splitId);

  const pickSplit = (id: SplitId) => {
    setSplitId(id);
    setSplit(id);
    setWeek(getWeekAssignment(id));
    const nextTabs = getActiveDayTypeKeys(id);
    setEditDay(nextTabs[0] || Object.keys(SPLITS[id].dayTypes)[0]);
  };

  const toggleScheduleType = (wd: WeekdayKey, key: string) => {
    const next = { ...week };
    const list = [...(next[wd] || [])];
    next[wd] = list.includes(key) ? list.filter((t) => t !== key) : [...list, key];
    setWeek(next);
    saveWeekAssignment(next, splitId);
  };

  const onRename = (index: number, value: string) => {
    const result = renameExercise(editDay, index, value);
    if (result) {
      renameExerciseInSessions(editDay, result.oldName, result.newName);
      setExercises(getDayExercises(editDay));
    }
  };

  return (
    <>
      <div className="settings-block glass">
        <div className="settings-block-title">Training Split</div>
        <div className="split-picker">
          {(Object.keys(SPLITS) as SplitId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`split-opt${splitId === id ? ' selected' : ''}`}
              onClick={() => pickSplit(id)}
            >
              <span>{SPLITS[id].name}</span>
              {splitId === id ? <span className="check">✓</span> : null}
            </button>
          ))}
        </div>

        <div className="schedule-grid">
          {WEEKDAY_KEYS.map((wd) => {
            const types = (week[wd] || []).filter((t) => t !== 'rest');
            return (
              <button
                key={wd}
                type="button"
                className={`schedule-row${scheduleDay === wd ? ' open' : ''}`}
                onClick={() => setScheduleDay((d) => (d === wd ? null : wd))}
              >
                <span className="schedule-day">{WEEKDAY_LABELS[wd]}</span>
                <span className="schedule-types">
                  {types.length
                    ? types.map((t) => dayTypeLabel(t, splitId)).join(' + ')
                    : 'Rest'}
                </span>
              </button>
            );
          })}
        </div>

        {scheduleDay ? (
          <div className="schedule-sheet" style={{ marginTop: 12 }}>
            <div className="edit-note" style={{ marginBottom: 8 }}>
              {WEEKDAY_LABELS[scheduleDay]} — tap to toggle day-types
            </div>
            <div className="seg" style={{ flexWrap: 'wrap', gap: 8 }}>
              {[...Object.keys(available), ...Object.keys(ADDON_DAY_TYPES)]
                .filter((k, i, arr) => arr.indexOf(k) === i)
                .map((key) => {
                  const on = (week[scheduleDay] || []).includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={on ? 'on' : ''}
                      onClick={() => toggleScheduleType(scheduleDay, key)}
                    >
                      {dayTypeLabel(key, splitId)}
                    </button>
                  );
                })}
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 10 }}
              onClick={() => {
                const next = { ...week, [scheduleDay]: [] as string[] };
                setWeek(next);
                saveWeekAssignment(next, splitId);
              }}
            >
              Clear day (Rest)
            </button>
          </div>
        ) : null}

        <div className="edit-note" style={{ marginTop: 12 }}>
          Tap a weekday to choose which day-type(s) happen that day. Pick more than one to double up.
          Switching splits never deletes logged history for any day-type.
        </div>
      </div>

      <div className="settings-block glass">
        <div className="settings-block-title">Edit Exercises</div>
        <div className="subtabs" role="tablist">
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              className={`subtab${editDay === key ? ' active' : ''}`}
              onClick={() => setEditDay(key)}
            >
              {dayTypeLabel(key, splitId)}
            </button>
          ))}
        </div>

        <div>
          {exercises.map((name, i) => (
            <div key={`${editDay}-${i}-${name}`} className="edit-row" style={{ flexWrap: 'wrap' }}>
              <input
                className="edit-name"
                defaultValue={name}
                onBlur={(e) => onRename(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
              <div className="edit-ctrls">
                <button
                  type="button"
                  disabled={i === 0}
                  style={i === 0 ? { opacity: 0.3 } : undefined}
                  onClick={() => {
                    moveExercise(editDay, i, -1);
                    setExercises(getDayExercises(editDay));
                  }}
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={i === exercises.length - 1}
                  style={i === exercises.length - 1 ? { opacity: 0.3 } : undefined}
                  onClick={() => {
                    moveExercise(editDay, i, 1);
                    setExercises(getDayExercises(editDay));
                  }}
                  aria-label="Move down"
                >
                  ▼
                </button>
                <button
                  type="button"
                  className="del"
                  onClick={() => {
                    removeExercise(editDay, i);
                    setExercises(getDayExercises(editDay));
                  }}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
                  <div className="muscle-tag">{inferMuscleTag(name)}</div>
            </div>
          ))}
        </div>

        <div className="add-ex">
          <input
            type="text"
            value={newName}
            placeholder="New exercise name"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (addExercise(editDay, newName)) {
                  setNewName('');
                  setExercises(getDayExercises(editDay));
                }
              }
            }}
          />
          <button
            type="button"
            id="addExBtn"
            onClick={() => {
              if (addExercise(editDay, newName)) {
                setNewName('');
                setExercises(getDayExercises(editDay));
              }
            }}
          >
            Add
          </button>
        </div>
        <div className="edit-note">
          Tap a name to rename it (history follows the rename). Use the arrows to reorder. Removing an
          exercise hides it from the list but keeps its logged history safe.
        </div>
      </div>
    </>
  );
}
