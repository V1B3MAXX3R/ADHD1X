import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { AssignmentType, AssignmentTypeSchema, SavedRoutine } from '../../shared/data/schemas';

const MAX_ROUTINES = 30;

// Reusable step lists (A93). They show up in Help me start for tasks of the same type.
export const SavedRoutinesManager: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<AssignmentType>('lab');
  const [stepsText, setStepsText] = useState('');
  const routines = settings.savedRoutines;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const steps = stepsText
      .split('\n')
      .map((s) => s.trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 8);
    if (!title.trim() || steps.length === 0 || routines.length >= MAX_ROUTINES) return;
    const routine: SavedRoutine = { id: crypto.randomUUID(), title: title.trim().slice(0, 120), taskType, steps };
    await updateSettings({ savedRoutines: [...routines, routine] }, true);
    setTitle('');
    setStepsText('');
  };

  return (
    <section aria-labelledby="routines-heading" className="space-y-3">
      <div>
        <h3 id="routines-heading" className="font-bold">
          Saved routines
        </h3>
        <p className="text-sm text-muted">
          Write a step list once and see it again whenever you start a task of the same type.
        </p>
      </div>

      {routines.length === 0 ? (
        <p className="text-sm text-muted">No saved routines yet.</p>
      ) : (
        <ul className="space-y-2">
          {routines.map((r) => (
            <li key={r.id} className="p-3 rounded border border-border bg-bg flex flex-wrap justify-between gap-2 text-sm">
              <div>
                <p className="font-bold">
                  {r.title} <span className="text-xs text-muted">({r.taskType})</span>
                </p>
                <ol className="list-decimal list-inside text-muted">
                  {r.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
              <button
                type="button"
                aria-label={`Remove ${r.title}`}
                onClick={() => void updateSettings({ savedRoutines: routines.filter((x) => x.id !== r.id) }, true)}
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface self-start"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={(e) => void add(e)} className="space-y-3 border-t border-border pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Routine name"
            placeholder="For example: Weekly lab routine"
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
          />
          <select
            value={taskType}
            onChange={(e) => setTaskType(AssignmentTypeSchema.parse(e.target.value))}
            aria-label="Task type"
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
          >
            {AssignmentTypeSchema.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <textarea
          rows={4}
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          aria-label="Steps, one per line (up to 8)"
          placeholder="One step per line, up to 8"
          className="w-full p-2 rounded border border-border bg-bg text-text"
        />
        <button type="submit" className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium">
          Save routine
        </button>
      </form>
    </section>
  );
};
