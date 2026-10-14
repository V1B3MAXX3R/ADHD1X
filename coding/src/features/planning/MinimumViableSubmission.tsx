import React, { useState } from 'react';
import { useApp, getCurrentBlockName } from '../../app/AppContext';
import { Assignment } from '../../shared/data/schemas';

const RESCUE_MINUTES = 15;

// For when time is nearly gone. Plain steps for turning in something in 15 minutes, with a timer on request.
export const MinimumViableSubmission: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const { settings, startTimer, timer } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="min-h-[44px] px-3 py-1.5 rounded border border-border bg-surface text-sm font-medium"
      >
        Short on time? Turn in something in {RESCUE_MINUTES} minutes
      </button>
      {open && (
        <div className="p-4 rounded border-2 border-accent bg-surface space-y-3 text-sm">
          <p className="font-bold">Turning in something is usually better than turning in nothing.</p>
          <p className="text-muted">
            A quick plan for <strong>{assignment.name}</strong>. Check the syllabus if you are unsure how late or partial
            work is handled.
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Do the easiest or highest-point half of the prompt first.</li>
            <li>For a part you have no energy for, write a two-sentence outline of what your answer would cover.</li>
            <li>Upload what you have when the {RESCUE_MINUTES}-minute timer ends.</li>
          </ol>
          {timer.running ? (
            <p className="text-xs text-muted">A timer is already running.</p>
          ) : (
            <button
              type="button"
              onClick={() =>
                startTimer(assignment.id, RESCUE_MINUTES, getCurrentBlockName(settings), 'Turn in something')
              }
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold"
            >
              Start {RESCUE_MINUTES}-minute timer
            </button>
          )}
        </div>
      )}
    </div>
  );
};
