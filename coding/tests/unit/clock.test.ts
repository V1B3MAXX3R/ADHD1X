import { describe, expect, it } from 'vitest';
import {
  blockAt,
  describeNow,
  formatDueIn,
  formatDuration,
  isQuietTime,
  msUntilNextMinute,
  toLocalIso,
} from '../../src/shared/clock/clockLogic';
import { getClockNotices } from '../../src/shared/clock/notices';
import { buildDayPlan } from '../../src/features/today/planEngine';
import { Assignment, BlockWindows, SettingsSchema } from '../../src/shared/data/schemas';

const WINDOWS: BlockWindows = {
  Morning: { start: '07:00', end: '12:00' },
  Evening: { start: '12:00', end: '17:00' },
  Night: { start: '17:00', end: '20:00' },
};
const at = (h: number, m = 0, day = 13) => new Date(2026, 9, day, h, m, 0);

const makeAssignment = (patch: Partial<Assignment>): Assignment => ({
  id: 'a1',
  courseId: 'c1',
  name: 'Essay 1',
  type: 'essay',
  dueDate: '2026-10-14',
  estimateMinutes: 120,
  estimateSource: 'default',
  minutesLogged: 0,
  status: 'todo',
  notNow: false,
  addedLate: false,
  source: 'manual',
  createdAt: '2026-10-13T00:00:00Z',
  ...patch,
});

describe('Clock basics', () => {
  it('formats the local time the way the plan engine expects', () => {
    expect(toLocalIso(at(14, 5))).toBe('2026-10-13T14:05');
  });

  it('finds the block for a time of day', () => {
    expect(blockAt(WINDOWS, 7 * 60)).toBe('Morning');
    expect(blockAt(WINDOWS, 12 * 60)).toBe('Evening');
    expect(blockAt(WINDOWS, 6 * 60 + 59)).toBeNull();
    expect(blockAt(WINDOWS, 20 * 60)).toBeNull();
  });

  it('waits for the next minute, never zero', () => {
    const ms = msUntilNextMinute(at(10, 0));
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(60050);
    expect(formatDuration(100)).toBe('1 h 40 min');
    expect(formatDuration(25)).toBe('25 min');
  });

  it('knows quiet hours that wrap past midnight', () => {
    expect(isQuietTime('20:00', '06:00', 21 * 60)).toBe(true);
    expect(isQuietTime('20:00', '06:00', 5 * 60)).toBe(true);
    expect(isQuietTime('20:00', '06:00', 12 * 60)).toBe(false);
    expect(isQuietTime('08:00', '08:00', 8 * 60)).toBe(false);
  });
});

describe('Right now line', () => {
  it('shows time left in a study block', () => {
    const r = describeNow(WINDOWS, ['Morning', 'Evening'], 10 * 60 + 20);
    expect(r.headline).toBe("You're in your Morning block");
    expect(r.detail).toContain('1 h 40 min left');
  });

  it('says so when the current block is not a study block', () => {
    expect(describeNow(WINDOWS, ['Morning'], 13 * 60).headline).toBe("It's Evening time");
  });

  it('points to the next block, or says none are left', () => {
    expect(describeNow(WINDOWS, ['Morning'], 6 * 60).detail).toContain('Next: Morning at 7:00 am, in 1 h');
    expect(describeNow(WINDOWS, ['Morning'], 21 * 60).headline).toBe('No more study blocks today');
  });
});

describe('Due wording', () => {
  it('is neutral and relative to the clock', () => {
    const now = at(14, 0);
    expect(formatDueIn('2026-10-13', '17:00', now)).toBe('due today at 5:00 pm');
    expect(formatDueIn('2026-10-13', '09:00', now)).toBe('was due today at 9:00 am');
    expect(formatDueIn('2026-10-14', undefined, now)).toBe('due tomorrow');
    expect(formatDueIn('2026-10-12', undefined, now)).toMatch(/^was due /);
    expect(formatDueIn('2026-10-13', undefined, now)).not.toMatch(/overdue|late/i);
  });
});

