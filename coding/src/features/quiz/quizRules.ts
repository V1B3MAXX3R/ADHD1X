import { QuizAnswerRecord, Settings } from '../../shared/data/schemas';

export interface QuizQuestionSpec {
  id: number;
  tier: 'Basic' | 'Standard' | 'Detailed' | 'Full';
  question: string;
  shortLabel: string;
  settingKeys: (keyof Settings)[];
  applyYes: (s: Settings) => Partial<Settings>;
  applyNo: (s: Settings) => Partial<Settings>;
}

export const QUIZ_QUESTIONS: QuizQuestionSpec[] = [
  {
    id: 1,
    tier: 'Basic',
    question: 'Would you like the app to plan your school day for you?',
    shortLabel: 'Plan my school day for me',
    settingKeys: ['dayPlanHome'],
    applyYes: () => ({ dayPlanHome: true }),
    applyNo: () => ({ dayPlanHome: false }),
  },
  {
    id: 2,
    tier: 'Basic',
    question: "Do big assignments feel easier when they're broken into small steps?",
    shortLabel: 'Break big assignments into small steps',
    settingKeys: ['defaultSize'],
    applyYes: () => ({ defaultSize: 'bite' }),
    applyNo: () => ({ defaultSize: 'half' }),
  },
  {
    id: 3,
    tier: 'Basic',
    question: 'Do you prefer a calm, simple screen over a colorful, busy one?',
    shortLabel: 'Calm, simple screen',
    settingKeys: ['theme', 'fewerOnScreen'],
    applyYes: () => ({ theme: 'low', fewerOnScreen: true }),
    applyNo: () => ({ theme: 'normal', fewerOnScreen: false }),
  },
  {
    id: 4,
    tier: 'Basic',
    question: 'Would a short 2-minute timer help you get started on schoolwork?',
    shortLabel: 'Short 2-minute starter timer',
    settingKeys: ['starterTimer'],
    applyYes: () => ({ starterTimer: true }),
    applyNo: () => ({ starterTimer: false }),
  },
  {
    id: 5,
    tier: 'Basic',
    question: 'Would you like the space theme, with a spaceship voyage, Hyperdrive and fun facts?',
    shortLabel: 'Space theme and spaceship voyage',
    settingKeys: ['interfaceStyle'],
    applyYes: () => ({ interfaceStyle: 'space' }),
    applyNo: () => ({ interfaceStyle: 'regular' }),
  },
  {
    id: 6,
    tier: 'Standard',
    question: 'Is morning usually your best time for hard schoolwork?',
    shortLabel: 'Morning for hard schoolwork',
    settingKeys: ['heavyBlock'],
    applyYes: () => ({ heavyBlock: 'Morning' }),
    applyNo: () => ({ heavyBlock: 'Evening' }),
  },
  {
    id: 7,
    tier: 'Standard',
    question: 'Would you like reminders before assignments are due?',
    shortLabel: 'Reminders before assignments are due',
    settingKeys: ['dueReminders'],
    applyYes: () => ({ dueReminders: true }),
    applyNo: () => ({ dueReminders: false }),
  },
  {
    id: 8,
    tier: 'Standard',
    question: 'Would you like your home screen to show just one task at a time?',
    shortLabel: 'One task at a time on home screen',
    settingKeys: ['todayView'],
    applyYes: () => ({ todayView: 'card' }),
    applyNo: () => ({ todayView: 'list' }),
  },
  {
    id: 9,
    tier: 'Standard',
    question: 'Would it help if the app scheduled work a few days before each due date?',
    shortLabel: 'Schedule work a few days early',
    settingKeys: ['spacingEarly'],
    applyYes: () => ({ spacingEarly: true }),
    applyNo: () => ({ spacingEarly: false }),
  },
  {
    id: 10,
    tier: 'Standard',
    question: 'Would you like break reminders during long study sessions?',
    shortLabel: 'Break reminders on every plan',
    settingKeys: ['breaks'],
    applyYes: () => ({ breaks: 'always' }),
    applyNo: () => ({ breaks: 'twoPlus' }),
  },
  {
    id: 11,
    tier: 'Detailed',
    question: 'Would you like a heads-up 5 minutes before a study block ends?',
    shortLabel: '5-minute heads-up before block ends',
    settingKeys: ['headsUp'],
    applyYes: () => ({ headsUp: true }),
    applyNo: () => ({ headsUp: false }),
  },
  {
    id: 14,
    tier: 'Detailed',
    question: 'Do you prefer short, direct messages over friendly, encouraging ones?',
    shortLabel: 'Short, direct messages',
    settingKeys: ['tone'],
    applyYes: () => ({ tone: 'short' }),
    applyNo: () => ({ tone: 'warm' }),
  },
  {
    id: 15,
    tier: 'Detailed',
    question: 'Would you like a small celebration when you finish an assignment?',
    shortLabel: 'Small celebrations when finished',
    settingKeys: ['celebrations'],
    applyYes: () => ({ celebrations: true }),
    applyNo: () => ({ celebrations: false }),
  },
  {
    id: 18,
    tier: 'Full',
    question: 'Would you like animations and moving effects turned off?',
    shortLabel: 'Turn off animations',
    settingKeys: ['motion'],
    applyYes: () => ({ motion: false }),
    applyNo: () => ({ motion: true }),
  },
  {
    id: 19,
    tier: 'Full',
    question: 'Do you like seeing the exact minutes count down on a timer?',
    shortLabel: 'Show exact minutes on timer',
    settingKeys: ['timerDisplay'],
    applyYes: () => ({ timerDisplay: 'number' }),
    applyNo: () => ({ timerDisplay: 'bar' }),
  },
  {
    id: 20,
    tier: 'Full',
    question: 'Should classes in your major get extra priority when deadlines are close?',
    shortLabel: 'Extra priority for major classes',
    settingKeys: ['majorWeighting'],
    applyYes: () => ({ majorWeighting: true }),
    applyNo: () => ({ majorWeighting: false }),
  },
  {
    id: 21,
    tier: 'Full',
    question: "When you're stuck, would you like tips for getting started to pop up?",
    shortLabel: 'Pop up tips when stuck',
    settingKeys: ['tipsWhenStuck'],
    applyYes: () => ({ tipsWhenStuck: true }),
    applyNo: () => ({ tipsWhenStuck: false }),
  },
];

export function applyQuizAnswersToSettings(
  current: Settings,
  answers: QuizAnswerRecord[],
): Settings {
  const next = { ...current };
  const manualSet = new Set(current.manualOverrides);

  for (const ans of answers) {
    const spec = QUIZ_QUESTIONS.find((q) => q.id === ans.questionId);
    if (!spec) continue;
    const patch = ans.answer === 'yes' ? spec.applyYes(next) : spec.applyNo(next);
    for (const [k, v] of Object.entries(patch)) {
      if (!manualSet.has(k)) {
        (next as Record<string, unknown>)[k] = v;
      }
    }
  }
  return next;
}

export function getWhyOnNote(
  settingKey: keyof Settings,
  answers: QuizAnswerRecord[],
  manualOverrides: string[],
): { questionId: number; label: string } | null {
  if (manualOverrides.includes(settingKey)) return null;
  const spec = QUIZ_QUESTIONS.find((q) => q.settingKeys.includes(settingKey));
  if (!spec) return null;
  const record = answers.find((a) => a.questionId === spec.id);
  if (!record || record.answer !== 'yes') return null;
  return { questionId: spec.id, label: spec.shortLabel };
}
