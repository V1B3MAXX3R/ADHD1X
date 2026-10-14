import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 2;

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

// Reusable step list for similar assignments (A93).
export const SavedRoutineSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120),
  taskType: AssignmentTypeSchema,
  steps: z.array(z.string().min(1).max(160)).min(1).max(8),
});
export type SavedRoutine = z.infer<typeof SavedRoutineSchema>;

// A class or event that leaves you drained. A quiet gap is kept after it ends (Lever L7).
export const RecoveryGapSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(120),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).default([0, 1, 2, 3, 4, 5, 6]),
  minutes: z.number().int().min(5).max(60).default(15),
});
export type RecoveryGap = z.infer<typeof RecoveryGapSchema>;

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

// A custom color palette. It is only applied after it passes the contrast checks (A3).
export const CustomPaletteSchema = z.object({
  name: z.string().min(1).max(60),
  bg: hexColor,
  surface: hexColor,
  text: hexColor,
  muted: hexColor,
  accent: hexColor,
  onAccent: hexColor,
  focus: hexColor,
  dueSoon: hexColor,
  border: hexColor,
});
export type CustomPalette = z.infer<typeof CustomPaletteSchema>;

// "Make it clear" checklist line (A60).
export const ChecklistItemSchema = z.object({
  kind: z.enum(['handIn', 'format', 'length', 'dueDate', 'grading', 'other']),
  text: z.string().min(1).max(200),
  checked: z.boolean().default(false),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const AggressiveHoursSchema = z.object({
  Morning: z.number().min(0).max(6).default(1.5),
  Evening: z.number().min(0).max(6).default(1.5),
  Night: z.number().min(0).max(6).default(1),
});
export type AggressiveHours = z.infer<typeof AggressiveHoursSchema>;

export const TermModeSchema = z.enum(['regular', 'midterms', 'finals']);
export type TermMode = z.infer<typeof TermModeSchema>;
export const TermSchema = z.object({
  lastDay: dateString.optional(),
  mode: TermModeSchema.default('regular'),
});
export type Term = z.infer<typeof TermSchema>;

export const SchoolBreakSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(60),
  start: dateString,
  end: dateString,
});
export type SchoolBreak = z.infer<typeof SchoolBreakSchema>;

