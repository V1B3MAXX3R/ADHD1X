import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { GradesFile, MAX_GRADES_FILE_BYTES, parseGradesFile, planGradeImport } from './gradesFile';

// Reads the file made by the Canvas grades tool (tools/canvas_grades). It shows what would change first, and
// nothing is saved until Save (A4). The website never sees a Canvas login, and grades never go to Gemini (A36).
export const GradesImportPanel: React.FC = () => {
  const { courses, assignments, upsertCourse, upsertAssignment } = useApp();
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
    // Courses with graded work start ticked. Old or empty courses start unticked, so they do not clutter your list.
    setChosen(
      new Set(
        result.file.courses
          .filter((c) => c.assignments.some((a) => a.state === 'graded' && a.score !== null))
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
    for (const c of real.newCourses) await upsertCourse(c);
    for (const a of real.updates) await upsertAssignment(a);
    for (const a of real.additions) await upsertAssignment(a);
    setMessage(
      `Saved. Updated ${real.updates.length} assignment${real.updates.length === 1 ? '' : 's'}` +
        (real.additions.length > 0 ? ` and added ${real.additions.length} graded one${real.additions.length === 1 ? '' : 's'}.` : '.') +
        ' You can delete the file now.',
    );
    setBusy(false);
    reset();
  };

  const changes = plan ? plan.updates.length + plan.additions.length : 0;

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
              <span className="font-medium">Also add graded work that is not in my assignments yet</span>
              <span className="block text-muted">
                It is added as finished, and the course is created if you do not have it. Without these, the grade math
                leaves out past work. They count toward your Progress too.
              </span>
            </span>
          </label>

          <ul className="list-disc list-inside text-sm text-muted">
            <li>
              Points and scores filled in on {plan.updates.length} assignment{plan.updates.length === 1 ? '' : 's'} you
              already have
            </li>
            {plan.additions.length > 0 && (
              <li>
                {plan.additions.length} graded assignment{plan.additions.length === 1 ? '' : 's'} will be added
              </li>
            )}
            {plan.newCourses.length > 0 && <li>New courses: {plan.newCourses.map((c) => c.name).join(', ')}</li>}
            {plan.unchanged > 0 && <li>{plan.unchanged} already up to date</li>}
            {plan.unmatchedGraded > 0 && <li>{plan.unmatchedGraded} graded but not added, because the box above is off</li>}
            {plan.notGradedYet > 0 && (
              <li>{plan.notGradedYet} not graded yet and not in your list. Import your calendar to bring those in.</li>
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
