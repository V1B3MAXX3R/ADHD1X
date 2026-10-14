import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { SettingsSchema } from '../../src/shared/data/schemas';
import { applyQuizAnswersToSettings } from '../../src/features/quiz/quizRules';
import { computeVoyageStatus } from '../../src/features/voyage/voyage';
import {
  deleteAllData,
  exportAllData,
  getAccessCode,
  getCourses,
  importReplaceData,
  saveAccessCode,
  saveCourse,
  validateImportFile,
} from '../../src/shared/data/database';

describe('Quiz Rule Table & Skip Defaults (A85, A117, FR-02)', () => {
  it('Treats skipped questions as No, keeping dayPlanHome false when Q1 is skipped', () => {
    const initial = SettingsSchema.parse({});
    const updated = applyQuizAnswersToSettings(initial, [
      { questionId: 1, answer: 'skipped', answeredAt: '2026-10-13T00:00:00Z' },
      { questionId: 3, answer: 'yes', answeredAt: '2026-10-13T00:00:00Z' },
    ]);
    expect(updated.dayPlanHome).toBe(false);
    expect(updated.theme).toBe('low');
    expect(updated.fewerOnScreen).toBe(true);
  });

  it('Never overwrites a setting that the user changed by hand', () => {
    const initial = SettingsSchema.parse({
      theme: 'normal',
      manualOverrides: ['theme'],
    });
    const updated = applyQuizAnswersToSettings(initial, [
      { questionId: 3, answer: 'yes', answeredAt: '2026-10-13T00:00:00Z' },
    ]);
    expect(updated.theme).toBe('normal');
  });
});

describe('Voyage Points & Forward-Only Rule (T74, A54)', () => {
  it('Keeps previously reached stops even if new assignments are added later', () => {
    const first = computeVoyageStatus([
      {
        id: 'a1',
        courseId: 'c1',
        name: 'Essay 1',
        type: 'essay',
        dueDate: '2026-10-20',
        estimateMinutes: 240,
        estimateSource: 'default',
        minutesLogged: 0,
        status: 'done',
        notNow: false,
        addedLate: false,
        source: 'manual',
        createdAt: '2026-10-01',
      },
    ]);
    expect(first.planetsReached).toContain('Neptune');

    const afterAddingMore = computeVoyageStatus(
      [
        {
          id: 'a1',
          courseId: 'c1',
          name: 'Essay 1',
          type: 'essay',
          dueDate: '2026-10-20',
          estimateMinutes: 240,
          estimateSource: 'default',
          minutesLogged: 0,
          status: 'done',
          notNow: false,
          addedLate: false,
          source: 'manual',
          createdAt: '2026-10-01',
        },
        {
          id: 'a2',
          courseId: 'c1',
          name: 'Project 1',
          type: 'project',
          dueDate: '2026-11-20',
          estimateMinutes: 360,
          estimateSource: 'default',
          minutesLogged: 0,
          status: 'todo',
          notNow: false,
          addedLate: false,
          source: 'manual',
          createdAt: '2026-10-01',
        },
      ],
      first.planetsReached,
    );
    expect(afterAddingMore.planetsReached).toContain('Neptune');
  });
});

describe('Export, Delete, and Import Round Trip (T76, FR-20)', () => {
  it('Restores courses and settings on round trip while excluding accessCode from export', async () => {
    await deleteAllData();
    await saveAccessCode('super-secret-device-code');
    await saveCourse({
      id: 'c-101',
      name: 'CIS 101',
      isMajor: true,
      createdAt: '2026-10-13T00:00:00Z',
    });

    const exported = await exportAllData();
    expect(JSON.stringify(exported)).not.toContain('super-secret-device-code');

    const validation = validateImportFile(exported);
    expect(validation.ok).toBe(true);

    await deleteAllData();
    await saveAccessCode('super-secret-device-code');
    await importReplaceData(exported);

    const coursesAfter = await getCourses();
    expect(coursesAfter).toHaveLength(1);
    expect(coursesAfter[0].name).toBe('CIS 101');
    expect(await getAccessCode()).toBe('super-secret-device-code');
  });
});
