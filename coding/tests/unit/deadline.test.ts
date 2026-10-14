import { describe, expect, it } from 'vitest';
import { computeCGoal } from '../../src/features/catchUp/cGoal';
import {
  assignmentGroup,
  closedOnCanvas,
  isZeroScore,
  lateOpenWork,
  planChoices,
  studyDaysBetween,
  unavailableLateIds,
} from '../../src/features/catchUp/deadline';
import { Assignment, SettingsSchema } from '../../src/shared/data/schemas';

const TODAY = '2026-10-14';
const NOW = new Date(2026, 9, 14, 10, 0);
const courses = [{ id: 'c1', name: 'ENG 1A' }];

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


describe('Late work choices', () => {
  const items = [
    task({ id: 'late1', dueDate: '2026-10-05' }),
    task({ id: 'late2', dueDate: '2026-10-10', courseId: 'c2' }),
    task({ id: 'soon', dueDate: '2026-10-20' }),
    task({ id: 'doneLate', dueDate: '2026-10-01', status: 'done' }),
    task({ id: 'heldLate', dueDate: '2026-10-02', notNow: true }),
  ];

  it('lists only open work that is past due', () => {
    expect(lateOpenWork(items, NOW).map((a) => a.id)).toEqual(['late1', 'late2']);
  });

  it('leaves out late work in a class that does not accept it, and late work you took out', () => {
    expect([...unavailableLateIds(items, NOW, { c1: 100, c2: 0 }, [])]).toEqual(['late1']);
    expect([...unavailableLateIds(items, NOW, { c1: 10, c2: 50 }, ['late2'])]).toEqual(['late2']);
    expect([...unavailableLateIds(items, NOW, { c1: 0 }, [])]).toEqual([]);
  });

  it('never leaves out work that is not late, even if its id is in the skipped list', () => {
    expect([...unavailableLateIds(items, NOW, { c1: 100 }, ['soon'])]).toEqual(['late1']);
  });

  it('keeps late work you took out in the class total as points lost, but never picks it', () => {
    const work = [
      task({ id: 'g', dueDate: '2026-10-01', status: 'done', points: 100, earnedPoints: 90 }),
      task({ id: 'missed', dueDate: '2026-10-05', points: 100 }),
      task({ id: 'next', dueDate: '2026-10-20', points: 100 }),
    ];
    const all = computeCGoal(work, courses, { today: TODAY, now: NOW, horizonDays: 30 });
    expect(all.classes[0].taskIds).not.toContain('g');
    const without = computeCGoal(work, courses, { today: TODAY, now: NOW, horizonDays: 30, unavailableIds: new Set(['missed']) });
    expect(without.classes[0].taskIds).not.toContain('missed');
    // The missed 100 points still count in the total, so a C needs more from the rest.
    expect(without.classes[0].pointsNeeded).toBe(all.classes[0].pointsNeeded);
  });
});

describe('Study days before a deadline', () => {
  it('counts today and the deadline, and skips break days', () => {
    expect(studyDaysBetween(TODAY, '2026-10-14', [])).toBe(1);
    expect(studyDaysBetween(TODAY, '2026-10-20', [])).toBe(7);
    expect(studyDaysBetween(TODAY, '2026-10-20', [{ id: 'b', label: 'Break', start: '2026-10-16', end: '2026-10-17' }])).toBe(5);
    expect(studyDaysBetween(TODAY, '2026-10-10', [])).toBe(0);
  });
});

describe('Saved settings for the deadline and late work', () => {
  it('defaults to automatic, with nothing taken out', () => {
    const s = SettingsSchema.parse({});
    expect(s.catchUp).toMatchObject({ deadlineMode: 'auto', lateSkippedIds: [] });
    expect(s.catchUp.deadline).toBeUndefined();
  });

  it('rejects a bad deadline', () => {
    expect(SettingsSchema.safeParse({ catchUp: { deadline: 'soon' } }).success).toBe(false);
    expect(SettingsSchema.safeParse({ catchUp: { deadlineMode: 'whenever' } }).success).toBe(false);
  });
});

