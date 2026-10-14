import React from 'react';
import { useApp } from '../../../app/AppContext';
import { BlockName } from '../../../shared/data/schemas';
import { format12h } from '../../../shared/clock/clockLogic';
import { aggressiveMinutes, BLOCK_ORDER, hoursLabel } from '../termLogic';
import { useCatchUp } from '../useCatchUp';

const HOUR_CHOICES = Array.from({ length: 13 }, (_, i) => i / 2); // 0 to 6 in half hours

// Only for the Aggressive pace: how many hours you are willing to give each part of the day.
// The three add up to the daily amount, and the study plan fills Morning first, then Evening, then Night.
export const AggressiveHoursPicker: React.FC = () => {
  const { settings } = useApp();
  const { catchUp, save } = useCatchUp();
  const hours = catchUp.aggressiveHours;
  const total = aggressiveMinutes(hours);

  return (
    <fieldset className="p-4 rounded border border-border bg-bg space-y-3">
      <legend className="font-bold px-1">Aggressive pace: your hours</legend>
      <p className="text-sm text-muted">
        Choose how long you will work in each part of the day. Use 0 to skip a part. The plan fills Morning first, then
        Evening, then Night.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {BLOCK_ORDER.map((block: BlockName) => {
          const w = settings.blockWindows[block];
          return (
            <div key={block}>
              <label htmlFor={`agg-${block}`} className="block text-sm font-medium mb-1">
                {block} hours
              </label>
              <select
                id={`agg-${block}`}
                value={hours[block]}
                onChange={(e) => void save({ aggressiveHours: { ...hours, [block]: Number(e.target.value) } })}
                className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
              >
                {HOUR_CHOICES.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-muted mt-1">
                {format12h(w.start)} to {format12h(w.end)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="font-medium">
        That is {hoursLabel(total)} hours a day.
      </p>
    </fieldset>
  );
};
