import React, { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { Settings } from '../../shared/data/schemas';

const CALM: Partial<Settings> = {
  theme: 'low',
  dim: true,
  motion: false,
  timerDisplay: 'bar',
  notificationSounds: false,
  timerSound: false,
};

// One tap to turn down glare, motion, ticking numbers and sounds (A74). The earlier values are remembered
// for this visit so the same tap can put them back.
export const SensoryQuickSwitch: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const [previous, setPrevious] = useState<Partial<Settings> | null>(null);

  const isCalm = (Object.keys(CALM) as (keyof Settings)[]).every((k) => settings[k] === CALM[k]);

  const apply = async () => {
    const before: Record<string, unknown> = {};
    for (const k of Object.keys(CALM) as (keyof Settings)[]) before[k] = settings[k];
    setPrevious(before as Partial<Settings>);
    await updateSettings(CALM, true);
  };

  const restore = async () => {
    if (previous) await updateSettings(previous, true);
    setPrevious(null);
  };

  return (
    <div className="p-3 rounded border border-border bg-bg space-y-2 text-sm">
      <p className="font-bold">Too much noise or glare?</p>
      <ul className="list-disc list-inside text-muted space-y-1">
        <li>Put on headphones or steady background sound.</li>
        <li>Clear extra things off your desk.</li>
        <li>Turn the screen down in one tap below.</li>
      </ul>
      {previous ? (
        <button
          type="button"
          onClick={() => void restore()}
          className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface font-medium"
        >
          Put my settings back
        </button>
      ) : (
        <button
          type="button"
          disabled={isCalm}
          onClick={() => void apply()}
          className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold disabled:opacity-60"
        >
          {isCalm ? 'Calm mode is on (low, dim, no motion, bar timer, no sounds)' : 'Turn on calm mode (low, dim, no motion, bar timer, no sounds)'}
        </button>
      )}
    </div>
  );
};
