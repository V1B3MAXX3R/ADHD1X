import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { RecoveryGap } from '../../shared/data/schemas';
import { format12h } from '../../shared/clock/clockLogic';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_GAPS = 12;

// Tag classes or events that leave you drained. After they end, Today shows a short quiet gap before work starts.
export const RecoveryGapsManager: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const gaps = settings.recoveryGaps;
  const [title, setTitle] = useState('');
  const [endTime, setEndTime] = useState('12:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [minutes, setMinutes] = useState(15);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = title.trim().slice(0, 120);
    if (!name || days.length === 0 || !endTime || gaps.length >= MAX_GAPS) return;
    const gap: RecoveryGap = { id: crypto.randomUUID(), title: name, endTime, days, minutes };
    await updateSettings({ recoveryGaps: [...gaps, gap] }, true);
    setTitle('');
  };

  return (
    <section aria-labelledby="recovery-heading" className="space-y-3">
      <div>
        <h3 id="recovery-heading" className="font-bold">
          Recovery gap after draining classes
        </h3>
        <p className="text-sm text-muted">
          Loud, social or crowded classes can take energy to recover from. Add one here and Today will show a short quiet
          gap after it ends, so you do not jump straight into studying.
        </p>
      </div>

      {gaps.length === 0 ? (
        <p className="text-sm text-muted">No recovery gaps yet.</p>
      ) : (
        <ul className="space-y-2">
          {gaps.map((g) => (
            <li
              key={g.id}
              className="p-3 rounded border border-border bg-bg flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                <strong>{g.title}</strong> ends {format12h(g.endTime)} ({g.days.map((d) => DAYS[d]).join(', ')}):{' '}
                {g.minutes} quiet minutes after
              </span>
              <button
                type="button"
                aria-label={`Remove ${g.title}`}
                onClick={() => void updateSettings({ recoveryGaps: gaps.filter((x) => x.id !== g.id) }, true)}
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void add(e)} className="space-y-3 border-t border-border pt-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Class or event name"
            placeholder="Class or event name"
            className="flex-1 min-w-[200px] min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            aria-label="Time it ends"
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
          />
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            aria-label="Length of the quiet gap"
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
          >
            {[10, 15, 20, 30].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="text-sm mb-1">Days it happens</legend>
          {DAYS.map((label, d) => (
            <button
              key={label}
              type="button"
              aria-pressed={days.includes(d)}
              onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort())}
              className={`min-h-[44px] px-3 py-1 rounded border text-sm ${
                days.includes(d) ? 'bg-accent text-on-accent border-accent' : 'bg-bg text-text border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </fieldset>
        <button type="submit" className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium">
          Add recovery gap
        </button>
      </form>
    </section>
  );
};
