import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { getNotedAssignments } from './sessionMemory';

const SHOW_AT_MOST = 3;

// A calm card on Today listing tasks you left a note on. It disappears when there are none. Nothing to keep up (A25).
export const LeftOffList: React.FC = () => {
  const { assignments, upsertAssignment } = useApp();
  const noted = getNotedAssignments(assignments);
  if (noted.length === 0) return null;

  return (
    <section aria-labelledby="leftoff-heading" className="p-4 rounded border border-border bg-surface space-y-3">
      <h2 id="leftoff-heading" className="font-bold">
        Where you left off
      </h2>
      <ul className="space-y-2">
        {noted.slice(0, SHOW_AT_MOST).map((a) => (
          <li
            key={a.id}
            className="p-3 rounded border border-border bg-bg flex flex-wrap items-center justify-between gap-2"
          >
            <span className="text-sm">
              <strong>{a.name}</strong>: &ldquo;{a.note}&rdquo;
            </span>
            <span className="flex gap-2">
              <Link
                to={`/start/${a.id}`}
                className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent text-sm font-medium flex items-center"
              >
                Pick it back up
              </Link>
              <button
                type="button"
                onClick={() => void upsertAssignment({ ...a, note: undefined })}
                className="min-h-[44px] px-3 py-1 underline text-sm"
              >
                Clear note
              </button>
            </span>
          </li>
        ))}
      </ul>
      {noted.length > SHOW_AT_MOST && (
        <p className="text-xs text-muted">
          {noted.length - SHOW_AT_MOST} more on the <Link to="/assignments" className="underline">Assignments</Link> page.
        </p>
      )}
    </section>
  );
};
