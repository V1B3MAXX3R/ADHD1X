import React, { useEffect, useState } from 'react';
import { useApp } from '../../../app/AppContext';
import { Assignment, Course, CourseGrading as GradingSetup, GradeCategory } from '../../../shared/data/schemas';
import { buildGradeBook, categoryFromSetup, connectionSummary, courseGrading, DEFAULT_CUTOFFS, gradeNow } from '../gradeBook';

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const MAX_ROWS = 200;

// A starting setup for a class: Canvas's letter scale and categories when the file had them, else the usual scale.
export function startingSetup(course: Course): GradingSetup {
  const scale = course.canvas?.gradingScale;
  const cut = (letter: string, fallback: number) => scale?.find((e) => e.name.trim().toUpperCase() === letter)?.minPercent ?? fallback;
  const categories: GradeCategory[] = (course.canvas?.groups ?? []).map((g) => ({
    id: `cat-${g.id}`,
    name: (g.name || 'Category').slice(0, 60),
    weight: g.weight,
    keywords: [],
    canvasGroupId: g.id,
    dropLowest: Math.min(50, g.dropLowest),
  }));
  return {
    cutoffs: { A: cut('A', DEFAULT_CUTOFFS.A), B: cut('B', DEFAULT_CUTOFFS.B), C: cut('C', DEFAULT_CUTOFFS.C), D: cut('D', DEFAULT_CUTOFFS.D) },
    weighted: Boolean(course.canvas?.weighted && categories.some((c) => c.weight > 0)),
    categories,
  };
}

// A number box that saves when you leave it (or press Enter), so typing never saves half a number.
const NumberField: React.FC<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (n: number) => void;
}> = ({ id, label, value, min, max, step = 1, onCommit }) => {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) {
      if (n !== value) onCommit(n);
    } else setDraft(String(value));
  };
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-24 min-h-[44px] px-2 py-1 rounded border border-border bg-surface text-text"
      />
    </div>
  );
};

// A number box that may be left empty (empty means "not set"). Saves when you leave it, or press Enter.
const OptionalNumberField: React.FC<{
  id: string;
  label: string;
  value: number | undefined;
  placeholder?: string;
  min: number;
  max: number;
  onCommit: (n: number | undefined) => void;
}> = ({ id, label, value, placeholder, min, max, onCommit }) => {
  const shown = value === undefined ? '' : String(value);
  const [draft, setDraft] = useState(shown);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(shown);
  }, [shown, focused]);
  const commit = () => {
    if (draft.trim() === '') {
      if (value !== undefined) onCommit(undefined);
      return;
    }
    const n = Number(draft);
    if (Number.isFinite(n) && n >= min && n <= max) {
      if (n !== value) onCommit(n);
    } else setDraft(shown);
  };
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={0.01}
        value={draft}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-28 min-h-[44px] px-2 py-1 rounded border border-border bg-surface text-text"
      />
    </div>
  );
};

// A text box that saves when you leave it (or press Enter).
const TextField: React.FC<{ id: string; label: string; value: string; maxLength: number; onCommit: (s: string) => void; wide?: boolean }> = ({
  id,
  label,
  value,
  maxLength,
  onCommit,
  wide,
}) => {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);
  return (
    <div className={wide ? 'flex-1 min-w-[12rem]' : ''}>
      <label htmlFor={id} className="block text-xs font-medium mb-1">
        {label}
      </label>
      <input
        id={id}
        value={draft}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setFocused(false);
          if (draft !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full min-h-[44px] px-2 py-1 rounded border border-border bg-surface text-text"
      />
    </div>
  );
};

const splitWords = (text: string): string[] =>
  text
    .split(',')
    .map((w) => w.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 20);

