import React from 'react';
import { useApp } from '../../../app/AppContext';
import { Assignment, Course } from '../../../shared/data/schemas';
import { AssignmentGroup, assignmentGroup, closedOnCanvas, isZeroScore } from '../deadline';
import { CanvasClassInfo } from '../../grades/CanvasClassInfo';
import { safeLink } from '../../grades/canvasText';
import { useCatchUp } from '../useCatchUp';

type Policy = 0 | 10 | 50 | 100;

const POLICIES: { value: Policy; label: string; note: string }[] = [
  { value: 0, label: 'Late work waived', note: 'Late work here still earns full points.' },
  { value: 10, label: 'Late work deducted at 10%', note: 'Late work here loses 10% of its points.' },
  { value: 50, label: 'Late work deducted at 50%', note: 'Late work here loses half of its points.' },
  { value: 100, label: 'Late work not accepted', note: 'Late work here cannot be turned in, so it is left out of the plan.' },
];

const GROUPS: { key: Exclude<AssignmentGroup, 'notNow'>; title: string; hint: string }[] = [
  { key: 'late', title: 'Late: not turned in, or scored 0', hint: 'In the plan unless you untick it.' },
  { key: 'upcoming', title: 'Coming up', hint: 'In the plan unless you untick it.' },
  { key: 'turnedIn', title: 'Turned in or graded', hint: 'Tick one to redo or resubmit it.' },
];

