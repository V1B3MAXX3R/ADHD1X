import React, { useState } from 'react';
import { Assignment } from '../../shared/data/schemas';
import { buildDefinitionOfDone } from './planningLogic';

// "How do I know I can stop and submit?" Built-in, no Gemini. Ticks are not saved.
export const DefinitionOfDoneCard: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
  const criteria = buildDefinitionOfDone(assignment);
  const [checked, setChecked] = useState<boolean[]>(() => criteria.map(() => false));

  return (
    <div className="p-3 rounded border border-border bg-surface space-y-2 text-sm">
      <p className="font-bold">How to know you are done</p>
      <p className="text-muted">When these are true, this is good enough to turn in:</p>
      <ul className="space-y-1">
        {criteria.map((c, i) => (
          <li key={c}>
            <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={checked[i] ?? false}
                onChange={(e) => setChecked(criteria.map((_, j) => (j === i ? e.target.checked : (checked[j] ?? false))))}
                className="w-5 h-5 mt-1"
              />
              <span>{c}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};
