import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../app/AppContext';
import { formatDueIn } from '../../../shared/clock/clockLogic';
import { Assignment } from '../../../shared/data/schemas';
import { CatchUpModel } from '../catchUpModel';
import { closedOnCanvas } from '../deadline';
import { groupByDueDate } from '../dueBuckets';
import { CatchUpPlan, planDayLabel } from '../studyPlan';
import { hoursLabel } from '../termLogic';

// Every unfinished assignment in the ticked classes, sorted into groups by its own due date, with what each one means
// for a C and when the plan does it. This is the due-date view of the same work the pace and plan below use.
export const DueDateView: React.FC<{ model: CatchUpModel; plan: CatchUpPlan; today: string; now: Date }> = ({
  model,
  plan,
  today,
  now,
}) => {
  const { assignments, completeAssignmentWithReward } = useApp();
  const goalEnd = model.goalDate.date ?? model.termEnd ?? '9999-12-31';
  const groups = groupByDueDate(model.openWork, today, now, goalEnd);
  const afterLabel = model.goalDate.date ? 'Due after your goal date' : 'Due after the last day of the term';
  const courseName = (id: string) => model.activeCourses.find((c) => c.id === id)?.name ?? 'Course';
  const needed = (a: Assignment) => model.goal.taskIds.has(a.id);
  const day = (d: string) => planDayLabel(d, today);

  // Marking finished saves the assignment as it is saved, never the copy used for the math.
  const finish = (a: Assignment) => {
    const saved = assignments.find((x) => x.id === a.id);
    if (saved) void completeAssignmentWithReward(saved);
  };

  const status = (a: Assignment): string => {
    if (model.unavailableIds.has(a.id)) {
      if (closedOnCanvas(a, now)) return 'Closed in Canvas';
      if ((model.penalties[a.courseId] ?? 0) >= 100) return 'Late work not accepted';
      return 'Taken out of your plan';
    }
    const start = plan.startById.get(a.id);
    const planned = start ? `planned ${day(start)}` : '';
    if (needed(a)) return start ? `Needed for a C, ${planned}` : 'Needed for a C, does not fit in the plan';
    return start ? `Not needed for a C, ${planned}` : 'Not needed for a C';
  };

  const first = plan.days[0]?.items[0]?.assignment;

  return (
    <section aria-labelledby="due-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div>
        <h2 id="due-heading" className="text-lg font-bold">
          5. By due date
        </h2>
        <p className="text-sm text-muted">
          Every unfinished assignment in your ticked classes, in groups by its own due date. Each one says whether it is
          needed for a C and when the plan does it.
        </p>
      </div>

      {first && (
        <p className="p-3 rounded border border-accent bg-bg text-sm">
          <strong>Where to start:</strong> {first.name} ({courseName(first.courseId)}), {formatDueIn(first.dueDate, first.dueTime, now)}.
          Even partial work, or asking for a short extension today, moves things forward.
        </p>
      )}

      {model.openWork.length === 0 ? (
        <p className="text-sm text-muted">No unfinished work in your ticked classes.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            if (g.items.length === 0) return null;
            const neededCount = g.items.filter(needed).length;
            return (
              <details key={g.key} open={g.key === 'overdue' || g.key === 'thisWeek'} className="rounded border border-border bg-bg">
                <summary className="min-h-[44px] px-3 py-2 cursor-pointer font-medium flex flex-wrap items-center gap-x-2">
                  <span>{g.key === 'afterGoal' ? afterLabel : g.title}</span>
                  <span className="text-xs font-normal text-muted">
                    {g.items.length} task{g.items.length === 1 ? '' : 's'}, about {hoursLabel(g.minutes)} hours, {neededCount} needed
                    for a C
                  </span>
                </summary>
                <ul className="p-3 space-y-2">
                  {g.items.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        <span className="font-medium">{a.name}</span>
                        <span className="block text-xs text-muted">
                          {courseName(a.courseId)} • {formatDueIn(a.dueDate, a.dueTime, now)} • about{' '}
                          {Math.max(0, a.estimateMinutes - (a.minutesLogged ?? 0))} min
                          {a.points ? ` • ${a.points} points` : ''} • {status(a)}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <Link
                          to={`/start/${a.id}`}
                          className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-xs font-medium flex items-center"
                        >
                          Help me start
                        </Link>
                        <button
                          type="button"
                          onClick={() => finish(a)}
                          className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-xs font-medium"
                        >
                          I finished this
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
};
