import { z } from 'zod';
import { Assignment, Course } from '../../shared/data/schemas';
import { formatLocalDate } from '../../shared/clock/clockLogic';
import { getDefaultEstimate } from '../../shared/logic/estimates';
import { guessAssignmentType } from '../calendar/icsParser';
import { MAX_ASSIGNMENT_NAME } from '../calendar/calendarLogic';

// Reads the file made by tools/canvas_grades/canvas_grades.py. Nothing here touches the network, and
// grades stay on this device (A36).

export const GRADES_FORMAT = 'ADHD1X-canvas-grades';
export const SUPPORTED_FORMAT_VERSION = 1;
export const MAX_GRADES_FILE_BYTES = 5 * 1024 * 1024;
const MAX_POINTS = 1000; // the limit the saved data allows

const CanvasAssignmentSchema = z.object({
  canvasAssignmentId: z.number().int(),
  name: z.string().min(1).max(200),
  dueAt: z.string().nullable(),
  pointsPossible: z.number().nullable(),
  score: z.number().nullable(),
  state: z.enum(['graded', 'submitted', 'missing', 'unsubmitted', 'excused']),
  countsInFinalGrade: z.boolean(),
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

function localDate(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : formatLocalDate(d);
}

// Picks the course whose name best fits the Canvas code or name, so "CIS" does not swallow "CIS 101".
function findCourse(fileCourse: FileCourse, known: Course[]): Course | undefined {
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
  /** Graded work that is not in your list yet (only when asked for). Marked finished. */
  additions: Assignment[];
  newCourses: Course[];
  unchanged: number;
  /** Graded in Canvas, not in your list, and not being added. */
  unmatchedGraded: number;
  /** Not graded yet and not in your list. Importing your calendar brings these in. */
  notGradedYet: number;
  /** Excused, not counted in the grade, or with no usable points. */
  skipped: number;
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
    unchanged: 0,
    unmatchedGraded: 0,
    notGradedYet: 0,
    skipped: 0,
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

    for (const ca of fc.assignments) {
      const pts = ca.pointsPossible;
      const unusable = !ca.countsInFinalGrade || ca.state === 'excused' || pts === null || pts <= 0 || pts > MAX_POINTS;
      if (unusable) {
        plan.skipped++;
        continue;
      }
      const scored = ca.state === 'graded' && ca.score !== null && ca.score >= 0 && ca.score <= MAX_POINTS;
      const match = matchAssignment(ca, appCourse, assignments, used);

      if (match) {
        used.add(match.id);
        const next: Assignment = {
          ...match,
          points: pts as number,
          earnedPoints: scored ? (ca.score as number) : match.earnedPoints,
        };
        if (next.points === match.points && next.earnedPoints === match.earnedPoints) plan.unchanged++;
        else plan.updates.push(next);
        continue;
      }

      if (!scored) {
        plan.notGradedYet++;
        continue;
      }
      if (!options.addMissing) {
        plan.unmatchedGraded++;
        continue;
      }
      if (!appCourse) {
        appCourse = {
          id: makeId(),
          name: (fc.courseCode || fc.name).slice(0, 120),
          isMajor: false,
          createdAt: now.toISOString(),
        };
        known.push(appCourse);
        plan.newCourses.push(appCourse);
      }
      const name = ca.name.trim().slice(0, MAX_ASSIGNMENT_NAME);
      const type = guessAssignmentType(name);
      plan.additions.push({
        id: makeId(),
        courseId: appCourse.id,
        name,
        type,
        dueDate: localDate(ca.dueAt) ?? formatLocalDate(now),
        points: pts,
        earnedPoints: ca.score as number,
        estimateMinutes: getDefaultEstimate(type),
        estimateSource: 'default',
        minutesLogged: 0,
        status: 'done',
        completedAt: now.toISOString(),
        notNow: false,
        addedLate: false,
        source: 'canvas',
        calendarId: calendarIdFor(ca.canvasAssignmentId),
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