export const SettingsSchema = z.object({
  ageConfirmed18: z.boolean().default(false),
  geminiNoticeAcknowledged: z.boolean().default(false),
  // Master switch for everything that uses Gemini. Off means only built-in logic runs.
  aiModeEnabled: z.boolean().default(true),
  customPalette: CustomPaletteSchema.nullable().default(null),
  savedRoutines: z.array(SavedRoutineSchema).default([]),
  recoveryGaps: z.array(RecoveryGapSchema).default([]),
  // Minutes per page used by the reading-time calculator (A89).
  readingMinutesPerPage: z.number().min(1).max(10).default(2.5),
  major: z.string().optional(),
  interfaceStyle: z.enum(['space', 'regular']).default('regular'),
  theme: z.enum(['low', 'normal']).default('normal'),
  dim: z.boolean().default(false),
  textScale: z.union([z.literal(100), z.literal(115), z.literal(130), z.literal(150)]).default(100),
  spacing: z.enum(['normal', 'roomy']).default('normal'),
  motion: z.boolean().default(true),
  fewerOnScreen: z.boolean().default(false),
  showClock: z.boolean().default(true),
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
  // The pulp-comic Cosmos look on every page. Off until the person switches it on.
  cosmosLook: z.boolean().default(false),
  // Catch Up (called Hyperdrive in Space style). Only the person switches it on (A39). Local only (A36).
  catchUp: z
    .object({
      on: z.boolean().default(false),
      targetGrade: z.number().min(0).max(100).default(85),
      pace: z.enum(['aggressive', 'normal', 'chill']).default('normal'),
      selectedCourseId: z.string().default('all'),
      // The classes combined in one plan. Empty means the older single choice above, or all classes.
      selectedCourseIds: z.array(z.string()).default([]),
      // The catch-up deadline: the nearest date a C is possible (auto), or a date you pick (manual).
      deadlineMode: z.enum(['auto', 'manual']).default('auto'),
      deadline: dateString.optional(),
      // Late assignments you took out of the plan. Everything late is in the plan until you take it out.
      lateSkippedIds: z.array(z.string()).max(3000).default([]),
      // Work you already turned in that you chose to put back in the plan (to redo or resubmit).
      planAddedIds: z.array(z.string()).max(3000).default([]),
      // Hours the person is willing to work in each block on the Aggressive pace. Their total is the daily amount.
      aggressiveHours: AggressiveHoursSchema.default({ Morning: 1.5, Evening: 1.5, Night: 1 }),
      quickCurrentPercent: z.number().min(0).max(100).optional(),
      quickRemainingWeight: z.number().min(0).max(100).optional(),
    })
    .default({ on: false, targetGrade: 85, pace: 'normal', selectedCourseId: 'all' }),
  // The school term: its last day, and whether it is a regular stretch, midterms or finals.
  term: TermSchema.default({ mode: 'regular' }),
  // Days off (holidays, spring break). Catch Up plans no study on these days.
  schoolBreaks: z.array(SchoolBreakSchema).max(20).default([]),
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

// What the Canvas tool brought in about an assignment. Read-only copies; editing them changes nothing in Canvas.
export const CanvasAssignmentInfoSchema = z.object({
  groupId: z.number().int().optional(),
  lockAt: z.string().max(40).optional(), // after this, Canvas no longer takes the work
  url: z.string().max(500).optional(), // https link back to the assignment, checked against the Canvas site on import
  missing: z.boolean().optional(),
  late: z.boolean().optional(),
  submittedAt: z.string().max(40).optional(),
  attempt: z.number().int().min(0).max(1000).optional(),
  allowedAttempts: z.number().int().min(-1).max(1000).optional(),
  redo: z.boolean().optional(),
  pointsDeducted: z.number().min(0).max(1000).optional(),
});
export type CanvasAssignmentInfo = z.infer<typeof CanvasAssignmentInfoSchema>;

export const CanvasGroupSchema = z.object({
  id: z.number().int(),
  name: z.string().max(120),
  weight: z.number().min(0).max(1000),
  dropLowest: z.number().int().min(0).max(100).default(0),
  dropHighest: z.number().int().min(0).max(100).default(0),
  neverDrop: z.array(z.number().int()).max(500).default([]),
});
export type CanvasGroup = z.infer<typeof CanvasGroupSchema>;

// What the Canvas tool brought in about a class: how it is graded, plus the syllabus and recent announcements.
// Grades stay on this device and are never sent to Gemini (A36).
export const CanvasCourseInfoSchema = z.object({
  courseId: z.number().int(),
  fetchedAt: z.string().max(40),
  currentScore: z.number().min(0).max(1000).nullable().optional(),
  currentGrade: z.string().max(10).nullable().optional(),
  finalScore: z.number().min(0).max(1000).nullable().optional(),
  finalGrade: z.string().max(10).nullable().optional(),
  weighted: z.boolean().default(false),
  hideFinalGrades: z.boolean().optional(),
  groups: z.array(CanvasGroupSchema).max(100).default([]),
  gradingScale: z.array(z.object({ name: z.string().max(20), minPercent: z.number().min(0).max(100) })).max(40).optional(),
  latePolicy: z
    .object({
      lateDeductionEnabled: z.boolean(),
      lateDeductionPercent: z.number().min(0).max(100).nullable(),
      lateInterval: z.string().max(10).nullable(),
      lateMinimumEnabled: z.boolean(),
      lateMinimumPercent: z.number().min(0).max(100).nullable(),
      missingDeductionEnabled: z.boolean(),
      missingDeductionPercent: z.number().min(0).max(100).nullable(),
    })
    .optional(),
  moduleProgress: z.object({ completed: z.number().int().min(0), total: z.number().int().min(1) }).optional(),
  syllabusText: z.string().max(20000).optional(),
  announcements: z
    .array(z.object({ id: z.number().int(), title: z.string().max(200), postedAt: z.string().max(40).nullable(), text: z.string().max(1500) }))
    .max(15)
    .default([]),
  /** Parts Canvas did not share with students, by name. */
  unavailable: z.array(z.string().max(40)).max(20).default([]),
});
export type CanvasCourseInfo = z.infer<typeof CanvasCourseInfoSchema>;

const percent = z.number().min(0).max(100);

// A category of work in your own grading setup (Homework 40%, say). Assignments join it by your choice, by its
// Canvas category, or by a word in their name.
export const GradeCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60),
  weight: z.number().min(0).max(1000),
  /** Words that connect an assignment to this category when they appear in its name ("quiz", "lab"). */
  keywords: z.array(z.string().min(1).max(40)).max(20).default([]),
  canvasGroupId: z.number().int().optional(),
  dropLowest: z.number().int().min(0).max(50).default(0),
});
export type GradeCategory = z.infer<typeof GradeCategorySchema>;

