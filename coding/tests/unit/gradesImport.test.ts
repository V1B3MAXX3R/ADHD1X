import { describe, expect, it } from 'vitest';
import {
  calendarIdFor,
  courseInfo,
  detailsFromCanvas,
  GradesFile,
  parseGradesFile,
  planGradeImport,
  safeCanvasUrl,
} from '../../src/features/grades/gradesFile';
import { CourseSchema } from '../../src/shared/data/schemas';
import { computeCatchUpGradeMath } from '../../src/features/catchUp/catchUp';
import { Assignment, AssignmentSchema, Course } from '../../src/shared/data/schemas';
import { buildPromptSpec } from '../../server/promptBuilders';

let n = 0;
const makeId = () => `id-${++n}`;
const NOW = new Date(2026, 9, 14, 9, 30);

const fileWith = (assignments: GradesFile['courses'][number]['assignments'], over: Partial<GradesFile['courses'][number]> = {}): GradesFile => ({
  format: 'ADHD1X-canvas-grades',
  formatVersion: 1,
  fetchedAt: '2026-10-14T16:30:00Z',
  source: 'canvas.example.edu',
  courses: [
    {
      canvasCourseId: 11,
      name: 'Introduction to Computer Science',
      courseCode: 'CIS-101-4827',
      term: 'Fall 2026',
      currentScore: 91.2,
      currentGrade: 'A-',
      assignments,
      ...over,
    },
  ],
});

const ca = (over: Partial<GradesFile['courses'][number]['assignments'][number]> & { canvasAssignmentId: number; name: string }) => ({
  dueAt: '2026-10-05T12:00:00Z',
  pointsPossible: 20,
  score: null,
  state: 'unsubmitted' as const,
  countsInFinalGrade: true,
  ...over,
});

const course = (name: string): Course => ({ id: `c-${name}`, name, isMajor: false, createdAt: '2026-10-01T00:00:00Z' });

const mine = (over: Partial<Assignment>): Assignment =>
  AssignmentSchema.parse({
    id: 'a1',
    courseId: 'c-CIS 101',
    name: 'Quiz 1',
    type: 'quiz',
    dueDate: '2026-10-05',
    estimateMinutes: 30,
    estimateSource: 'default',
    source: 'calendar',
    createdAt: '2026-10-01T00:00:00Z',
    ...over,
  });

