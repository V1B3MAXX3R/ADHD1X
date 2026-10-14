import { describe, expect, it } from 'vitest';
import { computeCatchUpGradeMath, isPastDue } from '../../src/features/catchUp/catchUp';
import {
  applyWhatIf,
  buildCatchUpPlan,
  latePenaltyMap,
  MAX_PLAN_DAYS,
  planDayLabel,
  resolveSelectedCourseIds,
  withOverride,
} from '../../src/features/catchUp/studyPlan';
import { Assignment, CourseSchema, SettingsSchema } from '../../src/shared/data/schemas';

const NOW = new Date(2026, 9, 14, 10, 0); // Wed Oct 14 2026, 10:00
const TODAY = '2026-10-14';

function task(over: Partial<Assignment> & { id: string; dueDate: string }): Assignment {
  return {
    courseId: 'c1',
    name: over.id,
    type: 'homework',
    estimateMinutes: 60,
    estimateSource: 'user',
    minutesLogged: 0,
    status: 'todo',
    notNow: false,
    addedLate: false,
    source: 'manual',
    createdAt: '2026-10-01T00:00:00Z',
    ...over,
  };
}

describe('Late penalties in the grade math', () => {
  const graded = task({ id: 'g', dueDate: '2026-10-01', points: 100, earnedPoints: 70, status: 'done' });
  const pastDue = task({ id: 'p', dueDate: '2026-10-10', points: 100 });
  const future = task({ id: 'f', dueDate: '2026-10-30', points: 100 });

  it('gives exactly the old answer when no penalty is set', () => {
    const plain = computeCatchUpGradeMath({ targetGrade: 80, assignments: [graded, pastDue] });
    const waived = computeCatchUpGradeMath({ targetGrade: 80, assignments: [graded, pastDue], latePenaltyByCourse: { c1: 0 }, now: NOW });
    expect(waived).toEqual(plain);
    expect(plain.latePenaltyPointsLost).toBe(0);
    expect(plain.pointsNeededFromRemaining).toBe(90);
  });

  it('takes the penalty off work that is already past due, and says what it costs', () => {
    const r = computeCatchUpGradeMath({ targetGrade: 80, assignments: [graded, pastDue], latePenaltyByCourse: { c1: 10 }, now: NOW });
    expect(r.pointsRemainingPool).toBe(90); // 100 points, minus 10% for being late
    expect(r.latePenaltyPointsLost).toBe(10);
    expect(r.lateCount).toBe(1);
    expect(r.pointsNeededFromRemaining).toBe(90); // the target still counts the full 200 points
    expect(r.reachable).toBe(true);
    expect(r.plainSummary).toMatch(/Late penalties take away 10 points across 1 task/);
  });

  it('can make a target out of reach, in plain words', () => {
    const r = computeCatchUpGradeMath({ targetGrade: 80, assignments: [graded, pastDue], latePenaltyByCourse: { c1: 50 }, now: NOW });
    expect(r.pointsRemainingPool).toBe(50);
    expect(r.reachable).toBe(false);
    expect(r.plainSummary).not.toMatch(/behind|failing|danger|warning/i);
  });

  it('only penalizes work that is already late, or that the plan would finish late', () => {
    const onTime = computeCatchUpGradeMath({ targetGrade: 80, assignments: [graded, future], latePenaltyByCourse: { c1: 50 }, now: NOW });
    expect(onTime.latePenaltyPointsLost).toBe(0);
    const planned = computeCatchUpGradeMath({
      targetGrade: 80,
      assignments: [graded, future],
      latePenaltyByCourse: { c1: 50 },
      now: NOW,
      plannedLateIds: new Set(['f']),
    });
    expect(planned.latePenaltyPointsLost).toBe(50);
  });

  it('uses each class\'s own penalty', () => {
    const other = task({ id: 'o', courseId: 'c2', dueDate: '2026-10-10', points: 100 });
    const r = computeCatchUpGradeMath({ targetGrade: 80, assignments: [pastDue, other], latePenaltyByCourse: { c1: 10, c2: 0 }, now: NOW });
    expect(r.latePenaltyPointsLost).toBe(10);
    expect(r.lateCount).toBe(1);
  });

  it('says so when penalties leave nothing to earn', () => {
    const r = computeCatchUpGradeMath({ targetGrade: 80, assignments: [graded, pastDue], latePenaltyByCourse: { c1: 100 }, now: NOW });
    expect(r.plainSummary).toMatch(/Late penalties leave no points/);
  });

  it('judges "past due" by the clock, including the time on the due day', () => {
    expect(isPastDue({ dueDate: '2026-10-13' }, NOW)).toBe(true);
    expect(isPastDue({ dueDate: '2026-10-14', dueTime: '09:00' }, NOW)).toBe(true);
    expect(isPastDue({ dueDate: '2026-10-14', dueTime: '23:59' }, NOW)).toBe(false);
    expect(isPastDue({ dueDate: '2026-10-14' }, NOW)).toBe(false);
    expect(isPastDue({ dueDate: '2026-10-15' }, NOW)).toBe(false);
  });
});

