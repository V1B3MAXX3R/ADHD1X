import React, { useMemo, useRef, useState } from 'react';
import { useApp, getTodayDateString } from '../../app/AppContext';
import { parseIcs, ParsedCalendarEntry } from './icsParser';
import {
  entryIsInTheFuture,
  formatDayHeading,
  formatTime12h,
  MAX_CALENDAR_FILE_BYTES,
  mergeImport,
  planCalendarAdd,
} from './calendarLogic';
import { describeAdd, useCalendarAdd } from './useCalendarAdd';

interface Preview {
  entries: ParsedCalendarEntry[];
  earlierHidden: number;
  skipped: number;
}

export const ImportPanel: React.FC<{ onMessage: (text: string) => void }> = ({ onMessage }) => {
  const { calendarItems, saveCalendarBatch, courses, assignments } = useApp();
  const { commit } = useCalendarAdd();
  // On by default because the person asked for it. Nothing happens until they tap Save (A4).
  const [autoAdd, setAutoAdd] = useState(true);
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const storedById = useMemo(() => new Map(calendarItems.map((c) => [c.id, c])), [calendarItems]);

  // What saving would do, shown before anything is saved.
  const previewPlan = useMemo(() => {
    if (!preview || !autoAdd) return null;
    const picked = preview.entries
      .filter((e) => selected.has(e.uid) && e.kind === 'assignment' && storedById.get(e.uid)?.status !== 'hidden')
      .map((e) => ({ id: e.uid, title: e.title, courseName: e.courseName, kind: e.kind, date: e.date, time: e.time, description: e.description }));
    return planCalendarAdd(picked, courses, assignments, () => 'preview', 'preview');
  }, [preview, autoAdd, selected, storedById, courses, assignments]);

  const readText = (text: string) => {
    setError('');
    const result = parseIcs(text);
    if (result.entries.length === 0) {
      setPreview(null);
      setError(
        'I could not find any calendar items in that. Make sure it is a calendar file ending in .ics, or paste its text.',
      );
      return;
    }
    const today = getTodayDateString();
    const upcoming = result.entries.filter((e) => entryIsInTheFuture(e.date, today));
    setPreview({
      entries: upcoming,
      earlierHidden: result.entries.length - upcoming.length,
      skipped: result.skipped,
    });
    setSelected(new Set(upcoming.filter((e) => e.kind === 'assignment').map((e) => e.uid)));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_CALENDAR_FILE_BYTES) {
      setError('That file is bigger than 4 MB. Try exporting a shorter date range.');
      return;
    }
    readText(await file.text());
  };

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const save = async () => {
    if (!preview) return;
    const picked = preview.entries.filter((e) => selected.has(e.uid));
    const { items, created, updated } = mergeImport(calendarItems, picked, new Date().toISOString());
    let toSave = items;
    let addNote = '';
    if (autoAdd) {
      // Only assignments you have not already added or hidden are considered.
      const open = items.filter((i) => i.kind === 'assignment' && i.status === 'open');
      const result = await commit(open);
      const byId = new Map(result.updated.map((i) => [i.id, i]));
      toSave = items.map((i) => byId.get(i.id) ?? i);
      if (result.plan.additions.length > 0 || result.plan.needCourse.length > 0) addNote = ' ' + describeAdd(result.plan);
    }
    await saveCalendarBatch(toSave);
    onMessage(
      `Saved ${picked.length} calendar item${picked.length === 1 ? '' : 's'} (${created} new, ${updated} already here and refreshed).${addNote}`,
    );
    setPreview(null);
    setPasted('');
    if (fileRef.current) fileRef.current.value = '';
  };
  return (
    <section aria-labelledby="import-heading" className="p-4 rounded border border-border bg-surface space-y-4">
      <h2 id="import-heading" className="text-xl font-bold">
        Bring in a calendar
      </h2>
      <p className="text-sm">
        Pick a calendar file (.ics) from Google Calendar, Canvas, Outlook or Apple Calendar. You will see what is in it
        before anything is saved. Your calendar stays in this browser and is never sent to Gemini.
      </p>

      <details className="text-sm">
        <summary className="cursor-pointer min-h-[44px] flex items-center font-medium">How do I get the file?</summary>
        <div className="space-y-3 pt-2">
          <div>
            <p className="font-bold">Google Calendar</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>On a computer, open Google Calendar and click the gear, then Settings.</li>
              <li>Choose Import &amp; export, then Export. This downloads a zip file.</li>
              <li>Open the zip. Pick the .ics file for the calendar you want.</li>
            </ol>
          </div>
          <div>
            <p className="font-bold">Canvas</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Open Calendar in Canvas.</li>
              <li>Click Calendar Feed (bottom right of the calendar).</li>
              <li>Open the link it shows. Your browser downloads a .ics file. Pick that file here.</li>
            </ol>
          </div>
          <p className="text-muted">
            Importing is a snapshot. When new assignments appear, download the file again and import it again.
            Anything you already added or hid stays as you left it.
          </p>
        </div>
      </details>

      <div className="space-y-2">
        <label htmlFor="ics-file" className="block font-medium">
          Calendar file
        </label>
        <input
          id="ics-file"
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="block min-h-[44px] w-full text-sm"
        />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer min-h-[44px] flex items-center font-medium">
          Or paste the calendar text
        </summary>
        <div className="space-y-2 pt-2">
          <label htmlFor="ics-text" className="sr-only">
            Calendar text
          </label>
          <textarea
            id="ics-text"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            className="w-full p-2 rounded border border-border bg-bg text-text font-mono text-xs"
            placeholder="BEGIN:VCALENDAR ..."
          />
          <button
            type="button"
            disabled={!pasted.trim()}
            onClick={() => readText(pasted)}
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
          >
            Read this text
          </button>
        </div>
      </details>

      {error && (
        <p role="alert" className="p-3 rounded border-2 border-focus bg-bg text-sm">
          {error}
        </p>
      )}

      {preview && (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="font-bold">
            Found {preview.entries.length} coming-up item{preview.entries.length === 1 ? '' : 's'}
          </h3>
          <p className="text-sm text-muted">
            Assignments are ticked. Tick events too if you want them in your coming-up list. Nothing is saved yet.
            {preview.earlierHidden > 0 ? ` ${preview.earlierHidden} earlier item(s) were left out.` : ''}
            {preview.skipped > 0 ? ` ${preview.skipped} item(s) had no title or date and were skipped.` : ''}
          </p>
          {preview.entries.length === 0 ? (
            <p className="text-sm">Everything in this file is in the past.</p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {preview.entries.map((e) => (
                <li key={e.uid} className="p-2 rounded border border-border bg-bg">
                  <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(e.uid)}
                      onChange={() => toggle(e.uid)}
                      className="mt-1 w-5 h-5"
                    />
                    <span className="text-sm">
                      <span className="font-bold">{e.title}</span>
                      <span className="text-muted">
                        {' '}
                        • {e.kind === 'assignment' ? 'Assignment' : 'Event'}
                        {e.courseName ? ` • ${e.courseName}` : ''}
                        <br />
                        {formatDayHeading(e.date)} • {formatTime12h(e.time)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="p-3 rounded border border-border bg-bg space-y-2 text-sm">
            <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdd}
                onChange={(e) => setAutoAdd(e.target.checked)}
                className="mt-1 w-5 h-5"
              />
              <span>
                <span className="font-medium">Also add the ticked assignments to my assignments</span>
                <span className="block text-muted">
                  Courses named in the calendar are created for you. Added assignments become part of your study plan.
                </span>
              </span>
            </label>
            {previewPlan && (
              <ul className="list-disc list-inside text-muted">
                {previewPlan.additions.length > 0 && (
                  <li>
                    {previewPlan.additions.length} assignment{previewPlan.additions.length === 1 ? '' : 's'} will be added
                  </li>
                )}
                {previewPlan.newCourses.length > 0 && (
                  <li>New course{previewPlan.newCourses.length === 1 ? '' : 's'}: {previewPlan.newCourses.map((c) => c.name).join(', ')}</li>
                )}
                {previewPlan.alreadyIn > 0 && <li>{previewPlan.alreadyIn} already in your assignments</li>}
                {previewPlan.needCourse.length > 0 && (
                  <li>
                    {previewPlan.needCourse.length} name no course. They stay in the list and you can add them yourself.
                  </li>
                )}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => void save()}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Save {selected.size} item{selected.size === 1 ? '' : 's'}
              {previewPlan && previewPlan.additions.length > 0
                ? ` and add ${previewPlan.additions.length} to my assignments`
                : ''}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