describe('Reading the grades file', () => {
  const good = JSON.stringify(fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded' })]));

  it('accepts a file in the format the Python tool writes', () => {
    const r = parseGradesFile(good);
    expect(r.ok).toBe(true);
  });

  it('says what is wrong in plain words, for text that is not JSON, the wrong shape or a newer file', () => {
    expect(parseGradesFile('not json')).toMatchObject({ ok: false, error: expect.stringMatching(/could not be read/) });
    expect(parseGradesFile('{"hello":1}')).toMatchObject({ ok: false, error: expect.stringMatching(/does not look like/) });
    const newer = JSON.stringify({ ...JSON.parse(good), formatVersion: 99 });
    expect(parseGradesFile(newer)).toMatchObject({ ok: false, error: expect.stringMatching(/newer version/) });
    const wrongApp = JSON.stringify({ ...JSON.parse(good), format: 'something-else' });
    expect(parseGradesFile(wrongApp).ok).toBe(false);
  });

  it('refuses a huge file', () => {
    expect(parseGradesFile('x'.repeat(6 * 1024 * 1024))).toMatchObject({ ok: false });
  });
});

describe('Matching grades to your assignments', () => {
  const courses = [course('CIS 101')];

  it('finds your assignment by the Canvas id that the calendar import saved, and fills in points and score', () => {
    const a = mine({ calendarId: calendarIdFor(1), name: 'Quiz 1 [renamed by me]' });
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded' })]), courses, [a], { addMissing: true }, makeId, NOW);
    expect(plan.updates).toHaveLength(1);
    // Canvas has a score on it, so it was turned in: it is marked finished.
    expect(plan.updates[0]).toMatchObject({ id: 'a1', points: 20, earnedPoints: 18, status: 'done' });
    expect(plan.markedDone).toBe(1);
    expect(plan.additions).toEqual([]);
  });

  it('falls back to the same course, same name and same day', () => {
    const a = mine({ name: 'quiz 1' });
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 15, state: 'graded' })]), courses, [a], { addMissing: false }, makeId, NOW);
    expect(plan.updates[0].earnedPoints).toBe(15);
  });

  it('does not match a same-named assignment in a different course', () => {
    const other = mine({ courseId: 'c-OTHER 200' });
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 15, state: 'graded' })]), [...courses, course('OTHER 200')], [other], { addMissing: false }, makeId, NOW);
    expect(plan.updates).toEqual([]);
    expect(plan.unmatchedGraded).toBe(1);
  });

  it('fills in points for work that is not graded yet, without inventing a score or keeping you from typing one', () => {
    const typed = mine({ calendarId: calendarIdFor(2), earnedPoints: 7 });
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 2, name: 'Lab 2', pointsPossible: 50 })]), courses, [typed], { addMissing: true }, makeId, NOW);
    expect(plan.updates[0]).toMatchObject({ points: 50, earnedPoints: 7 });
  });

  it('reports work that is already up to date', () => {
    const a = mine({ calendarId: calendarIdFor(1), points: 20, earnedPoints: 18, estimateSource: 'user', status: 'done' });
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded' })]), courses, [a], { addMissing: true }, makeId, NOW);
    expect(plan.unchanged).toBe(1);
    expect(plan.updates).toEqual([]);
  });

  it('resizes a time guess you never changed to the points, and keeps one you set yourself', () => {
    const file = fileWith([
      ca({ canvasAssignmentId: 1, name: 'Quiz 1', pointsPossible: 5 }),
      ca({ canvasAssignmentId: 2, name: 'Quiz 2', pointsPossible: 20 }),
      ca({ canvasAssignmentId: 3, name: 'Quiz 3', pointsPossible: 20 }),
    ]);
    const guessed = mine({ calendarId: calendarIdFor(1), estimateMinutes: 60, estimateSource: 'default' });
    const own = mine({ id: 'a2', name: 'Quiz 2', calendarId: calendarIdFor(2), estimateMinutes: 60, estimateSource: 'user' });
    const plan = planGradeImport(file, courses, [guessed, own], { addMissing: false }, makeId, NOW);
    // A 5-point quiz in a class whose usual item is 20 points: a quarter of the 60-minute quiz guess.
    expect(plan.updates.find((x) => x.id === 'a1')?.estimateMinutes).toBe(15);
    expect(plan.updates.find((x) => x.id === 'a2')?.estimateMinutes ?? 60).toBe(60);
  });

  it('skips excused work, work not counted in the grade, and work with no usable points', () => {
    const plan = planGradeImport(
      fileWith([
        ca({ canvasAssignmentId: 1, name: 'Excused', state: 'excused' }),
        ca({ canvasAssignmentId: 2, name: 'Participation', countsInFinalGrade: false, score: 5, state: 'graded' }),
        ca({ canvasAssignmentId: 3, name: 'Zero points', pointsPossible: 0, score: 0, state: 'graded' }),
        ca({ canvasAssignmentId: 4, name: 'No points', pointsPossible: null }),
        ca({ canvasAssignmentId: 5, name: 'Huge', pointsPossible: 5000, score: 4000, state: 'graded' }),
      ]),
      courses,
      [],
      { addMissing: true },
      makeId,
      NOW,
    );
    expect(plan.skipped).toBe(5);
    expect(plan.additions).toEqual([]);
  });
});