describe('What-if scores', () => {
  const a = task({ id: 'a', dueDate: '2026-10-20', points: 20, earnedPoints: 18 });

  it('replaces values without touching the saved assignment', () => {
    const over = withOverride({}, a, 'earnedPoints', 5);
    const [changed] = applyWhatIf([a], over);
    expect(changed.earnedPoints).toBe(5);
    expect(a.earnedPoints).toBe(18);
    expect(changed.points).toBe(20);
  });

  it('treats a cleared box as blank, and typing the saved value again as no change', () => {
    const cleared = withOverride({}, a, 'earnedPoints', undefined);
    expect(applyWhatIf([a], cleared)[0].earnedPoints).toBeUndefined();
    const back = withOverride(cleared, a, 'earnedPoints', 18);
    expect(back).toEqual({});
  });

  it('keeps one change when the other field goes back', () => {
    let o = withOverride({}, a, 'earnedPoints', 5);
    o = withOverride(o, a, 'points', 30);
    o = withOverride(o, a, 'earnedPoints', 18);
    expect(o).toEqual({ a: { points: 30 } });
  });

  it('returns the very same objects when there is nothing to change', () => {
    expect(applyWhatIf([a], {})[0]).toBe(a);
  });

  it('lets a what-if score change the grade math', () => {
    const ungraded = task({ id: 'u', dueDate: '2026-10-30', points: 100 });
    const base = computeCatchUpGradeMath({ targetGrade: 90, assignments: [ungraded] });
    expect(base.pointsNeededFromRemaining).toBe(90);
    const what = computeCatchUpGradeMath({ targetGrade: 90, assignments: applyWhatIf([ungraded], withOverride({}, ungraded, 'earnedPoints', 95)) });
    expect(what.currentAveragePercent).toBe(95);
  });
});

describe('Picking several classes', () => {
  const courses = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('uses all classes when nothing is picked', () => {
    expect(resolveSelectedCourseIds({ selectedCourseId: 'all', selectedCourseIds: [] }, courses)).toEqual(['a', 'b', 'c']);
  });

  it('keeps working with the older single choice', () => {
    expect(resolveSelectedCourseIds({ selectedCourseId: 'b' }, courses)).toEqual(['b']);
    expect(resolveSelectedCourseIds({ selectedCourseId: 'gone' }, courses)).toEqual(['a', 'b', 'c']);
  });

  it('uses the picked list, ignoring classes that no longer exist', () => {
    expect(resolveSelectedCourseIds({ selectedCourseId: 'all', selectedCourseIds: ['c', 'zzz', 'a'] }, courses)).toEqual(['c', 'a']);
    expect(resolveSelectedCourseIds({ selectedCourseId: 'all', selectedCourseIds: ['zzz'] }, courses)).toEqual(['a', 'b', 'c']);
  });

  it('builds the penalty lookup from your classes, with waived as the default', () => {
    expect(latePenaltyMap([{ id: 'a', latePenaltyPercent: 10 }, { id: 'b' }, { id: 'c', latePenaltyPercent: 0 }])).toEqual({ a: 10, b: 0, c: 0 });
  });
});

