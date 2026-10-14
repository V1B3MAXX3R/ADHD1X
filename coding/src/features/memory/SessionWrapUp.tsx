import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { parseMinutesInput } from '../focus/timeCheck';
import { cleanLine, MAX_NOTE_LENGTH, minutesWorked, OUTCOME_CHOICES, SessionOutcome } from './sessionMemory';

// Shown when "Done for now" is chosen. Everything in it is optional: stopping is always fine (A5, A25).
export const SessionWrapUp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { timer, assignments, finishSession, stopTimer } = useApp();
  const task = assignments.find((a) => a.id === timer.assignmentId);
  const [outcome, setOutcome] = useState<SessionOutcome | undefined>(undefined);
  const [noteDraft, setNoteDraft] = useState(task?.note ?? '');
  const measured = minutesWorked(timer.workedSeconds ?? 0, timer.totalSeconds, timer.secondsRemaining);
  const [minutesDraft, setMinutesDraft] = useState(String(measured));

  const skip = () => {
    stopTimer();
    onClose();
  };

  const save = async () => {
    await finishSession({
      outcome,
      note: cleanLine(noteDraft, MAX_NOTE_LENGTH) ?? null,
      minutes: parseMinutesInput(minutesDraft),
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wrapup-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape') skip();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="max-w-md w-full max-h-full overflow-y-auto rounded bg-surface p-6 text-text border border-border shadow-lg space-y-4">
        <h2 id="wrapup-title" className="text-xl font-bold">
          Done for now{task ? `: ${task.name}` : ''}
        </h2>

        {timer.goalText && (
          <fieldset className="space-y-2">
            <legend className="text-sm mb-1">
              Your goal was &ldquo;{timer.goalText}&rdquo;. How did it go? (optional)
            </legend>
            <div className="flex flex-wrap gap-2">
              {OUTCOME_CHOICES.map(([value, label]) => (
                <label
                  key={value}
                  className={`min-h-[44px] px-4 py-2 rounded border cursor-pointer flex items-center gap-2 ${
                    outcome === value ? 'border-accent bg-bg font-bold' : 'border-border bg-bg'
                  }`}
                >
                  <input
                    type="radio"
                    name="session-outcome"
                    checked={outcome === value}
                    onChange={() => setOutcome(value)}
                    className="w-5 h-5"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="space-y-1">
          <label htmlFor="wrapup-note" className="block text-sm font-medium">
            Where was I? A line for next time (optional)
          </label>
          <input
            id="wrapup-note"
            type="text"
            autoFocus
            maxLength={MAX_NOTE_LENGTH}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Example: finished paragraph 2, start the conclusion"
            className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
          />
          <p className="text-xs text-muted">Only you see this. It stays on this device and is never sent to Gemini.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="wrapup-minutes" className="block text-sm font-medium">
            About how many minutes did you work? (optional)
          </label>
          <input
            id="wrapup-minutes"
            type="number"
            min={0}
            max={600}
            value={minutesDraft}
            onChange={(e) => setMinutesDraft(e.target.value)}
            className="w-28 min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
          />
          <p className="text-xs text-muted">
            Only used to make future time estimates fit you better. Never shown as a score.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={skip}
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
          >
            Just stop
          </button>
          <button
            type="button"
            onClick={() => void save()}
            className="min-h-[44px] px-5 py-2 rounded bg-accent text-on-accent font-bold"
          >
            Save and stop
          </button>
        </div>
      </div>
    </div>
  );
};