describe('Graded work you do not have yet', () => {
  it('is added as finished, with the course created, when asked for', () => {
    const plan = planGradeImport(
      fileWith([
        ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded', dueAt: '2026-10-05T12:00:00Z' }),
        ca({ canvasAssignmentId: 2, name: 'Midterm exam', pointsPossible: 100, score: 82, state: 'graded', dueAt: '2026-10-08T12:00:00Z' }),
      ]),
      [],
      [],
      { addMissing: true },
      makeId,
      NOW,
    );
    expect(plan.newCourses.map((c) => c.name)).toEqual(['CIS-101-4827']);
    expect(plan.additions).toHaveLength(2);
    for (const a of plan.additions) {
      expect(a).toMatchObject({ status: 'done', source: 'canvas', courseId: plan.newCourses[0].id });
      expect(AssignmentSchema.safeParse(a).success).toBe(true);
    }
    expect(plan.additions.map((a) => a.calendarId)).toEqual([calendarIdFor(1), calendarIdFor(2)]);
    expect(plan.additions[1].type).toBe('exam');
  });

  it('is only counted, not added, when the box is off', () => {
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded' })]), [], [], { addMissing: false }, makeId, NOW);
    expect(plan.additions).toEqual([]);
    expect(plan.newCourses).toEqual([]);
    expect(plan.unmatchedGraded).toBe(1);
  });

  it('adds work that is not graded yet (including missing work) as to do, so Catch Up can plan it', () => {
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 9, name: 'Lab 9', state: 'missing' })]), [], [], { addMissing: true }, makeId, NOW);
    expect(plan.additions).toHaveLength(1);
    expect(plan.additions[0]).toMatchObject({ status: 'todo', points: 20, dueDate: '2026-10-05', source: 'canvas' });
    expect(plan.additions[0].earnedPoints).toBeUndefined();
    expect(plan.additions[0].completedAt).toBeUndefined();
    expect(AssignmentSchema.safeParse(plan.additions[0]).success).toBe(true);
    expect(plan.notGradedYet).toBe(0);
  });

  it('does not add work that is not graded yet when the box is off, or when Canvas has no due date for it', () => {
    const off = planGradeImport(fileWith([ca({ canvasAssignmentId: 9, name: 'Lab 9' })]), [], [], { addMissing: false }, makeId, NOW);
    expect(off.additions).toEqual([]);
    expect(off.notGradedYet).toBe(1);
    const noDate = planGradeImport(fileWith([ca({ canvasAssignmentId: 9, name: 'Lab 9', dueAt: null })]), [], [], { addMissing: true }, makeId, NOW);
    expect(noDate.additions).toEqual([]);
    expect(noDate.newCourses).toEqual([]);
    expect(noDate.notGradedYet).toBe(1);
  });

  it('cuts very long names so the saved data and backups stay valid', () => {
    const long = 'x'.repeat(190);
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 1, name: long, score: 5, state: 'graded' })]), [], [], { addMissing: true }, makeId, NOW);
    expect(plan.additions[0].name).toHaveLength(120);
    expect(AssignmentSchema.safeParse(plan.additions[0]).success).toBe(true);
  });

  it('uses the best fitting course, so CIS does not swallow CIS 101', () => {
    const plan = planGradeImport(
      fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded' })]),
      [course('CIS'), course('CIS 101')],
      [],
      { addMissing: true },
      makeId,
      NOW,
    );
    expect(plan.newCourses).toEqual([]);
    expect(plan.additions[0].courseId).toBe('c-CIS 101');
  });

  it('lists each course with its Canvas grade, and whether you have the course', () => {
    const plan = planGradeImport(fileWith([]), [course('ENG 1A')], [], { addMissing: true }, makeId, NOW);
    expect(plan.courseGrades).toEqual([
      { canvasCourseId: 11, name: 'Introduction to Computer Science', score: 91.2, grade: 'A-', inYourCourses: false, gradedCount: 0, notGradedCount: 0, included: true },
    ]);
  });

  it('only brings in the courses you pick, and leaves the rest completely alone', () => {
    const two: GradesFile = {
      ...fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded' })]),
    };
    two.courses.push({
      canvasCourseId: 12,
      name: 'Old course',
      courseCode: 'OLD-100',
      term: 'Spring 2025',
      currentScore: 70,
      currentGrade: 'C-',
      assignments: [ca({ canvasAssignmentId: 50, name: 'Old quiz', score: 14, state: 'graded' })],
    });
    const plan = planGradeImport(two, [], [], { addMissing: true, courseIds: new Set([11]) }, makeId, NOW);
    expect(plan.newCourses.map((c) => c.name)).toEqual(['CIS-101-4827']);
    expect(plan.additions).toHaveLength(1);
    expect(plan.courseGrades.map((c) => [c.name, c.included, c.gradedCount])).toEqual([
      ['Introduction to Computer Science', true, 1],
      ['Old course', false, 1],
    ]);
    const none = planGradeImport(two, [], [], { addMissing: true, courseIds: new Set() }, makeId, NOW);
    expect(none.newCourses).toEqual([]);
    expect(none.additions).toEqual([]);
  });
});