describe('The combined study plan', () => {
  it('puts work due soonest first, across classes, and fills each day up to the pace', () => {
    const plan = buildCatchUpPlan(
      [
        task({ id: 'late-due', dueDate: '2026-10-20', estimateMinutes: 100, courseId: 'c2' }),
        task({ id: 'soon', dueDate: '2026-10-15', estimateMinutes: 100, courseId: 'c1' }),
        task({ id: 'mid', dueDate: '2026-10-17', estimateMinutes: 100, courseId: 'c2' }),
      ],
      { today: TODAY, pace: 'chill' }, // 75 minutes a day
    );
    expect(plan.days.map((d) => d.minutes)).toEqual([75, 75, 75, 75]);
    expect(plan.days[0].items[0].assignment.id).toBe('soon');
    expect(plan.totalMinutes).toBe(300);
    expect(plan.taskCount).toBe(3);
    expect(plan.finishDate).toBe('2026-10-17');
    // "soon" is worked on for two days, so the first day says it continues.
    expect(plan.days[0].items[0].continues).toBe(true);
    expect(plan.days[1].items[0]).toMatchObject({ minutes: 25, continues: false });
  });

  it('breaks ties on due date by due time, then the bigger task, then name', () => {
    const plan = buildCatchUpPlan(
      [
        task({ id: 'b-small', name: 'B', dueDate: '2026-10-20', points: 5 }),
        task({ id: 'a-big', name: 'A', dueDate: '2026-10-20', points: 50 }),
        task({ id: 'early-time', name: 'Z', dueDate: '2026-10-20', dueTime: '08:00', points: 1 }),
      ],
      { today: TODAY, pace: 'aggressive' },
    );
    // Aggressive cuts a day into blocks, so a task can appear in two blocks; the order is what matters.
    expect([...new Set(plan.days[0].items.map((i) => i.assignment.id))]).toEqual(['early-time', 'a-big', 'b-small']);
  });

  it('leaves out finished work, "not now" work, work with nothing left to do, and work far in the future', () => {
    const plan = buildCatchUpPlan(
      [
        task({ id: 'done', dueDate: '2026-10-15', status: 'done' }),
        task({ id: 'notnow', dueDate: '2026-10-15', notNow: true }),
        task({ id: 'logged', dueDate: '2026-10-15', estimateMinutes: 30, minutesLogged: 45 }),
        task({ id: 'far', dueDate: '2027-02-01' }),
        task({ id: 'keep', dueDate: '2026-10-15' }),
      ],
      { today: TODAY, pace: 'normal' },
    );
    expect(plan.days.flatMap((d) => d.items.map((i) => i.assignment.id))).toEqual(['keep']);
  });

  it('includes work from earlier dates, because the person chose Catch Up (A39, A40)', () => {
    const plan = buildCatchUpPlan([task({ id: 'old', dueDate: '2026-10-01' })], { today: TODAY, pace: 'normal' });
    expect(plan.taskCount).toBe(1);
  });

  it('flags what would finish after its due date, and what a late penalty would cost', () => {
    const plan = buildCatchUpPlan(
      [
        task({ id: 'old', dueDate: '2026-10-10', points: 40, estimateMinutes: 60 }),
        task({ id: 'ok', dueDate: '2026-10-30', points: 100, estimateMinutes: 60 }),
        task({ id: 'tight', dueDate: '2026-10-14', points: 20, estimateMinutes: 60, courseId: 'c2' }),
      ],
      { today: TODAY, pace: 'chill', latePenaltyByCourse: { c1: 50, c2: 10 } }, // 75 min a day
    );
    // old (60) and tight (60 -> 15 today, 45 tomorrow); due dates sort old, tight, ok
    const byId = Object.fromEntries(plan.afterDue.map((x) => [x.assignment.id, x]));
    expect(Object.keys(byId).sort()).toEqual(['old', 'tight']);
    expect(byId.old).toMatchObject({ penaltyPercent: 50, pointsLost: 20, finishDate: TODAY });
    expect(byId.tight).toMatchObject({ penaltyPercent: 10, pointsLost: 2, finishDate: '2026-10-15' });
    expect(plan.afterDueIds.has('ok')).toBe(false);
  });

  it('feeds the grade math, so the penalty follows the plan', () => {
    const items = [task({ id: 'tight', dueDate: '2026-10-14', points: 100, estimateMinutes: 200, courseId: 'c2' })];
    const penalties = { c2: 50 };
    const plan = buildCatchUpPlan(items, { today: TODAY, pace: 'chill', latePenaltyByCourse: penalties });
    expect(plan.afterDueIds.has('tight')).toBe(true);
    const math = computeCatchUpGradeMath({ targetGrade: 80, assignments: items, latePenaltyByCourse: penalties, plannedLateIds: plan.afterDueIds });
    expect(math.pointsRemainingPool).toBe(50);
  });

  it('counts a task due today whose time has passed as late', () => {
    const plan = buildCatchUpPlan([task({ id: 'x', dueDate: TODAY, dueTime: '09:00', estimateMinutes: 30 })], { today: TODAY, pace: 'normal', now: NOW });
    expect(plan.afterDueIds.has('x')).toBe(true);
    const fine = buildCatchUpPlan([task({ id: 'y', dueDate: TODAY, dueTime: '23:00', estimateMinutes: 30 })], { today: TODAY, pace: 'normal', now: NOW });
    expect(fine.afterDueIds.has('y')).toBe(false);
  });

  it('is empty, not broken, with nothing to do', () => {
    const plan = buildCatchUpPlan([], { today: TODAY, pace: 'normal' });
    expect(plan).toMatchObject({ days: [], taskCount: 0, totalMinutes: 0, finishDate: null, truncated: false });
  });

  it('stops at the longest plan it makes and says so', () => {
    const many = Array.from({ length: 10 }, (_, i) => task({ id: `t${i}`, dueDate: '2026-10-20', estimateMinutes: 4000 }));
    const plan = buildCatchUpPlan(many, { today: TODAY, pace: 'chill' });
    expect(plan.days.length).toBeLessThanOrEqual(MAX_PLAN_DAYS);
    expect(plan.truncated).toBe(true);
  });

  it('takes as many days as the pace picker promises', () => {
    const items = [task({ id: 'a', dueDate: '2026-10-20', estimateMinutes: 400 }), task({ id: 'b', dueDate: '2026-10-21', estimateMinutes: 275 })];
    for (const [pace, days] of [['aggressive', 3], ['normal', 5], ['chill', 9]] as const) {
      expect(buildCatchUpPlan(items, { today: TODAY, pace }).days).toHaveLength(days);
    }
  });

  it('labels days in words', () => {
    expect(planDayLabel('2026-10-14', TODAY)).toBe('Today');
    expect(planDayLabel('2026-10-15', TODAY)).toBe('Tomorrow');
    expect(planDayLabel('2026-10-20', TODAY)).toMatch(/Oct/);
  });
});

