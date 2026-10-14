import { describe, expect, it } from 'vitest';
import {
  activeRecoveryGap,
  buildDefinitionOfDone,
  calculateReadingMinutes,
  formatMinutesAsHHMM,
  personalPace,
  previousDate,
  suggestForEnergy,
} from '../../src/features/planning/planningLogic';
import { parseMinutesInput } from '../../src/features/focus/timeCheck';
import { filterPhrases } from '../../src/features/tips/academicPhrases';
import { EVIDENCE_TIPS_LIBRARY } from '../../src/features/tips/tipsData';
import { STUDY_SCIENCE_FUN_FACTS } from '../../src/features/voyage/studyScienceFacts';
import { FUN_FACTS, pickRandomFunFact } from '../../src/features/voyage/funFacts';
import { containsMedicalAdvice } from '../../server/safety';
import { AssignmentSchema, RecoveryGapSchema, SettingsSchema } from '../../src/shared/data/schemas';

const task = (over: Record<string, unknown>) =>
  AssignmentSchema.parse({
    id: 'a',
    courseId: 'c',
    name: 'Task',
    type: 'lab',
    dueDate: '2026-10-20',
    estimateMinutes: 60,
    estimateSource: 'default',
    createdAt: '2026-10-13T00:00:00Z',
    source: 'manual',
    ...over,
  });

describe('Energy check suggestions (A64)', () => {
  it('low energy suggests one block and a 2-minute starter', () => {
    expect(suggestForEnergy('low', ['Morning', 'Evening'], ['Morning'])).toMatchObject({ blocks: ['Morning'], starterMinutes: 2 });
  });
  it('okay and good keep the chosen blocks, and fall back to usual blocks when none are chosen', () => {
    expect(suggestForEnergy('okay', ['Evening', 'Night'], []).blocks).toEqual(['Evening', 'Night']);
    expect(suggestForEnergy('good', [], ['Morning', 'Evening'])).toMatchObject({ blocks: ['Morning', 'Evening'], starterMinutes: 15 });
    expect(suggestForEnergy('low', [], [])).toMatchObject({ blocks: ['Morning'] });
  });
});

describe('Reading time from pages (A89)', () => {
  it('rounds up to 5 minutes and never goes under 5', () => {
    expect(calculateReadingMinutes(15, 2.5)).toBe(40);
    expect(calculateReadingMinutes(1, 1)).toBe(5);
  });
  it('uses 15 minutes when the page count is unusable', () => {
    expect(calculateReadingMinutes(0)).toBe(15);
    expect(calculateReadingMinutes(Number.NaN)).toBe(15);
  });
});

describe('Personal pace (A90)', () => {
  it('needs two finished tasks of the same type with time logged', () => {
    const one = [task({ id: '1', status: 'done', minutesLogged: 100 })];
    expect(personalPace(one, 'lab')).toBeNull();
    const two = [...one, task({ id: '2', status: 'done', minutesLogged: 140 }), task({ id: '3', status: 'todo', minutesLogged: 500 })];
    const pace = personalPace(two, 'lab');
    expect(pace?.sampleCount).toBe(2);
    expect(pace?.averageMinutes).toBe(120);
    expect(personalPace(two, 'essay')).toBeNull();
  });
  it('keeps the multiplier between 0.5 and 2', () => {
    const big = [task({ id: '1', status: 'done', minutesLogged: 5000 }), task({ id: '2', status: 'done', minutesLogged: 5000 })];
    expect(personalPace(big, 'lab')?.multiplier).toBe(2);
  });
});

describe('Time check-back input', () => {
  it('reads whole minutes and ignores empty or bad input', () => {
    expect(parseMinutesInput(' 25.4 ')).toBe(25);
    expect(parseMinutesInput('')).toBeUndefined();
    expect(parseMinutesInput('abc')).toBeUndefined();
    expect(parseMinutesInput('-3')).toBeUndefined();
    expect(parseMinutesInput('9999')).toBe(600);
  });
});

describe('Definition of done', () => {
  it('uses the Make it clear checklist when there is one', () => {
    const a = task({ checklist: [{ kind: 'format', text: 'Submit as a PDF' }] });
    expect(buildDefinitionOfDone(a)).toEqual(['Submit as a PDF']);
  });
  it('gives a short list for every task type', () => {
    for (const type of ['discussion', 'reading', 'homework', 'quiz', 'lab', 'essay', 'exam', 'project', 'other']) {
      const list = buildDefinitionOfDone(task({ type }));
      expect(list.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Recovery gaps', () => {
  const gap = RecoveryGapSchema.parse({ id: 'g', title: 'Lab lecture', endTime: '11:50', days: [1, 3], minutes: 15 });
  it('is active only on its days and inside the gap', () => {
    const monday = (h: number, m: number) => new Date(2026, 9, 12, h, m); // Mon 12 Oct 2026
    expect(activeRecoveryGap([gap], monday(11, 49))).toBeNull();
    expect(activeRecoveryGap([gap], monday(11, 50))).toMatchObject({ title: 'Lab lecture', untilMinutes: 12 * 60 + 5 });
    expect(activeRecoveryGap([gap], monday(12, 5))).toBeNull();
    expect(activeRecoveryGap([gap], new Date(2026, 9, 13, 11, 55))).toBeNull(); // Tuesday
  });
  it('formats the end of the gap', () => expect(formatMinutesAsHHMM(12 * 60 + 5)).toBe('12:05'));
  it('is saved with sensible defaults', () => {
    expect(SettingsSchema.parse({})).toMatchObject({ recoveryGaps: [], readingMinutesPerPage: 2.5 });
  });
});

describe('Dates', () => {
  it('finds the day before, across a month and a year', () => {
    expect(previousDate('2026-10-13')).toBe('2026-10-12');
    expect(previousDate('2026-11-01')).toBe('2026-10-31');
    expect(previousDate('2027-01-01')).toBe('2026-12-31');
  });
});

describe('Tips, phrases and extra facts', () => {
  it('has tips with unique ids and no medical advice (A71)', () => {
    expect(new Set(EVIDENCE_TIPS_LIBRARY.map((t) => t.id)).size).toBe(EVIDENCE_TIPS_LIBRARY.length);
    expect(EVIDENCE_TIPS_LIBRARY.filter((t) => containsMedicalAdvice(`${t.title} ${t.body}`))).toEqual([]);
  });
  it('filters syllabus phrases by words in the phrase or the meaning', () => {
    expect(filterPhrases('synthes')).toHaveLength(1);
    expect(filterPhrases('zzzz')).toHaveLength(0);
    expect(filterPhrases('  ').length).toBeGreaterThan(3);
  });
  it('keeps the approved 20 facts separate from the extra ones, with unique ids and sources', () => {
    expect(FUN_FACTS).toHaveLength(20);
    const ids = [...FUN_FACTS, ...STUDY_SCIENCE_FUN_FACTS].map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(STUDY_SCIENCE_FUN_FACTS.every((f) => f.source.length > 0)).toBe(true);
    expect(STUDY_SCIENCE_FUN_FACTS.filter((f) => /symptom|disorder|deficit|superpower/i.test(f.fact))).toEqual([]);
  });
  it('can pick any of the facts', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(pickRandomFunFact().id);
    expect(seen.has('FF21')).toBe(true);
    expect(seen.has('FF1')).toBe(true);
  });
});
