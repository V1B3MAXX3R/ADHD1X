import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../app/AppContext';
import { useClock } from '../../../shared/clock/ClockContext';
import { formatDueIn } from '../../../shared/clock/clockLogic';
import { Assignment } from '../../../shared/data/schemas';

// What is due soonest first, including work from earlier dates that can still be turned in (A39, A40).
// Calm wording: no warnings and no "behind" language (A5).
export const DueSoonestQueue: React.FC<{ tasks: Assignment[] }> = ({ tasks }) => {
  const { completeAssignmentWithReward } = useApp();
  const { now } = useClock();

  return (
    <section aria-labelledby="queue-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div className="p-3 rounded border border-accent bg-bg text-sm">
        <strong>Where to start:</strong> take the first item below. Even partial work, or asking for a short extension
        today, moves things forward.
      </div>

      <h2 id="queue-heading" className="text-lg font-bold">
        3. Due soonest
      </h2>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted">No unfinished tasks in this view.</p>
      ) : (
        <ol className="space-y-3">
          {tasks.map((a, idx) => (
            <li
              key={a.id}
              className="p-4 rounded border border-border bg-bg flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <span className="text-xs font-bold uppercase text-accent mr-2">{idx === 0 ? 'Start here' : `#${idx + 1}`}</span>
                <span className="font-bold">{a.name}</span>
                <span className="text-sm text-muted ml-2">
                  {formatDueIn(a.dueDate, a.dueTime, now)} • about {Math.max(0, a.estimateMinutes - a.minutesLogged)} min left
                  {a.points ? ` • ${a.points} pts` : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/start/${a.id}`}
                  className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold text-sm flex items-center"
                >
                  Help me start
                </Link>
                <button
                  type="button"
                  onClick={() => void completeAssignmentWithReward(a)}
                  className="min-h-[44px] px-3 py-2 rounded border border-accent bg-surface text-sm font-bold"
                >
                  I finished this
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