describe('Planning by due date', () => {
  const byDue = (items: Assignment[], over: Record<string, unknown> = {}) =>
    buildCatchUpPlan(items, { today: TODAY, now: NOW, pace: 'normal', leadDays: 7, horizonDays: 60, ...over });
  const firstIds = (plan: ReturnType<typeof buildCatchUpPlan>) => plan.days.flatMap((d) => d.items.map((i) => i.assignment.id));

  it('keeps work due soon on time before turning to past-due work', () => {
    const plan = byDue([
      task({ id: 'old', dueDate: '2026-10-01', estimateMinutes: 300 }),
      task({ id: 'soon', dueDate: '2026-10-15', estimateMinutes: 240 }),
    ]);
    expect(plan.finishById.get('soon')! <= '2026-10-15').toBe(true);
    expect(plan.afterDueIds.has('soon')).toBe(false);
  });

  it('does not start upcoming work more than a week before it is due', () => {
    const plan = byDue([task({ id: 'far', dueDate: '2026-11-20', estimateMinutes: 60 })]);
    expect(plan.startById.get('far')! >= '2026-11-13').toBe(true);
  });

  it('works past-due work one class at a time, the class with the least left first, oldest first inside it', () => {
    const plan = byDue([
      task({ id: 'eng1', courseId: 'eng', dueDate: '2026-10-01', estimateMinutes: 120 }),
      task({ id: 'eng2', courseId: 'eng', dueDate: '2026-10-02', estimateMinutes: 120 }),
      task({ id: 'bus2', courseId: 'bus', dueDate: '2026-10-09', estimateMinutes: 30 }),
      task({ id: 'bus1', courseId: 'bus', dueDate: '2026-10-08', estimateMinutes: 30 }),
    ]);
    expect(firstIds(plan).slice(0, 3)).toEqual(['bus1', 'bus2', 'eng1']);
  });

  it('gives a class whose C is out of reach only the time left over', () => {
    const items = [
      task({ id: 'lost', courseId: 'lost', dueDate: '2026-10-01', estimateMinutes: 60 }),
      task({ id: 'keep', courseId: 'eng', dueDate: '2026-10-05', estimateMinutes: 120 }),
      task({ id: 'due', courseId: 'lost', dueDate: '2026-10-15', estimateMinutes: 600 }),
    ];
    const plan = byDue(items, { lowPriorityCourseIds: new Set(['lost']) });
    // The other class's past-due work comes first, even though the out-of-reach work is older.
    expect(firstIds(plan)[0]).toBe('keep');
    expect(plan.finishById.get('keep')).toBe(TODAY);
    // Without the rule, its big task due tomorrow would take today's time first.
    expect(firstIds(byDue(items))[0]).toBe('due');
  });

  it('uses a daily amount in place of the pace when one is given', () => {
    const plan = byDue([task({ id: 'a', dueDate: '2026-10-01', estimateMinutes: 600 })], { minutesPerDay: 200 });
    expect(plan.days.map((d) => d.minutes)).toEqual([200, 200, 200]);
  });
});

