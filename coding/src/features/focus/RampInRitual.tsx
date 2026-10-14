import React, { useState } from 'react';

const RAMP_STEPS = [
  'Close or minimize the tabs from your last class or activity.',
  'Open only the one folder or document you need for this task.',
  'Read your "Where was I?" note (or your 2-minute first move) and take one slow breath.',
];

// An optional 60-second landing before a session. Nothing is saved, and nothing has to be checked to start.
export const RampInRitual: React.FC = () => {
  const [done, setDone] = useState<boolean[]>(RAMP_STEPS.map(() => false));

  return (
    <details className="p-3 rounded border border-border bg-bg text-sm">
      <summary className="cursor-pointer min-h-[44px] flex items-center font-medium">
        60-second ramp-in (optional)
      </summary>
      <div className="space-y-2 pt-2">
        <p className="text-muted">Switching tasks suddenly is tiring. Three quick steps can help you land.</p>
        <ul className="space-y-1">
          {RAMP_STEPS.map((step, i) => (
            <li key={step}>
              <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={done[i]}
                  onChange={(e) => setDone(done.map((d, j) => (j === i ? e.target.checked : d)))}
                  className="w-5 h-5 mt-1"
                />
                <span>{step}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
};
