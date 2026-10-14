import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Course, TermMode } from '../../../shared/data/schemas';
import { formatDueIn } from '../../../shared/clock/clockLogic';
import { CatchUpPace, isPastDue, PACE_MINUTES_PER_DAY } from '../catchUp';
import { CatchUpPlan, planDayLabel, PlanItem } from '../studyPlan';
import { BLOCK_ORDER, hoursLabel } from '../termLogic';

const SHOW_DAYS = 7;

// Says where the rest of a split task goes: the next block the same day, or the next study day.
function continuesText(item: PlanItem, dayItems: PlanItem[]): string {
  if (!item.continues) return '';
  const laterToday = dayItems.some((x) => x !== item && x.assignment.id === item.assignment.id && dayItems.indexOf(x) > dayItems.indexOf(item));
  return laterToday ? ' (continues in the next block)' : ' (continues on your next study day)';
}

// The day-by-day plan. Every task keeps its own due date and class: work that must be done to stay on time first,
// then past-due work one class at a time, then each task in the week before it is due. You can show one class at a
// time. Calm wording on purpose: a task that would finish after its due date is information, not a warning (A5).
export const StudyPlan: React.FC<{
  plan: CatchUpPlan;
  today: string;
  now: Date;
  pace: CatchUpPace;
  courses: Course[];
  minutesPerDay: number;
  mode: TermMode;
  /** True plans all the work; false plans just the work that gets each class to a C. */
  fullPlan: boolean;
  onFullPlanChange: (value: boolean) => void;
}> = ({ plan, today, now, pace, courses, minutesPerDay, mode, fullPlan, onFullPlanChange }) => {
  const [showAll, setShowAll] = useState(false);
  const [only, setOnly] = useState('all');
  const info = PACE_MINUTES_PER_DAY[pace];
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name ?? 'Course';

  // The classes in the plan, in the order of your class list, and the days narrowed to one class when you pick one.
  const inPlan = new Set(plan.days.flatMap((d) => d.items.map((it) => it.assignment.courseId)));
  const classIds = courses.map((c) => c.id).filter((id) => inPlan.has(id));
  const shown = only !== 'all' && inPlan.has(only) ? only : 'all';
  const keep = (courseId: string) => shown === 'all' || courseId === shown;
  const allDays = plan.days
    .map((d) => {
      const items = d.items.filter((it) => keep(it.assignment.courseId));
      return { ...d, items, minutes: items.reduce((s, it) => s + it.minutes, 0) };
    })
    .filter((d) => d.items.length > 0);
  const taskCount = new Set(allDays.flatMap((d) => d.items.map((it) => it.assignment.id))).size;
  const hours = Math.round((allDays.reduce((s, d) => s + d.minutes, 0) / 60) * 10) / 10;
  const lastDay = allDays.length > 0 ? allDays[allDays.length - 1].date : today;
  const days = showAll ? allDays : allDays.slice(0, SHOW_DAYS);
  // Work that was already past its due date is expected to be late; only work that becomes late is called out.
  const newlyLate = plan.afterDue.filter((x) => !isPastDue(x.assignment, now) && keep(x.assignment.courseId));

  return (
    <section aria-labelledby="plan-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div>
        <h2 id="plan-heading" className="text-lg font-bold">
          7. Your study plan
        </h2>
        <p className="text-sm text-muted">
          {fullPlan ? 'All the work in your ticked classes' : 'Just the work that gets each ticked class to a C'}, planned by
          its own due date: work that must be done to stay on time first, then past-due work one class at a time (the class
          closest to caught up first), then each task in the week before it is due. Each day holds up to about{' '}
          {hoursLabel(minutesPerDay)} hours ({info.label} pace), and bigger tasks are split across days.
          {plan.usesBlocks && ' Each day is cut into Morning, Evening and Night using your hours.'}
          {mode !== 'regular' && ` ${mode === 'midterms' ? 'Midterms' : 'Finals'} mode: exams come before other work due on or after the first exam.`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={fullPlan}
            onChange={(e) => onFullPlanChange(e.target.checked)}
            className="w-5 h-5"
          />
          <span>Plan all my work, not just enough for a C</span>
        </label>
        {classIds.length > 1 && (
          <div>
            <label htmlFor="plan-class" className="block text-xs font-medium mb-1">
              Show
            </label>
            <select
              id="plan-class"
              value={shown}
              onChange={(e) => setOnly(e.target.value)}
              className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
            >
              <option value="all">Every class</option>
              {classIds.map((id) => (
                <option key={id} value={id}>
                  {courseName(id)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {allDays.length === 0 ? (
        <p className="text-sm text-muted">Nothing to plan right now.</p>
      ) : (
        <>
          <p className="font-medium">
            {shown !== 'all' && `${courseName(shown)}: `}
            {taskCount} task{taskCount === 1 ? '' : 's'}, about {hours} hours, on {allDays.length} study{' '}
            {allDays.length === 1 ? 'day' : 'days'}. Last task: {planDayLabel(lastDay, today)}.
          </p>
          {plan.breakDaysSkipped > 0 && (
            <p className="text-sm text-muted">
              {plan.breakDaysSkipped} break {plan.breakDaysSkipped === 1 ? 'day is' : 'days are'} skipped, with no study planned.
            </p>
          )}

          {newlyLate.length > 0 && (
            <div className="p-3 rounded border border-border bg-bg text-sm space-y-2">
              <p className="font-medium">
                {newlyLate.length} task{newlyLate.length === 1 ? '' : 's'} that {newlyLate.length === 1 ? 'is' : 'are'} not
                late yet would be finished after the due date at this pace.
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted">
                {newlyLate.map((x) => (
                  <li key={x.assignment.id}>
                    <span className="text-text">{x.assignment.name}</span> ({courseName(x.assignment.courseId)}):{' '}
                    {formatDueIn(x.assignment.dueDate, x.assignment.dueTime, now)}, planned {planDayLabel(x.finishDate, today)}.{' '}
                    {x.penaltyPercent > 0
                      ? `A ${x.penaltyPercent}% late penalty could take off ${x.pointsLost} points.`
                      : 'No late penalty in this class.'}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">A faster pace, ticking fewer classes, or asking for an extension can change this.</p>
            </div>
          )}

          <ol className="space-y-3">
            {days.map((day) => (
              <li key={day.date} className="p-3 rounded border border-border bg-bg space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold">{planDayLabel(day.date, today)}</h3>
                  <span className="text-xs text-muted">{day.minutes} min</span>
                </div>
                {(plan.usesBlocks ? BLOCK_ORDER : [undefined]).map((block) => {
                  const items = day.items.filter((it) => it.block === block);
                  if (items.length === 0) return null;
                  return (
                    <div key={block ?? 'day'} className="space-y-1">
                      {block && (
                        <h4 className="text-xs font-bold uppercase tracking-wide text-muted">
                          {block} • {items.reduce((sum, it) => sum + it.minutes, 0)} min
                        </h4>
                      )}
                      <ul className="space-y-1 text-sm">
                        {items.map((item, i) => (
                          <li key={`${item.assignment.id}-${i}`} className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              <span className="font-medium">{item.assignment.name}</span>
                              <span className="text-muted">
                                {' '}
                                • {courseName(item.assignment.courseId)} •{' '}
                                {formatDueIn(item.assignment.dueDate, item.assignment.dueTime, now)} • {item.minutes} min
                                {continuesText(item, day.items)}
                              </span>
                            </span>
                            <Link
                              to={`/start/${item.assignment.id}`}
                              className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-xs font-medium flex items-center"
                            >
                              Help me start
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </li>
            ))}
          </ol>

          {allDays.length > SHOW_DAYS && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-sm font-medium"
            >
              {showAll ? 'Show the first week only' : `Show all ${allDays.length} study days`}
            </button>
          )}
          {plan.truncated && (
            <p className="text-xs text-muted">
              This is more work than fits in the longest plan this page makes, so the plan stops early. Try ticking fewer
              classes or a faster pace.
            </p>
          )}
        </>
      )}
    </section>
  );
};