// One class's grading: letter cutoffs, points or weighted categories, and which assignments go in which category.
const ClassGrading: React.FC<{ course: Course; assignments: Assignment[] }> = ({ course, assignments }) => {
  const { upsertCourse, upsertAssignment } = useApp();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [onlyUnconnected, setOnlyUnconnected] = useState(true);
  const grading = courseGrading(course);
  const setup = course.grading;
  const save = (next: GradingSetup | undefined) => void upsertCourse({ ...course, grading: next });
  const update = (patch: Partial<GradingSetup>) => setup && save({ ...setup, ...patch });
  const updateCategory = (id: string, patch: Partial<GradeCategory>) =>
    setup && update({ categories: setup.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const mine = assignments.filter((a) => a.courseId === course.id && (a.points ?? 0) > 0);
  const summary = connectionSummary(mine, grading);
  const key = course.id.replace(/[^a-zA-Z0-9_-]/g, '');
  const scored = buildGradeBook(mine, grading, {
    assumedScore: 0,
    roleOf: (a) => (typeof a.earnedPoints === 'number' ? 'graded' : null),
  });
  const now = gradeNow(course, scored?.percent);
  const canvasNow =
    course.canvas && !course.canvas.hideFinalGrades && typeof course.canvas.currentScore === 'number'
      ? `${course.canvas.currentScore}%${course.canvas.currentGrade ? ` (${course.canvas.currentGrade})` : ''}`
      : null;

  const sourceText = grading.cSource === 'yours' ? 'yours' : grading.cSource === 'canvas' ? 'from Canvas' : 'the usual';
  const howText = grading.weighted
    ? `weighted: ${grading.groups.filter((g) => g.weight > 0).map((g) => `${g.name} ${g.weight}%`).join(', ')}`
    : 'by points';

  return (
    <details className="rounded border border-border bg-bg">
      <summary className="min-h-[44px] px-3 py-2 cursor-pointer font-medium flex flex-wrap items-center gap-x-2">
        <span>{course.name}</span>
        <span className="text-xs font-normal text-muted">
          {now ? `now ${now.percent}% (${now.letter}); ` : ''}
          {howText}; C at {grading.cPercent}% ({sourceText})
        </span>
      </summary>
      <div className="p-3 space-y-4 text-sm">
        <div className="space-y-1">
          <OptionalNumberField
            id={`now-${key}`}
            label="My grade now (%)"
            value={course.gradeNowPercent}
            placeholder={canvasNow ? String(course.canvas?.currentScore) : undefined}
            min={0}
            max={150}
            onCommit={(n) => void upsertCourse({ ...course, gradeNowPercent: n })}
          />
          <p className="text-xs text-muted">
            {canvasNow ? `Canvas shows ${canvasNow}. Leave this empty to use it. ` : 'Type the grade your class site shows. '}
            Catch Up starts this class&apos;s C math from this grade.
          </p>
        </div>
        {!setup ? (
          <>
            <p className="text-muted">
              {grading.source === 'canvas'
                ? 'This class uses the categories and weights from your Canvas file.'
                : 'This class is graded by points, with a C at 70%, until you set it up.'}{' '}
              Set it up to type in the class&apos;s own cutoffs and weights (they are usually in the syllabus).
            </p>
            <button
              type="button"
              onClick={() => save(startingSetup(course))}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Set up grading for {course.name}
            </button>
          </>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="font-medium">Letter grade cutoffs (the lowest percent for each)</legend>
              <div className="flex flex-wrap gap-3">
                {LETTERS.map((l) => (
                  <NumberField
                    key={l}
                    id={`cut-${key}-${l}`}
                    label={`${l} from`}
                    value={setup.cutoffs[l]}
                    min={0}
                    max={100}
                    step={0.1}
                    onCommit={(n) => update({ cutoffs: { ...setup.cutoffs, [l]: n } })}
                  />
                ))}
              </div>
              {!(setup.cutoffs.A > setup.cutoffs.B && setup.cutoffs.B > setup.cutoffs.C && setup.cutoffs.C > setup.cutoffs.D) && (
                <p className="text-xs text-muted">The cutoffs usually go down from A to D. Catch Up uses the C cutoff.</p>
              )}
            </fieldset>

            <fieldset className="space-y-1">
              <legend className="font-medium">How this class is graded</legend>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  name={`how-${key}`}
                  checked={!setup.weighted}
                  onChange={() => update({ weighted: false })}
                  className="w-5 h-5"
                />
                <span>By points (every point counts the same)</span>
              </label>
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  name={`how-${key}`}
                  checked={setup.weighted}
                  onChange={() => update({ weighted: true })}
                  className="w-5 h-5"
                />
                <span>By category weights (for example Homework 40%, Exams 60%)</span>
              </label>
            </fieldset>

            <div className="space-y-2">
              <p className="font-medium">Categories</p>
              <p className="text-xs text-muted">
                Words connect an assignment to a category when they are in its name (for example: quiz, lab). An
                assignment from Canvas also joins the category tied to its Canvas category.
                {setup.weighted ? '' : ' In a class graded by points, categories only matter for drop-lowest rules.'}
              </p>
              {setup.categories.length === 0 && <p className="text-xs text-muted">No categories yet.</p>}
              <ul className="space-y-2">
                {setup.categories.map((c, i) => (
                  <li key={c.id} className="p-2 rounded border border-border bg-surface flex flex-wrap items-end gap-2">
                    <TextField
                      id={`cat-name-${key}-${i}`}
                      label="Category"
                      value={c.name}
                      maxLength={60}
                      onCommit={(s) => s.trim() && updateCategory(c.id, { name: s.trim() })}
                    />
                    {setup.weighted && (
                      <NumberField
                        id={`cat-weight-${key}-${i}`}
                        label="Weight %"
                        value={c.weight}
                        min={0}
                        max={1000}
                        step={0.1}
                        onCommit={(n) => updateCategory(c.id, { weight: n })}
                      />
                    )}
                    <TextField
                      id={`cat-words-${key}-${i}`}
                      label="Words in names"
                      value={c.keywords.join(', ')}
                      maxLength={400}
                      wide
                      onCommit={(s) => updateCategory(c.id, { keywords: splitWords(s) })}
                    />
                    <NumberField
                      id={`cat-drop-${key}-${i}`}
                      label="Drop lowest"
                      value={c.dropLowest}
                      min={0}
                      max={50}
                      onCommit={(n) => updateCategory(c.id, { dropLowest: Math.round(n) })}
                    />
                    <span className="text-xs text-muted min-h-[44px] flex items-center">
                      {summary.counts.get(c.id) ?? 0} assignment{(summary.counts.get(c.id) ?? 0) === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove the category ${c.name}`}
                      onClick={() =>
                        update({
                          categories: setup.categories.filter((x) => x.id !== c.id),
                          defaultCategoryId: setup.defaultCategoryId === c.id ? undefined : setup.defaultCategoryId,
                        })
                      }
                      className="min-h-[44px] px-3 py-1 rounded border border-border bg-bg"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={setup.categories.length >= 30}
                onClick={() =>
                  update({
                    categories: [
                      ...setup.categories,
                      { id: `cat-${crypto.randomUUID().slice(0, 8)}`, name: `Category ${setup.categories.length + 1}`, weight: 0, keywords: [], dropLowest: 0 },
                    ],
                  })
                }
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface font-medium disabled:opacity-50"
              >
                Add a category
              </button>
              {setup.weighted && setup.categories.length > 0 && (
                <p className="text-xs text-muted">
                  Weights add up to {Math.round(setup.categories.reduce((s, c) => s + c.weight, 0) * 10) / 10}%.
                  {Math.abs(setup.categories.reduce((s, c) => s + c.weight, 0) - 100) > 0.05
                    ? ' Catch Up scales them to fit, the way Canvas does.'
                    : ''}
                </p>
              )}
              {setup.categories.length > 0 && (
                <div>
                  <label htmlFor={`default-${key}`} className="block text-xs font-medium mb-1">
                    When nothing else connects an assignment, put it in
                  </label>
                  <select
                    id={`default-${key}`}
                    value={setup.defaultCategoryId ?? ''}
                    onChange={(e) => update({ defaultCategoryId: e.target.value || undefined })}
                    className="min-h-[44px] px-3 py-2 rounded border border-border bg-surface text-text"
                  >
                    <option value="">No category (it does not count in a weighted grade)</option>
                    {setup.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {setup.categories.length > 0 && (
              <details className="rounded border border-border bg-surface">
                <summary className="min-h-[44px] px-3 py-2 cursor-pointer font-medium flex items-center">
                  Connect assignments by hand: {mine.length - summary.unconnected.length} of {mine.length} connected
                </summary>
                <div className="p-3 space-y-2">
                  <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyUnconnected}
                      onChange={(e) => setOnlyUnconnected(e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span>Show only assignments that are not connected</span>
                  </label>
                  <ul className="space-y-1">
                    {(onlyUnconnected ? summary.unconnected : mine).slice(0, MAX_ROWS).map((a) => {
                      const automatic = categoryFromSetup({ ...a, categoryId: undefined }, setup);
                      const autoName = setup.categories.find((c) => c.id === automatic)?.name;
                      return (
                        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                          <label htmlFor={`connect-${a.id}`} className="text-sm">
                            {a.name} <span className="text-xs text-muted">({a.points} points, due {a.dueDate})</span>
                          </label>
                          <select
                            id={`connect-${a.id}`}
                            value={a.categoryId && setup.categories.some((c) => c.id === a.categoryId) ? a.categoryId : ''}
                            onChange={(e) => void upsertAssignment({ ...a, categoryId: e.target.value || undefined })}
                            className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                          >
                            <option value="">{autoName ? `Automatic (${autoName})` : 'Not connected'}</option>
                            {setup.categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </li>
                      );
                    })}
                  </ul>
                  {(onlyUnconnected ? summary.unconnected : mine).length > MAX_ROWS && (
                    <p className="text-xs text-muted">Showing the first {MAX_ROWS}. Words in names can connect many at once.</p>
                  )}
                  {onlyUnconnected && summary.unconnected.length === 0 && (
                    <p className="text-xs text-muted">Every assignment is connected.</p>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-wrap gap-2">
              {!confirmRemove ? (
                <button
                  type="button"
                  onClick={() => setConfirmRemove(true)}
                  className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface"
                >
                  Remove my grading setup
                </button>
              ) : (
                <>
                  <span className="text-sm min-h-[44px] flex items-center">
                    Remove it? This class goes back to {course.canvas?.groups.length ? 'what Canvas says' : 'points with a C at 70%'}.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRemove(false);
                      save(undefined);
                    }}
                    className="min-h-[44px] px-3 py-1 rounded bg-accent text-on-accent font-medium"
                  >
                    Yes, remove it
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                    className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface"
                  >
                    Keep it
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </details>
  );
};

// How each class is graded. Catch Up uses this for every C it works out.
export const GradingSection: React.FC<{ courses: Course[]; assignments: Assignment[] }> = ({ courses, assignments }) => (
  <section aria-labelledby="grading-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
    <div>
      <h2 id="grading-heading" className="text-lg font-bold">
        2. Grading for each class
      </h2>
      <p className="text-sm text-muted">
        Each class&apos;s grade now, and its own grading if you know it (the syllabus usually says): the letter cutoffs,
        and the category weights if it has them. Catch Up uses your setup first, then what Canvas says, then plain points
        with a C at 70%.
      </p>
    </div>
    {courses.length === 0 ? (
      <p className="text-sm text-muted">Tick a class above to set its grading.</p>
    ) : (
      <div className="space-y-2">
        {courses.map((c) => (
          <ClassGrading key={c.id} course={c} assignments={assignments} />
        ))}
      </div>
    )}
  </section>
);
