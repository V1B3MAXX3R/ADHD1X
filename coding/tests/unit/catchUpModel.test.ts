import { describe, expect, it } from 'vitest';
import { buildCatchUpModel } from '../../src/features/catchUp/catchUpModel';
import { lateOpenWork } from '../../src/features/catchUp/deadline';
import { Assignment, Course, SettingsSchema } from '../../src/shared/data/schemas';

const TODAY = '2026-10-14';
const NOW = new Date(2026, 9, 14, 10, 0);
const COURSES: Course[] = [{ id: 'c1', name: 'ENG 1A', isMajor: false, createdAt: '2026-10-01T00:00:00Z' }];
const TWO: Course[] = [...COURSES, { id: 'c2', name: 'BUS 10', isMajor: false, createdAt: '2026-10-01T00:00:00Z' }];

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

function settings(catchUp: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return SettingsSchema.parse({ catchUp: { on: true, ...catchUp }, ...extra });
}

const TERM = { term: { lastDay: '2026-12-12', mode: 'regular' } };

const model = (assignments: Assignment[], catchUp: Record<string, unknown> = {}, extra: Record<string, unknown> = {}, courses = COURSES) =>
  buildCatchUpModel({ assignments, courses, settings: settings(catchUp, { ...TERM, ...extra }), today: TODAY, now: NOW });

type Model = ReturnType<typeof model>;
type Pace = 'chill' | 'normal' | 'aggressive';
const planned = (m: Model, pace: Pace, which: 'cPlan' | 'allPlan' = 'cPlan') =>
  new Set(m.paces[pace][which].days.flatMap((d) => d.items.map((i) => i.assignment.id)));
const order = (m: Model, pace: Pace) => m.paces[pace].cPlan.days.flatMap((d) => d.items.map((i) => i.assignment.id));
const classAt = (m: Model, pace: Pace, courseId: string) => m.paces[pace].classes.find((k) => k.courseId === courseId)!;

// 30 hours of 100-point work due over the next three weeks; nothing graded, so the assumed score is 80%.
// A C needs 70% of the points, so most of it is needed, but not all of it.
const BIG = Array.from({ length: 10 }, (_, i) =>
  task({ id: `t${i}`, name: `Task ${i}`, dueDate: `2026-10-${String(16 + i * 2).padStart(2, '0')}`, points: 100, estimateMinutes: 180 }),
);

// Sixteen hours of 50-point work, all past due, in a class with nothing graded. A C needs 7 of the 8 (14 hours).
const BEHIND = Array.from({ length: 8 }, (_, i) =>
  task({ id: `b${i}`, name: `Late ${i}`, dueDate: `2026-10-${String(1 + i).padStart(2, '0')}`, points: 50, estimateMinutes: 120 }),
);

describe('Zeros count as late work', () => {
  const zero = task({ id: 'zero', dueDate: '2026-10-05', status: 'done', points: 50, earnedPoints: 0 });
  const scored = task({ id: 'scored', dueDate: '2026-10-05', status: 'done', points: 50, earnedPoints: 40 });
  const missing = task({ id: 'missing', dueDate: '2026-10-06', points: 50 });
  const zeroFuture = task({ id: 'zeroFuture', dueDate: '2026-10-30', status: 'done', points: 50, earnedPoints: 0 });

  it('lists a past-due 0 with work never turned in, but not scored work or a 0 that is not due yet', () => {
    expect(lateOpenWork([zero, scored, missing, zeroFuture], NOW).map((a) => a.id)).toEqual(['zero', 'missing']);
  });

  it('plans a past-due 0 like work still to do, without changing the saved assignment', () => {
    const m = model([zero, missing]);
    expect(m.reopenedIds.has('zero')).toBe(true);
    expect(planned(m, 'normal', 'allPlan').has('zero')).toBe(true);
    expect(zero.earnedPoints).toBe(0);
    expect(zero.status).toBe('done');
    expect(m.inView.find((a) => a.id === 'zero')?.earnedPoints).toBe(0);
  });

  it('keeps a 0 as lost points when you take it out, or the class does not accept late work', () => {
    const out = model([zero, missing], { lateSkippedIds: ['zero'] });
    expect(out.reopenedIds.has('zero')).toBe(false);
    expect(planned(out, 'normal', 'allPlan').has('zero')).toBe(false);
    const notAccepted = model([zero, missing], {}, {}, [{ ...COURSES[0], latePenaltyPercent: 100 }]);
    expect(notAccepted.eligible.map((a) => a.id)).toEqual([]);
  });

  it('turning a 0 into planned work lowers the points still needed for a C', () => {
    const graded = task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 80 });
    const withZero = model([graded, zero]);
    expect(withZero.goal.classes[0].taskIds).toContain('zero');
  });

  it('the grade now counts 0s, like Canvas does, even a 0 you plan to turn in', () => {
    // 80 of 100, plus a 0 on 100: Canvas shows 40%.
    const good = task({ id: 'good', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 80 });
    const zero100 = task({ id: 'zero100', dueDate: '2026-10-02', status: 'done', points: 100, earnedPoints: 0 });
    const m = model([good, zero100]);
    expect(m.reopenedIds.has('zero100')).toBe(true);
    expect(m.goal.classes[0].gradedPercent).toBe(40);
    expect(m.classes[0].grade).toMatchObject({ percent: 40, letter: 'F', source: 'computed' });
  });
});