// What late work means in each class, and every assignment in that class to choose from, read from your assignments.
// Late and upcoming work starts in the plan; work you already turned in starts out of it.
export const LateWorkSection: React.FC<{ courses: Course[]; assignments: Assignment[]; now: Date }> = ({
  courses,
  assignments,
  now,
}) => {
  const { upsertCourse } = useApp();
  const { catchUp, save } = useCatchUp();
  const skipped = new Set(catchUp.lateSkippedIds);
  const added = new Set(catchUp.planAddedIds);

  const inPlan = (a: Assignment, group: AssignmentGroup) =>
    group === 'turnedIn' ? added.has(a.id) : group !== 'notNow' && !skipped.has(a.id);

  // One tap changes the saved choice for these assignments.
  const setInPlan = (items: { a: Assignment; group: AssignmentGroup }[], want: boolean) => {
    const nextSkipped = new Set(skipped);
    const nextAdded = new Set(added);
    for (const { a, group } of items) {
      if (group === 'notNow') continue;
      if (group === 'turnedIn') {
        if (want) nextAdded.add(a.id);
        else nextAdded.delete(a.id);
      } else if (want) nextSkipped.delete(a.id);
      else nextSkipped.add(a.id);
    }
    void save({ lateSkippedIds: [...nextSkipped], planAddedIds: [...nextAdded] });
  };

  return (
    <section aria-labelledby="late-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div>
        <h2 id="late-heading" className="text-lg font-bold">
          3. Late work
        </h2>
        <p className="text-sm text-muted">
          Pick what late work means in each class. Where it is accepted, open the list to choose which assignments go in
          your study plan. Every assignment in the class is listed. A 0 counts as late work, since it often means the
          work was never turned in.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-muted">Tick a class above to set its late work.</p>
      ) : (
        <ul className="space-y-3">
          {courses.map((c) => {
            const policy = (c.latePenaltyPercent ?? 0) as Policy;
            const mine = assignments
              .filter((a) => a.courseId === c.id)
              .sort((x, y) => x.dueDate.localeCompare(y.dueDate) || x.name.localeCompare(y.name))
              .map((a) => ({ a, group: assignmentGroup(a, now) }));
            const lateCount = mine.filter((x) => x.group === 'late').length;
            const choosable = mine.filter((x) => x.group !== 'notNow');
            const planned = choosable.filter((x) => inPlan(x.a, x.group) && !(x.group !== 'turnedIn' && closedOnCanvas(x.a, now))).length;
            const notNow = mine.length - choosable.length;
            return (
              <li key={c.id} className="p-3 rounded border border-border bg-bg space-y-2">
                <fieldset className="space-y-2">
                  <legend className="font-bold">
                    {c.name} <span className="text-xs font-normal text-muted">({lateCount} late)</span>
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {POLICIES.map((p) => (
                      <label
                        key={p.value}
                        className={`min-h-[44px] px-3 py-2 rounded border cursor-pointer flex items-center gap-2 text-sm ${
                          policy === p.value ? 'border-accent bg-surface font-bold' : 'border-border bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`late-${c.id}`}
                          checked={policy === p.value}
                          onChange={() => void upsertCourse({ ...c, latePenaltyPercent: p.value })}
                          className="w-5 h-5"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted">{POLICIES.find((p) => p.value === policy)?.note}</p>
                </fieldset>

                <CanvasClassInfo course={c} />

                {policy !== 100 && (
                  <details className="rounded border border-border bg-surface">
                    <summary className="min-h-[44px] px-3 py-2 cursor-pointer font-medium flex items-center">
                      Assignments in my study plan: {planned} of {choosable.length}
                    </summary>
                    <div className="p-3 space-y-3">
                      {mine.length === 0 ? (
                        <p className="text-sm text-muted">No assignments in this class yet.</p>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setInPlan(mine.filter((x) => x.group === 'late'), true)}
                              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-sm font-medium"
                            >
                              Add all late work
                            </button>
                            <button
                              type="button"
                              onClick={() => setInPlan(choosable, false)}
                              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-sm font-medium"
                            >
                              Take all out
                            </button>
                          </div>
                          {GROUPS.map((g) => {
                            const items = mine.filter((x) => x.group === g.key);
                            if (items.length === 0) return null;
                            return (
                              <div key={g.key} className="space-y-1">
                                <h4 className="text-sm font-bold">
                                  {g.title} ({items.length})
                                </h4>
                                <p className="text-xs text-muted">{g.hint}</p>
                                <ul className="space-y-1">
                                  {items.map(({ a, group }) => {
                                    const closed = group !== 'turnedIn' && closedOnCanvas(a, now);
                                    return (
                                      <li key={a.id} className="flex flex-wrap items-start justify-between gap-2">
                                        <label
                                          className={`flex items-start gap-3 min-h-[44px] py-1 ${closed ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={inPlan(a, group) && !closed}
                                            disabled={closed}
                                            onChange={(e) => setInPlan([{ a, group }], e.target.checked)}
                                            className="w-5 h-5 mt-1"
                                          />
                                          <span>
                                            <span className="font-medium">{a.name}</span>
                                            <span className="block text-xs text-muted">
                                              {statusText(a, now)} • Due {a.dueDate}
                                              {a.points ? ` • ${a.points} points` : ''} • about {a.estimateMinutes} min
                                            </span>
                                          </span>
                                        </label>
                                        {safeLink(a.canvas?.url) && (
                                          <a
                                            href={safeLink(a.canvas?.url)!.href}
                                            rel="noopener noreferrer"
                                            className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-xs font-medium flex items-center"
                                          >
                                            Open in Canvas<span className="sr-only">: {a.name}</span>
                                          </a>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            );
                          })}
                          {notNow > 0 && (
                            <p className="text-xs text-muted">
                              {notNow} set to Not now {notNow === 1 ? 'is' : 'are'} left out. Bring {notNow === 1 ? 'it' : 'them'}{' '}
                              back from Today or Assignments.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

function statusText(a: Assignment, now: Date): string {
  let text: string;
  if (isZeroScore(a)) text = 'Scored 0';
  else if (typeof a.earnedPoints === 'number') text = `Scored ${a.earnedPoints}${a.points ? ` of ${a.points}` : ''}`;
  else if (a.status === 'done') text = 'Turned in, not graded yet';
  else text = 'Not turned in';
  const flags: string[] = [];
  if (a.canvas?.missing) flags.push('missing in Canvas');
  if (a.canvas?.redo) flags.push('redo requested');
  if (a.canvas?.lockAt) {
    const lock = new Date(a.canvas.lockAt);
    if (!Number.isNaN(lock.getTime())) {
      const day = lock.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      flags.push(closedOnCanvas(a, now) ? `closed in Canvas on ${day}` : `Canvas takes it until ${day}`);
    }
  }
  return flags.length > 0 ? `${text} (${flags.join(', ')})` : text;
}
