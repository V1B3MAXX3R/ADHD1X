import { describe, expect, it } from 'vitest';
import { FUN_FACTS, pickRandomFunFact } from '../../src/features/voyage/funFacts';
import { PLANET_DETAILS } from '../../src/features/voyage/planets';
import { buildCompletionReward } from '../../src/features/voyage/rewards';
import { VOYAGE_STOPS } from '../../src/features/voyage/voyage';
import { Assignment } from '../../src/shared/data/schemas';

const make = (id: string, type: Assignment['type'], status: Assignment['status']): Assignment => ({
  id,
  courseId: 'c1',
  name: `Task ${id}`,
  type,
  dueDate: '2026-10-20',
  estimateMinutes: 30,
  estimateSource: 'default',
  minutesLogged: 0,
  status,
  notNow: false,
  addedLate: false,
  source: 'manual',
  createdAt: '2026-10-13T00:00:00Z',
});

describe('Fun facts (A67, A77)', () => {
  it('has the 20 approved facts with unique ids and sources', () => {
    expect(FUN_FACTS).toHaveLength(20);
    expect(new Set(FUN_FACTS.map((f) => f.id)).size).toBe(20);
    expect(FUN_FACTS.every((f) => f.source.length > 0)).toBe(true);
  });

  it('never uses the words the interface must avoid (A76)', () => {
    const banned = /symptom|disorder|deficit|superpower/i;
    expect(FUN_FACTS.filter((f) => banned.test(f.fact))).toEqual([]);
  });

  it('picks a different fact when asked to skip one', () => {
    for (let i = 0; i < 30; i++) expect(pickRandomFunFact('FF1').id).not.toBe('FF1');
  });
});

describe('Planets', () => {
  it('has details for every stop on the route', () => {
    expect(VOYAGE_STOPS.every((s) => PLANET_DETAILS[s])).toBe(true);
  });
});

describe('Completion reward', () => {
  it('reports points, progress and a newly reached stop', () => {
    const open = [make('a', 'essay', 'todo'), make('b', 'quiz', 'todo')];
    const after = [make('a', 'essay', 'done'), make('b', 'quiz', 'todo')];
    const r = buildCompletionReward(open, after, after[0], FUN_FACTS[0]);
    expect(r.pointsEarned).toBe(3);
    expect(r.progressPoints).toBe(3);
    expect(r.totalPoints).toBe(4);
    // 3 of 4 points passes the first five stops (Moon to Saturn); the newest one is reported.
    expect(r.newlyReachedStop).toBe('Saturn');
    expect(r.currentStop).toBe('Saturn');
  });

  it('has no new stop when the finish does not cross a threshold', () => {
    const open = Array.from({ length: 14 }, (_, i) => make(String(i), 'quiz', 'todo'));
    const after = open.map((a, i) => (i === 0 ? { ...a, status: 'done' as const } : a));
    const r = buildCompletionReward(open, after, after[0], FUN_FACTS[0]);
    expect(r.newlyReachedStop).toBeNull();
    expect(r.currentStop).toBe('Earth Orbit');
  });
});
