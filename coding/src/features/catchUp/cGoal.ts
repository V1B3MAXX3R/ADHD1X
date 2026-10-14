import { Assignment, Course } from '../../shared/data/schemas';
import { dayDiff } from '../../shared/clock/clockLogic';
import { isPastDue } from './catchUp';
import { buildGradeBook, courseGrading, DEFAULT_C_PERCENT, ItemRole, knownGrade } from './gradeBook';

// "Just enough for a C": the fewest tasks that should bring each class to a C, worked out the way the class is
// graded in Canvas (by points or by category weights, with drop rules) when the Canvas tool brought that in.
// Plain local math on this device. Grades never leave it (A36).

/** The usual C cutoff. A class's own Canvas letter scale replaces it when the Canvas tool brought one in. */
export const C_PERCENT = DEFAULT_C_PERCENT;
/** What a score is assumed to be when nothing in the class is graded yet. */
const NO_HISTORY_SCORE = 80;
// Zeros for work never handed in are left out when judging your usual score, so a gap of missing work
// does not make the plan assume you will keep scoring badly.
const MIN_ASSUMED = 70;
const MAX_ASSUMED = 90;
/** A C that needs up to this score on the work left still counts as possible: hard, but realistic if you do it all. */
export const REALISTIC_MAX_PERCENT = 90;

// Whether a class can realistically reach a C: at your usual score, or with a score up to REALISTIC_MAX_PERCENT.
export function realisticC(c: Pick<CGoalClass, 'status' | 'requiredPercent'>): boolean {
  if (c.status === 'already' || c.status === 'plan' || c.status === 'noPoints' || c.status === 'nothingDue') return true;
  return c.status === 'stretch' && (c.requiredPercent ?? 101) <= REALISTIC_MAX_PERCENT;
}

// already: at a C. plan: reachable at your usual score. stretch: reachable only with a higher score than usual.
// short: out of reach even with full marks on the work in the window. noPoints: no point values to judge by.
// nothingDue: the class has point values, but nothing worth points is due or graded by the date, so nothing is needed yet.
export type CGoalStatus = 'already' | 'plan' | 'stretch' | 'short' | 'noPoints' | 'nothingDue';

export interface CGoalClass {
  courseId: string;
  name: string;
  status: CGoalStatus;
  /** Still needed for a C, counting finished-but-ungraded work at the assumed score: points in a class graded by
   * points, percentage points of the grade in a weighted class. */
  pointsNeeded: number;
  /** Percentage points of the grade still needed for a C. */
  percentNeeded?: number;
  /** The grade by the date if nothing more is turned in: graded work, plus everything due by then counted as 0. */
  currentPercent?: number;
  /** Your grade now, the way Canvas shows it: every score so far, 0s included (or the number you typed in). */
  gradedPercent?: number;
  /** Where the grade now comes from: typed in by you, Canvas's own number, or added up from the scores here. */
  gradeSource: 'yours' | 'canvas' | 'computed';
  /** The lowest percent that is a C in this class. */
  cPercent: number;
  /** True when the class is graded by category weights. */
  weighted: boolean;
  /** The share of each task's points the plan assumes you earn. 0 to 1. */
  assumedScore: number;
  /** The score needed on all the work in the window to reach a C. Set when status is stretch. */
  requiredPercent?: number;
  /** The best this class could reach on the work in the window with full marks. Set when status is short. */
  bestCasePercent?: number;
  taskIds: string[];
}

