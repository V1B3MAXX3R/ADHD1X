import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { useClock } from '../../shared/clock/ClockContext';
import { breakOn, termLastDay, termStatus } from '../catchUp/termLogic';
import { planDayLabel } from '../catchUp/studyPlan';

export const MODE_LABELS = { regular: 'Regular', midterms: 'Midterms', finals: 'Finals' } as const;

// One calm line about the school term: its last day, the mode, and the next break. Shown on Today and Catch Up.
export const TermBar: React.FC = () => {
  const { settings, courses } = useApp();
  const { today } = useClock();
  const status = termStatus(termLastDay(settings.term, courses), today);
  const inBreak = breakOn(today, settings.schoolBreaks);
  const nextBreak = settings.schoolBreaks
    .filter((b) => b.start > today)
    .sort((a, b) => a.start.localeCompare(b.start))[0];

  let lastDayText = 'Not set yet.';
  if (status.lastDay) {
    const when = planDayLabel(status.lastDay, today);
    if (status.over) lastDayText = `${status.lastDay} (passed).`;
    else if (status.daysLeft === 0) lastDayText = 'Today.';
    else lastDayText = `${when} (${status.daysLeft} ${status.daysLeft === 1 ? 'day' : 'days'} left).`;
  }

  return (
    <section aria-label="School term" className="p-4 rounded border border-border bg-surface text-sm space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="font-bold">Last day of the term:</span> {lastDayText}{' '}
          <span className="text-muted">
            Mode: <strong className="text-text">{MODE_LABELS[settings.term.mode]}</strong>
          </span>
        </p>
        <Link to="/settings/term" className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg font-medium flex items-center">
          Term and breaks
        </Link>
      </div>
      {inBreak && (
        <p>
          Today is in {inBreak.label} (through {planDayLabel(inBreak.end, today)}). Catch Up plans no study on break days.
        </p>
      )}
      {!inBreak && nextBreak && (
        <p className="text-muted">
          Next break: {nextBreak.label}, starting {planDayLabel(nextBreak.start, today)}.
        </p>
      )}
    </section>
  );
};
