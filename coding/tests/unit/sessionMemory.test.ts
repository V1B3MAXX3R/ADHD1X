import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { cleanLine, getNotedAssignments, MAX_NOTE_LENGTH, minutesWorked } from '../../src/features/memory/sessionMemory';
import { AssignmentSchema, SessionSchema } from '../../src/shared/data/schemas';
import { getSession, saveSession } from '../../src/shared/data/database';

const make = (id: string, patch: object = {}) =>
  AssignmentSchema.parse({
    id,
    courseId: 'c1',
    name: `Task ${id}`,
    type: 'essay',
    dueDate: '2026-10-20',
    estimateMinutes: 60,
    estimateSource: 'default',
    source: 'manual',
    createdAt: '2026-10-13T00:00:00Z',
    ...patch,
  });

describe('"Where was I?" note and session goal (A62, A91)', () => {
  it('keeps notes to one plain line', () => {
    expect(cleanLine('  finished para 2,\n start the   conclusion  ', 280)).toBe('finished para 2, start the conclusion');
    expect(cleanLine('   \n  ', 280)).toBeUndefined();
    expect(cleanLine('x'.repeat(500), MAX_NOTE_LENGTH)).toHaveLength(MAX_NOTE_LENGTH);
  });

  it('lists only unfinished, active tasks that have a note, soonest first', () => {
    const list = getNotedAssignments([
      make('a', { note: 'later', dueDate: '2026-10-25' }),
      make('b', { note: 'soon', dueDate: '2026-10-15' }),
      make('c', { note: 'done one', status: 'done' }),
      make('d', { note: 'parked', notNow: true }),
      make('e', {}),
      make('f', { note: '   ' }),
    ]);
    expect(list.map((a) => a.id)).toEqual(['b', 'a']);
  });

  it('counts whole minutes worked, including earlier "Keep going" rounds', () => {
    expect(minutesWorked(0, 120, 0)).toBe(2);
    expect(minutesWorked(120, 120, 60)).toBe(3);
    expect(minutesWorked(0, 120, 200)).toBe(0);
  });

  it('rejects a note or goal that is too long', () => {
    expect(AssignmentSchema.safeParse({ ...make('a'), note: 'x'.repeat(281) }).success).toBe(false);
    expect(
      SessionSchema.safeParse({ id: 's', assignmentId: 'a', startedAt: 'now', plannedMinutes: 2, goalText: 'x'.repeat(201) })
        .success,
    ).toBe(false);
  });

  it('saves a session and updates it with the outcome', async () => {
    await saveSession({ id: 's1', assignmentId: 'a', startedAt: '2026-10-13T09:00:00Z', plannedMinutes: 2, goalText: 'Outline' });
    const first = await getSession('s1');
    expect(first?.goalText).toBe('Outline');
    await saveSession({ ...first!, actualMinutes: 5, outcome: 'partly' });
    expect(await getSession('s1')).toMatchObject({ actualMinutes: 5, outcome: 'partly', goalText: 'Outline' });
  });

  it('keeps notes and goals out of anything sent to Gemini (A15, A36)', () => {
    for (const file of ['src/shared/ai/client.ts', 'server/presets.ts', 'api/ai/[preset].ts']) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\.note\b|goalText|sessionId/);
    }
  });
});
