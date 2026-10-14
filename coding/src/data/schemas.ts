import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1;

export const AssignmentTypeSchema = z.enum([
  'discussion',
  'reading',
  'homework',
  'quiz',
  'lab',
  'essay',
  'exam',
  'project',
  'other',
]);
export type AssignmentType = z.infer<typeof AssignmentTypeSchema>;

export const BlockNameSchema = z.enum(['Morning', 'Evening', 'Night']);
export type BlockName = z.infer<typeof BlockNameSchema>;

export const BlockWindowsSchema = z.object({
  Morning: z.object({ start: z.string(), end: z.string() }),
  Evening: z.object({ start: z.string(), end: z.string() }),
  Night: z.object({ start: z.string(), end: z.string() }),
});
export type BlockWindows = z.infer<typeof BlockWindowsSchema>;

export const SettingsSchema = z.object({
  ageConfirmed18: z.boolean().default(false),
  geminiNoticeAcknowledged: z.boolean().default(false),
  major: z.string().optional(),
  interfaceStyle: z.enum(['space', 'regular']).default('regular'),
  theme: z.enum(['low', 'normal']).default('normal'),
  dim: z.boolean().default(false),
  textScale: z.union([z.literal(100), z.literal(115), z.literal(130), z.literal(150)]).default(100),
  spacing: z.enum(['normal', 'roomy']).default('normal'),
  motion: z.boolean().default(true),
  fewerOnScreen: z.boolean().default(false),
  todayView: z.enum(['list', 'card']).default('list'),
  timerDisplay: z.enum(['number', 'bar', 'hidden']).default('bar'),
  usualBlocks: z.array(BlockNameSchema).default(['Morning', 'Evening']),
  blockWindows: BlockWindowsSchema.default({
    Morning: { start: '06:00', end: '12:00' },
    Evening: { start: '12:00', end: '17:00' },
    Night: { start: '17:00', end: '20:00' },
  }),
  dayPlanHome: z.boolean().default(false),
  spacingEarly: z.boolean().default(false),
  heavyBlock: z.enum(['Morning', 'Evening']).default('Evening'),
  majorWeighting: z.boolean().default(false),
  energyCheck: z.boolean().default(false),
  starterTimer: z.boolean().default(false),
  starterMinutes: z.number().int().min(1).max(180).default(2),
  timerSound: z.boolean().default(false),
  tone: z.enum(['warm', 'short']).default('warm'),
  defaultSize: z.enum(['bite', 'half', 'full']).default('half'),
  tipsWhenStuck: z.boolean().default(false),
  celebrations: z.boolean().default(false),
  dueReminders: z.boolean().default(false),
  daysAhead: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  headsUp: z.boolean().default(false),
  breaks: z.enum(['twoPlus', 'always']).default('twoPlus'),
  whereShow: z.enum(['app', 'browser']).default('app'),
  batching: z.boolean().default(false),
  batchTime: z.string().optional(),
  quietStart: z.string().default('20:00'),
  quietEnd: z.string().default('06:00'),
  notificationSounds: z.boolean().default(false),
  voyageHidden: z.boolean().default(false),
  manualOverrides: z.array(z.string()).default([]),
  exportPromptShown: z.boolean().default(false),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const QuizAnswerRecordSchema = z.object({
  questionId: z.number().int().min(1).max(21),
  answer: z.enum(['yes', 'no', 'skipped']),
  answeredAt: z.string(),
});
export type QuizAnswerRecord = z.infer<typeof QuizAnswerRecordSchema>;

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  isMajor: z.boolean(),
  endDate: z.string().optional(),
  createdAt: z.string(),
});
export type Course = z.infer<typeof CourseSchema>;

export const AssignmentSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  name: z.string().min(1).max(120),
  type: AssignmentTypeSchema,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  points: z.number().min(0).max(1000).optional(),
  percentOfGrade: z.number().min(0).max(100).optional(),
  detailsText: z.string().optional(),
  estimateMinutes: z.number().int().min(5).max(2400),
  estimateSource: z.enum(['default', 'user']),
  minutesLogged: z.number().int().min(0).default(0),
  status: z.enum(['todo', 'inProgress', 'done']).default('todo'),
  notNow: z.boolean().default(false),
  addedLate: z.boolean().default(false),
  note: z.string().optional(),
  source: z.enum(['syllabus', 'manual']),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  assignmentId: z.string(),
  startedAt: z.string(),
  plannedMinutes: z.number().int().min(1),
  actualMinutes: z.number().int().min(0).optional(),
  goalText: z.string().optional(),
  outcome: z.enum(['done', 'partly', 'notYet']).optional(),
  firstMoveId: z.string().optional(),
});
export type SessionRecord = z.infer<typeof SessionSchema>;

export const FirstMoveRecordSchema = z.object({
  id: z.string(),
  taskType: AssignmentTypeSchema,
  courseId: z.string().optional(),
  sizeChoice: z.enum(['bite', 'half', 'full']),
  firstMove: z.string().min(1).max(160),
  steps: z.array(z.string().max(120)),
  source: z.enum(['gemini', 'template']),
  createdAt: z.string(),
});
export type FirstMoveRecord = z.infer<typeof FirstMoveRecordSchema>;

export const ManualMoveSchema = z.object({
  assignmentId: z.string(),
  targetBlock: BlockNameSchema,
  position: z.number().int().min(0),
});
export type ManualMove = z.infer<typeof ManualMoveSchema>;

export const StudyDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  blocks: z.array(BlockNameSchema),
  accepted: z.boolean(),
  manualMoves: z.array(ManualMoveSchema),
});
export type StudyDay = z.infer<typeof StudyDaySchema>;

export const VoyageRecordSchema = z.object({
  semesterKey: z.string(),
  progressPoints: z.number().int().min(0),
  planetsReached: z.array(z.string()),
  startedAt: z.string(),
  endedAt: z.string().optional(),
});
export type VoyageRecord = z.infer<typeof VoyageRecordSchema>;

export const LogbookRecordSchema = z.object({
  semesterKey: z.string(),
  label: z.string(),
  summary: z.string(),
  endedAt: z.string(),
});
export type LogbookRecord = z.infer<typeof LogbookRecordSchema>;

export const ExportFileSchema = z.object({
  app: z.literal('ADHD1X'),
  exportSchemaVersion: z.number().int(),
  exportedAt: z.string(),
  data: z.object({
    settings: SettingsSchema,
    quizAnswers: z.array(QuizAnswerRecordSchema),
    courses: z.array(CourseSchema),
    assignments: z.array(AssignmentSchema),
    sessions: z.array(SessionSchema),
    firstMoves: z.array(FirstMoveRecordSchema),
    studyDays: z.array(StudyDaySchema),
    voyage: VoyageRecordSchema.nullable(),
    logbook: z.array(LogbookRecordSchema),
  }),
});
export type ExportFile = z.infer<typeof ExportFileSchema>;
