import React from 'react';
import { useApp } from '../../app/AppContext';
import { Assignment } from '../../shared/data/schemas';
import { personalPace } from './planningLogic';

// Shown only after two or more finished tasks of the same type have time logged. Information, not a score (A90).
export const PersonalPaceNote: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const { assignments, upsertAssignment } = useApp();
  const pace = personalPace(assignments, assignment.type);
  if (!pace) return null;

  const suggested = Math.min(2400, Math.max(5, Math.round((pace.averageMinutes / 5)) * 5));
  return (
    <div className="p-3 rounded border border-border bg-surface space-y-1 text-sm">
      <p>
        Your {pace.sampleCount} finished {assignment.type} tasks took about {pace.averageMinutes} minutes each. The
        starting estimate is {pace.defaultMinutes}.
      </p>
      {suggested !== assignment.estimateMinutes && (
        <button
          type="button"
          onClick={() => void upsertAssignment({ ...assignment, estimateMinutes: suggested, estimateSource: 'user' })}
          className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg font-medium"
        >
          Use {suggested} minutes for this one
        </button>
      )}
    </div>
  );
};
