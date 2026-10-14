import { z } from 'zod';
import { Assignment, CanvasAssignmentInfo, CanvasCourseInfo, Course } from '../../shared/data/schemas';
import { formatLocalDate } from '../../shared/clock/clockLogic';
import { scaledEstimate } from '../../shared/logic/estimates';
import { guessAssignmentType } from '../calendar/icsParser';
import { MAX_ASSIGNMENT_NAME } from '../calendar/calendarLogic';

// Reads the file made by tools/canvas_grades/canvas_grades.py. Nothing here touches the network, and
// grades stay on this device (A36). Version 2 files add how each class is graded and assignment details;
// version 1 files still work.

export const GRADES_FORMAT = 'ADHD1X-canvas-grades';
export const SUPPORTED_FORMAT_VERSION = 2;
export const MAX_GRADES_FILE_BYTES = 5 * 1024 * 1024;
const MAX_POINTS = 1000; // the limit the saved data allows
const MAX_DETAILS = 6000;

const RubricRowSchema = z.object({
  description: z.string().max(200),
  points: z.number().nullable(),
  details: z.string().max(500).nullable(),
});

const CanvasAssignmentSchema = z.object({
  canvasAssignmentId: z.number().int(),
  name: z.string().min(1).max(200),
  dueAt: z.string().nullable(),
  pointsPossible: z.number().nullable(),
  score: z.number().nullable(),
  state: z.enum(['graded', 'submitted', 'missing', 'unsubmitted', 'excused']),
  countsInFinalGrade: z.boolean(),
  // Version 2
  groupId: z.number().int().nullable().optional(),
  lockAt: z.string().max(40).nullable().optional(),
  unlockAt: z.string().max(40).nullable().optional(),
  htmlUrl: z.string().max(500).nullable().optional(),
  gradingType: z.string().max(20).nullable().optional(),
  submissionTypes: z.array(z.string().max(40)).max(10).optional(),
  allowedAttempts: z.number().int().nullable().optional(),
  attempt: z.number().int().nullable().optional(),
  missing: z.boolean().optional(),
  late: z.boolean().optional(),
  latePolicyStatus: z.string().max(20).nullable().optional(),
  pointsDeducted: z.number().nullable().optional(),
  submittedAt: z.string().max(40).nullable().optional(),
  redoRequest: z.boolean().optional(),
  description: z.string().max(4000).nullable().optional(),
  rubric: z.array(RubricRowSchema).max(30).optional(),
});

const CanvasGroupFileSchema = z.object({
  id: z.number().int(),
  name: z.string().max(120),
  weight: z.number(),
  dropLowest: z.number().int(),
  dropHighest: z.number().int(),
  neverDrop: z.array(z.number().int()).max(500),
});

export const GradesFileSchema = z.object({
  format: z.literal(GRADES_FORMAT),
  formatVersion: z.number().int(),
  fetchedAt: z.string(),
  source: z.string(),
  courses: z.array(
    z.object({
      canvasCourseId: z.number().int(),
      name: z.string().min(1).max(120),
      courseCode: z.string().max(120).nullable(),
      term: z.string().nullable(),
      currentScore: z.number().nullable(),
      currentGrade: z.string().nullable(),
      assignments: z.array(CanvasAssignmentSchema),
      // Version 2
      finalScore: z.number().nullable().optional(),
      finalGrade: z.string().max(10).nullable().optional(),
      weighted: z.boolean().optional(),
      hideFinalGrades: z.boolean().optional(),
      groups: z.array(CanvasGroupFileSchema).max(100).optional(),
      gradingScale: z
        .object({
          title: z.string().max(120).nullable(),
          entries: z.array(z.object({ name: z.string().max(20), minPercent: z.number() })).max(40),
        })
        .nullable()
        .optional(),
      latePolicy: z
        .object({
          lateDeductionEnabled: z.boolean(),
          lateDeductionPercent: z.number().nullable(),
          lateInterval: z.string().max(10).nullable(),
          lateMinimumEnabled: z.boolean(),
          lateMinimumPercent: z.number().nullable(),
          missingDeductionEnabled: z.boolean(),
          missingDeductionPercent: z.number().nullable(),
        })
        .nullable()
        .optional(),
      unavailable: z.array(z.string().max(40)).max(20).optional(),
      syllabusText: z.string().max(20000).nullable().optional(),
      moduleProgress: z.object({ completed: z.number().int(), total: z.number().int() }).nullable().optional(),
      announcements: z
        .array(z.object({ id: z.number().int(), title: z.string().max(200), postedAt: z.string().max(40).nullable(), text: z.string().max(1500) }))
        .max(15)
        .optional(),
    }),
  ),
});
export type GradesFile = z.infer<typeof GradesFileSchema>;
type FileCourse = GradesFile['courses'][number];
type FileAssignment = FileCourse['assignments'][number];