describe('Each class starts from its real grade now', () => {
  // Scores here add up to 50%, but Canvas weights the class and shows 90%.
  const items = [
    task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 50 }),
    ...[0, 1, 2, 3].map((i) => task({ id: `r${i}`, dueDate: `2026-11-0${i + 2}`, points: 100 })),
  ];
  const canvas = { courseId: 1, fetchedAt: '2026-10-14T00:00:00Z', currentScore: 90, currentGrade: 'A-', weighted: false, groups: [], announcements: [], unavailable: [] };

  it("uses Canvas's own grade, so a class needs less when Canvas says it is doing better", () => {
    const plain = model(items);
    const withCanvas = model(items, {}, {}, [{ ...COURSES[0], canvas }]);
    const c = withCanvas.goal.classes[0];
    expect(c.gradedPercent).toBe(90);
    expect(c.gradeSource).toBe('canvas');
    expect(withCanvas.classes[0].grade).toMatchObject({ percent: 90, letter: 'A-', source: 'canvas' });
    expect(c.pointsNeeded).toBeLessThan(plain.goal.classes[0].pointsNeeded);
    expect((c.currentPercent ?? 0) > (plain.goal.classes[0].currentPercent ?? 0)).toBe(true);
  });

  it('a grade you type in wins over Canvas', () => {
    const m = model(items, {}, {}, [{ ...COURSES[0], canvas, gradeNowPercent: 75 }]);
    expect(m.goal.classes[0].gradedPercent).toBe(75);
    expect(m.goal.classes[0].gradeSource).toBe('yours');
    expect(m.classes[0].grade).toMatchObject({ percent: 75, letter: 'C', source: 'yours' });
  });

  it('a hidden Canvas grade is not used', () => {
    const m = model(items, {}, {}, [{ ...COURSES[0], canvas: { ...canvas, hideFinalGrades: true } }]);
    expect(m.goal.classes[0].gradeSource).toBe('computed');
    expect(m.goal.classes[0].gradedPercent).toBe(50);
  });
});

describe('The C comes from the points, not from doing everything', () => {
  it('needs only some of the unfinished tasks, and says how many for each class', () => {
    const m = model(BIG);
    expect(m.needed.count).toBeGreaterThan(0);
    expect(m.needed.count).toBeLessThan(m.available.count);
    expect(m.needed.minutes).toBeLessThan(m.available.minutes);
    expect(m.goal.taskIds.size).toBe(m.needed.count);
    expect(m.classes[0]).toMatchObject({ courseId: 'c1', neededCount: m.needed.count, openCount: BIG.length });
  });

  it('plans just the C work for the C plan and all the work for the full plan', () => {
    const m = model(BIG);
    expect(planned(m, 'aggressive')).toEqual(m.goal.taskIds);
    expect(planned(m, 'aggressive', 'allPlan').size).toBe(BIG.length);
  });

  it('picks the biggest point values first, so small work is skipped before big work', () => {
    const items = [
      task({ id: 'small', dueDate: '2026-10-20', points: 5 }),
      task({ id: 'big', dueDate: '2026-10-20', points: 200 }),
      task({ id: 'mid', dueDate: '2026-10-20', points: 50 }),
    ];
    const m = model(items);
    expect(m.goal.taskIds.has('big')).toBe(true);
    expect(m.goal.taskIds.has('small')).toBe(false);
  });

  it('a class already at a C needs nothing, and every pace is fine', () => {
    const m = model([
      task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 95 }),
      task({ id: 'r', dueDate: '2026-10-20', points: 10 }),
    ]);
    expect(m.goal.nothingNeeded).toBe(true);
    expect(m.needed.count).toBe(0);
    expect(m.minutesNeeded).toBe(0);
    expect(m.paces.chill.possible).toBe(true);
    expect(m.recommended).toBeNull();
  });

  it('with no point values, all of the class is planned, since nothing says which work matters most', () => {
    const m = model([task({ id: 'x', dueDate: '2026-10-20' })]);
    expect(m.goal.classes[0].status).toBe('noPoints');
    expect(m.needed.count).toBe(1);
  });
});

