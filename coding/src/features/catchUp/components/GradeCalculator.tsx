import React, { useMemo, useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { Assignment, Course } from '../../../shared/data/schemas';
import { computeCatchUpGradeMath } from '../catchUp';
import { applyWhatIf, latePenaltyMap, WhatIfOverrides } from '../studyPlan';
import { reopenZeros } from '../deadline';
import { courseGrading } from '../gradeBook';
import { useCatchUp } from '../useCatchUp';

const toNumber = (s: string): number | undefined => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Number(s));

// "What-if" scores live on the page only. They never change your saved scores until you choose to save them.
export interface WhatIfControls {
  overrides: WhatIfOverrides;
  count: number;
  setValue: (a: Assignment, field: 'earnedPoints' | 'points', value: number | undefined) => void;
  reset: () => void;
}

type Filter = 'ungraded' | 'graded' | 'all';
const SHOW_FIRST = 40;

export const GradeCalculator: React.FC<{
  /** The classes in the plan. */
  courses: Course[];
  /** Your saved assignments in those classes. */
  assignments: Assignment[];
  /** 0s you plan to turn in late. The math counts them as work still to do; the saved scores are not changed. */
  reopenedIds?: ReadonlySet<string>;
  whatIf: WhatIfControls;
  /** Tasks the study plan would finish after their due date. */
  plannedLateIds: ReadonlySet<string>;
  now: Date;
}> = ({ courses, assignments, reopenedIds, whatIf, plannedLateIds, now }) => {
  const { upsertAssignment } = useApp();
  const { catchUp, save } = useCatchUp();
  const [quickCurrent, setQuickCurrent] = useState(catchUp.quickCurrentPercent?.toString() ?? '');
  const [quickRemaining, setQuickRemaining] = useState(catchUp.quickRemainingWeight?.toString() ?? '');
  const [confirmSave, setConfirmSave] = useState(false);
  const [filter, setFilter] = useState<Filter>('ungraded');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const effective = useMemo(() => applyWhatIf(assignments, whatIf.overrides), [assignments, whatIf.overrides]);
  const effectiveById = useMemo(() => new Map(effective.map((a) => [a.id, a])), [effective]);
  // For the math, a 0 you plan to turn in counts as still to do, and a what-if score on it counts as that score.
  const forMath = useMemo(
    () => applyWhatIf(reopenZeros(assignments, reopenedIds ?? new Set()), whatIf.overrides),
    [assignments, reopenedIds, whatIf.overrides],
  );
  const penalties = useMemo(() => latePenaltyMap(courses), [courses]);
  const single = courses.length === 1;

  const results = courses.map((course) => ({
    course,
    math: computeCatchUpGradeMath({
      targetGrade: catchUp.targetGrade,
      assignments: forMath.filter((a) => a.courseId === course.id),
      // The quick check is one overall percent, so it only makes sense for a single class.
      quickCurrentPercent: single ? toNumber(quickCurrent) : undefined,
      quickRemainingWeight: single ? toNumber(quickRemaining) : undefined,
      latePenaltyByCourse: penalties,
      now,
      plannedLateIds,
      grading: courseGrading(course),
    }),
  }));

  const quickInUse = catchUp.quickCurrentPercent !== undefined || catchUp.quickRemainingWeight !== undefined;
  const canReset = whatIf.count > 0 || quickInUse || quickCurrent !== '' || quickRemaining !== '';

  const reset = () => {
    whatIf.reset();
    setConfirmSave(false);
    setQuickCurrent('');
    setQuickRemaining('');
    if (quickInUse) void save({ quickCurrentPercent: undefined, quickRemainingWeight: undefined });
  };

  // Only runs after a second tap, because it replaces the scores you have saved.
  const saveAsReal = async () => {
    for (const a of assignments) {
      const o = whatIf.overrides[a.id];
      if (o) await upsertAssignment(applyWhatIf([a], { [a.id]: o })[0]);
    }
    whatIf.reset();
    setConfirmSave(false);
  };

  const matches = (a: Assignment): boolean =>
    filter === 'all' ? true : filter === 'graded' ? typeof a.earnedPoints === 'number' : typeof a.earnedPoints !== 'number';

  return (
    <section aria-labelledby="grade-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="grade-heading" className="text-lg font-bold">
          8. Target grade and score math
        </h2>
        <span className="text-xs px-2.5 py-1 rounded bg-bg border border-border text-muted">
          <span aria-hidden="true">🔒 </span>Done on this device. Grades never go to Gemini.
        </span>
      </div>

      <div>
        <label htmlFor="cu-target" className="block text-sm font-medium mb-1">
          Target final grade (%)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="cu-target"
            type="number"
            min={0}
            max={100}
            value={catchUp.targetGrade}
            onChange={(e) => {
              const n = toNumber(e.target.value);
              if (n !== undefined) void save({ targetGrade: Math.min(100, Math.max(0, n)) });
            }}
            className="w-28 min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text font-bold"
          />
          {[70, 80, 90].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => void save({ targetGrade: preset })}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-xs font-medium"
            >
              {preset}% ({preset === 90 ? 'A' : preset === 80 ? 'B' : 'C'})
            </button>
          ))}
        </div>
      </div>

      {single ? (
        <div className="p-4 rounded border border-border bg-bg space-y-3">
          <h3 className="font-bold text-sm">
            Quick check from your Canvas gradebook (or leave blank to use the assignment scores below)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="quick-curr" className="block text-xs font-medium mb-1">
                Current overall grade in this class (%)
              </label>
              <input
                id="quick-curr"
                type="number"
                min={0}
                max={100}
                value={quickCurrent}
                onChange={(e) => {
                  setQuickCurrent(e.target.value);
                  void save({ quickCurrentPercent: toNumber(e.target.value) });
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
              />
            </div>
            <div>
              <label htmlFor="quick-rem" className="block text-xs font-medium mb-1">
                Part of the course not graded yet (%)
              </label>
              <input
                id="quick-rem"
                type="number"
                min={1}
                max={100}
                value={quickRemaining}
                onChange={(e) => {
                  setQuickRemaining(e.target.value);
                  void save({ quickRemainingWeight: toNumber(e.target.value) });
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted">
          The quick check from your gradebook is for one class at a time. Tick just one class above to use it. With
          several classes, each gets its own answer from its assignment scores.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canReset}
          onClick={reset}
          className="min-h-[44px] px-4 py-2 rounded border-2 border-accent bg-bg font-bold disabled:opacity-50 disabled:border-border"
        >
          Reset to my real numbers
        </button>
        {whatIf.count > 0 && !confirmSave && (
          <button
            type="button"
            onClick={() => setConfirmSave(true)}
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-sm font-medium"
          >
            Save what-if scores as my real scores
          </button>
        )}
        <span className="text-xs text-muted">Reset clears the what-if scores and the quick-check boxes.</span>
      </div>

      {whatIf.count > 0 && (
        <div role="status" className="p-3 rounded border-2 border-focus bg-bg text-sm">
          Showing {whatIf.count} what-if score{whatIf.count === 1 ? '' : 's'}. Your saved grades have not changed, and
          these go away when you leave this page or reset.
        </div>
      )}

      {confirmSave && (
        <div role="alertdialog" aria-label="Save what-if scores" className="p-3 rounded border-2 border-focus bg-bg space-y-2 text-sm">
          <p className="font-medium">
            This replaces your saved scores for {whatIf.count} assignment{whatIf.count === 1 ? '' : 's'} with the
            what-if numbers. Do this only if they are your real scores.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveAsReal()}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold"
            >
              Yes, save them
            </button>
            <button
              type="button"
              onClick={() => setConfirmSave(false)}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div role="status" className="space-y-3">
        {results.map(({ course, math }) => (
          <div key={course.id} className="p-4 rounded border-2 border-accent bg-bg space-y-2">
            <h3 className="font-bold">{course.name}</h3>
            <p className="font-bold">
              {!single &&
              math.currentAveragePercent === null &&
              math.pointsGradedSoFar === 0 &&
              math.pointsRemainingPool === 0
                ? 'No point values or scores for this class yet. Import your grades, or add points under "Try what-if scores, or enter your own" below.'
                : math.plainSummary}
            </p>
            {math.currentAveragePercent !== null && (
              <p className="text-xs text-muted">
                Current average: {math.currentAveragePercent}%
                {course.canvas?.currentScore !== null && course.canvas?.currentScore !== undefined && !course.canvas.hideFinalGrades
                  ? ` (Canvas shows ${course.canvas.currentScore}%${course.canvas.currentGrade ? `, ${course.canvas.currentGrade}` : ''})`
                  : ''}{' '}
                • Target: {catchUp.targetGrade}%{courseGrading(course).weighted ? ' • Weighted by category, as in Canvas' : ''}
              </p>
            )}
            {(course.latePenaltyPercent ?? 0) > 0 && (
              <p className="text-xs text-muted">{course.latePenaltyPercent === 100 ? 'Late work is not accepted in this class.' : `Late penalty in this class: ${course.latePenaltyPercent}% off late work.`}</p>
            )}
          </div>
        ))}
      </div>

      {assignments.length > 0 && (
        <details className="p-3 rounded border border-border bg-bg">
          <summary className="cursor-pointer font-medium text-sm min-h-[44px] flex items-center">
            Try what-if scores, or enter your own ({assignments.length} assignments)
          </summary>
          <div className="mt-3 space-y-4">
            <p className="text-xs text-muted">
              Type a score to see what it would do. Numbers you type here are only what-ifs until you save them. The
              grey line shows what is saved.
            </p>
            <div>
              <label htmlFor="wi-filter" className="text-sm font-medium mr-2">
                Show
              </label>
              <select
                id="wi-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as Filter)}
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-text"
              >
                <option value="ungraded">Not graded yet</option>
                <option value="graded">Graded</option>
                <option value="all">Everything</option>
              </select>
            </div>

            {courses.map((course) => {
              const rows = assignments
                .filter((a) => a.courseId === course.id && matches(a))
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
              if (rows.length === 0) return null;
              const showAll = expanded.has(course.id);
              const shown = showAll ? rows : rows.slice(0, SHOW_FIRST);
              return (
                <div key={course.id} className="space-y-2">
                  <h4 className="font-bold text-sm">{course.name}</h4>
                  <ul className="space-y-2">
                    {shown.map((a) => {
                      const e = effectiveById.get(a.id) ?? a;
                      const changed = a.id in whatIf.overrides;
                      return (
                        <li
                          key={a.id}
                          className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded border bg-surface text-sm ${
                            changed ? 'border-accent border-2' : 'border-border'
                          }`}
                        >
                          <span>
                            <span className="font-bold">{a.name}</span>
                            {changed && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-accent text-on-accent">what-if</span>}
                            <span className="block text-xs text-muted">
                              Due {a.dueDate} • Saved:{' '}
                              {typeof a.earnedPoints === 'number' ? `${a.earnedPoints}` : 'not graded'}
                              {' / '}
                              {a.points ?? 'no points'}
                            </span>
                          </span>
                          <span className="flex flex-wrap items-center gap-2">
                            <label className="flex items-center gap-2">
                              <span className="text-xs text-muted">Score</span>
                              <input
                                type="number"
                                min={0}
                                max={1000}
                                aria-label={`Score for ${a.name}`}
                                value={e.earnedPoints ?? ''}
                                onChange={(ev) => whatIf.setValue(a, 'earnedPoints', toNumber(ev.target.value))}
                                className="w-24 min-h-[44px] px-2 py-1 rounded border border-border bg-bg text-text"
                              />
                            </label>
                            <label className="flex items-center gap-2">
                              <span className="text-xs text-muted">out of</span>
                              <input
                                type="number"
                                min={0}
                                max={1000}
                                aria-label={`Points possible for ${a.name}`}
                                value={e.points ?? ''}
                                onChange={(ev) => whatIf.setValue(a, 'points', toNumber(ev.target.value))}
                                className="w-24 min-h-[44px] px-2 py-1 rounded border border-border bg-bg text-text"
                              />
                            </label>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {rows.length > SHOW_FIRST && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(course.id)) next.delete(course.id);
                          else next.add(course.id);
                          return next;
                        })
                      }
                      className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-sm"
                    >
                      {showAll ? 'Show fewer' : `Show all ${rows.length}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
};