export function parseGradesFile(text: string): { ok: true; file: GradesFile } | { ok: false; error: string } {
  if (text.length > MAX_GRADES_FILE_BYTES) {
    return { ok: false, error: 'That file is bigger than 5 MB, so it is probably not a grades file.' };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file could not be read. Pick the .json file made by the Canvas grades tool.' };
  }
  if (typeof json === 'object' && json !== null && 'formatVersion' in json) {
    const v = (json as { formatVersion: unknown }).formatVersion;
    if (typeof v === 'number' && v > SUPPORTED_FORMAT_VERSION) {
      return { ok: false, error: 'This file was made by a newer version of the grades tool and cannot be read here.' };
    }
  }
  const parsed = GradesFileSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: 'That file does not look like one made by the Canvas grades tool.' };
  }
  return { ok: true, file: parsed.data };
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// The app writes Canvas calendar entries with this id (the number is Canvas's assignment id).
export const calendarIdFor = (canvasAssignmentId: number): string => `event-assignment-${canvasAssignmentId}`;

function localDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : formatLocalDate(d);
}

const validIso = (iso: string | null | undefined): string | undefined =>
  iso && !Number.isNaN(new Date(iso).getTime()) ? iso : undefined;

const inRange = (n: number | null | undefined, min: number, max: number): number | undefined =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : undefined;

// A link back to Canvas is kept only when it is https on the same Canvas site the file came from.
export function safeCanvasUrl(url: string | null | undefined, source: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.toLowerCase() === source.toLowerCase() && !u.username && !u.password
      ? u.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

// Canvas shows the work as turned in (a 0 on work never turned in does not count).
export function turnedInOnCanvas(ca: FileAssignment): boolean {
  if (ca.state === 'submitted') return true;
  if (ca.state === 'graded') return Boolean(ca.submittedAt) || (ca.score ?? 0) > 0;
  return false;
}

function assignmentInfo(ca: FileAssignment, source: string): CanvasAssignmentInfo {
  const info: CanvasAssignmentInfo = {
    groupId: ca.groupId ?? undefined,
    lockAt: validIso(ca.lockAt),
    url: safeCanvasUrl(ca.htmlUrl, source),
    missing: ca.missing ?? (ca.state === 'missing' ? true : undefined),
    late: ca.late,
    submittedAt: validIso(ca.submittedAt),
    attempt: inRange(ca.attempt, 0, 1000),
    allowedAttempts: inRange(ca.allowedAttempts, -1, 1000),
    redo: ca.redoRequest || undefined,
    pointsDeducted: inRange(ca.pointsDeducted, 0, 1000),
  };
  return Object.fromEntries(Object.entries(info).filter(([, v]) => v !== undefined)) as CanvasAssignmentInfo;
}

// The instructions and rubric from Canvas, as plain text for the assignment's details.
export function detailsFromCanvas(ca: FileAssignment): string | undefined {
  const parts: string[] = [];
  if (ca.description) parts.push(ca.description);
  if (ca.rubric && ca.rubric.length > 0) {
    const rows = ca.rubric.map(
      (r) => `- ${r.description}${r.points !== null ? ` (${r.points} pts)` : ''}${r.details ? `: ${r.details}` : ''}`,
    );
    parts.push(['Rubric:', ...rows].join('\n'));
  }
  const text = parts.join('\n\n').trim();
  return text ? text.slice(0, MAX_DETAILS) : undefined;
}

export function courseInfo(fc: FileCourse, fetchedAt: string): CanvasCourseInfo {
  const scale = fc.gradingScale?.entries
    .map((e) => ({ name: e.name, minPercent: inRange(e.minPercent, 0, 100) }))
    .filter((e): e is { name: string; minPercent: number } => e.minPercent !== undefined);
  const late = fc.latePolicy;
  const percent = (n: number | null) => (n === null ? null : (inRange(n, 0, 100) ?? null));
  const info: CanvasCourseInfo = {
    courseId: fc.canvasCourseId,
    fetchedAt: fetchedAt.slice(0, 40),
    currentScore: inRange(fc.currentScore, 0, 1000) ?? null,
    currentGrade: fc.currentGrade?.slice(0, 10) ?? null,
    finalScore: inRange(fc.finalScore, 0, 1000) ?? null,
    finalGrade: fc.finalGrade ?? null,
    weighted: Boolean(fc.weighted),
    hideFinalGrades: fc.hideFinalGrades,
    groups: (fc.groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      weight: inRange(g.weight, 0, 1000) ?? 0,
      dropLowest: inRange(g.dropLowest, 0, 100) ?? 0,
      dropHighest: inRange(g.dropHighest, 0, 100) ?? 0,
      neverDrop: g.neverDrop,
    })),
    gradingScale: scale && scale.length > 0 ? scale : undefined,
    latePolicy: late
      ? {
          lateDeductionEnabled: late.lateDeductionEnabled,
          lateDeductionPercent: percent(late.lateDeductionPercent),
          lateInterval: late.lateInterval,
          lateMinimumEnabled: late.lateMinimumEnabled,
          lateMinimumPercent: percent(late.lateMinimumPercent),
          missingDeductionEnabled: late.missingDeductionEnabled,
          missingDeductionPercent: percent(late.missingDeductionPercent),
        }
      : undefined,
    moduleProgress:
      fc.moduleProgress && fc.moduleProgress.total > 0
        ? { completed: Math.max(0, Math.min(fc.moduleProgress.completed, fc.moduleProgress.total)), total: fc.moduleProgress.total }
        : undefined,
    syllabusText: fc.syllabusText ?? undefined,
    announcements: fc.announcements ?? [],
    unavailable: fc.unavailable ?? [],
  };
  return info;
}

