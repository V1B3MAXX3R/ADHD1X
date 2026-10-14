import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { useClock } from '../../shared/clock/ClockContext';
import { PACE_MINUTES_PER_DAY } from '../catchUp/catchUp';
import { buildCatchUpModel } from '../catchUp/catchUpModel';
import { planDayLabel } from '../catchUp/studyPlan';
import { useCatchUp } from '../catchUp/useCatchUp';

// Shown on Today only after the person switched Catch Up on themselves. It is never an invitation (A39).
// It reads the same Catch Up model as the Catch Up page, so the two always agree.
export const CatchUpBar: React.FC = () => {
  const { assignments, courses, settings } = useApp();
  const { today, now } = useClock();
  const { catchUp, isSpace, modeName } = useCatchUp();
  const model = useMemo(
    () => (catchUp.on ? buildCatchUpModel({ assignments, courses, settings, today, now }) : null),
    [catchUp.on, assignments, courses, settings, today, now],
  );
  if (!catchUp.on || !model) return null;

  const pace = model.paces[catchUp.pace];
  const behind = pace.classes.filter((k) => !k.onTrack && !model.outOfReachIds.has(k.courseId)).length;
  let line: React.ReactNode;
  if (model.goal.nothingNeeded) line = 'On the points so far every ticked class is at a C. You can switch Catch Up off.';
  else if (!pace.possible && model.needed.count > 0)
    line = `At this pace, ${behind} ${behind === 1 ? 'class is' : 'classes are'} not on track for a C. Open Catch Up to change the pace or the goal.`;
  else if (pace.cPlan.days.length === 0) line = 'There is nothing to plan right now.';
  else if (!pace.caughtUpDate) line = 'Nothing needed for a C is past due. Start with the first task below for 2 minutes.';
  else if (pace.caughtUpDate === today)
    line = 'Start with the first task below for 2 minutes. At this pace every class is caught up today.';
  else
    line = (
      <>
        Start with the first task below for 2 minutes. At this pace every class is caught up by{' '}
        <strong>{planDayLabel(pace.caughtUpDate, today)}</strong>.
      </>
    );

  return (
    <section
      aria-label={`${modeName} status`}
      className="p-4 rounded border-2 border-focus bg-surface flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <span className="font-bold">
          {isSpace && <span aria-hidden="true">⚡ </span>}
          {modeName} is on ({PACE_MINUTES_PER_DAY[catchUp.pace].label} pace)
        </span>
        <p className="text-xs text-muted mt-1">{line}</p>
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
