import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { CalendarItem } from '../../shared/data/schemas';
import {
  buildAssignmentFromItem,
  findExistingAssignment,
  formatDayHeading,
  formatTime12h,
  matchCourse,
} from './calendarLogic';

export const CalendarItemRow: React.FC<{
  item: CalendarItem;
  showDate?: boolean;
  onMessage: (text: string) => void;
}> = ({ item, showDate = false, onMessage }) => {
  const { courses, assignments, upsertAssignment, saveCalendarBatch } = useApp();
  const existing = findExistingAssignment(item, assignments);
  const matched = matchCourse(item.courseName, courses);
  const [courseId, setCourseId] = useState(matched?.id ?? courses[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  const canAdd = item.kind === 'assignment' && !existing && item.status !== 'hidden';

  const add = async () => {
    if (!courseId) return;
    setBusy(true);
    const assignment = buildAssignmentFromItem(
      item,
      courseId,
      new Date().toISOString(),
      crypto.randomUUID(),
    );
    await upsertAssignment(assignment);
    await saveCalendarBatch([{ ...item, status: 'added', isNew: false, assignmentId: assignment.id }]);
    onMessage(`Added "${item.title}" to your assignments. It is now part of your study plan.`);
    setBusy(false);
  };

  const hide = async () => {
    await saveCalendarBatch([{ ...item, status: 'hidden', isNew: false }]);
    onMessage(`Hid "${item.title}".`);
  };

  return (
    <li className="p-3 rounded border border-border bg-bg space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="font-bold">{item.title}</span>
          <span className="text-sm text-muted ml-2">
            {item.kind === 'assignment' ? 'Assignment' : 'Event'}
            {item.courseName ? ` • ${item.courseName}` : ''}
          </span>
          <p className="text-sm text-muted">
            {showDate ? `${formatDayHeading(item.date)} • ` : ''}
            {item.kind === 'assignment' && item.time ? 'due ' : ''}
            {formatTime12h(item.time)}
            {item.repeats ? ' • repeats (only the first date is shown)' : ''}
          </p>
        </div>
        {existing && (
          <Link
            to={`/assignments/${existing.id}`}
            className="min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-sm flex items-center"
          >
            In your assignments
          </Link>
        )}
      </div>

      {canAdd && (
        <div className="flex flex-wrap items-center gap-2">
          {courses.length === 0 ? (
            <Link to="/setup/courses" className="underline min-h-[44px] flex items-center text-sm">
              Add a course first, then you can add this
            </Link>
          ) : (
            <>
              <label htmlFor={`course-${item.id}`} className="text-sm font-medium">
                Course:
              </label>
              <select
                id={`course-${item.id}`}
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-text"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => void add()}
                className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Add to my assignments
              </button>
              <button
                type="button"
                onClick={() => void hide()}
                className="min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text text-sm"
              >
                Hide
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
};