// Picks the course whose name best fits the Canvas code or name, so "CIS" does not swallow "CIS 101".
function findCourse(fileCourse: FileCourse, known: Course[]): Course | undefined {
  const byCanvasId = known.find((c) => c.canvas?.courseId === fileCourse.canvasCourseId);
  if (byCanvasId) return byCanvasId;
  const targets = [fileCourse.courseCode, fileCourse.name].filter((t): t is string => Boolean(t)).map(norm);
  let best: Course | undefined;
  let bestLength = 0;
  for (const c of known) {
    const n = norm(c.name);
    if (n.length < 3) continue;
    for (const t of targets) {
      if (t.length < 3) continue;
      if ((n.includes(t) || t.includes(n)) && n.length > bestLength) {
        best = c;
        bestLength = n.length;
      }
    }
  }
  return best;
}

export interface GradePlan {
  /** Your assignments with points and scores filled in. */
  updates: Assignment[];
  /** Canvas work that is not in your list yet (only when asked for). Graded or turned-in work is marked finished; work
   * not turned in yet, including missing work, is added as to do so Catch Up can plan it. */
  additions: Assignment[];
  newCourses: Course[];
  /** Your classes, with how they are graded in Canvas (weights, letter scale, late policy, syllabus, announcements). */
  courseUpdates: Course[];
  unchanged: number;
  /** Graded in Canvas, not in your list, and not being added. */
  unmatchedGraded: number;
  /** Not graded yet, not in your list, and not being added (the box is off, or it has no due date). */
  notGradedYet: number;
  /** Excused, not counted in the grade, or with no usable points. */
  skipped: number;
  /** Your unfinished assignments that Canvas shows as turned in. They are marked finished. */
  markedDone: number;
  /** Assignments whose empty instructions are filled in from Canvas. */
  detailsFilled: number;
  /** Assignments from Canvas or your calendar whose due date changed in Canvas (an extension, say). */
  datesChanged: number;
  courseGrades: {
    canvasCourseId: number;
    name: string;
    score: number | null;
    grade: string | null;
    inYourCourses: boolean;
    gradedCount: number;
    notGradedCount: number;
    included: boolean;
  }[];
}

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// Works out what importing would do, without changing anything.
export function planGradeImport(
  file: GradesFile,
  courses: Course[],
  assignments: Assignment[],
  options: { addMissing: boolean; /** Only these Canvas courses are brought in. Everything, when left out. */ courseIds?: ReadonlySet<number> },
  makeId: () => string,
  now: Date,
): GradePlan {
  const known: Course[] = [...courses];
  const plan: GradePlan = {
    updates: [],
    additions: [],
    newCourses: [],
    courseUpdates: [],
    unchanged: 0,
    unmatchedGraded: 0,
    notGradedYet: 0,
    skipped: 0,
    markedDone: 0,
    detailsFilled: 0,
    datesChanged: 0,
    courseGrades: [],
  };
  const used = new Set<string>();

  for (const fc of file.courses) {
    let appCourse = findCourse(fc, known);
    const included = !options.courseIds || options.courseIds.has(fc.canvasCourseId);
    const gradedCount = fc.assignments.filter((x) => x.state === 'graded' && x.score !== null).length;
    plan.courseGrades.push({
      canvasCourseId: fc.canvasCourseId,
      name: fc.name,
      score: fc.currentScore,
      grade: fc.currentGrade,
      inYourCourses: Boolean(appCourse),
      gradedCount,
      notGradedCount: fc.assignments.length - gradedCount,
      included,
    });
    if (!included) continue;

    const info = courseInfo(fc, file.fetchedAt);
    if (appCourse && !sameJson(appCourse.canvas, info)) {
      const updated = { ...appCourse, canvas: info };
      plan.courseUpdates.push(updated);
      known[known.indexOf(appCourse)] = updated;
      appCourse = updated;
    }

    // The class's usual item size, used to scale time guesses so small items do not get big estimates.
    const sizes = fc.assignments
      .map((x) => x.pointsPossible)
      .filter((p): p is number => p !== null && p > 0)
      .sort((a, b) => a - b);
    const median = sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)] : undefined;

    for (const ca of fc.assignments) {
      const pts = ca.pointsPossible;
      const unusable = !ca.countsInFinalGrade || ca.state === 'excused' || pts === null || pts <= 0 || pts > MAX_POINTS;
      if (unusable) {
        plan.skipped++;
        continue;
      }
      const scored = ca.state === 'graded' && ca.score !== null && ca.score >= 0 && ca.score <= MAX_POINTS;
      const turnedIn = turnedInOnCanvas(ca);
      const canvas = assignmentInfo(ca, file.source);
      const details = detailsFromCanvas(ca);
      const dueDate = localDate(ca.dueAt);
      const match = matchAssignment(ca, appCourse, assignments, used);

      if (match) {
        used.add(match.id);
        const fromFeed = match.source === 'canvas' || match.source === 'calendar';
        const markDone = turnedIn && match.status !== 'done';
        const fillDetails = Boolean(details) && !match.detailsText?.trim();
        const moveDate = fromFeed && dueDate !== undefined && dueDate !== match.dueDate;
        const next: Assignment = {
          ...match,
          points: pts as number,
          earnedPoints: scored ? (ca.score as number) : match.earnedPoints,
          // A time guess you never changed is resized to the points; one you set yourself is kept.
          ...(match.estimateSource === 'default' ? { estimateMinutes: scaledEstimate(match.type, pts as number, median) } : {}),
          ...(Object.keys(canvas).length > 0 ? { canvas } : {}),
          ...(fillDetails ? { detailsText: details } : {}),
          ...(markDone ? { status: 'done' as const, completedAt: canvas.submittedAt ?? now.toISOString() } : {}),
          ...(moveDate ? { dueDate } : {}),
        };
        if (sameJson(next, match)) plan.unchanged++;
        else {
          plan.updates.push(next);
          if (markDone) plan.markedDone++;
          if (fillDetails) plan.detailsFilled++;
          if (moveDate) plan.datesChanged++;
        }
        continue;
      }

      if (!scored && !turnedIn && (!options.addMissing || !dueDate)) {
        plan.notGradedYet++;
        continue;
      }
      if ((scored || turnedIn) && !options.addMissing) {
        plan.unmatchedGraded++;
        continue;
      }
      if (!appCourse) {
        appCourse = {
          id: makeId(),
          name: (fc.courseCode || fc.name).slice(0, 120),
          isMajor: false,
          createdAt: now.toISOString(),
          canvas: info,
        };
        known.push(appCourse);
        plan.newCourses.push(appCourse);
      }
      const name = ca.name.trim().slice(0, MAX_ASSIGNMENT_NAME);
      const type = guessAssignmentType(name);
      const done = scored || turnedIn;
      plan.additions.push({
        id: makeId(),
        courseId: appCourse.id,
        name,
        type,
        dueDate: dueDate ?? formatLocalDate(now),
        points: pts,
        ...(scored ? { earnedPoints: ca.score as number } : {}),
        ...(details ? { detailsText: details } : {}),
        estimateMinutes: scaledEstimate(type, pts, median),
        estimateSource: 'default',
        minutesLogged: 0,
        status: done ? 'done' : 'todo',
        ...(done ? { completedAt: canvas.submittedAt ?? now.toISOString() } : {}),
        notNow: false,
        addedLate: false,
        source: 'canvas',
        calendarId: calendarIdFor(ca.canvasAssignmentId),
        ...(Object.keys(canvas).length > 0 ? { canvas } : {}),
        createdAt: now.toISOString(),
      });
    }
  }
  return plan;
}

function matchAssignment(
  ca: FileAssignment,
  appCourse: Course | undefined,
  assignments: Assignment[],
  used: Set<string>,
): Assignment | undefined {
  const free = assignments.filter((a) => !used.has(a.id));
  const byId = free.find((a) => a.calendarId === calendarIdFor(ca.canvasAssignmentId));
  if (byId) return byId;
  if (!appCourse) return undefined;
  const sameName = free.filter((a) => a.courseId === appCourse.id && norm(a.name) === norm(ca.name));
  const due = localDate(ca.dueAt);
  const withDate = sameName.find((a) => !due || a.dueDate === due);
  if (withDate) return withDate;
  return sameName.length === 1 ? sameName[0] : undefined;
}