describe('Clock notices', () => {
  const settings = (patch: object) => SettingsSchema.parse({ blockWindows: WINDOWS, ...patch });
  const SettingsParse = settings;

  it('shows nothing unless the person turned notices on', () => {
    expect(getClockNotices(at(11, 57), settings({}), [makeAssignment({})])).toEqual([]);
  });

  it('gives a 5-minute heads-up before a study block ends', () => {
    const s = settings({ headsUp: true, usualBlocks: ['Morning'] });
    expect(getClockNotices(at(11, 56), s, [])[0].message).toBe(
      'Heads-up: your Morning block wraps up in about 4 minutes.',
    );
    expect(getClockNotices(at(11, 40), s, [])).toEqual([]);
  });

  it('uses short wording when the tone is short, and today\'s chosen blocks', () => {
    const s = settings({ headsUp: true, tone: 'short', usualBlocks: ['Evening'] });
    expect(getClockNotices(at(11, 56), s, [], ['Morning'])[0].message).toBe('Morning block ends in 4 min.');
    expect(getClockNotices(at(11, 56), s, [], ['Evening'])).toEqual([]);
  });

  it('lists work due within the chosen number of days, calmly', () => {
    const s = settings({ dueReminders: true, daysAhead: 1 });
    const list = getClockNotices(at(9, 0), s, [
      makeAssignment({}),
      makeAssignment({ id: 'far', dueDate: '2026-10-20' }),
      makeAssignment({ id: 'done', status: 'done' }),
    ]);
    expect(list.map((n) => n.message)).toEqual(['Coming up: Essay 1, due tomorrow.']);

    const short = SettingsParse({ dueReminders: true, daysAhead: 1, tone: 'short' });
    expect(getClockNotices(at(9, 0), short, [makeAssignment({})]).map((n) => n.message)).toEqual([
      'Essay 1: due tomorrow.',
    ]);
  });

  it('stays quiet during quiet hours', () => {
    const s = settings({ dueReminders: true, quietStart: '20:00', quietEnd: '06:00' });
    expect(getClockNotices(at(21, 0), s, [makeAssignment({ dueDate: '2026-10-13' })])).toEqual([]);
  });
});

describe('Day plan follows the real time', () => {
  const base = {
    selectedBlocks: ['Morning', 'Evening'] as ('Morning' | 'Evening')[],
    blockWindows: WINDOWS,
    usualBlocks: ['Morning', 'Evening'] as ('Morning' | 'Evening')[],
    assignments: [makeAssignment({ dueDate: '2026-10-20' })],
    courses: [],
    prefs: { spacingEarly: false, heavyBlock: 'Morning' as const, majorWeighting: false, breaks: 'twoPlus' as const },
    manualMoves: [],
  };

  it('has less Morning room later in the morning', () => {
    const early = buildDayPlan({ ...base, now: '2026-10-13T07:00' });
    const late = buildDayPlan({ ...base, now: '2026-10-13T11:00' });
    const morning = (p: typeof early) => p.blocks.find((b) => b.block === 'Morning')!.capacityMinutes;
    expect(morning(early)).toBe(255);
    expect(morning(late)).toBeLessThan(morning(early));
  });

  it('after 8 pm gives an empty plan until the person asks, then plans full-length blocks', () => {
    const asked = buildDayPlan({ ...base, now: '2026-10-13T20:30' });
    expect(asked.flags.needsConfirmAfterHours).toBe(true);
    expect(asked.items).toEqual([]);

    const confirmed = buildDayPlan({ ...base, now: '2026-10-13T20:30', afterHoursConfirmed: true });
    expect(confirmed.flags.needsConfirmAfterHours).toBe(false);
    expect(confirmed.blocks.find((b) => b.block === 'Morning')!.capacityMinutes).toBe(255);
    expect(confirmed.items.length).toBeGreaterThan(0);
  });
});
