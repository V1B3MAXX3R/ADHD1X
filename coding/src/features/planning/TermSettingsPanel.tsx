import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { SchoolBreak, TermMode } from '../../shared/data/schemas';
import { validBreak } from '../catchUp/termLogic';

const MAX_BREAKS = 20;

const MODE_HELP: Record<TermMode, string> = {
  regular: 'Work is planned by due date.',
  midterms: 'In Catch Up, exams are planned ahead of other work due on or after the first exam.',
  finals: 'In Catch Up, exams are planned ahead of other work due on or after the first exam.',
};

// Settings for the school term: the last day, regular / midterms / finals, and days off.
export const TermSettingsPanel: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const breaks = settings.schoolBreaks;
  const [label, setLabel] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');

  const addBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = label.trim().slice(0, 60);
    const last = end || start;
    if (!name) return setError('Give the break a name, like Thanksgiving.');
    if (!start || !validBreak({ start, end: last })) return setError('Pick a first day, and a last day that is not before it.');
    if (breaks.length >= MAX_BREAKS) return setError(`You can save up to ${MAX_BREAKS} breaks.`);
    setError('');
    const b: SchoolBreak = { id: crypto.randomUUID(), label: name, start, end: last };
    await updateSettings({ schoolBreaks: [...breaks, b].sort((x, y) => x.start.localeCompare(y.start)) }, true);
    setLabel('');
    setStart('');
    setEnd('');
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="term-last-day" className="block font-medium mb-1">
          Last day of the term
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="term-last-day"
            type="date"
            value={settings.term.lastDay ?? ''}
            onChange={(e) =>
              void updateSettings({ term: { ...settings.term, lastDay: e.target.value || undefined } }, true)
            }
            className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
          />
          {settings.term.lastDay && (
            <button
              type="button"
              onClick={() => void updateSettings({ term: { ...settings.term, lastDay: undefined } }, true)}
              className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-muted mt-1">
          Shown on Today and Catch Up. Catch Up looks ahead to this day. If you leave it blank, the latest end date among
          your classes is used.
        </p>
      </div>

      <div>
        <label htmlFor="term-mode" className="block font-medium mb-1">
          Term mode
        </label>
        <select
          id="term-mode"
          value={settings.term.mode}
          onChange={(e) => void updateSettings({ term: { ...settings.term, mode: e.target.value as TermMode } }, true)}
          className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
        >
          <option value="regular">Regular</option>
          <option value="midterms">Midterms</option>
          <option value="finals">Finals</option>
        </select>
        <p className="text-xs text-muted mt-1">{MODE_HELP[settings.term.mode]}</p>
      </div>

      <section aria-labelledby="breaks-heading" className="space-y-3">
        <div>
          <h3 id="breaks-heading" className="font-bold">
            Breaks
          </h3>
          <p className="text-sm text-muted">
            Days off, like Thanksgiving or spring break. Catch Up plans no study on these days and moves the work to the
            next day that is not a break.
          </p>
        </div>

        {breaks.length === 0 ? (
          <p className="text-sm text-muted">No breaks yet.</p>
        ) : (
          <ul className="space-y-2">
            {breaks.map((b) => (
              <li
                key={b.id}
                className="p-3 rounded border border-border bg-bg flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  <strong>{b.label}</strong>: {b.start === b.end ? b.start : `${b.start} to ${b.end}`}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${b.label}`}
                  onClick={() => void updateSettings({ schoolBreaks: breaks.filter((x) => x.id !== b.id) }, true)}
                  className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addBreak} className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label htmlFor="break-name" className="block text-sm font-medium mb-1">
              Break name
            </label>
            <input
              id="break-name"
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
            />
          </div>
          <div>
            <label htmlFor="break-start" className="block text-sm font-medium mb-1">
              First day
            </label>
            <input
              id="break-start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
            />
          </div>
          <div>
            <label htmlFor="break-end" className="block text-sm font-medium mb-1">
              Last day (blank for one day)
            </label>
            <input
              id="break-end"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Add break
            </button>
          </div>
        </form>
        {error && (
          <p role="alert" className="text-sm text-due-soon">
            {error}
          </p>
        )}
      </section>
    </div>
  );
};
