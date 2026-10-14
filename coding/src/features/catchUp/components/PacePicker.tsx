import React from 'react';
import { CatchUpPace, CATCH_UP_HORIZON_DAYS, PACE_MINUTES_PER_DAY, PaceDaysResult } from '../catchUp';
import { useCatchUp } from '../useCatchUp';

// Three paces, each with the real number of days it takes, so the choice is honest (A36, A81).
export const PacePicker: React.FC<{ stats: PaceDaysResult }> = ({ stats }) => {
  const { catchUp, save } = useCatchUp();
  const hours = Math.round((stats.totalRemainingMinutes / 60) * 10) / 10;

  return (
    <section aria-labelledby="pace-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div>
        <h2 id="pace-heading" className="text-lg font-bold">
          2. Pick your pace
        </h2>
        <p className="text-sm text-muted">
          About {hours} hours of work across {stats.dueSoonestTasks.length} unfinished task
          {stats.dueSoonestTasks.length === 1 ? '' : 's'} due within the next {CATCH_UP_HORIZON_DAYS} days or earlier.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['aggressive', 'normal', 'chill'] as CatchUpPace[]).map((pace) => {
          const info = PACE_MINUTES_PER_DAY[pace];
          const days = stats.daysByPace[pace];
          const selected = catchUp.pace === pace;
          return (
            <button
              key={pace}
              type="button"
              aria-pressed={selected}
              onClick={() => void save({ pace })}
              className={`p-4 rounded-lg border-2 text-left flex flex-col justify-between gap-3 min-h-[44px] ${
                selected ? 'border-accent bg-bg' : 'border-border bg-bg hover:border-accent'
              }`}
            >
              <span>
                <span className="flex items-center justify-between">
                  <span className="font-bold text-base">{info.label}</span>
                  {selected && (
                    <span className="text-xs px-2 py-0.5 rounded bg-accent text-on-accent font-bold">Chosen</span>
                  )}
                </span>
                <span className="block text-xs text-muted mt-1">{info.desc}</span>
              </span>
              <span className="text-xl font-bold text-accent">
                {days === 0 ? 'Nothing to catch up' : `${days} ${days === 1 ? 'day' : 'days'}`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
