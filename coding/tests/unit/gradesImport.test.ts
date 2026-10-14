import { describe, expect, it } from 'vitest';
import {
  calendarIdFor,
  GradesFile,
  parseGradesFile,
  planGradeImport,
} from '../../src/features/grades/gradesFile';
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
    expect(plan.updates[0]).toMatchObject({ id: 'a1', points: 20, earnedPoints: 18, status: 'todo' }); // status is left alone
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
    const a = mine({ calendarId: calendarIdFor(1), points: 20, earnedPoints: 18 });
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 1, name: 'Quiz 1', score: 18, state: 'graded' })]), courses, [a], { addMissing: true }, makeId, NOW);
    expect(plan.unchanged).toBe(1);
    expect(plan.updates).toEqual([]);
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

  it('never adds work that is not graded yet. The calendar import brings those in.', () => {
    const plan = planGradeImport(fileWith([ca({ canvasAssignmentId: 9, name: 'Lab 9' })]), [], [], { addMissing: true }, makeId, NOW);
    expect(plan.additions).toEqual([]);
    expect(plan.newCourses).toEqual([]);
    expect(plan.notGradedYet).toBe(1);
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

  it('keeps scores out of anything sent to Gemini (A36)', () => {
    const a = mine({ earnedPoints: 18, points: 20, source: 'canvas' });
    const spec = buildPromptSpec('aiDayTuner', { userContext: 'x', tasks: [a] });
    const text = spec.ok ? String(spec.contents) : '';
    expect(text).not.toMatch(/earnedPoints|"points"|18/);
  });
});
