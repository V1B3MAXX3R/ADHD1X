import { Assignment, CanvasCourseInfo, Course, CourseGrading as GradingSetup } from '../../shared/data/schemas';

// How a class turns scores into a grade: by points, or by category weights, with "drop the lowest" rules.
// Your own setup (entered under Grading) comes first, then what Canvas says, then plain points with a C at 70%.
// Plain local math on this device. Grades never leave it (A36).

export const DEFAULT_C_PERCENT = 70;
export const DEFAULT_CUTOFFS = { A: 90, B: 80, C: 70, D: 60 };

export interface GradeGroup {
  id: string;
  name: string;
  weight: number;
  dropLowest: number;
  dropHighest: number;
  /** Canvas assignment ids that are never dropped. */
  neverDrop: number[];
}

export interface CourseGrading {
  /** True when categories are weighted (and at least one has a weight). */
  weighted: boolean;
  groups: GradeGroup[];
  /** The category an assignment counts in, or undefined when nothing connects it. */
  categoryOf: (a: Assignment) => string | undefined;
  /** The lowest percent that is a C in this class. */
  cPercent: number;
  /** Where the weights and categories come from. */
  source: 'yours' | 'canvas' | 'default';
  /** Where the C cutoff comes from. */
  cSource: 'yours' | 'canvas' | 'default';
}

/** Canvas's own id for an assignment, from the id the calendar and grades imports save. */
export function canvasIdOf(a: Pick<Assignment, 'calendarId'>): number | undefined {
  const m = /^event-assignment-(\d+)$/.exec(a.calendarId ?? '');
  return m ? Number(m[1]) : undefined;
}

// Which of your categories an assignment belongs to: the one you picked by hand, else the one tied to its Canvas
// category, else the first whose words appear in its name, else your default.
export function categoryFromSetup(a: Assignment, setup: GradingSetup): string | undefined {
  const ids = new Set(setup.categories.map((c) => c.id));
  if (a.categoryId && ids.has(a.categoryId)) return a.categoryId;
  const groupId = a.canvas?.groupId;
  if (groupId !== undefined) {
    const tied = setup.categories.find((c) => c.canvasGroupId === groupId);
    if (tied) return tied.id;
  }
  const name = a.name.toLowerCase();
  const byWord = setup.categories.find((c) => c.keywords.some((k) => k.trim() && name.includes(k.trim().toLowerCase())));
  if (byWord) return byWord.id;
  return setup.defaultCategoryId && ids.has(setup.defaultCategoryId) ? setup.defaultCategoryId : undefined;
}

export function courseGrading(course?: { canvas?: CanvasCourseInfo; grading?: GradingSetup }): CourseGrading {
  const info = course?.canvas;
  const setup = course?.grading;
  const canvasC = info?.gradingScale?.find((e) => e.name.trim().toUpperCase() === 'C');

  if (setup) {
    const canvasGroups = new Map((info?.groups ?? []).map((g) => [g.id, g]));
    return {
      weighted: setup.weighted && setup.categories.some((c) => c.weight > 0),
      groups: setup.categories.map((c) => ({
        id: c.id,
        name: c.name,
        weight: c.weight,
        dropLowest: c.dropLowest,
        dropHighest: 0,
        neverDrop: c.canvasGroupId !== undefined ? (canvasGroups.get(c.canvasGroupId)?.neverDrop ?? []) : [],
      })),
      categoryOf: (a) => categoryFromSetup(a, setup),
      cPercent: setup.cutoffs.C,
      source: 'yours',
      cSource: 'yours',
    };
  }

  if (info && info.groups.length > 0) {
    const known = new Set(info.groups.map((g) => g.id));
    return {
      weighted: info.weighted && info.groups.some((g) => g.weight > 0),
      groups: info.groups.map((g) => ({
        id: `canvas-${g.id}`,
        name: g.name,
        weight: g.weight,
        dropLowest: g.dropLowest,
        dropHighest: g.dropHighest,
        neverDrop: g.neverDrop,
      })),
      categoryOf: (a) => (a.canvas?.groupId !== undefined && known.has(a.canvas.groupId) ? `canvas-${a.canvas.groupId}` : undefined),
      cPercent: canvasC ? canvasC.minPercent : DEFAULT_C_PERCENT,
      source: 'canvas',
      cSource: canvasC ? 'canvas' : 'default',
    };
  }

  return {
    weighted: false,
    groups: [],
    categoryOf: () => undefined,
    cPercent: canvasC ? canvasC.minPercent : DEFAULT_C_PERCENT,
    source: 'default',
    cSource: canvasC ? 'canvas' : 'default',
  };
}

