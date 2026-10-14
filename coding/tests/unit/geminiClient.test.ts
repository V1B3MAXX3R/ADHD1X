import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { buildDayTunerMoves, buildVibeFallback, sanitizeMilestones, splitBrainDump } from '../../src/features/gemini/geminiLogic';
import { buildLocalMajorProposal } from '../../src/features/gemini/majorPresets';
import { applyCustomPalette, checkPalette, contrastRatio, paletteProblems, readableOn } from '../../src/features/gemini/palette';
import { callAiPreset, getCalmErrorMessage } from '../../src/shared/ai/client';
import { getSettings, saveSettings } from '../../src/shared/data/database';
import { CustomPaletteSchema, SettingsSchema } from '../../src/shared/data/schemas';
import { FUN_FACTS } from '../../src/features/voyage/funFacts';

const GOOD = {
  name: 'Nebula',
  bg: '#101020', surface: '#1A1A30', text: '#F0F0FF', muted: '#C0C0E0',
  accent: '#80E0D0', onAccent: '#101020', focus: '#FFD060', dueSoon: '#FFB050', border: '#9090C0',
};

describe('Palette contrast rules (A3)', () => {
  it('knows the extremes', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(readableOn('#000000')).toBe('#FFFFFF');
    expect(readableOn('#FFFFFF')).toBe('#000000');
  });

  it('passes a readable palette and names every check that fails on a poor one', () => {
    expect(paletteProblems(CustomPaletteSchema.parse(GOOD))).toEqual([]);
    const bad = CustomPaletteSchema.parse({ ...GOOD, muted: '#303050', border: '#1C1C32', focus: '#101024' });
    const failing = paletteProblems(bad).map((c) => c.label);
    expect(failing).toEqual(expect.arrayContaining(['Muted text on background', 'Borders on background', 'Focus ring on background']));
    expect(checkPalette(bad)).toHaveLength(8);
  });

  it('only accepts proper hex colors', () => {
    expect(CustomPaletteSchema.safeParse({ ...GOOD, bg: 'red' }).success).toBe(false);
    expect(CustomPaletteSchema.safeParse({ ...GOOD, bg: '#12345' }).success).toBe(false);
  });

  it('applies a good palette to the page and never applies a bad one', () => {
    const root = document.documentElement.style;
    applyCustomPalette(CustomPaletteSchema.parse(GOOD));
    expect(root.getPropertyValue('--color-bg')).toBe('#101020');
    applyCustomPalette(null);
    expect(root.getPropertyValue('--color-bg')).toBe('');
    applyCustomPalette(CustomPaletteSchema.parse({ ...GOOD, text: '#101030' }));
    expect(root.getPropertyValue('--color-text')).toBe('');
  });
});

describe('Built-in versions of the Gemini helpers', () => {
  it('splits a brain dump into clean, unique lines', () => {
    expect(splitBrainDump('- read ch 4\n2) Lab 2; lab 2, email prof')).toEqual(['read ch 4', 'Lab 2', 'email prof']);
    expect(splitBrainDump('  \n ')).toEqual([]);
  });

  it('only suggests settings the description clearly mentions', () => {
    expect(buildVibeFallback('Bright screens hurt my eyes and I love space. Keep it short.')).toEqual({
      dim: true,
      interfaceStyle: 'space',
      tone: 'short',
    });
    expect(buildVibeFallback('I just want to get my homework done')).toEqual({});
  });

  it('makes a major preset, and does not mistake words like Nutrition for technology', () => {
    const tech = buildLocalMajorProposal('Cybersecurity');
    expect(tech.starterMoves.some((m) => m.taskType === 'lab')).toBe(true);
    const other = buildLocalMajorProposal('Nutrition');
    expect(other.starterMoves[0].taskType).toBe('essay');
    expect(new Set(tech.savedRoutines.map((r) => r.id)).size).toBe(tech.savedRoutines.length);
  });
});

describe('Cleaning up what Gemini suggests', () => {
  it('keeps only milestones with real dates between today and the due date, in order', () => {
    const out = sanitizeMilestones(
      [
        { title: 'Draft', dueDate: '2026-10-28', estimateMinutes: 90 },
        { title: 'Too early', dueDate: '2026-10-01', estimateMinutes: 30 },
        { title: 'Too late', dueDate: '2026-12-01', estimateMinutes: 30 },
        { title: 'Outline', dueDate: '2026-10-20', estimateMinutes: 5 },
        { title: '  ', dueDate: '2026-10-21', estimateMinutes: 30 },
      ],
      '2026-10-13',
      '2026-11-01',
    );
    expect(out.map((m) => m.title)).toEqual(['Outline', 'Draft']);
    expect(out[0].estimateMinutes).toBe(15);
  });

  it('spreads at most six known tasks across the proposed blocks', () => {
    const known = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    const moves = buildDayTunerMoves(['a', 'x', 'b', 'c', 'd', 'e', 'f', 'g', 'a'], known, ['Morning', 'Evening']);
    expect(moves).toHaveLength(6);
    expect(moves.map((m) => m.assignmentId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(moves.filter((m) => m.targetBlock === 'Morning')).toHaveLength(3);
    expect(buildDayTunerMoves(['a'], known, [])[0].targetBlock).toBe('Morning');
  });
});

describe('AI Mode switch and settings', () => {
  it('has AI Mode on, no custom palette and no routines by default', () => {
    const s = SettingsSchema.parse({});
    expect(s).toMatchObject({ aiModeEnabled: true, customPalette: null, savedRoutines: [], celebrations: false });
  });

  it('does not contact the server at all when AI Mode is off', async () => {
    await saveSettings(SettingsSchema.parse({ aiModeEnabled: false }));
    expect((await getSettings()).aiModeEnabled).toBe(false);
    const original = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as typeof fetch;
    try {
      expect(await callAiPreset('firstMove', {})).toEqual({ ok: false, reason: 'ai_disabled' });
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
    expect(getCalmErrorMessage('ai_disabled')).toMatch(/AI Mode is turned off/);
  });
});

describe('Fun facts still intact', () => {
  it('has 20 facts', () => expect(FUN_FACTS).toHaveLength(20));
});
