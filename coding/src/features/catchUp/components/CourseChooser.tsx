import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../app/AppContext';
import { useClock } from '../../../shared/clock/ClockContext';
import { assignmentGroup } from '../deadline';
import { isCurrentWork } from '../dueBuckets';
import { buildGradeBook, courseGrading, gradeNow, GradeNow } from '../gradeBook';
import { useCatchUp } from '../useCatchUp';

// Pick the classes to plan together. Everything below (grade math, pace, study plan) uses just these classes.
// Each class shows its grade now, which is where its C math starts.
export const CourseChooser: React.FC<{ selectedIds: string[] }> = ({ selectedIds }) => {
  const { courses, assignments } = useApp();
  const { today, now } = useClock();
  const { save } = useCatchUp();
  const chosen = new Set(selectedIds);

  // Your grade now in each class: yours, else Canvas's, else what this term's scores add up to (0s included).
  const grades = useMemo(() => {
    const out = new Map<string, GradeNow | null>();
    for (const c of courses) {
      const graded = assignments.filter((a) => a.courseId === c.id && typeof a.earnedPoints === 'number' && isCurrentWork(a, today));
      const book = buildGradeBook(graded, courseGrading(c), { assumedScore: 0, roleOf: () => 'graded' });
      out.set(c.id, gradeNow(c, book?.percent));
    }
    return out;
  }, [courses, assignments, today]);

  // Work left to do: not turned in yet, including a 0 on work never turned in and a redo, like the Late work list.
  const unfinishedIn = (courseId: string) =>
    assignments.filter((a) => {
      if (a.courseId !== courseId) return false;
      const group = assignmentGroup(a, now);
      return group === 'late' || group === 'upcoming';
    }).length;

  // Classes with work left come first, so old or empty ones sink to the bottom.
  const ordered = [...courses].sort((a, b) => unfinishedIn(b.id) - unfinishedIn(a.id) || a.name.localeCompare(b.name));

  // Everything ticked is saved as "no list", so classes you add later join automatically.
  const choose = (ids: string[]) =>
    void save({
      selectedCourseIds: ids.length === courses.length ? [] : ids,
      selectedCourseId: ids.length === 1 ? ids[0] : 'all',
    });

  const toggle = (id: string) => {
    if (chosen.has(id)) {
      if (chosen.size > 1) choose(selectedIds.filter((x) => x !== id));
    } else {
      choose([...selectedIds, id]);
    }
  };

  const withWork = courses.filter((c) => unfinishedIn(c.id) > 0).map((c) => c.id);

  return (
    <section aria-labelledby="classes-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div>
        <h2 id="classes-heading" className="text-lg font-bold">
          1. Your classes
        </h2>
        <p className="text-sm text-muted">
          Tick the classes to plan together. Each one is worked out on its own, starting from its grade now, and the pace
          and the study plan below use only these.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm">
          No classes yet.{' '}
          <Link to="/setup/courses" className="underline">
            Add a course
          </Link>{' '}
          or import your grades or calendar first.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={chosen.size === courses.length}
              onClick={() => choose(courses.map((c) => c.id))}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-sm font-medium disabled:opacity-50"
            >
              All classes
            </button>
            <button
              type="button"
              disabled={withWork.length === 0}
              onClick={() => choose(withWork)}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-sm font-medium disabled:opacity-50"
            >
              Only classes with work left
            </button>
          </div>
          <ul className="space-y-1">
            {ordered.map((c) => {
              const isChosen = chosen.has(c.id);
              const count = unfinishedIn(c.id);
              const grade = grades.get(c.id);
              return (
                <li key={c.id} className="rounded border border-border bg-bg px-3 py-1">
                  <label className="flex items-start gap-3 min-h-[44px] cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={isChosen}
                      disabled={isChosen && chosen.size === 1}
                      onChange={() => toggle(c.id)}
                      className="w-5 h-5 mt-1"
                    />
                    <span>
                      <span className="font-medium">{c.name}</span>
                      <span className="block text-xs text-muted">
                        {grade ? `Grade now ${grade.percent}% (${grade.letter}) • ` : ''}
                        {count} task{count === 1 ? '' : 's'} left to do
                        {isChosen && chosen.size === 1 ? ' • keep at least one class ticked' : ''}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};
