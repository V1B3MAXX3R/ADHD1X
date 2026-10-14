import { describe, expect, it } from 'vitest';
import { buildGradeBook, canvasIdOf, courseGrading, DEFAULT_C_PERCENT, gradeNow, knownGrade, letterFor } from '../../src/features/catchUp/gradeBook';
import { computeCGoal } from '../../src/features/catchUp/cGoal';
import { computeCatchUpGradeMath } from '../../src/features/catchUp/catchUp';
import { Assignment, CanvasCourseInfo } from '../../src/shared/data/schemas';

const TODAY = '2026-10-14';
const NOW = new Date(2026, 9, 14, 10, 0);

function task(over: Partial<Assignment> & { id: string; dueDate?: string }): Assignment {
  return {
    courseId: 'c1',
    name: over.id,
    type: 'homework',
    dueDate: '2026-10-01',
    estimateMinutes: 60,
    estimateSource: 'user',
    minutesLogged: 0,
    status: 'todo',
    notNow: false,
    addedLate: false,
    source: 'canvas',
    createdAt: '2026-10-01T00:00:00Z',
    ...over,
  };
}

const info = (over: Partial<CanvasCourseInfo> = {}): CanvasCourseInfo => ({
  courseId: 11,
  fetchedAt: '2026-10-14T00:00:00Z',
  weighted: true,
  groups: [
    { id: 1, name: 'Homework', weight: 40, dropLowest: 0, dropHighest: 0, neverDrop: [] },
    { id: 2, name: 'Exams', weight: 60, dropLowest: 0, dropHighest: 0, neverDrop: [] },
  ],
  announcements: [],
  unavailable: [],
  ...over,
});

const graded = (id: string, group: number, earned: number, points: number, extra: Partial<Assignment> = {}) =>
  task({ id, earnedPoints: earned, points, status: 'done', canvas: { groupId: group }, ...extra });
const todo = (id: string, group: number, points: number, extra: Partial<Assignment> = {}) =>
  task({ id, points, dueDate: '2026-10-20', canvas: { groupId: group }, ...extra });

const gradedOnly = (a: Assignment) => (typeof a.earnedPoints === 'number' ? ('graded' as const) : null);
const withRemaining = (a: Assignment) =>
  typeof a.earnedPoints === 'number' ? ('graded' as const) : a.status === 'done' ? ('doneUngraded' as const) : ('remaining' as const);

describe('How a class is graded', () => {
  it('reads weights and the C cutoff from Canvas, or uses points and 70%', () => {
    expect(courseGrading({})).toMatchObject({ weighted: false, groups: [], cPercent: DEFAULT_C_PERCENT, source: 'default', cSource: 'default' });
    const g = courseGrading({ canvas: info({ gradingScale: [{ name: 'A', minPercent: 90 }, { name: 'c ', minPercent: 72 }] }) });
    expect(g.weighted).toBe(true);
    expect(g.cPercent).toBe(72);
    expect(g.cSource).toBe('canvas');
    expect(g.source).toBe('canvas');
    // Weighted but every weight is 0: it is graded by points.
    expect(courseGrading({ canvas: info({ groups: [{ id: 1, name: 'A', weight: 0, dropLowest: 0, dropHighest: 0, neverDrop: [] }] }) }).weighted).toBe(false);
    // A scale with C- but no C keeps the usual 70%.
    expect(courseGrading({ canvas: info({ gradingScale: [{ name: 'C-', minPercent: 70 }] }) }).cPercent).toBe(70);
  });

  it("finds Canvas's id for an assignment", () => {
    expect(canvasIdOf({ calendarId: 'event-assignment-915245' })).toBe(915245);
    expect(canvasIdOf({ calendarId: 'something-else' })).toBeUndefined();
    expect(canvasIdOf({})).toBeUndefined();
  });
});

describe('Weighted grades', () => {
  const grading = courseGrading({ canvas: info() });

  it('weights each category, the way Canvas does', () => {
    // Homework 90/100 (90%), exams 60/100 (60%): 0.4 * 90 + 0.6 * 60 = 72.
    const book = buildGradeBook([graded('h', 1, 90, 100), graded('e', 2, 60, 100)], grading, { assumedScore: 0.8, roleOf: gradedOnly })!;
    expect(book.weighted).toBe(true);
    expect(book.percent).toBeCloseTo(72, 6);
    // By points it would have been 75: the weights matter.
    expect(buildGradeBook([graded('h', 1, 90, 100), graded('e', 2, 60, 100)], courseGrading({}), { assumedScore: 0.8, roleOf: gradedOnly })!.percent).toBeCloseTo(75, 6);
  });

  it('like Canvas, a category with nothing in it yet does not count, and the others are scaled up', () => {
    const book = buildGradeBook([graded('h', 1, 45, 50)], grading, { assumedScore: 0.8, roleOf: gradedOnly })!;
    expect(book.percent).toBeCloseTo(90, 6);
  });

  it('gives each point its share of the grade', () => {
    // Homework holds 100 points and 40% of the grade, so one homework point is 0.4 percentage points.
    const items = [graded('h', 1, 50, 50), todo('h2', 1, 50), graded('e', 2, 80, 100)];
    const book = buildGradeBook(items, grading, { assumedScore: 0.8, roleOf: withRemaining })!;
    expect(book.valuePerPoint(items[1])).toBeCloseTo(0.4, 6);
    expect(book.valuePerPoint(items[2])).toBeCloseTo(0.6, 6);
    // Doing h2 perfectly adds 50 * 0.4 = 20 points: from 0.4*50 + 0.6*80 = 68 to 88.
    expect(book.percent).toBeCloseTo(68, 6);
  });

  it('work outside any Canvas category does not change a weighted grade', () => {
    const manual = task({ id: 'mine', points: 100, dueDate: '2026-10-20' });
    const items = [graded('h', 1, 90, 100), graded('e', 2, 60, 100), manual];
    const book = buildGradeBook(items, grading, { assumedScore: 0.8, roleOf: withRemaining })!;
    expect(book.percent).toBeCloseTo(72, 6);
    expect(book.valuePerPoint(manual)).toBe(0);
  });
});