// How a class is graded, entered by you. It replaces what Canvas says when both exist.
export const CourseGradingSchema = z.object({
  /** The lowest percent for each letter. */
  cutoffs: z.object({ A: percent, B: percent, C: percent, D: percent }),
  /** True when the class weights categories. False means it is graded by points. */
  weighted: z.boolean().default(false),
  categories: z.array(GradeCategorySchema).max(30).default([]),
  /** Where an assignment goes when nothing else connects it. */
  defaultCategoryId: z.string().optional(),
});
export type CourseGrading = z.infer<typeof CourseGradingSchema>;

export const CourseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  isMajor: z.boolean(),
  endDate: z.string().optional(),
  createdAt: z.string(),
  // Percent taken off late work in this class. Missing or 0 means the late penalty is waived. 100 means late work is not accepted.
  latePenaltyPercent: z.union([z.literal(0), z.literal(10), z.literal(50), z.literal(100)]).optional(),
  canvas: CanvasCourseInfoSchema.optional(),
  grading: CourseGradingSchema.optional(),
  // Your grade now in this class, typed in by you. It replaces Canvas's number in the Catch Up math. Stays on this
  // device, never sent to Gemini (A36).
  gradeNowPercent: z.number().min(0).max(150).optional(),
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
  earnedPoints: z.number().min(0).max(1000).optional(), // Your own score. Stays on this device, never sent to Gemini (A36).
  percentOfGrade: z.number().min(0).max(100).optional(),
  detailsText: z.string().optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
  estimateMinutes: z.number().int().min(5).max(2400),
  estimateSource: z.enum(['default', 'user']),
  minutesLogged: z.number().int().min(0).default(0),
  status: z.enum(['todo', 'inProgress', 'done']).default('todo'),
  notNow: z.boolean().default(false),
  addedLate: z.boolean().default(false),
  note: z.string().max(280).optional(), // "Where was I?" note (A62). Stays on this device, never sent to Gemini.
  source: z.enum(['syllabus', 'manual', 'calendar', 'canvas']),
  calendarId: z.string().optional(),
  canvas: CanvasAssignmentInfoSchema.optional(),
  /** The grading category you connected this to by hand. */
  categoryId: z.string().max(60).optional(),
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
  goalText: z.string().max(200).optional(),
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

export const CalendarItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  courseName: z.string().max(120).optional(),
  kind: z.enum(['assignment', 'event']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  description: z.string().max(2000).optional(),
  repeats: z.boolean().default(false),
  importedAt: z.string(),
  isNew: z.boolean().default(true),
  status: z.enum(['open', 'added', 'hidden']).default('open'),
  assignmentId: z.string().optional(),
});
export type CalendarItem = z.infer<typeof CalendarItemSchema>;

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
    calendarItems: z.array(CalendarItemSchema).default([]),
  }),
});
export type ExportFile = z.infer<typeof ExportFileSchema>;
