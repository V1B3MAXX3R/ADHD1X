import React, { useState } from 'react';
import { AppShell } from '../../shared/components/AppShell';
import { useApp } from '../../app/AppContext';
import { useClock } from '../../shared/clock/ClockContext';
import { CalendarItemRow } from './CalendarItemRow';
import { ImportPanel } from './ImportPanel';
import { formatDayHeading, getNewAssignments, getUpcomingByDay, planCalendarAdd, UPCOMING_DAYS } from './calendarLogic';
import { describeAdd, useCalendarAdd } from './useCalendarAdd';

export const CalendarPage: React.FC = () => {
  const { calendarItems, assignments, courses, saveCalendarBatch, removeAllCalendarItems } = useApp();
  const { commitAndSave } = useCalendarAdd();
  const [message, setMessage] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { today } = useClock();

  const newItems = getNewAssignments(calendarItems, assignments, today);
  const upcoming = getUpcomingByDay(calendarItems, today);

  // How many of the new assignments could be added in one tap (they must name a course).
  const addable = planCalendarAdd(newItems, courses, assignments, () => 'x', 'x').additions.length;

  const addAll = async () => {
    const { plan } = await commitAndSave(newItems);
    setMessage(describeAdd(plan));
  };

  const markAllSeen = async () => {
    await saveCalendarBatch(newItems.map((i) => ({ ...i, isNew: false })));
    setMessage('Marked the new items as seen. They are still in Coming up.');
  };

  return (
    <AppShell title="Calendar">
      <div className="space-y-6">
        <p>
          Bring in a calendar to see new and upcoming assignments in one place. Assignments you add become part of your
          study plan on the Today page.
        </p>

        <div role="status" aria-live="polite" className="min-h-[1.5rem] text-sm font-medium">
          {message}
        </div>

        <ImportPanel onMessage={setMessage} />

        <section aria-labelledby="new-heading" className="p-4 rounded border border-border bg-surface space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="new-heading" className="text-xl font-bold">
              New assignments ({newItems.length})
            </h2>
            {addable > 0 && (
              <button
                type="button"
                onClick={() => void addAll()}
                className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Add all {addable} to my assignments
              </button>
            )}
            {newItems.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllSeen()}
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text text-sm"
              >
                Mark all as seen
              </button>
            )}
          </div>
          {newItems.length === 0 ? (
            <p className="text-sm text-muted">
              {calendarItems.length === 0
                ? 'Nothing here yet. Import a calendar above.'
                : 'No new assignments right now.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {newItems.map((item) => (
                <CalendarItemRow key={item.id} item={item} showDate onMessage={setMessage} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="upcoming-heading" className="p-4 rounded border border-border bg-surface space-y-3">
          <h2 id="upcoming-heading" className="text-xl font-bold">
            Coming up (next {UPCOMING_DAYS} days)
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nothing in your imported calendar for the next {UPCOMING_DAYS} days.</p>
          ) : (
            upcoming.map((day) => (
              <div key={day.date} className="space-y-2">
                <h3 className="font-bold">{day.date === today ? 'Today' : formatDayHeading(day.date)}</h3>
                <ul className="space-y-2">
                  {day.items.map((item) => (
                    <CalendarItemRow key={item.id} item={item} onMessage={setMessage} />
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {calendarItems.length > 0 && (
          <section aria-labelledby="manage-heading" className="p-4 rounded border border-border bg-surface space-y-3">
            <h2 id="manage-heading" className="text-xl font-bold">
              Your imported calendar
            </h2>
            <p className="text-sm">
              {calendarItems.length} item{calendarItems.length === 1 ? '' : 's'} saved in this browser. Removing them
              does not delete assignments you already added.
            </p>
            {confirmRemove ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm">Remove all imported calendar items?</span>
                <button
                  type="button"
                  onClick={() => {
                    void removeAllCalendarItems();
                    setConfirmRemove(false);
                    setMessage('Removed the imported calendar items.');
                  }}
                  className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
                >
                  Yes, remove them
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
                >
                  Keep them
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
              >
                Remove imported calendar items
              </button>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
};