describe('Every assignment in the dropdown', () => {
  const late = task({ id: 'late', dueDate: '2026-10-05' });
  const zero = task({ id: 'zero', dueDate: '2026-10-05', status: 'done', points: 20, earnedPoints: 0 });
  const upcoming = task({ id: 'upcoming', dueDate: '2026-10-20' });
  const graded = task({ id: 'graded', dueDate: '2026-10-05', status: 'done', points: 20, earnedPoints: 15 });
  const turnedIn = task({ id: 'turnedIn', dueDate: '2026-10-05', status: 'done' });
  const held = task({ id: 'held', dueDate: '2026-10-05', notNow: true });
  const all = [late, zero, upcoming, graded, turnedIn, held];

  it('sorts each assignment into late, coming up, turned in, or not now', () => {
    expect(all.map((a) => assignmentGroup(a, NOW))).toEqual(['late', 'late', 'upcoming', 'turnedIn', 'turnedIn', 'notNow']);
  });

  it('by default: late and upcoming work is in the plan, a 0 counts as still to do, turned-in work stays out', () => {
    const r = planChoices(all, NOW, {}, [], []);
    expect([...r.unavailable]).toEqual([]);
    expect([...r.reopened]).toEqual(['zero']);
  });

  it('unticking takes late or upcoming work out; ticking turned-in work puts it back in to redo', () => {
    const r = planChoices(all, NOW, {}, ['late', 'upcoming', 'zero'], ['graded', 'turnedIn']);
    expect([...r.unavailable].sort()).toEqual(['late', 'upcoming', 'zero']);
    expect([...r.reopened].sort()).toEqual(['graded', 'turnedIn']);
  });

  it('a class that does not accept late work blocks its late work and redos, but not upcoming work', () => {
    const r = planChoices(all, NOW, { c1: 100 }, [], ['graded']);
    expect([...r.unavailable].sort()).toEqual(['late', 'zero']);
    expect([...r.reopened]).toEqual([]);
  });
});

describe('Using what Canvas says', () => {
  it('a 0 on work Canvas shows as turned in is a real grade, not late work', () => {
    const missingZero = task({ id: 'm', dueDate: '2026-10-05', status: 'done', points: 20, earnedPoints: 0, canvas: { missing: true } });
    const realZero = task({ id: 'r', dueDate: '2026-10-05', status: 'done', points: 20, earnedPoints: 0, canvas: { submittedAt: '2026-10-04T10:00:00Z' } });
    expect(isZeroScore(missingZero)).toBe(true);
    expect(isZeroScore(realZero)).toBe(false);
    expect(assignmentGroup(missingZero, NOW)).toBe('late');
    expect(assignmentGroup(realZero, NOW)).toBe('turnedIn');
    expect([...planChoices([missingZero, realZero], NOW, {}, [], []).reopened]).toEqual(['m']);
  });

  it('work Canvas has closed (past its lock date) cannot go in the plan', () => {
    const closed = task({ id: 'closed', dueDate: '2026-10-05', canvas: { lockAt: '2026-10-12T06:59:00Z' } });
    const stillOpen = task({ id: 'open', dueDate: '2026-10-05', canvas: { lockAt: '2026-10-30T06:59:00Z' } });
    expect(closedOnCanvas(closed, NOW)).toBe(true);
    expect(closedOnCanvas(stillOpen, NOW)).toBe(false);
    expect(closedOnCanvas(task({ id: 'x', dueDate: '2026-10-05' }), NOW)).toBe(false);
    expect([...planChoices([closed, stillOpen], NOW, {}, [], []).unavailable]).toEqual(['closed']);
  });

  it('a redo your instructor asked for is work to do again', () => {
    const redo = task({ id: 'redo', dueDate: '2026-10-20', status: 'done', points: 20, earnedPoints: 12, canvas: { redo: true } });
    expect(assignmentGroup(redo, NOW)).toBe('upcoming');
    expect([...planChoices([redo], NOW, {}, [], []).reopened]).toEqual(['redo']);
  });
});