// ------------------------------------------------------------------ grade now

/** Your grade now in a class: the number you typed in, else Canvas's current score. Null when neither is known. */
export function knownGrade(
  course?: Pick<Course, 'gradeNowPercent' | 'canvas'>,
): { percent: number; source: 'yours' | 'canvas' } | null {
  if (typeof course?.gradeNowPercent === 'number') return { percent: course.gradeNowPercent, source: 'yours' };
  const info = course?.canvas;
  if (info && !info.hideFinalGrades && typeof info.currentScore === 'number') return { percent: info.currentScore, source: 'canvas' };
  return null;
}

/** The letter for a percent: your cutoffs, else Canvas's letter scale, else the usual 90/80/70/60. */
export function letterFor(percent: number, course?: { grading?: GradingSetup; canvas?: CanvasCourseInfo }): string {
  const scale = course?.canvas?.gradingScale;
  if (!course?.grading && scale && scale.length > 0) {
    const hit = [...scale].sort((x, y) => y.minPercent - x.minPercent).find((e) => percent >= e.minPercent);
    if (hit) return hit.name;
  }
  const cut = course?.grading?.cutoffs ?? DEFAULT_CUTOFFS;
  return percent >= cut.A ? 'A' : percent >= cut.B ? 'B' : percent >= cut.C ? 'C' : percent >= cut.D ? 'D' : 'F';
}

export interface GradeNow {
  percent: number;
  letter: string;
  /** Typed in by you, from Canvas, or added up from the scores here. */
  source: 'yours' | 'canvas' | 'computed';
}

// The grade to show for a class: yours, else Canvas's (with its own letter), else what the scores here add up to.
export function gradeNow(
  course: Pick<Course, 'gradeNowPercent' | 'canvas' | 'grading'>,
  computedPercent?: number,
): GradeNow | null {
  const known = knownGrade(course);
  const round = (n: number) => Math.round(n * 100) / 100;
  if (known) {
    const canvasLetter = known.source === 'canvas' ? course.canvas?.currentGrade : null;
    return { percent: round(known.percent), letter: canvasLetter || letterFor(known.percent, course), source: known.source };
  }
  if (computedPercent === undefined) return null;
  return { percent: round(computedPercent), letter: letterFor(computedPercent, course), source: 'computed' };
}

/** graded: has a score. doneUngraded: finished, no score yet. remaining: still to do (counts as 0 until done). */
export type ItemRole = 'graded' | 'doneUngraded' | 'remaining';

export interface GradeBook {
  /** The grade (0 to 100, more with extra credit) on what counts: scores, finished work at the assumed score, and
   * remaining work as 0. */
  percent: number;
  /** Percentage points of the grade that one point of this assignment is worth. 0 when it does not count. */
  valuePerPoint: (a: Assignment) => number;
  /** Graded work the drop rules leave out. */
  droppedIds: Set<string>;
  weighted: boolean;
  /** Points counted, for classes graded by points. */
  totalPoints: number;
  /** The share of the grade (0 to 1) that the assignments `pick` chooses make up. */
  shareOf: (pick: (a: Assignment) => boolean) => number;
}

interface Bucket {
  weight: number;
  earned: number;
  points: number;
}

const ratio = (a: Assignment): number => (a.earnedPoints ?? 0) / (a.points as number);

// Applies one group's drop rules to its graded work. Never drops every score in a group.
function dropsFor(graded: Assignment[], group: GradeGroup): Set<string> {
  const dropped = new Set<string>();
  const never = new Set(group.neverDrop);
  const canDrop = graded.filter((a) => {
    const id = canvasIdOf(a);
    return id === undefined || !never.has(id);
  });
  let room = Math.max(0, graded.length - 1);
  // Lowest first; among equal scores, the bigger item first, since dropping it helps more.
  const lowest = [...canDrop].sort((x, y) => ratio(x) - ratio(y) || (y.points as number) - (x.points as number));
  for (const a of lowest.slice(0, Math.min(group.dropLowest, room))) dropped.add(a.id);
  room -= dropped.size;
  const highest = canDrop.filter((a) => !dropped.has(a.id)).sort((x, y) => ratio(y) - ratio(x));
  for (const a of highest.slice(0, Math.min(group.dropHighest, room))) dropped.add(a.id);
  return dropped;
}

