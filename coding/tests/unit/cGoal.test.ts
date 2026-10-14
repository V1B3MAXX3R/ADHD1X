import { describe, expect, it } from 'vitest';
import { C_PERCENT, computeCGoal, realisticC, REALISTIC_MAX_PERCENT } from '../../src/features/catchUp/cGoal';
import { scaledEstimate } from '../../src/shared/logic/estimates';
import { buildCatchUpPlan } from '../../src/features/catchUp/studyPlan';
import { Assignment } from '../../src/shared/data/schemas';

const TODAY = '2026-10-14';
const NOW = new Date(2026, 9, 14, 10, 0);
const course = [{ id: 'c1', name: 'ENG 1A' }];
const opts = { today: TODAY, now: NOW, horizonDays: 60 };

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

describe('Enough for a C', () => {
  it('uses a C of 70%', () => {
    expect(C_PERCENT).toBe(70);
  });

  it('says a class is already at a C when the points so far get there', () => {
    // 90 of 100 graded, and 100 left: a C needs 140 of 200, so 50 more, but the 90 already count. 0.7*200-90 = 50.
    // Make it already there: 90/100 graded and only 20 left: need 0.7*120 - 90 < 0.
    const goal = computeCGoal(
      [task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 90 }), task({ id: 'r', dueDate: '2026-10-20', points: 20 })],
      course,
      opts,
    );
    expect(goal.classes[0].status).toBe('already');
    expect(goal.nothingNeeded).toBe(true);
    expect(goal.taskIds.size).toBe(0);
  });

  it('picks the best points for the time, and stops once a C is covered', () => {
    // Nothing graded, assumed score 80%. Total 300, a C needs 210. Each full task is worth 0.8 of its points.
    const goal = computeCGoal(
      [
        task({ id: 'big-cheap', dueDate: '2026-10-30', points: 100, estimateMinutes: 50 }), // 80 per 50 min
        task({ id: 'big-slow', dueDate: '2026-10-20', points: 100, estimateMinutes: 400 }), // 80 per 400 min
        task({ id: 'small', dueDate: '2026-10-18', points: 100, estimateMinutes: 100 }), // 80 per 100 min
      ],
      course,
      opts,
    );
    const c = goal.classes[0];
    expect(c.status).toBe('plan');
    expect(c.pointsNeeded).toBe(210);
    expect(c.assumedScore).toBe(0.8);
    // 80 + 80 = 160 < 210, so all three are needed.
    expect(c.taskIds).toEqual(['big-cheap', 'small', 'big-slow']);
  });

  it('chooses fewer tasks when fewer are enough', () => {
    const goal = computeCGoal(
      [
        task({ id: 'a', dueDate: '2026-10-20', points: 100, estimateMinutes: 30 }),
        task({ id: 'b', dueDate: '2026-10-21', points: 100, estimateMinutes: 60 }),
        task({ id: 'c', dueDate: '2026-10-22', points: 10, estimateMinutes: 60 }),
      ],
      course,
      opts,
    );
    // total 210, a C needs 147, each 100-point task is worth 80: two tasks cover it.
    expect(goal.classes[0].taskIds).toEqual(['a', 'b']);
  });

  it('assumes you score what you have been scoring, within sensible limits', () => {
    const lowHistory = computeCGoal(
      [task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 20 }), task({ id: 'r', dueDate: '2026-10-20', points: 100 })],
      course,
      opts,
    );
    expect(lowHistory.classes[0].assumedScore).toBe(0.7); // floor
    const highHistory = computeCGoal(
      [task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 100 }), task({ id: 'r', dueDate: '2026-10-20', points: 400 })],
      course,
      opts,
    );
    expect(highHistory.classes[0].assumedScore).toBe(0.9); // cap
  });

  it('counts finished work that is not graded yet, so finishing tasks brings the C closer', () => {
    const before = computeCGoal(
      [task({ id: 'a', dueDate: '2026-10-20', points: 100 }), task({ id: 'b', dueDate: '2026-10-21', points: 100 })],
      course,
      opts,
    );
    const after = computeCGoal(
      [task({ id: 'a', dueDate: '2026-10-20', points: 100, status: 'done' }), task({ id: 'b', dueDate: '2026-10-21', points: 100 })],
      course,
      opts,
    );
    expect(before.classes[0].pointsNeeded).toBe(140);
    expect(after.classes[0].pointsNeeded).toBe(60); // 140 - 80
    expect(after.classes[0].taskIds).toEqual(['b']);
  });

  it('is honest when the work left cannot reach a C, and includes all of it', () => {
    const goal = computeCGoal(
      [task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 500, earnedPoints: 100 }), task({ id: 'r', dueDate: '2026-10-20', points: 20 })],
      course,
      opts,
    );
    expect(goal.classes[0].status).toBe('short');
    expect(goal.classes[0].taskIds).toEqual(['r']);
  });

  it('does not let zeros for work never handed in drag the assumed score down', () => {
    const goal = computeCGoal(
      [
        task({ id: 'ok', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 85 }),
        task({ id: 'z1', dueDate: '2026-10-02', status: 'done', points: 100, earnedPoints: 0 }),
        task({ id: 'z2', dueDate: '2026-10-03', points: 100, earnedPoints: 0 }),
        task({ id: 'r', dueDate: '2026-10-20', points: 100 }),
      ],
      course,
      opts,
    );
    expect(goal.classes[0].assumedScore).toBe(0.85);
  });

  it('says a C is a stretch when it needs more than your usual score but is still possible', () => {
    // Graded 50 of 100 (usual score floor 70%), 100 left: a C needs 140 - 50 = 90 of the 100, so 90%.
    const goal = computeCGoal(
      [task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 50 }), task({ id: 'r', dueDate: '2026-10-20', points: 100 })],
      course,
      opts,
    );
    expect(goal.classes[0]).toMatchObject({ status: 'stretch', requiredPercent: 90, taskIds: ['r'] });
    expect(goal.nothingNeeded).toBe(false);
  });

  it('gives the best case when even full marks fall short', () => {
    const goal = computeCGoal(
      [task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 500, earnedPoints: 100 }), task({ id: 'r', dueDate: '2026-10-20', points: 20 })],
      course,
      opts,
    );
    // (100 + 20) / 520 = 23%
    expect(goal.classes[0]).toMatchObject({ status: 'short', bestCasePercent: 23 });
  });

  it('plans all of a class that has no point values', () => {
    const goal = computeCGoal([task({ id: 'x', dueDate: '2026-10-20' }), task({ id: 'y', dueDate: '2026-10-21' })], course, opts);
    expect(goal.classes[0].status).toBe('noPoints');
    expect(goal.classes[0].taskIds).toEqual(['x', 'y']);
  });

  it('works out each class by itself', () => {
    const goal = computeCGoal(
      [
        task({ id: 'a1', dueDate: '2026-10-20', points: 100, courseId: 'c1' }),
        task({ id: 'g2', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 95, courseId: 'c2' }),
        task({ id: 'b2', dueDate: '2026-10-20', points: 10, courseId: 'c2' }),
      ],
      [{ id: 'c1', name: 'ENG' }, { id: 'c2', name: 'CIS' }],
      opts,
    );
    expect(goal.classes.map((c) => [c.name, c.status])).toEqual([['ENG', 'plan'], ['CIS', 'already']]);
    expect([...goal.taskIds]).toEqual(['a1']);
  });

  it('ignores work due beyond the window, and "not now" work', () => {
    const goal = computeCGoal(
      [task({ id: 'far', dueDate: '2027-03-01', points: 100 }), task({ id: 'hold', dueDate: '2026-10-20', points: 100, notNow: true })],
      course,
      { ...opts, horizonDays: 30 },
    );
    expect(goal.taskIds.size).toBe(0);
  });

  it('does not count work for the rest of the school year when judging a C', () => {
    const items = [
      task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 80 }),
      task({ id: 'next-week', dueDate: '2026-10-20', points: 10 }),
      task({ id: 'december', dueDate: '2026-12-10', points: 1000 }),
    ];
    // Counting december, a C needs 0.7 * 1110 = 777 points. Without it, 80 of 110 is already above 70%.
    const goal = computeCGoal(items, course, { ...opts, horizonDays: 14 });
    expect(goal.classes[0].status).toBe('already');
    expect(goal.taskIds.size).toBe(0);
    // Looking further ahead brings december back in.
    expect(computeCGoal(items, course, { ...opts, horizonDays: 90 }).classes[0].status).not.toBe('already');
  });

  it('values already-late work less when the class has a late penalty', () => {
    const goal = computeCGoal(
      [
        task({ id: 'late', dueDate: '2026-10-05', points: 100, estimateMinutes: 60 }), // past due: worth 40 at 50% off
        task({ id: 'ontime', dueDate: '2026-10-20', points: 100, estimateMinutes: 60 }), // worth 80
      ],
      course,
      { ...opts, latePenaltyByCourse: { c1: 50 } },
    );
    expect(goal.classes[0].taskIds[0]).toBe('ontime');
  });

  it('gives a plan that a pace can finish in a realistic number of days', () => {
    const work = [
      task({ id: 'a', dueDate: '2026-10-20', points: 100, estimateMinutes: 120 }),
      task({ id: 'b', dueDate: '2026-10-21', points: 100, estimateMinutes: 120 }),
      task({ id: 'c', dueDate: '2026-10-22', points: 100, estimateMinutes: 600 }),
    ];
    const goal = computeCGoal(work, course, opts);
    const essential = work.filter((a) => goal.taskIds.has(a.id));
    // 300 total, a C needs 210, a and b give 160, so c is needed too.
    expect(essential.map((a) => a.id).sort()).toEqual(['a', 'b', 'c']);
    const none = computeCGoal(work.slice(0, 1), course, opts);
    expect(none.taskIds.size).toBe(1);
    expect(buildCatchUpPlan(essential.slice(0, 2), { today: TODAY, pace: 'aggressive' }).days.length).toBe(1);
  });
});

