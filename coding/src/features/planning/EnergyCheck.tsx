import React, { useState } from 'react';
import { BlockName } from '../../shared/data/schemas';
import { EnergyLevel, suggestForEnergy } from './planningLogic';

const LEVELS: [EnergyLevel, string][] = [
  ['low', 'Low energy'],
  ['okay', 'Okay energy'],
  ['good', 'Good energy'],
];

// Optional (A64). The answer is never saved or counted (A25). It only offers a suggestion, and nothing changes
// until the suggestion is tapped.
export const EnergyCheck: React.FC<{
  currentBlocks: BlockName[];
  usualBlocks: BlockName[];
  onUse: (blocks: BlockName[], starterMinutes: number) => void;
}> = ({ currentBlocks, usualBlocks, onUse }) => {
  const [level, setLevel] = useState<EnergyLevel | null>(null);
  const suggestion = level ? suggestForEnergy(level, currentBlocks, usualBlocks) : null;

  return (
    <div className="p-3 rounded border border-border bg-bg space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          <span className="font-bold">How is your energy? (optional)</span>{' '}
          <span className="text-muted">Never saved or tracked.</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(([lvl, label]) => (
            <button
              key={lvl}
              type="button"
              aria-pressed={level === lvl}
              onClick={() => setLevel(level === lvl ? null : lvl)}
              className={`min-h-[44px] px-3 py-1 rounded border font-medium ${
                level === lvl ? 'bg-accent text-on-accent border-accent' : 'bg-surface text-text border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {suggestion && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2">
          <span>{suggestion.text}</span>
          <button
            type="button"
            onClick={() => {
              onUse(suggestion.blocks, suggestion.starterMinutes);
              setLevel(null);
            }}
            className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent font-medium"
          >
            Use this
          </button>
        </div>
      )}
    </div>
  );
};