describe('Each class stands on its own', () => {
  // BUS 10 is at 10 of 500 with only 20 points left: a C is out of reach.
  const lost = [
    task({ id: 'lg', courseId: 'c2', dueDate: '2026-10-01', status: 'done', points: 500, earnedPoints: 10 }),
    task({ id: 'lr', courseId: 'c2', dueDate: '2026-10-16', points: 20, estimateMinutes: 600 }),
  ];

  it('a class that cannot reach a C is still planned, but never makes a pace not possible', () => {
    const m = model([...lost, ...BIG], { courseIds: ['c1', 'c2'], selectedCourseIds: ['c1', 'c2'] }, {}, TWO);
    expect(m.goal.classes.find((c) => c.courseId === 'c2')?.status).toBe('short');
    expect(m.outOfReachIds.has('c2')).toBe(true);
    expect(planned(m, 'aggressive').has('lr')).toBe(true);
    // ENG 1A's work stays on time; BUS 10's ten hours only get the time left over.
    expect(classAt(m, 'aggressive', 'c1').onTrack).toBe(true);
    expect(m.paces.aggressive.possible).toBe(true);
    expect(m.paces.aggressive.lateIds).toEqual([]);
  });

  it('with only a class out of reach, no extra time is needed', () => {
    const m = model(lost.map((a) => ({ ...a, courseId: 'c1' })), {}, { term: { lastDay: '2026-10-30', mode: 'regular' } });
    expect(m.goal.classes[0].status).toBe('short');
    expect(m.minutesNeeded).toBe(0);
    expect(m.paces.chill.possible).toBe(true);
  });

  it('each ticked class gets its own tasks and its own result at every pace', () => {
    const second = BEHIND.slice(0, 4).map((a) => ({ ...a, id: `u${a.id}`, courseId: 'c2' }));
    const m = model([...BEHIND, ...second], { selectedCourseIds: ['c1', 'c2'] }, {}, TWO);
    expect(m.classes.map((c) => c.courseId).sort()).toEqual(['c1', 'c2']);
    for (const c of m.classes) expect(c.neededCount).toBeGreaterThan(0);
    for (const pace of ['chill', 'normal', 'aggressive'] as const) {
      expect(m.paces[pace].classes.map((k) => k.courseId).sort()).toEqual(['c1', 'c2']);
    }
  });

  it('past-due work goes one class at a time, and the class with the least left is caught up first', () => {
    // BUS 10 has one hour past due; ENG 1A has eight hours, some of it older.
    const bus = task({ id: 'bus', courseId: 'c2', dueDate: '2026-10-09', points: 50, estimateMinutes: 60 });
    const m = model([...BEHIND, bus], { selectedCourseIds: ['c1', 'c2'], pace: 'normal' }, {}, TWO);
    expect(order(m, 'normal')[0]).toBe('bus');
    const busDone = classAt(m, 'normal', 'c2').caughtUpDate!;
    const engDone = classAt(m, 'normal', 'c1').caughtUpDate!;
    expect(busDone).toBe(TODAY);
    expect(engDone > busDone).toBe(true);
    expect(m.paces.normal.caughtUpDate).toBe(engDone);
  });

  it('a ticked class with nothing from this term is left out and listed as inactive', () => {
    const old = task({ id: 'old', courseId: 'c2', dueDate: '2025-02-01', status: 'done', points: 10, earnedPoints: 10 });
    const m = model([...BIG, old], { selectedCourseIds: ['c1', 'c2'] }, {}, TWO);
    expect(m.activeCourses.map((c) => c.id)).toEqual(['c1']);
    expect(m.inactiveCourses.map((c) => c.id)).toEqual(['c2']);
    expect(m.inView.some((a) => a.id === 'old')).toBe(false);
  });
});

