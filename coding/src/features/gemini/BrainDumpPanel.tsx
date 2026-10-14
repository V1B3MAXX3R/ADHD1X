import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../app/AppContext';
import { useClock } from '../../shared/clock/ClockContext';
import { AssignmentType } from '../../shared/data/schemas';
import { getDefaultEstimate } from '../../shared/logic/estimates';
import { addDays, matchCourse } from '../calendar/calendarLogic';
import { splitBrainDump } from './geminiLogic';
import { useAiCall } from './useAiCall';

interface DumpItem {
  title: string;
  guessedCourse?: string;
  guessedType?: AssignmentType;
  selected: boolean;
}

// "Sort my brain dump" (A26, A94). Only runs when you tap, with a reminder to leave out personal
// details. Nothing is added until you tick items and tap Add.
export const BrainDumpPanel: React.FC = () => {
  const { settings, courses, upsertAssignment } = useApp();
  const { today } = useClock();
  const { loading, notice, setNotice, run } = useAiCall();
  const [text, setText] = useState('');
  const [items, setItems] = useState<DumpItem[]>([]);
  const [courseId, setCourseId] = useState('');
  const [dueDate, setDueDate] = useState(addDays(today, 7));

  const defaultCourseId = courseId || courses[0]?.id || '';

  const sortWithGemini = () =>
    run<{ items: { title: string; guessedCourse?: string; guessedType?: AssignmentType }[] }>(
      'brainDump',
      { dumpText: text, knownCourses: courses.map((c) => c.name) },
      (d) => setItems(d.items.map((x) => ({ ...x, selected: true }))),
      () => sortBuiltIn(),
    );

  const sortBuiltIn = () => setItems(splitBrainDump(text).map((title) => ({ title, selected: true })));

  const addSelected = async () => {
    const chosen = items.filter((i) => i.selected);
    for (const item of chosen) {
      const type = item.guessedType ?? 'homework';
      await upsertAssignment({
        id: crypto.randomUUID(),
        courseId: matchCourse(item.guessedCourse, courses)?.id ?? defaultCourseId,
        name: item.title,
        type,
        dueDate,
        estimateMinutes: getDefaultEstimate(type),
        estimateSource: 'default',
        minutesLogged: 0,
        status: 'todo',
        notNow: false,
        addedLate: false,
        source: 'manual',
        createdAt: new Date().toISOString(),
      });
    }
    setItems([]);
    setText('');
    setNotice(`Added ${chosen.length} task${chosen.length === 1 ? '' : 's'} to your assignments.`);
  };

  return (
    <section aria-labelledby="braindump-heading" className="p-4 rounded-lg border border-border bg-surface space-y-3">
      <h2 id="braindump-heading" className="font-bold text-base">
        Sort my brain dump
      </h2>
      <p className="text-xs text-muted">
        Type everything on your mind in one messy list. If you use Gemini, leave out personal or sensitive details.
      </p>

      {courses.length === 0 ? (
        <p className="text-sm">
          <Link to="/setup/courses" className="underline">
            Add a course first
          </Link>
          , so tasks have somewhere to go.
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="braindump-text" className="block text-sm font-medium mb-1">
              Your list
            </label>
            <textarea
              id="braindump-text"
              rows={3}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 rounded border border-border bg-bg text-text text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.aiModeEnabled && (
              <button
                type="button"
                disabled={!text.trim() || loading}
                onClick={sortWithGemini}
                className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium text-sm"
              >
                {loading ? 'Sorting...' : 'Sort my brain dump (Uses Gemini)'}
              </button>
            )}
            <button
              type="button"
              disabled={!text.trim()}
              onClick={sortBuiltIn}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-sm"
            >
              Split into a list (built-in)
            </button>
          </div>
        </>
      )}

      {notice && <p role="status" className="text-xs text-muted">{notice}</p>}

      {items.length > 0 && (
        <div className="p-3 rounded border-2 border-accent bg-bg space-y-3">
          <p className="font-bold text-sm">Tick what you want to add</p>
          <ul className="space-y-1 text-sm">
            {items.map((it, idx) => (
              <li key={idx}>
                <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={it.selected}
                    onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, selected: e.target.checked } : x)))}
                    className="w-5 h-5"
                  />
                  <span>
                    <strong>{it.title}</strong> ({it.guessedType ?? 'homework'}
                    {it.guessedCourse ? `, ${it.guessedCourse}` : ''})
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="braindump-course" className="block text-xs font-medium mb-1">
                Course (when no course is guessed)
              </label>
              <select
                id="braindump-course"
                value={defaultCourseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="braindump-due" className="block text-xs font-medium mb-1">
                Due date for these (you can change each one later)
              </label>
              <input
                id="braindump-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!items.some((i) => i.selected) || !dueDate || !defaultCourseId}
              onClick={() => void addSelected()}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-bold text-sm"
            >
              Add selected tasks
            </button>
            <button
              type="button"
              onClick={() => setItems([])}
              className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