export interface CGoal {
  classes: CGoalClass[];
  /** Every task chosen across the classes. */
  taskIds: Set<string>;
  /** True when no class needs more work for a C, so there is nothing to plan. */
  nothingNeeded: boolean;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
const EPS = 1e-9;
// Rounding that ignores tiny floating-point leftovers, so 90.00000000000001 is 90.
const ceilSafe = (n: number): number => Math.ceil(n - 1e-6);
const floorSafe = (n: number): number => Math.floor(n + 1e-6);
const minutesLeft = (a: Assignment): number => Math.max(0, a.estimateMinutes - (a.minutesLogged ?? 0));

export function computeCGoal(
  assignments: Assignment[],
  courses: Pick<Course, 'id' | 'name' | 'canvas' | 'grading' | 'gradeNowPercent'>[],
  options: {
    today: string;
    now?: Date;
    latePenaltyByCourse?: Record<string, number>;
    /** Only work due already or within this many days counts, and can be chosen. */
    horizonDays: number;
    /** Late work you cannot or will not do. It stays in the class total as points lost but is never chosen. */
    unavailableIds?: ReadonlySet<string>;
    /** 0s you plan to turn in late. They are work to do here, but your grade now still counts them as 0s. */
    reopenedIds?: ReadonlySet<string>;
  },
): CGoal {
  const { now, latePenaltyByCourse, horizonDays, today, unavailableIds, reopenedIds } = options;
  const classes: CGoalClass[] = [];
  const taskIds = new Set<string>();

  for (const course of courses) {
    const grading = courseGrading(course);
    // Graded work always counts. Anything else counts only if it is due already or inside the window, so work
    // for the rest of the school year does not make a C look further away than it is.
    const mine = assignments.filter(
      (a) => a.courseId === course.id && (typeof a.earnedPoints === 'number' || dayDiff(today, a.dueDate) <= horizonDays),
    );
    let submittedEarned = 0;
    let submittedMax = 0;
    for (const a of mine) {
      const pts = a.points ?? 0;
      if (pts > 0 && typeof a.earnedPoints === 'number' && a.earnedPoints > 0) {
        submittedEarned += a.earnedPoints;
        submittedMax += pts;
      }
    }

    const candidates = mine.filter(
      (a) =>
        a.status !== 'done' &&
        !a.notNow &&
        typeof a.earnedPoints !== 'number' &&
        !unavailableIds?.has(a.id) &&
        dayDiff(today, a.dueDate) <= horizonDays &&
        minutesLeft(a) > 0,
    );

    const average = submittedMax > 0 ? (submittedEarned / submittedMax) * 100 : NO_HISTORY_SCORE;
    const assumedScore = Math.min(MAX_ASSUMED, Math.max(MIN_ASSUMED, average)) / 100;
    const roleOf = (a: Assignment): ItemRole | null =>
      typeof a.earnedPoints === 'number' ? 'graded' : a.status === 'done' ? 'doneUngraded' : a.notNow ? null : 'remaining';
    const book = buildGradeBook(mine, grading, { assumedScore, roleOf });
    // Your grade now, the way Canvas shows it: every score so far, with 0s (a 0 you plan to turn in is still a 0 today).
    const wasGraded = (a: Assignment): boolean => typeof a.earnedPoints === 'number' || Boolean(reopenedIds?.has(a.id));
    const graded = buildGradeBook(mine, grading, { assumedScore, roleOf: (a) => (wasGraded(a) ? 'graded' : null) });
    // When your real grade now is known (typed in, or Canvas's own number) it wins: Canvas may weight the class in a way
    // the scores here do not show. The difference is kept for the part of the grade that is already graded.
    const known = knownGrade(course);
    const offset = known && graded && book ? (known.percent - graded.percent) * book.shareOf(wasGraded) : 0;
    const gradeSource: CGoalClass['gradeSource'] = known ? known.source : 'computed';

    const empty = { pointsNeeded: 0, assumedScore: 0, cPercent: grading.cPercent, weighted: grading.weighted, gradeSource };
    if (!book && assignments.some((a) => a.courseId === course.id && (a.points ?? 0) > 0)) {
      classes.push({ courseId: course.id, name: course.name, status: 'nothingDue', ...empty, taskIds: [] });
      continue;
    }
    if (!book) {
      // No point values, so there is no honest way to say which work matters most. Plan all of it.
      const ids = candidates.map((a) => a.id);
      ids.forEach((id) => taskIds.add(id));
      classes.push({ courseId: course.id, name: course.name, status: 'noPoints', ...empty, taskIds: ids });
      continue;
    }

    // Everything is worked out in percentage points of the grade. "Units" turns that back into points for classes
    // graded by points (so the numbers match the gradebook), and stays in percent for weighted classes.
    const units = book.weighted ? 1 : book.totalPoints / 100;
    const percentNow = book.percent + offset;
    const neededPct = grading.cPercent - percentNow;
    const needed = round1(neededPct * units);
    const base = {
      courseId: course.id,
      name: course.name,
      assumedScore,
      cPercent: grading.cPercent,
      weighted: book.weighted,
      currentPercent: round1(percentNow),
      gradedPercent: known ? round1(known.percent) : graded ? round1(graded.percent) : undefined,
      gradeSource,
      percentNeeded: Math.max(0, round1(neededPct)),
    };
    if (needed <= 0) {
      classes.push({ ...base, status: 'already', pointsNeeded: 0, percentNeeded: 0, taskIds: [] });
      continue;
    }

    const penalty = Math.min(100, Math.max(0, latePenaltyByCourse?.[course.id] ?? 0));
    // What a task adds to the grade, in the class's units, at your usual score.
    const worth = (a: Assignment): number => {
      const late = penalty > 0 && now !== undefined && isPastDue(a, now);
      return (a.points ?? 0) * book.valuePerPoint(a) * units * (late ? (100 - penalty) / 100 : 1) * assumedScore;
    };
    // Most grade for the time first, so the fewest hours get you to a C. Work that does not count is left out.
    const ranked = candidates
      .filter((a) => (a.points ?? 0) > 0 && book.valuePerPoint(a) > 0)
      .sort(
        (x, y) =>
          worth(y) / Math.max(1, minutesLeft(y)) - worth(x) / Math.max(1, minutesLeft(x)) ||
          x.dueDate.localeCompare(y.dueDate) ||
          x.name.localeCompare(y.name),
      );

    const pool = ranked.reduce((sum, a) => sum + worth(a) / assumedScore, 0); // what full marks would give
    const chosen: string[] = [];
    let sum = 0;
    for (const a of ranked) {
      if (sum + EPS >= needed) break;
      chosen.push(a.id);
      sum += worth(a);
    }
    if (sum + EPS >= needed) {
      chosen.forEach((id) => taskIds.add(id));
      classes.push({ ...base, status: 'plan', pointsNeeded: needed, taskIds: chosen });
      continue;
    }
    // Not enough at your usual score. Next, see whether a higher but realistic score on fewer tasks gets there,
    // so the plan does not ask for every task when it does not need to.
    const stretchScore = REALISTIC_MAX_PERCENT / 100;
    const stretched: string[] = [];
    let stretchSum = 0;
    for (const a of ranked) {
      if (stretchSum + EPS >= needed) break;
      stretched.push(a.id);
      stretchSum += (worth(a) / assumedScore) * stretchScore;
    }
    if (stretchSum + EPS >= needed) {
      const chosenPool = ranked.filter((a) => stretched.includes(a.id)).reduce((s, a) => s + worth(a) / assumedScore, 0);
      stretched.forEach((id) => taskIds.add(id));
      classes.push({ ...base, status: 'stretch', pointsNeeded: needed, requiredPercent: ceilSafe((needed / chosenPool) * 100), taskIds: stretched });
      continue;
    }
    // Even that is not enough. Plan every task in the window either way.
    const all = ranked.map((a) => a.id);
    all.forEach((id) => taskIds.add(id));
    if (pool + EPS >= needed) {
      classes.push({ ...base, status: 'stretch', pointsNeeded: needed, requiredPercent: ceilSafe((needed / pool) * 100), taskIds: all });
    } else {
      classes.push({ ...base, status: 'short', pointsNeeded: needed, bestCasePercent: floorSafe(percentNow + pool / units), taskIds: all });
    }
  }

  return {
    classes,
    taskIds,
    nothingNeeded: classes.length > 0 && classes.every((c) => c.status === 'already'),
  };
}
