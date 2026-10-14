import React from 'react';
import { useApp } from '../../app/AppContext';
import { AssignmentType } from '../../shared/data/schemas';

// Reusable step lists (A93) that match the kind of task you are starting.
export const SavedRoutinesList: React.FC<{ taskType: AssignmentType }> = ({ taskType }) => {
  const { settings } = useApp();
  const routines = settings.savedRoutines.filter((r) => r.taskType === taskType);
  if (routines.length === 0) return null;

  return (
    <details className="p-3 rounded border border-border bg-bg text-sm">
      <summary className="cursor-pointer min-h-[44px] flex items-center font-medium">
        Your saved routines for {taskType} tasks ({routines.length})
      </summary>
      <div className="space-y-3 pt-2">
        {routines.map((r) => (
          <div key={r.id}>
            <p className="font-bold">{r.title}</p>
            <ol className="list-decimal list-inside text-muted">
              {r.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </details>
  );
};
