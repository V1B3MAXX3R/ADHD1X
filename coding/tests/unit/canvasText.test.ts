import { describe, expect, it } from 'vitest';
import { describeCanvasAssignment, safeLink } from '../../src/features/grades/canvasText';
import { Assignment } from '../../src/shared/data/schemas';

const NOW = new Date('2026-10-14T17:00:00Z');
const base: Assignment = {
  id: 'a',
  courseId: 'c',
  name: 'Lab 3',
  type: 'lab',
  dueDate: '2026-10-10',
  estimateMinutes: 60,
  estimateSource: 'default',
  minutesLogged: 0,
  status: 'todo',
  notNow: false,
  addedLate: false,
  source: 'canvas',
  createdAt: '2026-10-01T00:00:00Z',
};

describe('What Canvas says about an assignment', () => {
  it('says nothing for work that did not come from Canvas', () => {
    expect(describeCanvasAssignment(base, NOW)).toEqual([]);
  });

  it('names missing, late, lock dates, redos, deductions and attempts in plain words', () => {
    const text = describeCanvasAssignment(
      {
        ...base,
        canvas: {
          missing: true,
          lockAt: '2026-10-12T06:59:00Z',
          redo: true,
          pointsDeducted: 3,
          attempt: 1,
          allowedAttempts: 2,
        },
      },
      NOW,
    );
    expect(text[0]).toBe('marked missing');
    expect(text).toContain('3 points taken off for being late');
    expect(text).toContain('your instructor asked for a redo');
    expect(text.some((t) => t.startsWith('closed on'))).toBe(true);
    expect(text).toContain('1 of 2 attempts used');
  });

  it('says when work was turned in, and whether it was late', () => {
    const text = describeCanvasAssignment({ ...base, canvas: { submittedAt: '2026-10-11T18:00:00Z', late: true } }, NOW);
    expect(text[0]).toMatch(/^turned in .+, late$/);
    expect(describeCanvasAssignment({ ...base, canvas: { lockAt: '2026-10-30T06:59:00Z' } }, NOW)[0]).toMatch(/^open until/);
  });

  it('ignores unlimited attempts and bad dates', () => {
    expect(describeCanvasAssignment({ ...base, canvas: { allowedAttempts: -1, lockAt: 'not a date' } }, NOW)).toEqual([]);
  });
});

describe('Safe Canvas links', () => {
  it('only shows https links without a login in them', () => {
    expect(safeLink('https://canvas.chaffey.edu/courses/1/assignments/2')).toEqual({
      href: 'https://canvas.chaffey.edu/courses/1/assignments/2',
      host: 'canvas.chaffey.edu',
    });
    for (const bad of [undefined, '', 'javascript:alert(1)', 'http://canvas.chaffey.edu/x', 'https://u:p@canvas.chaffey.edu/x', 'nope']) {
      expect(safeLink(bad)).toBeNull();
    }
  });
});
