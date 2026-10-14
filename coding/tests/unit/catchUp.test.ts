import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeCatchUpGradeMath, computeCatchUpPaces } from '../../src/features/catchUp/catchUp';
import { Assignment, SettingsSchema } from '../../src/shared/data/schemas';
import { buildDayPlan } from '../../src/features/today/planEngine';

function makeTask(partial: Partial<Assignment> & { id: string; name: string; dueDate: string }): Assignment {
  return {
    courseId: 'c1',
    type: 'homework',
    estimateMinutes: 120,
    estimateSource: 'user',
    minutesLogged: 0,
    status: 'todo',
    notNow: false,
    addedLate: false,
    source: 'manual',
    createdAt: '2026-10-01T00:00:00Z',
    ...partial,
  };
}

describe('Catch Up grade math (A36, A37)', () => {
  it('works out the quick Canvas percent mode without AI', () => {
    // 75% across 60% of the course = 45 points earned. Target 85% needs 40 more of the remaining 40.
    const res = computeCatchUpGradeMath({
      targetGrade: 85,
      assignments: [],
      quickCurrentPercent: 75,
      quickRemainingWeight: 40,
    });
    expect(res.modeUsed).toBe('quick');
    expect(res.requiredPercentOnRemaining).toBe(100);
    expect(res.reachable).toBe(true);
  });

  it('says plainly when a target is out of reach, without alarm words', () => {
    const res = computeCatchUpGradeMath({
      targetGrade: 95,
      assignments: [],
      quickCurrentPercent: 60,
      quickRemainingWeight: 20,
    });
    expect(res.reachable).toBe(false);
    expect(res.plainSummary).not.toMatch(/behind|failing|danger|warning/i);
  });

  it('works out per-assignment points', () => {
    const graded = makeTask({ id: '1', name: 'Quiz 1', dueDate: '2026-10-01', points: 100, earnedPoints: 70, status: 'done' });
    const upcoming = makeTask({ id: '2', name: 'Final Exam', dueDate: '2026-10-20', points: 100 });
    const res = computeCatchUpGradeMath({ targetGrade: 80, assignments: [graded, upcoming] });
    expect(res.modeUsed).toBe('assignments');
    expect(res.pointsEarnedSoFar).toBe(70);
    expect(res.pointsNeededFromRemaining).toBe(90);
    expect(res.requiredPercentOnRemaining).toBe(90);
    expect(res.reachable).toBe(true);
  });

  it('ignores out-of-range quick values and falls back to assignments', () => {
    const res = computeCatchUpGradeMath({ targetGrade: 80, assignments: [], quickCurrentPercent: 140, quickRemainingWeight: 40 });
    expect(res.modeUsed).toBe('assignments');
  });
});

describe('Catch Up pace math (A81)', () => {
  const t1 = makeTask({ id: '1', name: 'Lab 1', dueDate: '2026-10-05', estimateMinutes: 180 });
  const t2 = makeTask({ id: '2', name: 'Essay 1', dueDate: '2026-10-18', estimateMinutes: 300 });

  it('gives honest day counts for Aggressive, Normal and Chill', () => {
    const paces = computeCatchUpPaces([t1, t2]);
    expect(paces.totalRemainingMinutes).toBe(480);
    expect(paces.daysByPace).toEqual({ aggressive: 2, normal: 4, chill: 7 });
    expect(paces.dueSoonestTasks[0].name).toBe('Lab 1');
  });

  it('includes work from earlier dates (A40) but skips finished and not-now work', () => {
    const done = makeTask({ id: '3', name: 'Done', dueDate: '2026-10-01', status: 'done' });
    const later = makeTask({ id: '4', name: 'Parked', dueDate: '2026-10-02', notNow: true });
    const paces = computeCatchUpPaces([t1, t2, done, later], { today: '2026-10-13' });
    expect(paces.dueSoonestTasks.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('looks only 14 days ahead when given today', () => {
    const far = makeTask({ id: '5', name: 'Final Project', dueDate: '2026-12-10', estimateMinutes: 600 });
    const paces = computeCatchUpPaces([t1, far], { today: '2026-10-13' });
    expect(paces.totalRemainingMinutes).toBe(180);
    expect(computeCatchUpPaces([], { today: '2026-10-13' }).daysByPace).toEqual({ aggressive: 0, normal: 0, chill: 0 });
  });
});

describe('Catch Up settings and rules', () => {
  it('is off by default and never switched on for the person (A39)', () => {
    const s = SettingsSchema.parse({});
    expect(s.catchUp).toMatchObject({ on: false, targetGrade: 85, pace: 'normal', selectedCourseId: 'all' });
  });

  it('adds unfinished work from earlier dates to the plan only when asked (A40)', () => {
    const late = makeTask({ id: 'late', name: 'Lab 1', dueDate: '2026-10-10' });
    const base = {
      now: '2026-10-13T07:00',
      selectedBlocks: ['Morning'] as ('Morning')[],
      blockWindows: {
        Morning: { start: '07:00', end: '12:00' },
        Evening: { start: '12:00', end: '17:00' },
        Night: { start: '17:00', end: '20:00' },
      },
      usualBlocks: ['Morning'] as ('Morning')[],
      courses: [],
      prefs: { spacingEarly: false, heavyBlock: 'Morning' as const, majorWeighting: false, breaks: 'twoPlus' as const },
      manualMoves: [],
    };
    expect(buildDayPlan({ ...base, assignments: [late] }).items).toEqual([]);
    expect(buildDayPlan({ ...base, assignments: [{ ...late, addedLate: true }] }).items).toHaveLength(1);
  });

  it('keeps grades out of anything sent to Gemini (A36)', () => {
    const sent = ['src/shared/ai/client.ts', 'server/presets.ts', 'api/ai/[preset].ts'];
    for (const file of sent) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/earnedPoints|targetGrade|quickCurrentPercent|catchUp/);
    }
  });
});