describe('A realistic C', () => {
  it('counts a C needing up to 90% as possible, and more than that as not', () => {
    expect(REALISTIC_MAX_PERCENT).toBe(90);
    expect(realisticC({ status: 'plan' })).toBe(true);
    expect(realisticC({ status: 'stretch', requiredPercent: 72 })).toBe(true);
    expect(realisticC({ status: 'stretch', requiredPercent: 90 })).toBe(true);
    expect(realisticC({ status: 'stretch', requiredPercent: 95 })).toBe(false);
    expect(realisticC({ status: 'short' })).toBe(false);
    expect(realisticC({ status: 'nothingDue' })).toBe(true);
  });

  it('when your usual score is not enough, asks for fewer tasks at a higher score instead of every task', () => {
    // Usual score 70% (floor). 10 tasks of 10 points; graded 20 of 100. Total 200, a C needs 140 - 20 = 120.
    // At 70% even all 10 give 70, short. Not reachable at all: full marks give 100 < 120.
    const many = Array.from({ length: 10 }, (_, i) => task({ id: `t${i}`, dueDate: '2026-10-20', points: 10, estimateMinutes: 30 }));
    const g1 = computeCGoal([task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 20 }), ...many], course, opts);
    expect(g1.classes[0].status).toBe('short');
    // Graded 60 of 100 instead: a C needs 140 - 60 = 80. At 70% all 10 give 70, short; at 90%, 9 tasks give 81.
    const g2 = computeCGoal([task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 60 }), ...many], course, opts);
    expect(g2.classes[0].status).toBe('stretch');
    expect(g2.classes[0].taskIds).toHaveLength(9);
    expect(g2.classes[0].requiredPercent).toBe(89);
  });
});

describe('Time guesses scaled to points', () => {
  it('makes small items shorter and big ones longer, within a quarter and double of the type time', () => {
    expect(scaledEstimate('lab', 1, 10)).toBe(45); // 180 * 0.25
    expect(scaledEstimate('lab', 10, 10)).toBe(180);
    expect(scaledEstimate('lab', 100, 10)).toBe(360); // capped at double
    expect(scaledEstimate('discussion', 1, 100)).toBe(10); // never under 10 minutes
    expect(scaledEstimate('quiz', undefined, 10)).toBe(60);
    expect(scaledEstimate('quiz', 5, undefined)).toBe(60);
  });
});
