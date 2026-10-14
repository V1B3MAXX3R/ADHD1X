import { describe, expect, it } from 'vitest';
import { FAKE_ASSIGNMENTS_FOR_FIRST_MOVE, FAKE_SYLLABI_FIXTURES } from '../fixtures/fakeSyllabi';
import { FirstMoveOutputSchema, SyllabusOutputSchema } from '../../server/presets';
import { containsMedicalAdvice } from '../../server/safety';
import { getTemplateFirstMove } from '../../src/features/helpMeStart/templates';

describe('Prompt evaluation set and safety scan (P10, Blueprint section 10)', () => {
  it('has all 10 fake syllabi and 10 fake assignments, with unique ids', () => {
    expect(FAKE_SYLLABI_FIXTURES).toHaveLength(10);
    expect(FAKE_ASSIGNMENTS_FOR_FIRST_MOVE).toHaveLength(10);
    expect(new Set(FAKE_SYLLABI_FIXTURES.map((s) => s.id)).size).toBe(10);
  });

  it('blocks medical and supplement advice but allows nursing course titles', () => {
    expect(containsMedicalAdvice('You should take Adderall 20mg or omega-3 supplements')).toBe(true);
    expect(containsMedicalAdvice('Try an elimination diet or neurofeedback session')).toBe(true);
    expect(containsMedicalAdvice('Open the NURS 210 study guide and review chapter 1.')).toBe(false);

    // The nursing syllabus (S09) must not be rejected by the output check.
    const nursing = SyllabusOutputSchema.safeParse({
      assignments: [
        {
          name: 'Quiz 1: Dosage Calculation & Medication Safety',
          type: 'quiz',
          dueDate: '2026-10-24',
          points: 30,
          percentOfGrade: 15,
        },
      ],
      warnings: [],
    });
    expect(nursing.success).toBe(true);
  });

  it('has a safe built-in first move for every fake assignment', () => {
    for (const item of FAKE_ASSIGNMENTS_FOR_FIRST_MOVE) {
      const fallback = getTemplateFirstMove(item.taskType);
      expect(FirstMoveOutputSchema.safeParse(fallback).success).toBe(true);
      expect(containsMedicalAdvice([fallback.firstMove, ...fallback.steps].join(' '))).toBe(false);
    }
  });
});
