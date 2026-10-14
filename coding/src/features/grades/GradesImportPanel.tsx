import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { GradesFile, MAX_GRADES_FILE_BYTES, parseGradesFile, planGradeImport } from './gradesFile';
import { CURRENT_WORK_DAYS } from '../catchUp/dueBuckets';

// Reads the file made by the Canvas grades tool (tools/canvas_grades). It shows what would change first, and
// nothing is saved until Save (A4). The website never sees a Canvas login, and grades never go to Gemini (A36).
export const GradesImportPanel: React.FC = () => {
  const { courses, assignments, upsertMany } = useApp();
  const [file, setFile] = useState<GradesFile | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [addMissing, setAddMissing] = useState(true);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const plan = useMemo(
    () => (file ? planGradeImport(file, courses, assignments, { addMissing, courseIds: chosen }, () => 'preview', new Date()) : null),
    [file, courses, assignments, addMissing, chosen],
  );

  const onPick = async (picked: File | undefined) => {
    if (!picked) return;
    setMessage('');
    if (picked.size > MAX_GRADES_FILE_BYTES) {
      setFile(null);
      setError('That file is bigger than 5 MB, so it is probably not a grades file.');
      return;
    }
    const result = parseGradesFile(await picked.text());
    if (!result.ok) {
      setFile(null);
      setError(result.error);
      return;
    }
    setError('');
    setFile(result.file);
    // Courses with graded work, or with dated work from this term, start ticked. Old or empty courses (an old club,
    // support pages with no due dates) start unticked, so they do not clutter your list.
    setChosen(
      new Set(
        result.file.courses
          .filter((c) =>
            c.assignments.some(
              (a) =>
                (a.state === 'graded' && a.score !== null) ||
                (a.countsInFinalGrade &&
                  a.state !== 'excused' &&
                  (a.pointsPossible ?? 0) > 0 &&
                  Boolean(a.dueAt) &&
                  Date.now() - new Date(a.dueAt as string).getTime() < CURRENT_WORK_DAYS * 86_400_000),
            ),
          )
          .map((c) => c.canvasCourseId),
      ),
    );
  };

  const reset = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    const real = planGradeImport(file, courses, assignments, { addMissing, courseIds: chosen }, () => crypto.randomUUID(), new Date());
    // One save for everything, so a big import is quick and the page updates once.
    await upsertMany([...real.newCourses, ...real.courseUpdates], [...real.updates, ...real.additions]);
    setMessage(
      `Saved. Updated ${real.updates.length} assignment${real.updates.length === 1 ? '' : 's'}` +
        (real.additions.length > 0 ? ` and added ${real.additions.length} new one${real.additions.length === 1 ? '' : 's'}` : '') +
        (real.courseUpdates.length + real.newCourses.length > 0
          ? `, with Canvas details for ${real.courseUpdates.length + real.newCourses.length} class${real.courseUpdates.length + real.newCourses.length === 1 ? '' : 'es'}.`
          : '.') +
        ' You can delete the file now.',
    );
    setBusy(false);
    reset();
  };

  const changes = plan ? plan.updates.length + plan.additions.length + plan.courseUpdates.length + plan.newCourses.length : 0;
  const richFile = Boolean(file && file.formatVersion >= 2);

  return (
    <section aria-labelledby="grades-import-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="grades-import-heading" className="text-lg font-bold">
          Bring in grades from Canvas
        </h2>
        <span className="text-xs px-2.5 py-1 rounded bg-bg border border-border text-muted">
          Stays on this device. Never goes to Gemini.
        </span>
      </div>
      <p className="text-sm">
        A small Python tool on your computer reads your grades from Canvas and saves them to a file. You pick that file
        here. This website never sees your Canvas login.
      </p>

      <details className="text-sm">
        <summary className="cursor-pointer min-h-[44px] flex items-center font-medium">How do I get the file?</summary>
        <ol className="list-decimal ml-5 space-y-2 pt-2">
          <li>
            In Canvas, open Account, then Settings. Under Approved Integrations choose <strong>New Access Token</strong>.
            Name it ADHD1X and set it to expire soon (tomorrow is fine). Copy the token. Canvas shows it only once.
          </li>
          <li>
            In a terminal in the project folder, run{' '}
            <code className="px-1 rounded bg-bg border border-border">python coding\tools\canvas_grades\canvas_grades.py</code>
            . Paste the token when it asks. Nothing shows on screen as you paste, which is normal.
          </li>
          <li>
            The tool saves <code className="px-1 rounded bg-bg border border-border">canvas-grades-….json</code> in your
            Downloads folder. Pick that file below.
          </li>
          <li>Afterwards, delete the file, and delete the token in Canvas.</li>
        </ol>
        <p className="pt-2">
          The tool reads only your own things, and only reads: your grades and assignments (with your own due dates,
          lock dates, instructions and rubrics), how each class is graded (category weights, drop rules, letter scale,
          late policy), the syllabus, module progress, and announcements from the last 30 days. It never reads your
          inbox, other students&apos; work or posts, files, quiz questions or answers, feedback comments, or your profile.
          Add <code className="px-1 rounded bg-bg border border-border">--grades-only</code> to leave out the syllabus,
          announcements, instructions and rubrics.
        </p>
        <p className="text-muted pt-2">
          Never type your token into this website or share it in chat. The tool&apos;s README has the details and the
          safety rules it follows.
        </p>
      </details>

      <div className="space-y-2">
        <label htmlFor="grades-file" className="block font-medium">
          Grades file
        </label>
        <input
          id="grades-file"
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p role="alert" className="p-3 rounded border-2 border-focus bg-bg text-sm">
          {error}
        </p>
      )}
      <div role="status" aria-live="polite" className="text-sm font-medium">
        {message}
      </div>

      {file && plan && (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="font-bold">What this file would change</h3>
          <p className="text-sm text-muted">
            Nothing is saved yet. This file has {file.courses.length} course{file.courses.length === 1 ? '' : 's'}, with
            your Canvas grades as of {file.fetchedAt.slice(0, 10)}. Tick the ones to bring in.
          </p>
          <fieldset className="space-y-1">
            <legend className="sr-only">Courses to bring in</legend>
            {plan.courseGrades.map((c) => (
              <label key={c.canvasCourseId} className="flex items-start gap-3 min-h-[44px] cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={chosen.has(c.canvasCourseId)}
                  onChange={() =>
                    setChosen((prev) => {
                      const next = new Set(prev);
                      if (next.has(c.canvasCourseId)) next.delete(c.canvasCourseId);
                      else next.add(c.canvasCourseId);
                      return next;
                    })
                  }
                  className="mt-1 w-5 h-5"
                />
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-muted">
                    {c.score === null ? 'No grade shown in Canvas' : `${c.score}%${c.grade ? ` (${c.grade})` : ''} in Canvas`}
                    {' • '}
                    {c.gradedCount} graded, {c.notGradedCount} not graded yet
                    {c.inYourCourses ? '' : ' • not one of your courses here yet'}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="flex items-start gap-3 min-h-[44px] cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={addMissing}
              onChange={(e) => setAddMissing(e.target.checked)}
              className="mt-1 w-5 h-5"
            />
            <span>
              <span className="font-medium">Also add Canvas work that is not in my assignments yet</span>
              <span className="block text-muted">
                Graded work is added as finished. Work not graded yet, including missing work, is added as to do so Catch
                Up can plan it. The course is created if you do not have it. Without these, the grade math leaves work out.
              </span>
            </span>
          </label>

          <ul className="list-disc list-inside text-sm text-muted">
            <li>
              Points and scores filled in on {plan.updates.length} assignment{plan.updates.length === 1 ? '' : 's'} you
              already have
            </li>
            {plan.additions.filter((a) => a.status === 'done').length > 0 && (
              <li>{plan.additions.filter((a) => a.status === 'done').length} graded assignments will be added as finished</li>
            )}
            {plan.additions.filter((a) => a.status !== 'done').length > 0 && (
              <li>
                {plan.additions.filter((a) => a.status !== 'done').length} not graded yet (including missing work) will be
                added as to do
              </li>
            )}
            {plan.newCourses.length > 0 && <li>New courses: {plan.newCourses.map((c) => c.name).join(', ')}</li>}
            {richFile && plan.courseUpdates.length + plan.newCourses.length > 0 && (
              <li>
                How {plan.courseUpdates.length + plan.newCourses.length} class
                {plan.courseUpdates.length + plan.newCourses.length === 1 ? ' is' : 'es are'} graded in Canvas (weights, drop
                rules, letter scale, late policy), plus the syllabus and recent announcements where Canvas shares them
              </li>
            )}
            {plan.markedDone > 0 && (
              <li>
                {plan.markedDone} unfinished assignment{plan.markedDone === 1 ? '' : 's'} marked finished, because Canvas
                shows {plan.markedDone === 1 ? 'it' : 'them'} turned in
              </li>
            )}
            {plan.detailsFilled > 0 && (
              <li>
                Instructions from Canvas filled in on {plan.detailsFilled} assignment{plan.detailsFilled === 1 ? '' : 's'}{' '}
                that had none (yours are never replaced)
              </li>
            )}
            {plan.datesChanged > 0 && (
              <li>
                {plan.datesChanged} due date{plan.datesChanged === 1 ? '' : 's'} moved to match Canvas (an extension, for
                example)
              </li>
            )}
            {plan.unchanged > 0 && <li>{plan.unchanged} already up to date</li>}
            {plan.unmatchedGraded > 0 && <li>{plan.unmatchedGraded} graded but not added, because the box above is off</li>}
            {plan.notGradedYet > 0 && (
              <li>{plan.notGradedYet} not graded yet and not added (the box above is off, or Canvas has no due date for them)</li>
            )}
            {plan.skipped > 0 && <li>{plan.skipped} skipped (excused, not counted in the grade, or no points)</li>}
          </ul>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || changes === 0}
              onClick={() => void save()}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Save grades
            </button>
            <button
              type="button"
              onClick={reset}
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