describe('Work is planned by its own due dates', () => {
  it('never plans a task after its due date when the pace can keep up', () => {
    const m = model(BIG, { pace: 'aggressive' });
    const o = m.paces.aggressive;
    expect(o.possible).toBe(true);
    expect(o.lateIds).toEqual([]);
    for (const a of m.eligible.filter((x) => m.goal.taskIds.has(x.id))) {
      expect(o.cPlan.finishById.get(a.id)! <= a.dueDate).toBe(true);
    }
  });

  it('does not pile everything onto one day: a task due in five weeks waits for the week before', () => {
    const m = model([task({ id: 'soon', dueDate: '2026-10-16', points: 100 }), task({ id: 'far', dueDate: '2026-11-20', points: 100 })]);
    const o = m.paces.aggressive;
    expect(o.cPlan.finishById.get('soon')! <= '2026-10-16').toBe(true);
    expect(o.cPlan.startById.get('far')! >= '2026-11-13').toBe(true);
  });

  it('keeps work due soon on time even with past-due work waiting', () => {
    const items = [
      task({ id: 'old', dueDate: '2026-10-05', points: 100, estimateMinutes: 240 }),
      task({ id: 'tomorrow', dueDate: '2026-10-15', points: 100, estimateMinutes: 120 }),
    ];
    const m = model(items, { pace: 'normal' });
    const plan = m.paces.normal.cPlan;
    expect(plan.finishById.get('tomorrow')! <= '2026-10-15').toBe(true);
    expect(plan.finishById.get('old')! >= plan.finishById.get('tomorrow')!).toBe(true);
  });

  it('each pace gives its own caught-up date, and faster paces are never later', () => {
    const m = model(BEHIND);
    const date = (p: Pace) => m.paces[p].caughtUpDate ?? '9999-12-31';
    expect(m.needed.overdue).toBeGreaterThan(0);
    expect(date('aggressive') <= date('normal')).toBe(true);
    expect(date('normal') <= date('chill')).toBe(true);
    expect(date('aggressive')).not.toBe(date('chill'));
  });

  it('with nothing needed past due, the caught-up date is empty', () => {
    const m = model(BIG);
    expect(m.needed.overdue).toBe(0);
    expect(m.paces.normal.caughtUpDate).toBeNull();
  });

  it('counts study days only, so a school break is skipped', () => {
    const noBreak = model(BEHIND, { pace: 'chill' });
    const withBreak = model(BEHIND, { pace: 'chill' }, {
      schoolBreaks: [{ id: 'b', label: 'Fall break', start: '2026-10-15', end: '2026-10-25' }],
    });
    const a = noBreak.paces.chill.caughtUpDate!;
    const b = withBreak.paces.chill.caughtUpDate!;
    expect(b > a).toBe(true);
    expect(b >= '2026-10-26').toBe(true);
  });
});