describe('The imported grades work with Catch Up, and stay private', () => {
  it('gives Catch Up the same average Canvas shows', () => {
    const plan = planGradeImport(
      fileWith([
        ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded' }),
        ca({ canvasAssignmentId: 2, name: 'Quiz 2', score: 16, state: 'graded' }),
        ca({ canvasAssignmentId: 3, name: 'Final exam', pointsPossible: 60, dueAt: '2026-12-10T12:00:00Z' }),
      ]),
      [course('CIS 101')],
      [mine({ id: 'future', calendarId: calendarIdFor(3), name: 'Final exam', type: 'exam', dueDate: '2026-12-10' })],
      { addMissing: true },
      makeId,
      NOW,
    );
    const all = [...plan.updates, ...plan.additions];
    const math = computeCatchUpGradeMath({ targetGrade: 90, assignments: all });
    expect(math.currentAveragePercent).toBe(85); // (18 + 16) / 40
    expect(math.pointsRemainingPool).toBe(60); // the final, not yet graded
  });

  it('keeps the Canvas details (scores, deductions, class grade) out of anything sent to Gemini (A36)', () => {
    const a = mine({ source: 'canvas', canvas: { pointsDeducted: 7, missing: true, submittedAt: '2026-10-01T10:00:00Z' } });
    const spec = buildPromptSpec('aiDayTuner', { userContext: 'x', tasks: [a] });
    const text = spec.ok ? String(spec.contents) : '';
    expect(text).not.toMatch(/pointsDeducted|canvas|missing|2026-10-01T10/);
  });

  it('keeps scores out of anything sent to Gemini (A36)', () => {
    const a = mine({ earnedPoints: 18, points: 20, source: 'canvas' });
    const spec = buildPromptSpec('aiDayTuner', { userContext: 'x', tasks: [a] });
    const text = spec.ok ? String(spec.contents) : '';
    expect(text).not.toMatch(/earnedPoints|"points"|18/);
  });
});

const V2 = (over: Partial<GradesFile['courses'][number]['assignments'][number]> = {}) =>
  ca({
    canvasAssignmentId: 21,
    name: 'Lab 3',
    dueAt: '2026-10-20T06:59:00Z',
    pointsPossible: 30,
    groupId: 501,
    lockAt: '2026-10-27T06:59:00Z',
    htmlUrl: 'https://canvas.example.edu/courses/11/assignments/21',
    missing: true,
    submittedAt: null,
    description: 'Write two pages.',
    rubric: [{ description: 'Clarity', points: 10, details: 'Clear writing' }],
    ...over,
  });

const v2Course = {
  formatVersion: 2,
  weighted: true,
  finalScore: 40.5,
  finalGrade: 'F',
  groups: [
    { id: 501, name: 'Labs', weight: 40, dropLowest: 1, dropHighest: 0, neverDrop: [] },
    { id: 502, name: 'Exams', weight: 60, dropLowest: 0, dropHighest: 0, neverDrop: [] },
  ],
  gradingScale: { title: 'College', entries: [{ name: 'A', minPercent: 90 }, { name: 'C', minPercent: 72 }] },
  latePolicy: {
    lateDeductionEnabled: true, lateDeductionPercent: 10, lateInterval: 'day', lateMinimumEnabled: true,
    lateMinimumPercent: 50, missingDeductionEnabled: false, missingDeductionPercent: null,
  },
  syllabusText: 'Late work loses 10% a day.',
  moduleProgress: { completed: 12, total: 30 },
  announcements: [{ id: 1, title: 'Lab 3 moved', postedAt: '2026-10-10T10:00:00Z', text: 'Now due Friday.' }],
  unavailable: ['gradingStandard'],
};

