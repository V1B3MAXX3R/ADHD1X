import { describe, expect, it } from 'vitest';
import { computeCatchUpPaces } from '../../src/features/catchUp/catchUp';
import { buildCatchUpPlan } from '../../src/features/catchUp/studyPlan';
import {
  aggressiveMinutes,
  breakOn,
  daySlots,
  minutesByPace,
  termLastDay,
  termStatus,
  validBreak,
} from '../../src/features/catchUp/termLogic';
import { Assignment, SettingsSchema } from '../../src/shared/data/schemas';

const TODAY = '2026-10-14'; // a Wednesday

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

const brk = (start: string, end: string) => ({ id: start, label: 'Fall break', start, end });

describe('Last day of the term', () => {
  it('uses the day you set, else the latest class end date, else nothing', () => {
    expect(termLastDay({ lastDay: '2026-12-11' }, [{ endDate: '2026-12-01' }])).toBe('2026-12-11');
    expect(termLastDay({}, [{ endDate: '2026-12-01' }, { endDate: '2026-12-09' }, {}])).toBe('2026-12-09');
    expect(termLastDay({}, [{}])).toBeNull();
  });

  it('counts the days left, and notices when the term is over', () => {
    expect(termStatus('2026-10-24', TODAY)).toEqual({ lastDay: '2026-10-24', daysLeft: 10, over: false });
    expect(termStatus(TODAY, TODAY)).toMatchObject({ daysLeft: 0, over: false });
    expect(termStatus('2026-10-01', TODAY)).toMatchObject({ daysLeft: -13, over: true });
    expect(termStatus(null, TODAY)).toEqual({ lastDay: null, daysLeft: null, over: false });
  });

  it('plans work due past two weeks only when asked to look further', () => {
    const far = [task({ id: 'far', dueDate: '2026-11-10' })];
    expect(buildCatchUpPlan(far, { today: TODAY, pace: 'normal' }).taskCount).toBe(0);
    expect(buildCatchUpPlan(far, { today: TODAY, pace: 'normal', horizonDays: 31 }).taskCount).toBe(1);
  });

  it('says whether the plan fits before the last day', () => {
    const work = [task({ id: 'a', dueDate: '2026-10-16', estimateMinutes: 300 })]; // 2 days at 150
    expect(buildCatchUpPlan(work, { today: TODAY, pace: 'normal', lastDay: '2026-10-20' }).pastLastDay).toBe(false);
    expect(buildCatchUpPlan(work, { today: TODAY, pace: 'normal', lastDay: '2026-10-14' }).pastLastDay).toBe(true);
    expect(buildCatchUpPlan(work, { today: TODAY, pace: 'normal' }).pastLastDay).toBeNull();
  });
});

describe('Breaks', () => {
  it('finds a break day, inclusive of both ends', () => {
    const b = [brk('2026-10-16', '2026-10-18')];
    expect(breakOn('2026-10-15', b)).toBeUndefined();
    expect(breakOn('2026-10-16', b)?.label).toBe('Fall break');
    expect(breakOn('2026-10-18', b)?.label).toBe('Fall break');
    expect(breakOn('2026-10-19', b)).toBeUndefined();
  });

  it('only accepts a break whose last day is not before its first', () => {
    expect(validBreak({ start: '2026-10-16', end: '2026-10-16' })).toBe(true);
    expect(validBreak({ start: '2026-10-17', end: '2026-10-16' })).toBe(false);
    expect(validBreak({ start: '', end: '2026-10-16' })).toBe(false);
  });

  it('plans no study on break days and carries the work to the next day that is free', () => {
    // 3 days of work at 75 minutes a day, with Thu to Fri off.
    const work = [task({ id: 'a', dueDate: '2026-10-27', estimateMinutes: 225 })];
    const plan = buildCatchUpPlan(work, { today: TODAY, pace: 'chill', breaks: [brk('2026-10-15', '2026-10-16')] });
    expect(plan.days.map((d) => d.date)).toEqual(['2026-10-14', '2026-10-17', '2026-10-18']);
    expect(plan.breakDaysSkipped).toBe(2);
    expect(plan.finishDate).toBe('2026-10-18');
  });

  it('starts after a break that covers today', () => {
    const work = [task({ id: 'a', dueDate: '2026-10-27', estimateMinutes: 60 })];
    const plan = buildCatchUpPlan(work, { today: TODAY, pace: 'normal', breaks: [brk('2026-10-13', '2026-10-15')] });
    expect(plan.days.map((d) => d.date)).toEqual(['2026-10-16']);
  });

  it('counts a task as after its due date when a break pushes it past', () => {
    const work = [task({ id: 'a', dueDate: '2026-10-15', estimateMinutes: 60 })];
    const plan = buildCatchUpPlan(work, { today: TODAY, pace: 'normal', breaks: [brk('2026-10-14', '2026-10-15')] });
    expect(plan.afterDueIds.has('a')).toBe(true);
  });

  it('stops safely when every day is a break', () => {
    const work = [task({ id: 'a', dueDate: '2026-10-20' })];
    const plan = buildCatchUpPlan(work, { today: TODAY, pace: 'normal', breaks: [brk('2026-01-01', '2099-01-01')] });
    expect(plan.days).toEqual([]);
    expect(plan.truncated).toBe(true);
  });
});

