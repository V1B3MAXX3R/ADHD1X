import { describe, expect, it } from 'vitest';
import { buildDayPlan, PlanEngineInput } from '../../src/features/today/planEngine';
import { Assignment, BlockWindows, Course } from '../../src/shared/data/schemas';

const DEFAULT_WINDOWS: BlockWindows = {
  Morning: { start: '06:00', end: '12:00' },
  Evening: { start: '12:00', end: '17:00' },
  Night: { start: '17:00', end: '20:00' },
};

const MAJOR_COURSE: Course = {
  id: 'c-major',
  name: 'Cybersecurity 101',
  isMajor: true,
  createdAt: '2026-10-01T00:00:00Z',
};

function makeAssignment(partial: Partial<Assignment> & { id: string; name: string; dueDate: string }): Assignment {
  return {
    courseId: 'c-major',
    type: 'homework',
    estimateMinutes: 60,
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

function baseInput(overrides: Partial<PlanEngineInput>): PlanEngineInput {
  return {
    now: '2026-10-12T07:00',
    selectedBlocks: ['Morning', 'Evening'],
    blockWindows: DEFAULT_WINDOWS,
    usualBlocks: ['Morning', 'Evening'],
    assignments: [],
    courses: [MAJOR_COURSE],
    prefs: {
      spacingEarly: true,
      heavyBlock: 'Morning',
      majorWeighting: true,
      breaks: 'twoPlus',
    },
    manualMoves: [],
    ...overrides,
  };
}

describe('Day Plan Engine — Technical Spec §1.3 Cases 1 to 7 (T71)', () => {
  it('Case 1: Mon Oct 12 07:00 — Urgent Quiz (30m) fits; Essay 18 days out is outside 14-day lead window', () => {
    const quiz1 = makeAssignment({ id: 'q1', name: 'Quiz 1 review', type: 'quiz', estimateMinutes: 30, dueDate: '2026-10-13' });
    const essay1 = makeAssignment({ id: 'e1', name: 'Essay 1', type: 'essay', estimateMinutes: 600, dueDate: '2026-10-30' });

    const out = buildDayPlan(baseInput({ now: '2026-10-12T07:00', assignments: [quiz1, essay1] }));

    expect(out.items.map((i) => i.assignment.name)).toEqual(['Quiz 1 review']);
    expect(out.items[0].minutesPlanned).toBe(30);
    expect(out.items[0].urgent).toBe(true);
    expect(out.totals.breakMinutes).toBe(0);
    expect(out.finishTime).toBe('7:30 am');
  });

  it('Case 2: Tue Oct 13 07:00 — Quiz (30m), Essay share (45m), Break (10m after 60m reached), Reading share (15m), finish 8:40 am', () => {
    const quiz1 = makeAssignment({ id: 'q1', name: 'Quiz 1 review', type: 'quiz', estimateMinutes: 30, dueDate: '2026-10-13' });
    const essay1 = makeAssignment({ id: 'e1', name: 'Essay 1', type: 'essay', estimateMinutes: 600, dueDate: '2026-10-30' });
    const reading4 = makeAssignment({ id: 'r4', name: 'Reading Ch. 4', type: 'reading', estimateMinutes: 40, dueDate: '2026-10-17' });

    const out = buildDayPlan(
      baseInput({
        now: '2026-10-13T07:00',
        assignments: [quiz1, essay1, reading4],
      }),
    );

    const morningEntries = out.blocks.find((b) => b.block === 'Morning')!.entries;
    expect(morningEntries).toHaveLength(4);
    expect(morningEntries[0]).toMatchObject({ kind: 'session', minutesPlanned: 30 });
    expect(morningEntries[1]).toMatchObject({ kind: 'session', minutesPlanned: 45 });
    expect(morningEntries[2]).toMatchObject({ kind: 'break', minutes: 10 });
    expect(morningEntries[3]).toMatchObject({ kind: 'session', minutesPlanned: 15 });
    expect(out.finishTime).toBe('8:40 am');
  });

  it('Case 3: Mon Oct 12 07:00 — Only Morning selected; 600m Essay due tomorrow triggers 1.5h shortfall & continues', () => {
    const essay = makeAssignment({ id: 'e1', name: 'Essay 1', type: 'essay', estimateMinutes: 600, dueDate: '2026-10-13' });

    const out = buildDayPlan(
      baseInput({
        now: '2026-10-12T07:00',
        selectedBlocks: ['Morning'],
        usualBlocks: ['Morning'],
        assignments: [essay],
      }),
    );

    expect(out.items[0].minutesPlanned).toBe(255);
    expect(out.items[0].continues).toBe(true);
    expect(out.enoughTime).not.toBeNull();
    expect(out.enoughTime?.missingHours).toBe(1.5);
    expect(out.enoughTime?.suggestedBlock).toBe('Evening');
  });

  it('Case 4: Any time at or after 20:00 returns needsConfirmAfterHours and empty plan', () => {
    const quiz1 = makeAssignment({ id: 'q1', name: 'Quiz 1', dueDate: '2026-10-13' });
    const out = buildDayPlan(baseInput({ now: '2026-10-12T20:30', assignments: [quiz1] }));
    expect(out.flags.needsConfirmAfterHours).toBe(true);
    expect(out.items).toHaveLength(0);
  });

  it('Case 5: No blocks selected returns needsBlocks and empty plan', () => {
    const quiz1 = makeAssignment({ id: 'q1', name: 'Quiz 1', dueDate: '2026-10-13' });
    const out = buildDayPlan(baseInput({ selectedBlocks: [], assignments: [quiz1] }));
    expect(out.flags.needsBlocks).toBe(true);
    expect(out.items).toHaveLength(0);
  });

  it('Case 6: Not now, done, and overdue tasks are excluded automatically', () => {
    const notNowTask = makeAssignment({ id: '1', name: 'Not Now', dueDate: '2026-10-13', notNow: true });
    const doneTask = makeAssignment({ id: '2', name: 'Done', dueDate: '2026-10-13', status: 'done' });
    const overdueTask = makeAssignment({ id: '3', name: 'Overdue', dueDate: '2026-10-10' });

    const out = buildDayPlan(baseInput({ assignments: [notNowTask, doneTask, overdueTask] }));
    expect(out.items).toHaveLength(0);
  });

  it('Case 7: Deterministic — same input twice produces identical output', () => {
    const a1 = makeAssignment({ id: '1', name: 'Task A', dueDate: '2026-10-14', estimateMinutes: 60 });
    const a2 = makeAssignment({ id: '2', name: 'Task B', dueDate: '2026-10-15', estimateMinutes: 120 });
    const inp = baseInput({ assignments: [a1, a2] });
    expect(buildDayPlan(inp)).toEqual(buildDayPlan(inp));
  });
});