describe('Drop rules', () => {
  it('drops the lowest score in a category, but never one marked never-drop, and never every score', () => {
    const g = courseGrading({
      canvas: info({
        weighted: false,
        groups: [{ id: 1, name: 'Quizzes', weight: 0, dropLowest: 1, dropHighest: 0, neverDrop: [7] }],
      }),
    });
    const items = [
      graded('q1', 1, 0, 10, { calendarId: 'event-assignment-7' }), // 0, but never dropped
      graded('q2', 1, 2, 10),
      graded('q3', 1, 9, 10),
    ];
    const book = buildGradeBook(items, g, { assumedScore: 0.8, roleOf: gradedOnly })!;
    expect([...book.droppedIds]).toEqual(['q2']);
    expect(book.percent).toBeCloseTo(45, 6); // (0 + 9) / 20
    const single = buildGradeBook([graded('only', 1, 0, 10)], g, { assumedScore: 0.8, roleOf: gradedOnly })!;
    expect(single.droppedIds.size).toBe(0);
  });

  it('among equal scores, drops the bigger item, since that helps more', () => {
    const g = courseGrading({ canvas: info({ weighted: false, groups: [{ id: 1, name: 'HW', weight: 0, dropLowest: 1, dropHighest: 0, neverDrop: [] }] }) });
    const book = buildGradeBook([graded('small0', 1, 0, 5), graded('big0', 1, 0, 50), graded('ok', 1, 9, 10)], g, { assumedScore: 0.8, roleOf: gradedOnly })!;
    expect([...book.droppedIds]).toEqual(['big0']);
  });

  it('drops the highest too when the class says so', () => {
    const g = courseGrading({ canvas: info({ weighted: false, groups: [{ id: 1, name: 'HW', weight: 0, dropLowest: 0, dropHighest: 1, neverDrop: [] }] }) });
    const book = buildGradeBook([graded('a', 1, 10, 10), graded('b', 1, 5, 10)], g, { assumedScore: 0.8, roleOf: gradedOnly })!;
    expect([...book.droppedIds]).toEqual(['a']);
  });
});

describe('Enough for a C in a weighted class', () => {
  const course = { id: 'c1', name: 'CIS 101', canvas: info({ gradingScale: [{ name: 'C', minPercent: 72 }] }) };

  it('works in percentage points of the grade and uses the class C cutoff', () => {
    // Exams 30/100 so far (30%). Homework has two 50-point tasks to do. Exams weigh 60, homework 40.
    // Now: 0.4 * 0/100 + 0.6 * 30 = 18. A C here is 72, so 54 percentage points are needed.
    const items = [graded('e1', 2, 30, 100), todo('h1', 1, 50), todo('h2', 1, 50)];
    const goal = computeCGoal(items, [course], { today: TODAY, now: NOW, horizonDays: 30 });
    const c = goal.classes[0];
    expect(c.weighted).toBe(true);
    expect(c.cPercent).toBe(72);
    expect(c.currentPercent).toBe(18);
    expect(c.percentNeeded).toBe(54);
    // Full marks on both homework tasks add 40 points: short of 54.
    expect(c.status).toBe('short');
    expect(c.bestCasePercent).toBe(58);
  });

  it('picks the work worth the most of the grade for the time', () => {
    // Both categories hold 110 points. Exams weigh 60 and homework 40, so 10 exam points (5.5 percentage points)
    // are worth more than 10 homework points (3.6), for the same time.
    const items = [graded('e1', 2, 60, 100), todo('retake', 2, 10, { estimateMinutes: 30 }), todo('hw', 1, 10, { estimateMinutes: 30 }), graded('h0', 1, 90, 100)];
    const goal = computeCGoal(items, [{ ...course, canvas: info() }], { today: TODAY, now: NOW, horizonDays: 30 });
    expect(goal.classes[0].taskIds[0]).toBe('retake');
  });

  it('a class graded by points gives the same answers as before', () => {
    const items = [task({ id: 'g', points: 100, earnedPoints: 50, status: 'done' }), task({ id: 'r', points: 100, dueDate: '2026-10-20' })];
    const plain = computeCGoal(items, [{ id: 'c1', name: 'X' }], { today: TODAY, now: NOW, horizonDays: 30 });
    expect(plain.classes[0]).toMatchObject({ status: 'stretch', pointsNeeded: 90, requiredPercent: 90, weighted: false, cPercent: 70 });
  });
});