export function buildGradeBook(
  items: Assignment[],
  grading: CourseGrading,
  options: { assumedScore: number; roleOf: (a: Assignment) => ItemRole | null },
): GradeBook | null {
  const { assumedScore, roleOf } = options;
  const groupById = new Map(grading.groups.map((g) => [g.id, g]));
  const keyOf = (a: Assignment): string => {
    const id = grading.categoryOf(a);
    return id !== undefined && groupById.has(id) ? id : 'none';
  };

  const counted = items.filter((a) => (a.points ?? 0) > 0 && roleOf(a) !== null);
  // Drop rules apply to graded work in each category, weighted or not.
  const droppedIds = new Set<string>();
  for (const g of grading.groups) {
    if (g.dropLowest <= 0 && g.dropHighest <= 0) continue;
    const graded = counted.filter((a) => keyOf(a) === g.id && roleOf(a) === 'graded');
    for (const id of dropsFor(graded, g)) droppedIds.add(id);
  }

  const buckets = new Map<string, Bucket>();
  for (const a of counted) {
    if (droppedIds.has(a.id)) continue;
    const key = keyOf(a);
    const b = buckets.get(key) ?? { weight: key === 'none' ? 0 : (groupById.get(key)?.weight ?? 0), earned: 0, points: 0 };
    const pts = a.points as number;
    const role = roleOf(a);
    if (role === 'graded') b.earned += a.earnedPoints ?? 0;
    else if (role === 'doneUngraded') b.earned += pts * assumedScore;
    b.points += pts;
    buckets.set(key, b);
  }

  const totalPoints = [...buckets.values()].reduce((s, b) => s + b.points, 0);
  if (totalPoints <= 0) return null;
  const kept = counted.filter((a) => !droppedIds.has(a.id));

  if (grading.weighted) {
    // Like Canvas's current grade: only categories with work in them count, and their weights are scaled to fit.
    const included = [...buckets.entries()].filter(([key, b]) => key !== 'none' && b.points > 0 && b.weight > 0);
    const totalWeight = included.reduce((s, [, b]) => s + b.weight, 0);
    if (totalWeight > 0) {
      const percent = (included.reduce((s, [, b]) => s + (b.weight * b.earned) / b.points, 0) / totalWeight) * 100;
      return {
        percent,
        valuePerPoint: (a) => {
          const key = keyOf(a);
          const b = buckets.get(key);
          if (key === 'none' || !b || b.points <= 0 || b.weight <= 0) return 0;
          return (100 * b.weight) / (b.points * totalWeight);
        },
        droppedIds,
        weighted: true,
        totalPoints,
        shareOf: (pick) =>
          included.reduce((share, [key, b]) => {
            const picked = kept.filter((a) => keyOf(a) === key && pick(a)).reduce((s, a) => s + (a.points as number), 0);
            return share + (b.weight / totalWeight) * (picked / b.points);
          }, 0),
      };
    }
  }

  const earned = [...buckets.values()].reduce((s, b) => s + b.earned, 0);
  return {
    percent: (earned / totalPoints) * 100,
    valuePerPoint: () => 100 / totalPoints,
    droppedIds,
    weighted: false,
    totalPoints,
    shareOf: (pick) => kept.filter(pick).reduce((s, a) => s + (a.points as number), 0) / totalPoints,
  };
}

/** How many of a class's assignments each category holds, and which ones nothing connects. */
export function connectionSummary(
  items: Assignment[],
  grading: CourseGrading,
): { counts: Map<string, number>; unconnected: Assignment[] } {
  const counts = new Map<string, number>(grading.groups.map((g) => [g.id, 0]));
  const unconnected: Assignment[] = [];
  for (const a of items) {
    if ((a.points ?? 0) <= 0) continue;
    const id = grading.categoryOf(a);
    if (id !== undefined && counts.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    else unconnected.push(a);
  }
  return { counts, unconnected };
}
