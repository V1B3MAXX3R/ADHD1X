import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { DayTunerTab } from './architect/DayTunerTab';
import { MilestonesTab } from './architect/MilestonesTab';
import { StrategyTab } from './architect/StrategyTab';

type Tab = 'dayTuner' | 'strategy' | 'milestones';

const TABS: [Tab, string][] = [
  ['dayTuner', "Tune today's plan"],
  ['strategy', 'Split time across classes'],
  ['milestones', 'Break up a big project'],
];

// Optional Gemini planning helpers, tucked in a closed section on Today so the page stays predictable (A73).
export const StudyArchitectPanel: React.FC = () => {
  const { settings } = useApp();
  const [tab, setTab] = useState<Tab | null>(null);
  if (!settings.aiModeEnabled) return null;

  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer min-h-[44px] flex items-center px-4 font-bold text-sm">
        Planning helpers (Uses Gemini)
      </summary>
      <div className="p-4 pt-2 space-y-3">
        <div role="group" aria-label="Planning helpers" className="flex flex-wrap gap-2">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => setTab(tab === key ? null : key)}
              className={`min-h-[44px] px-3 py-1 rounded border text-xs font-medium ${
                tab === key ? 'bg-accent text-on-accent border-accent' : 'bg-bg border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'dayTuner' && <DayTunerTab onDone={() => setTab(null)} />}
        {tab === 'strategy' && <StrategyTab onDone={() => setTab(null)} />}
        {tab === 'milestones' && <MilestonesTab onDone={() => setTab(null)} />}
      </div>
    </details>
  );
};
