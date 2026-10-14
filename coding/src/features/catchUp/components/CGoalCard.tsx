import React from 'react';
import { REALISTIC_MAX_PERCENT } from '../cGoal';
import { CatchUpModel, ClassNeed } from '../catchUpModel';
import { planDayLabel } from '../studyPlan';

const tasks = (n: number) => `${n} task${n === 1 ? '' : 's'}`;
// Hours to read at a glance: whole hours from 10 up, half hours below.
const roughHours = (minutes: number): string => {
  const h = minutes / 60;
  const n = h >= 10 ? Math.round(h) : Math.round(h * 2) / 2;
  return `about ${n} hour${n === 1 ? '' : 's'}`;
};

// Each class on its own: its grade now, and the fewest tasks (by points) that get it to a C by the end of the term.
// A class that cannot reach a C is said plainly and never blocks the others. Reads the shared Catch Up model, and
// comes before the pace, since the pace is set up from this.
export const CGoalCard: React.FC<{ model: CatchUpModel; today: string }> = ({ model, today }) => {
  const { classes, inactiveCourses, termEnd } = model;
  const by =
    model.limit.kind === 'horizon' || !termEnd
      ? `in the next ${model.horizonDays} days`
      : `by the last day of the term (${planDayLabel(termEnd, today)})`;

  return (
    <section aria-labelledby="cgoal-heading" className="p-5 rounded-lg border border-border bg-surface space-y-3">
      <div>
        <h2 id="cgoal-heading" className="text-lg font-bold">
          4. What each class needs for a C
        </h2>
        <p className="text-sm text-muted">
          Each class is worked out on its own, from your grade now and the points left. You do not need every task:
          these are the fewest that get each class to a C {by}.
        </p>
      </div>

      {classes.length === 0 ? (
        <p className="text-sm text-muted">Tick a class above to see what a C would take.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {classes.map((c) => (
            <li key={c.courseId} className="p-3 rounded border border-border bg-bg">
              <p className="font-medium">
                {c.name}: {classHeadline(c)}
              </p>
              <p className="text-xs text-muted mt-1">{classLine(c)}</p>
            </li>
          ))}
        </ul>
      )}
      {inactiveCourses.length > 0 && (
        <p className="text-xs text-muted">
          Left out, because nothing in {inactiveCourses.length === 1 ? 'it' : 'them'} is from this term:{' '}
          {inactiveCourses.map((c) => c.name).join(', ')}.
        </p>
      )}
      <p className="text-xs text-muted">
        Uses each class&apos;s grading (set it under Grading), your grade now, and about the score you usually get (70% to
        90%; 80% when nothing is graded yet). A 0 counts as late work you can still do, unless you take it out under Late
        work.
      </p>
    </section>
  );
};

// One line: what the class needs, in tasks and hours.
export function classHeadline(c: ClassNeed): string {
  const hours = roughHours(c.neededMinutes);
  const late =
    c.overdueCount === 0
      ? ''
      : c.overdueCount >= c.neededCount
        ? c.neededCount === 1
          ? ', past due'
          : ', all past due'
        : `, ${c.overdueCount} of them past due`;
  switch (c.goal.status) {
    case 'already':
      return 'at a C or better. Nothing more is needed.';
    case 'nothingDue':
      return 'nothing worth points is due yet.';
    case 'noPoints':
      return `no point values, so all ${tasks(c.neededCount)} are planned (${hours}).`;
    case 'short':
      return `a C is out of reach this term. ${tasks(c.neededCount)} (${hours}) raise the grade as much as they can.`;
    default:
      if (c.neededCount === 0) return 'nothing is left to do for a C.';
      if (c.neededCount >= c.openCount) {
        return `${c.openCount === 1 ? 'the 1 task left is' : `all ${c.openCount} tasks left are`} needed for a C (${hours})${late}.`;
      }
      return `${c.neededCount} of the ${c.openCount} tasks left ${c.neededCount === 1 ? 'is' : 'are'} needed for a C (${hours})${late}.`;
  }
}

// The details: the grade now, where it ends up with nothing more turned in, and what a C takes.
// Weighted classes speak in percentage points of the grade; classes graded by points speak in points.
export function classLine(c: ClassNeed): string {
  const g = c.goal;
  const parts: string[] = [];
  if (c.grade) {
    const from = c.grade.source === 'canvas' ? ', from Canvas' : c.grade.source === 'yours' ? ', typed in by you' : '';
    parts.push(`Grade now ${c.grade.percent}% (${c.grade.letter})${from}.`);
  }
  if (g.currentPercent !== undefined && g.status !== 'already') parts.push(`With nothing more turned in: ${g.currentPercent}%.`);
  const more = g.weighted ? `${g.percentNeeded ?? g.pointsNeeded} more percentage points` : `${g.pointsNeeded} more points`;
  const usual = Math.round(g.assumedScore * 100);
  switch (g.status) {
    case 'already':
      parts.push(`A C here is ${g.cPercent}%.`);
      break;
    case 'plan':
      parts.push(`A C here is ${g.cPercent}%: about ${more}, scoring about ${usual}%.`);
      break;
    case 'stretch':
      parts.push(
        (g.requiredPercent ?? 101) <= REALISTIC_MAX_PERCENT
          ? `A C here is ${g.cPercent}%: about ${more}, scoring about ${g.requiredPercent}% on these tasks. That is more than your usual ${usual}%, but doable.`
          : `A C here is ${g.cPercent}%: it takes about ${g.requiredPercent}% on everything left, which is very hard. All of it is planned.`,
      );
      break;
    case 'short':
      parts.push(
        `Even full marks on everything left would reach about ${g.bestCasePercent}%, short of a C (${g.cPercent}%). Untick the class to leave it out; late work or extra credit could change this.`,
      );
      break;
    case 'noPoints':
      parts.push('You can add how it is graded under Grading.');
      break;
    case 'nothingDue':
      break;
  }
  return parts.join(' ');
}