describe('Saved data for these features', () => {
  it('accepts a grade now you type in for a class, from 0 to 150', () => {
    const base = { id: 'c', name: 'ENG', isMajor: false, createdAt: '2026-10-01T00:00:00Z' };
    for (const ok of [undefined, 0, 62.48, 150]) expect(CourseSchema.safeParse({ ...base, gradeNowPercent: ok }).success).toBe(true);
    for (const bad of [-1, 151, '70']) expect(CourseSchema.safeParse({ ...base, gradeNowPercent: bad }).success).toBe(false);
  });

  it('accepts 0, 10 and 50 percent for a class, and nothing else', () => {
    const base = { id: 'c', name: 'ENG', isMajor: false, createdAt: '2026-10-01T00:00:00Z' };
    for (const ok of [undefined, 0, 10, 50, 100]) expect(CourseSchema.safeParse({ ...base, latePenaltyPercent: ok }).success).toBe(true);
    for (const bad of [5, 25, 75, -10, '10']) expect(CourseSchema.safeParse({ ...base, latePenaltyPercent: bad }).success).toBe(false);
  });

  it('starts with no classes picked, so older saved data keeps working', () => {
    expect(SettingsSchema.parse({}).catchUp.selectedCourseIds).toEqual([]);
    expect(SettingsSchema.parse({ catchUp: { on: true, selectedCourseId: 'x' } }).catchUp).toMatchObject({ selectedCourseId: 'x', selectedCourseIds: [] });
  });
});