describe('The paces are set up from the due dates and the end of the term', () => {
  it('Chill and Normal keep their usual hours when those are enough', () => {
    const m = model(BEHIND);
    expect(m.paces.chill).toMatchObject({ minutesPerDay: 75, raised: false, possible: true });
    expect(m.paces.normal).toMatchObject({ minutesPerDay: 150, raised: false, possible: true });
  });

  it('Chill goes up to the least time that works, so it stays an option', () => {
    // 14 hours needed by Tue Oct 20: 7 study days, so 2 hours a day.
    const m = model(BEHIND, { deadlineMode: 'manual', deadline: '2026-10-20', pace: 'chill' });
    expect(m.minutesNeeded).toBe(120);
    expect(m.paces.chill).toMatchObject({ minutesPerDay: 120, raised: true, possible: true });
    expect(m.paces.normal).toMatchObject({ minutesPerDay: 150, raised: false, possible: true });
  });

  it('a pace that would need more than it can go up to is not possible, and the lightest one that works is suggested', () => {
    // 14 hours by Sun Oct 18: 5 study days, about 3 hours a day. Chill goes up to 2.
    const m = model(BEHIND, { deadlineMode: 'manual', deadline: '2026-10-18', pace: 'chill' });
    expect(m.goalDate.state).toBe('manual');
    expect(m.limit).toEqual({ date: '2026-10-18', kind: 'goal' });
    expect(m.paces.chill.possible).toBe(false);
    expect(m.paces.chill.minutesPerDay).toBe(120);
    expect(m.paces.normal.raised).toBe(true);
    expect(m.paces.normal.possible).toBe(true);
    expect(m.paces.aggressive.possible).toBe(true);
    expect(m.recommended).toBe('normal');
  });

  it('says every pace is possible when the date is far enough away', () => {
    const m = model(BEHIND, { deadlineMode: 'manual', deadline: '2026-12-01', pace: 'chill' });
    for (const p of ['chill', 'normal', 'aggressive'] as const) expect(m.paces[p].possible).toBe(true);
    expect(m.recommended).toBeNull();
  });

  it('says no pace is possible when the date is too close for all of them', () => {
    // Nine hours of work already past due, and the goal is today: no pace holds nine hours in one day.
    const pastDue = [0, 1, 2].map((i) => task({ id: `p${i}`, dueDate: '2026-10-12', points: 100, estimateMinutes: 180 }));
    const m = model(pastDue, { deadlineMode: 'manual', deadline: TODAY, pace: 'normal' });
    for (const p of ['chill', 'normal', 'aggressive'] as const) expect(m.paces[p].possible).toBe(false);
    expect(m.recommended).toBeNull();
    expect(m.hoursPerDayNeeded).toBe(9);
    expect(m.soonest).not.toBeNull();
  });

  it('a goal date before anything is due needs nothing past due, so every pace that keeps up is possible', () => {
    const m = model(BIG.slice(0, 3), { deadlineMode: 'manual', deadline: TODAY, pace: 'chill' });
    expect(m.paces.chill.possible).toBe(true);
    expect(m.paces.aggressive.possible).toBe(true);
  });

  it('the soonest goal date it suggests for a pace really works for that pace', () => {
    const tight = model(BEHIND, { deadlineMode: 'manual', deadline: '2026-10-15', pace: 'chill' });
    for (const pace of ['chill', 'normal', 'aggressive'] as const) {
      const e = tight.paces[pace].earliest;
      expect(e).not.toBeNull();
      const moved = model(BEHIND, { deadlineMode: 'manual', deadline: e, pace });
      expect(moved.paces[pace].possible).toBe(true);
    }
  });

  it('faster paces never have a later soonest date', () => {
    const m = model(BEHIND);
    const d = (p: Pace) => m.paces[p].earliest ?? '9999-12-31';
    expect(d('aggressive') <= d('normal')).toBe(true);
    expect(d('normal') <= d('chill')).toBe(true);
  });

  it('notices a goal date after the last day of the term, or on a break, and uses the last day', () => {
    const m = model(BIG.slice(0, 1), { deadlineMode: 'manual', deadline: '2026-12-20' }, {
      term: { lastDay: '2026-12-12', mode: 'regular' },
      schoolBreaks: [{ id: 'w', label: 'Winter break', start: '2026-12-19', end: '2026-12-31' }],
    });
    expect(m.goalDate.afterTermEnd).toBe(true);
    expect(m.goalDate.onBreak?.label).toBe('Winter break');
    expect(m.limit).toEqual({ date: '2026-12-12', kind: 'termEnd' });
  });

  it('with no date picked yet, or a date that has passed, goes by the last day of the term', () => {
    const missing = model(BEHIND, { deadlineMode: 'manual', pace: 'normal' });
    const past = model(BEHIND, { deadlineMode: 'manual', deadline: '2026-10-01', pace: 'normal' });
    const auto = model(BEHIND, { pace: 'normal' });
    expect(missing.goalDate.state).toBe('manualMissing');
    expect(past.goalDate.state).toBe('manualPast');
    expect(auto.goalDate.state).toBe('auto');
    for (const m of [missing, past, auto]) expect(m.limit).toEqual({ date: '2026-12-12', kind: 'termEnd' });
    expect(missing.paces.normal.possible).toBe(auto.paces.normal.possible);
  });

  it('when the term ends before the work could be done, it says how many hours a day would do it', () => {
    // 40 hours past due and the term ends Mon Oct 19. A C needs 9 of the 10 tasks: 36 hours over 6 study days.
    const heavy = Array.from({ length: 10 }, (_, i) => task({ id: `h${i}`, dueDate: '2026-10-10', points: 100, estimateMinutes: 240 }));
    const term = { term: { lastDay: '2026-10-19', mode: 'regular' } };
    const m = model(heavy, { pace: 'aggressive' }, term);
    expect(m.paces.aggressive.possible).toBe(false);
    expect(m.paces.aggressive.caughtUpDate! > '2026-10-19').toBe(true);
    expect(m.hoursPerDayNeeded).toBe(6);
    expect(m.paces.normal).toMatchObject({ minutesPerDay: 210, raised: true, possible: false });
    const fixed = model(heavy, { pace: 'aggressive', aggressiveHours: { Morning: 2, Evening: 2, Night: 2 } }, term);
    expect(fixed.paces.aggressive.possible).toBe(true);
  });

  it('a task due too soon for its size does not make every pace impossible', () => {
    // Ten hours due tomorrow cannot be on time at any realistic pace; the rest of the work is easy.
    const items = [task({ id: 'huge', dueDate: '2026-10-15', points: 100, estimateMinutes: 1200 }), ...BIG.slice(2, 5)];
    const m = model(items, { pace: 'normal' });
    expect(m.cannotBeOnTimeIds.has('huge')).toBe(true);
    expect(m.paces.aggressive.possible).toBe(true);
  });

  it('works for 120 days when the term has no last day', () => {
    const m = buildCatchUpModel({ assignments: BIG, courses: COURSES, settings: settings({}, { term: { mode: 'regular' } }), today: TODAY, now: NOW });
    expect(m.termEnd).toBeNull();
    expect(m.horizonDays).toBe(120);
    expect(m.limit.kind).toBe('horizon');
  });
});

