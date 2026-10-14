import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../../shared/components/AppShell';
import { useApp } from '../../app/AppContext';
import { Assignment } from '../../shared/data/schemas';
import { useClock } from '../../shared/clock/ClockContext';
import { formatDueIn } from '../../shared/clock/clockLogic';

export const AssignmentsPage: React.FC = () => {
  const { id: routeAssignmentId } = useParams<{ id?: string }>();
  const { assignments, courses, upsertAssignment, completeAssignmentWithReward } = useApp();
  const { now } = useClock();
  const [courseFilter, setCourseFilter] = useState('all');
  const [showNotNow, setShowNotNow] = useState(false);
  const [openDetailId, setOpenDetailId] = useState<string | null>(routeAssignmentId ?? null);
  const hoverTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (routeAssignmentId) setOpenDetailId(routeAssignmentId);
  }, [routeAssignmentId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDetailId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const startHover = (id: string) => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      setOpenDetailId(id);
    }, 2000);
  };

  const clearHover = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const notNowList = assignments.filter((a) => a.notNow);
  const visible = assignments.filter((a) => {
    if (a.notNow) return false;
    if (courseFilter !== 'all' && a.courseId !== courseFilter) return false;
    return true;
  });

  const renderDetails = (a: Assignment) => {
    const course = courses.find((c) => c.id === a.courseId);
    return (
      <div
        role="region"
        aria-label={`Details for ${a.name}`}
        className="mt-3 p-4 rounded border-2 border-accent bg-bg space-y-2 text-sm"
      >
        <div className="flex justify-between items-center">
          <strong>Full details: {a.name}</strong>
          <button
            type="button"
            onClick={() => setOpenDetailId(null)}
            className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface"
          >
            Close (Esc)
          </button>
        </div>
        <p>Course: {course?.name ?? 'General'}</p>
        <p>Type: {a.type} • Estimate: {a.estimateMinutes} min ({a.estimateSource})</p>
        <p>
          Due: {a.dueDate} {a.dueTime ?? ''} • Points: {a.points ?? 'n/a'} • Grade %:{' '}
          {a.percentOfGrade ?? 'n/a'}%
        </p>
        <p>Instructions: {a.detailsText || 'No additional instructions entered.'}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            to={`/start/${a.id}`}
            className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium flex items-center"
          >
            Help me start
          </Link>
          <button
            type="button"
            onClick={() =>
              a.status === 'done'
                ? void upsertAssignment({ ...a, status: 'todo', completedAt: undefined })
                : void completeAssignmentWithReward(a)
            }
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface"
          >
            {a.status === 'done' ? 'Mark todo' : 'Mark finished'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <AppShell title="Assignments">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4 rounded border border-border">
          <div className="flex items-center gap-2">
            <label htmlFor="course-filter" className="text-sm font-medium">
              Filter course:
            </label>
            <select
              id="course-filter"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg text-text"
            >
              <option value="all">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowNotNow(!showNotNow)}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text text-sm"
            >
              Not now ({notNowList.length}) {showNotNow ? 'Hide' : 'Open'}
            </button>
            <Link
              to="/setup/courses"
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium flex items-center"
            >
              Add a course
            </Link>
          </div>
        </div>

        {showNotNow && (
          <section
            aria-label="Not now list"
            className="p-4 rounded border border-border bg-surface space-y-3"
          >
            <h2 className="font-bold">Not now list</h2>
            {notNowList.length === 0 ? (
              <p className="text-sm text-muted">No tasks in Not now.</p>
            ) : (
              <ul className="space-y-2">
                {notNowList.map((a) => (
                  <li
                    key={a.id}
                    className="p-3 rounded border border-border bg-bg flex items-center justify-between"
                  >
                    <span>
                      {a.name} (due {a.dueDate})
                    </span>
                    <button
                      type="button"
                      onClick={() => void upsertAssignment({ ...a, notNow: false })}
                      className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent text-sm font-medium"
                    >
                      Put back in plan
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {visible.length === 0 ? (
          <div className="p-6 rounded border border-border bg-surface text-center">
            No assignments found.
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((a) => {
              const isOpen = openDetailId === a.id;
              return (
                <li
                  key={a.id}
                  onMouseEnter={() => startHover(a.id)}
                  onMouseLeave={clearHover}
                  className="p-4 rounded border border-border bg-surface"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-bold">{a.name}</span>
                      <span className="text-sm text-muted ml-2">
                        {formatDueIn(a.dueDate, a.dueTime, now)} ({a.dueDate}) • {a.points ?? 0} pts • {a.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenDetailId(isOpen ? null : a.id)}
                        className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text text-sm font-medium"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void upsertAssignment({ ...a, notNow: true })}
                        className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text text-sm"
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                  {isOpen && renderDetails(a)}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
};