describe('Version 2 files: how classes are graded, and assignment details', () => {
  const file = (assignments: GradesFile['courses'][number]['assignments']): GradesFile => {
    const f = fileWith(assignments, v2Course as Partial<GradesFile['courses'][number]>);
    return { ...f, formatVersion: 2 };
  };

  it('reads a version 2 file and still reads version 1', () => {
    expect(parseGradesFile(JSON.stringify(file([V2()]))).ok).toBe(true);
    expect(parseGradesFile(JSON.stringify(fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1' })]))).ok).toBe(true);
    expect(parseGradesFile(JSON.stringify({ ...file([]), formatVersion: 3 }))).toMatchObject({ ok: false });
  });

  it('saves how the class is graded on your class, valid for the saved data', () => {
    const plan = planGradeImport(file([V2()]), [course('CIS 101')], [], { addMissing: true }, makeId, NOW);
    expect(plan.courseUpdates).toHaveLength(1);
    const info = plan.courseUpdates[0].canvas!;
    expect(info.weighted).toBe(true);
    expect(info.groups.map((g) => [g.name, g.weight, g.dropLowest])).toEqual([['Labs', 40, 1], ['Exams', 60, 0]]);
    expect(info.gradingScale).toEqual([{ name: 'A', minPercent: 90 }, { name: 'C', minPercent: 72 }]);
    expect(info.latePolicy?.lateDeductionPercent).toBe(10);
    expect(info.syllabusText).toBe('Late work loses 10% a day.');
    expect(info.announcements[0].title).toBe('Lab 3 moved');
    expect(info.unavailable).toEqual(['gradingStandard']);
    expect(CourseSchema.safeParse(plan.courseUpdates[0]).success).toBe(true);
  });

  it('a class made by the import gets the details too, and is found again by its Canvas id next time', () => {
    const plan = planGradeImport(file([V2()]), [], [], { addMissing: true }, makeId, NOW);
    expect(plan.newCourses[0].canvas?.courseId).toBe(11);
    const renamed = { ...plan.newCourses[0], name: 'My own name' };
    const again = planGradeImport(file([V2()]), [renamed], plan.additions, { addMissing: true }, makeId, NOW);
    expect(again.newCourses).toEqual([]);
    expect(again.additions).toEqual([]);
  });

  it('keeps the Canvas details on the assignment, and fills empty instructions from Canvas', () => {
    const plan = planGradeImport(file([V2()]), [course('CIS 101')], [], { addMissing: true }, makeId, NOW);
    const a = plan.additions[0];
    expect(a.canvas).toEqual({
      groupId: 501,
      lockAt: '2026-10-27T06:59:00Z',
      url: 'https://canvas.example.edu/courses/11/assignments/21',
      missing: true,
    });
    expect(a.detailsText).toBe('Write two pages.\n\nRubric:\n- Clarity (10 pts): Clear writing');
    expect(a.status).toBe('todo');
    expect(AssignmentSchema.safeParse(a).success).toBe(true);
  });

  it('never replaces instructions you wrote', () => {
    const mineWithText = mine({ calendarId: calendarIdFor(21), name: 'Lab 3', detailsText: 'My own notes' });
    const plan = planGradeImport(file([V2()]), [course('CIS 101')], [mineWithText], { addMissing: true }, makeId, NOW);
    expect(plan.updates[0].detailsText).toBe('My own notes');
    expect(plan.detailsFilled).toBe(0);
  });

  it('marks work finished when Canvas shows it turned in, even before it is graded', () => {
    const open = mine({ calendarId: calendarIdFor(21), name: 'Lab 3' });
    const plan = planGradeImport(
      file([V2({ state: 'submitted', missing: false, submittedAt: '2026-10-19T20:00:00Z' })]),
      [course('CIS 101')],
      [open],
      { addMissing: true },
      makeId,
      NOW,
    );
    expect(plan.updates[0]).toMatchObject({ status: 'done', completedAt: '2026-10-19T20:00:00Z' });
    expect(plan.markedDone).toBe(1);
  });

  it('adds turned-in work that is not graded yet as finished, not as work to do', () => {
    const plan = planGradeImport(file([V2({ state: 'submitted', missing: false, submittedAt: '2026-10-19T20:00:00Z' })]), [], [], { addMissing: true }, makeId, NOW);
    expect(plan.additions[0]).toMatchObject({ status: 'done' });
    expect(plan.additions[0].earnedPoints).toBeUndefined();
  });

  it('keeps whether a 0 was turned in, so Catch Up can tell a missing 0 from a real one', () => {
    const plan = planGradeImport(
      file([
        V2({ canvasAssignmentId: 31, name: 'Never turned in', state: 'graded', score: 0, missing: true, submittedAt: null }),
        V2({ canvasAssignmentId: 32, name: 'Turned in, got 0', state: 'graded', score: 0, missing: false, submittedAt: '2026-10-02T10:00:00Z' }),
      ]),
      [],
      [],
      { addMissing: true },
      makeId,
      NOW,
    );
    expect(plan.additions.map((a) => [a.name, a.status, a.canvas?.submittedAt ?? null])).toEqual([
      ['Never turned in', 'done', null],
      ['Turned in, got 0', 'done', '2026-10-02T10:00:00Z'],
    ]);
  });

  it('moves the due date of work from Canvas or your calendar when Canvas changed it, and leaves your own work alone', () => {
    const fromCalendar = mine({ id: 'cal', calendarId: calendarIdFor(21), name: 'Lab 3', dueDate: '2026-10-18', source: 'calendar' });
    const plan = planGradeImport(file([V2({ dueAt: '2026-10-23T18:00:00Z' })]), [course('CIS 101')], [fromCalendar], { addMissing: true }, makeId, NOW);
    expect(plan.updates[0].dueDate).toBe('2026-10-23');
    expect(plan.datesChanged).toBe(1);
    const manual = mine({ id: 'man', calendarId: calendarIdFor(21), name: 'Lab 3', dueDate: '2026-10-18', source: 'manual' });
    const plan2 = planGradeImport(file([V2({ dueAt: '2026-10-23T18:00:00Z' })]), [course('CIS 101')], [manual], { addMissing: true }, makeId, NOW);
    expect(plan2.updates[0].dueDate).toBe('2026-10-18');
  });

  it('only keeps links that go back to the same Canvas site over https', () => {
    expect(safeCanvasUrl('https://canvas.example.edu/courses/1', 'canvas.example.edu')).toBe('https://canvas.example.edu/courses/1');
    for (const bad of ['javascript:alert(1)', 'http://canvas.example.edu/x', 'https://evil.example.com/x', 'https://u:p@canvas.example.edu/x', 'not a url', null]) {
      expect(safeCanvasUrl(bad, 'canvas.example.edu')).toBeUndefined();
    }
    const plan = planGradeImport(file([V2({ htmlUrl: 'https://evil.example.com/phish' })]), [], [], { addMissing: true }, makeId, NOW);
    expect(plan.additions[0].canvas?.url).toBeUndefined();
  });

  it('drops numbers the saved data cannot hold instead of failing', () => {
    const odd = fileWith([V2()], { ...(v2Course as Partial<GradesFile['courses'][number]>), currentScore: -5, groups: [{ id: 1, name: 'X', weight: 5000, dropLowest: -1, dropHighest: 0, neverDrop: [] }] });
    const info = courseInfo(odd.courses[0], odd.fetchedAt);
    expect(info.currentScore).toBeNull();
    expect(info.groups[0].weight).toBe(0);
    expect(info.groups[0].dropLowest).toBe(0);
    expect(CourseSchema.shape.canvas.safeParse(info).success).toBe(true);
  });

  it('turns instructions and the rubric into plain details', () => {
    expect(detailsFromCanvas(V2({ description: null, rubric: [] }))).toBeUndefined();
    expect(detailsFromCanvas(V2({ rubric: [] }))).toBe('Write two pages.');
  });
});