describe('Midterms and finals modes', () => {
  const work = [
    task({ id: 'hw-before', dueDate: '2026-10-15' }),
    task({ id: 'hw-after', dueDate: '2026-10-21' }),
    task({ id: 'exam', dueDate: '2026-10-20', type: 'exam' }),
    task({ id: 'exam-2', dueDate: '2026-10-24', type: 'exam' }),
  ];
  const order = (mode: 'regular' | 'midterms' | 'finals') =>
    buildCatchUpPlan(work, { today: TODAY, pace: 'chill', mode }).days.flatMap((d) => d.items.map((i) => i.assignment.id));

  it('keeps plain due-date order in regular mode', () => {
    expect([...new Set(order('regular'))]).toEqual(['hw-before', 'exam', 'hw-after', 'exam-2']);
  });

  it('plans the exam before other work due on or after the first exam, but not before earlier work', () => {
    expect([...new Set(order('midterms'))]).toEqual(['hw-before', 'exam', 'exam-2', 'hw-after']);
    expect([...new Set(order('finals'))]).toEqual(['hw-before', 'exam', 'exam-2', 'hw-after']);
  });
});

describe('Aggressive pace blocks', () => {
  it('adds up to the hours you chose, with a small floor', () => {
    expect(aggressiveMinutes({ Morning: 2, Evening: 1.5, Night: 1 })).toBe(270);
    expect(aggressiveMinutes({ Morning: 0, Evening: 0, Night: 0 })).toBe(30);
    expect(minutesByPace({ Morning: 1, Evening: 1, Night: 1 })).toEqual({ aggressive: 180, normal: 150, chill: 75 });
  });

  it('cuts a day into Morning, Evening and Night, skipping a block set to 0', () => {
    expect(daySlots('aggressive', { Morning: 2, Evening: 0, Night: 1 })).toEqual([
      { block: 'Morning', minutes: 120 },
      { block: 'Night', minutes: 60 },
    ]);
    expect(daySlots('normal')).toEqual([{ minutes: 150 }]);
    expect(daySlots('aggressive', { Morning: 0, Evening: 0, Night: 0 })).toEqual([{ block: 'Morning', minutes: 30 }]);
  });

  it('fills Morning, then Evening, then Night, then moves to the next day', () => {
    const hours = { Morning: 1, Evening: 0.5, Night: 1 }; // 150 minutes a day
    const plan = buildCatchUpPlan([task({ id: 'big', dueDate: '2026-10-27', estimateMinutes: 200 })], {
      today: TODAY,
      pace: 'aggressive',
      aggressiveHours: hours,
    });
    expect(plan.usesBlocks).toBe(true);
    expect(plan.days[0].items.map((i) => [i.block, i.minutes])).toEqual([
      ['Morning', 60],
      ['Evening', 30],
      ['Night', 60],
    ]);
    expect(plan.days[1].items.map((i) => [i.block, i.minutes])).toEqual([['Morning', 50]]);
    expect(plan.days[0].items[2].continues).toBe(true);
    expect(plan.days[1].items[0].continues).toBe(false);
  });

  it('gets done sooner with more hours', () => {
    const work = [task({ id: 'x', dueDate: '2026-10-27', estimateMinutes: 600 })];
    const few = buildCatchUpPlan(work, { today: TODAY, pace: 'aggressive', aggressiveHours: { Morning: 1, Evening: 0, Night: 0 } });
    const many = buildCatchUpPlan(work, { today: TODAY, pace: 'aggressive', aggressiveHours: { Morning: 3, Evening: 2, Night: 1 } });
    expect(few.days).toHaveLength(10);
    expect(many.days).toHaveLength(2);
  });

  it('does not use blocks on Normal or Chill', () => {
    const plan = buildCatchUpPlan([task({ id: 'x', dueDate: '2026-10-27' })], { today: TODAY, pace: 'normal' });
    expect(plan.usesBlocks).toBe(false);
    expect(plan.days[0].items[0].block).toBeUndefined();
  });

  it('feeds the days-by-pace numbers on the pace cards', () => {
    const work = [task({ id: 'x', dueDate: '2026-10-20', estimateMinutes: 600 })];
    const days = computeCatchUpPaces(work, { today: TODAY, minutesByPace: minutesByPace({ Morning: 2, Evening: 2, Night: 1 }) });
    expect(days.daysByPace.aggressive).toBe(2); // 300 a day
    expect(computeCatchUpPaces(work, { today: TODAY }).daysByPace.aggressive).toBe(3); // old 240 a day
  });
});

describe('Saved settings', () => {
  it('gives sensible defaults to older saved data', () => {
    const s = SettingsSchema.parse({});
    expect(s.term).toEqual({ mode: 'regular' });
    expect(s.schoolBreaks).toEqual([]);
    expect(s.catchUp.aggressiveHours).toEqual({ Morning: 1.5, Evening: 1.5, Night: 1 });
    const old = SettingsSchema.parse({ catchUp: { on: true, pace: 'aggressive' } });
    expect(old.catchUp.aggressiveHours).toEqual({ Morning: 1.5, Evening: 1.5, Night: 1 });
  });

  it('rejects hours or dates that are out of range', () => {
    expect(SettingsSchema.safeParse({ catchUp: { aggressiveHours: { Morning: 9 } } }).success).toBe(false);
    expect(SettingsSchema.safeParse({ term: { lastDay: 'soon' } }).success).toBe(false);
    expect(SettingsSchema.safeParse({ term: { mode: 'summer' } }).success).toBe(false);
  });
});