describe('Target grade math in a weighted class', () => {
  const grading = courseGrading({ canvas: info() });

  it('says the score needed on the remaining work, using the weights', () => {
    // Homework 40/50 graded, 50 to do; exams 60/100 graded, 100 to do.
    // Final with remaining as 0: 0.4 * 40/100 + 0.6 * 60/200 = 16 + 18 = 34. Full marks on the rest add 20 + 30 = 50.
    // For 80%: (80 - 34) / 50 = 92%.
    const items = [graded('h1', 1, 40, 50), todo('h2', 1, 50), graded('e1', 2, 60, 100), todo('e2', 2, 100)];
    const math = computeCatchUpGradeMath({ targetGrade: 80, assignments: items, grading });
    expect(math.requiredPercentOnRemaining).toBe(92);
    expect(math.reachable).toBe(true);
    expect(math.currentAveragePercent).toBe(68); // Canvas's current grade: 0.4 * 80 + 0.6 * 60
    expect(math.plainSummary).toMatch(/With the category weights from Canvas, you need about 92% on the remaining work/);
  });

  it('says plainly when the target is out of reach', () => {
    const items = [graded('h1', 1, 0, 50), todo('h2', 1, 50), graded('e1', 2, 10, 100)];
    const math = computeCatchUpGradeMath({ targetGrade: 90, assignments: items, grading });
    expect(math.reachable).toBe(false);
    expect(math.plainSummary).toMatch(/more than full marks/);
  });

  it('counts late penalties on the remaining work', () => {
    const items = [graded('h1', 1, 40, 50), todo('late', 1, 50, { dueDate: '2026-10-05' }), graded('e1', 2, 60, 100)];
    const math = computeCatchUpGradeMath({ targetGrade: 70, assignments: items, grading, latePenaltyByCourse: { c1: 50 }, now: NOW });
    expect(math.latePenaltyPointsLost).toBe(25);
    expect(math.plainSummary).toMatch(/Late penalties take away 25 points across 1 task/);
  });
});

describe('Your grade now', () => {
  it('uses the grade you typed in, else Canvas’s current score, never a hidden one', () => {
    expect(knownGrade({ gradeNowPercent: 74 })).toEqual({ percent: 74, source: 'yours' });
    expect(knownGrade({ canvas: info({ currentScore: 62.48 }) })).toEqual({ percent: 62.48, source: 'canvas' });
    expect(knownGrade({ gradeNowPercent: 74, canvas: info({ currentScore: 62.48 }) })?.source).toBe('yours');
    expect(knownGrade({ canvas: info({ currentScore: 62.48, hideFinalGrades: true }) })).toBeNull();
    expect(knownGrade({})).toBeNull();
  });

  it('gives a letter from your cutoffs, Canvas’s scale, or the usual 90/80/70/60', () => {
    expect(letterFor(71, {})).toBe('C');
    expect(letterFor(59.9, {})).toBe('F');
    const scale = [{ name: 'A', minPercent: 94 }, { name: 'C-', minPercent: 70 }, { name: 'D-', minPercent: 60 }, { name: 'F', minPercent: 0 }];
    expect(letterFor(62.48, { canvas: info({ gradingScale: scale }) })).toBe('D-');
    const grading = { cutoffs: { A: 93, B: 85, C: 75, D: 65 }, weighted: false, categories: [] };
    expect(letterFor(72, { grading, canvas: info({ gradingScale: scale }) })).toBe('D');
  });

  it('shows Canvas’s own letter with its number, and falls back to the scores here', () => {
    expect(gradeNow({ canvas: info({ currentScore: 62.48, currentGrade: 'D-' }) })).toEqual({ percent: 62.48, letter: 'D-', source: 'canvas' });
    expect(gradeNow({}, 42.777)).toEqual({ percent: 42.78, letter: 'F', source: 'computed' });
    expect(gradeNow({})).toBeNull();
  });

  it('says what share of the grade some of the work makes up, by points or by weight', () => {
    const points = buildGradeBook([graded('a', 1, 5, 10), todo('b', 1, 30)], courseGrading({}), { assumedScore: 0, roleOf: withRemaining })!;
    expect(points.shareOf((a) => a.id === 'a')).toBeCloseTo(0.25);
    // Weighted 40/60: half of Homework's points are graded, none of Exams'.
    const items = [graded('h1', 1, 40, 50), todo('h2', 1, 50), todo('e1', 2, 100)];
    const weighted = buildGradeBook(items, courseGrading({ canvas: info() }), { assumedScore: 0, roleOf: withRemaining })!;
    expect(weighted.shareOf((a) => typeof a.earnedPoints === 'number')).toBeCloseTo(0.2);
  });
});