describe('Everything reads from one model', () => {
  it('the plan is the chosen pace’s plan for the same tasks the C box counts', () => {
    const m = model(BEHIND, { pace: 'normal' });
    expect(m.chosen).toBe('normal');
    expect(planned(m, 'normal')).toEqual(m.goal.taskIds);
    expect(m.needed.count).toBe(m.goal.taskIds.size);
  });

  it('changing the Aggressive hours changes the Aggressive card', () => {
    const few = model(BEHIND, { pace: 'aggressive', aggressiveHours: { Morning: 0.5, Evening: 0, Night: 0 } });
    const many = model(BEHIND, { pace: 'aggressive', aggressiveHours: { Morning: 6, Evening: 6, Night: 6 } });
    expect(few.paces.aggressive.minutesPerDay).toBe(30);
    expect(many.paces.aggressive.minutesPerDay).toBe(18 * 60);
    expect(few.paces.aggressive.caughtUpDate! > many.paces.aggressive.caughtUpDate!).toBe(true);
  });

  it('a late assignment you put back in the plan shows up in the plan', () => {
    const late = task({ id: 'late', dueDate: '2026-09-30', points: 100, estimateMinutes: 60 });
    const course: Course = { ...COURSES[0], latePenaltyPercent: 10 };
    const without = model([late, ...BIG], {}, {}, [course]);
    expect(without.lateWork.map((a) => a.id)).toContain('late');
    expect(planned(without, 'normal', 'allPlan').has('late')).toBe(true);
    const skipped = model([late, ...BIG], { lateSkippedIds: ['late'] }, {}, [course]);
    expect(planned(skipped, 'normal', 'allPlan').has('late')).toBe(false);
  });
});

describe('Speed', () => {
  it('works out a full term of imported Canvas data quickly', () => {
    const courses: Course[] = Array.from({ length: 11 }, (_, i) => ({ id: `k${i}`, name: `Class ${i}`, isMajor: false, createdAt: '2026-08-01T00:00:00Z' }));
    const items: Assignment[] = [];
    for (let i = 0; i < 600; i++) {
      const day = new Date(2026, 7, 20 + Math.floor(i / 5));
      const due = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const past = due < TODAY;
      items.push(
        task({
          id: `a${i}`,
          courseId: `k${i % 11}`,
          dueDate: due,
          points: 10 + (i % 5) * 10,
          estimateMinutes: 30 + (i % 4) * 30,
          ...(past ? (i % 3 === 0 ? { status: 'done' as const, earnedPoints: 0 } : { status: 'done' as const, earnedPoints: 8 }) : {}),
        }),
      );
    }
    const start = performance.now();
    const m = buildCatchUpModel({ assignments: items, courses, settings: settings({}, TERM), today: TODAY, now: NOW });
    const ms = performance.now() - start;
    expect(m.classes).toHaveLength(11);
    expect(m.paces.normal.cPlan).toBeDefined();
    expect(ms).toBeLessThan(3000);
  });
});
