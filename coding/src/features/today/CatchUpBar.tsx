import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { useClock } from '../../shared/clock/ClockContext';
import { computeCatchUpPaces, PACE_MINUTES_PER_DAY } from '../catchUp/catchUp';
import { useCatchUp } from '../catchUp/useCatchUp';

// Shown on Today only after the person switched Catch Up on themselves. It is never an invitation (A39).
export const CatchUpBar: React.FC = () => {
  const { assignments } = useApp();
  const { today } = useClock();
  const { catchUp, isSpace, modeName } = useCatchUp();
  if (!catchUp.on) return null;

  const days = computeCatchUpPaces(assignments, { today }).daysByPace[catchUp.pace];

  return (
    <section
      aria-label={`${modeName} status`}
      className="p-4 rounded border-2 border-focus bg-surface flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <span className="font-bold">
          {isSpace && <span aria-hidden="true">⚡ </span>}
          {modeName} is on ({PACE_MINUTES_PER_DAY[catchUp.pace].label} pace, target {catchUp.targetGrade}%)
        </span>
        <p className="text-xs text-muted mt-1">
          Start with the first task below for 2 minutes. At this pace, catching up takes about{' '}
          <strong>
            {days} {days === 1 ? 'day' : 'days'}
          </strong>
          . Work from earlier dates that you can still turn in is included.
        </p>
      </div>
      <Link
        to="/catch-up"
        className="min-h-[44px] px-4 py-2 rounded border border-accent bg-bg text-text text-sm font-bold flex items-center"
      >
        {modeName} settings
      </Link>
    </section>
  );
};
