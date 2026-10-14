import React from 'react';
import { useCatchUp } from '../useCatchUp';

// The only place the mode is switched on or off. It is never offered or turned on for you (A39).
export const ModeSwitch: React.FC = () => {
  const { catchUp, isSpace, modeName, save } = useCatchUp();
  return (
    <section
      aria-label="Mode switch"
      className={`p-5 rounded-lg border-2 flex flex-wrap items-center justify-between gap-4 ${
        catchUp.on ? 'border-focus bg-surface' : 'border-border bg-surface'
      }`}
    >
      <div className="space-y-1 max-w-xl">
        <h2 className="text-lg font-bold">{catchUp.on ? `${modeName} is on` : `${modeName} is off`}</h2>
        <p className="text-sm text-muted">
          {isSpace
            ? 'Points your ship at what is due soonest, includes work from earlier dates that you can still turn in, and shows the pace and grade math. Switch it off any time to go back to normal.'
            : 'Focuses on what is due soonest, includes work from earlier dates that you can still turn in, and shows the pace and grade math. Switch it off any time to go back to normal.'}
        </p>
      </div>
      <button
        type="button"
        aria-pressed={catchUp.on}
        onClick={() => void save({ on: !catchUp.on })}
        className={`min-h-[44px] px-6 py-2 rounded font-bold ${
          catchUp.on ? 'border-2 border-border bg-bg text-text' : 'bg-accent text-on-accent'
        }`}
      >
        {catchUp.on ? `Turn off ${modeName}` : `Turn on ${modeName}`}
      </button>
    </section>
  );
};
