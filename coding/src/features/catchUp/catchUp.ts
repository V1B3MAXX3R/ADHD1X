import { Assignment } from '../../shared/data/schemas';
import { dayDiff, formatLocalDate, minutesOfDay, parseHHMM } from '../../shared/clock/clockLogic';
import { buildGradeBook, CourseGrading } from './gradeBook';

// Plain local math. Nothing in this file talks to Gemini, and grades never leave the device (A36).

export type CatchUpPace = 'aggressive' | 'normal' | 'chill';

export const PACE_MINUTES_PER_DAY: Record<CatchUpPace, { minutes: number; label: string; desc: string }> = {
  aggressive: {
    minutes: 240,
    label: 'Aggressive',
    desc: 'More work per day (about 4 hours) so you catch up sooner.',
  },
  normal: {
    minutes: 150,
    label: 'Normal',
    desc: 'A balanced day (about 2.5 hours).',
  },
  chill: {
    minutes: 75,
    label: 'Chill',
    desc: 'Spread over more days (about 1.25 hours a day) for the lightest daily load.',
  },
};

// How far ahead the "days to catch up" estimate looks, so work due months from now does not inflate it.
export const CATCH_UP_HORIZON_DAYS = 14;

export interface GradeMathResult {
  /** Points you could still lose to late penalties, and how many tasks that covers. 0 when penalties are waived. */
  latePenaltyPointsLost: number;
  lateCount: number;
  modeUsed: 'quick' | 'assignments';
  currentAveragePercent: number | null;
  requiredPercentOnRemaining: number | null;
  pointsEarnedSoFar: number;
  pointsGradedSoFar: number;
  pointsRemainingPool: number;
  pointsNeededFromRemaining: number | null;
  reachable: boolean;
  plainSummary: string;
}

export interface PaceDaysResult {
  totalRemainingMinutes: number;
  daysByPace: Record<CatchUpPace, number>;
  dueSoonestTasks: Assignment[];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

const inRange = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;

// Whether work with this due date is already past it, by the clock.
export function isPastDue(a: Pick<Assignment, 'dueDate' | 'dueTime'>, now: Date): boolean {
  const today = formatLocalDate(now);
  if (a.dueDate < today) return true;
  if (a.dueDate === today && a.dueTime) return parseHHMM(a.dueTime) < minutesOfDay(now);
  return false;
}

export function computeCatchUpGradeMath(params: {
  targetGrade: number;
  assignments: Assignment[];
  quickCurrentPercent?: number;
  quickRemainingWeight?: number;
  /** Percent off late work, by course id. Courses left out have the penalty waived. */
  latePenaltyByCourse?: Record<string, number>;
  /** The time to judge "already past due" by. Without it, only plannedLateIds count as late. */
  now?: Date;
  /** Tasks the plan would finish after their due date. */
  plannedLateIds?: ReadonlySet<string>;
  /** How the class is graded in Canvas (weights, drop rules), when the Canvas tool brought it in. */
  grading?: CourseGrading;
}): GradeMathResult {
  const { targetGrade, assignments, quickCurrentPercent, quickRemainingWeight, latePenaltyByCourse, now, plannedLateIds, grading } =
    params;

  // Quick mode: your overall percent in the gradebook plus how much of the course is still ungraded.
  if (inRange(quickCurrentPercent, 0, 100) && inRange(quickRemainingWeight, 0.1, 100)) {
    const completedWeight = 100 - quickRemainingWeight;
    const earnedWeighted = (quickCurrentPercent * completedWeight) / 100;
    const neededWeighted = targetGrade - earnedWeighted;
    const requiredPercent = Math.max(0, round1((neededWeighted / quickRemainingWeight) * 100));
    const reachable = requiredPercent <= 100;

    return {
      latePenaltyPointsLost: 0,
      lateCount: 0,
      modeUsed: 'quick',
      currentAveragePercent: quickCurrentPercent,
      requiredPercentOnRemaining: requiredPercent,
      pointsEarnedSoFar: round1(earnedWeighted),
      pointsGradedSoFar: completedWeight,
      pointsRemainingPool: quickRemainingWeight,
      pointsNeededFromRemaining: Math.max(0, round1(neededWeighted)),
      reachable,
      plainSummary: reachable
        ? `To reach ${targetGrade}%, you need to average about ${requiredPercent}% across the remaining ${quickRemainingWeight}% of the course.`
        : `Reaching ${targetGrade}% would take ${requiredPercent}% on the remaining ${quickRemainingWeight}% of the course. You could try a different target, or ask if extra credit is available.`,
    };
  }

  // A class with category weights or drop rules from Canvas is worked out the way Canvas grades it.
  if (grading && (grading.weighted || grading.groups.some((g) => g.dropLowest > 0 || g.dropHighest > 0))) {
    return weightedGradeMath({ targetGrade, assignments, latePenaltyByCourse, now, plannedLateIds, grading });
  }

  // Assignment mode: add up the points you have earned and the points still to come.
  let pointsEarnedSoFar = 0;
  let pointsGradedSoFar = 0;
  let fullRemainingPoints = 0; // what the unfinished work is worth if handed in on time
  let pointsRemainingPool = 0; // what can still be earned, after late penalties
  let lateCount = 0;

  for (const a of assignments) {
    const maxPts = a.points ?? 0;
    if (maxPts <= 0) continue;
    if (typeof a.earnedPoints === 'number') {
      pointsEarnedSoFar += a.earnedPoints;
      pointsGradedSoFar += maxPts;
    } else if (a.status !== 'done') {
      const penalty = Math.min(100, Math.max(0, latePenaltyByCourse?.[a.courseId] ?? 0));
      const late = penalty > 0 && ((now !== undefined && isPastDue(a, now)) || Boolean(plannedLateIds?.has(a.id)));
      fullRemainingPoints += maxPts;
      pointsRemainingPool += late ? round1((maxPts * (100 - penalty)) / 100) : maxPts;
      if (late) lateCount++;
    }
  }
  const latePenaltyPointsLost = round1(fullRemainingPoints - pointsRemainingPool);

  const totalCoursePoints = pointsGradedSoFar + fullRemainingPoints;
  if (totalCoursePoints <= 0) {
    return {
      latePenaltyPointsLost: 0,
      lateCount: 0,
      modeUsed: 'assignments',
      currentAveragePercent: null,
      requiredPercentOnRemaining: null,
      pointsEarnedSoFar: 0,
      pointsGradedSoFar: 0,
      pointsRemainingPool: 0,
      pointsNeededFromRemaining: null,
      reachable: true,
      plainSummary:
        'Enter your overall percent above, or add point values and your scores to your assignments, to see the exact math.',
    };
  }

  const currentAveragePercent = pointsGradedSoFar > 0 ? round1((pointsEarnedSoFar / pointsGradedSoFar) * 100) : null;
  const pointsNeededFromRemaining = Math.max(0, round1((targetGrade / 100) * totalCoursePoints - pointsEarnedSoFar));
  const requiredPercentOnRemaining =
    pointsRemainingPool > 0 ? Math.max(0, round1((pointsNeededFromRemaining / pointsRemainingPool) * 100)) : 0;
  const reachable = pointsNeededFromRemaining <= pointsRemainingPool;

  let plainSummary: string;
  if (pointsRemainingPool <= 0) {
    plainSummary =
      fullRemainingPoints > 0
        ? 'Late penalties leave no points you can still earn, so the grade can only stay where it is. Asking about the late policy could change that.'
        : `All ${totalCoursePoints} points are already graded.`;
  } else if (reachable) {
    plainSummary = `You need ${pointsNeededFromRemaining} of the remaining ${pointsRemainingPool} points (about ${requiredPercentOnRemaining}%) to finish at ${targetGrade}%.`;
  } else {
    plainSummary = `Finishing at ${targetGrade}% would take ${pointsNeededFromRemaining} points, and only ${pointsRemainingPool} are left. You could try a different target, or ask if extra credit is available.`;
  }

  if (latePenaltyPointsLost > 0) {
    plainSummary += ` Late penalties take away ${latePenaltyPointsLost} points across ${lateCount} task${lateCount === 1 ? '' : 's'}.`;
  }

  return {
    latePenaltyPointsLost,
    lateCount,
    modeUsed: 'assignments',
    currentAveragePercent,
    requiredPercentOnRemaining,
    pointsEarnedSoFar,
    pointsGradedSoFar,
    pointsRemainingPool,
    pointsNeededFromRemaining,
    reachable,
    plainSummary,
  };
}

// The same answers for a class graded by category weights (or with drop rules), in percentage points of the grade.
// Every remaining task adds its share of the grade, so the score needed on the remaining work is a straight line.
function weightedGradeMath(params: {
  targetGrade: number;
  assignments: Assignment[];
  latePenaltyByCourse?: Record<string, number>;
  now?: Date;
  plannedLateIds?: ReadonlySet<string>;
  grading: CourseGrading;
}): GradeMathResult {
  const { targetGrade, assignments, latePenaltyByCourse, now, plannedLateIds, grading } = params;
  const graded = (a: Assignment) => typeof a.earnedPoints === 'number';
  const all = buildGradeBook(assignments, grading, {
    assumedScore: 0,
    roleOf: (a) => (graded(a) ? 'graded' : a.status !== 'done' ? 'remaining' : null),
  });
  const soFar = buildGradeBook(assignments, grading, { assumedScore: 0, roleOf: (a) => (graded(a) ? 'graded' : null) });
  if (!all) {
    return {
      latePenaltyPointsLost: 0,
      lateCount: 0,
      modeUsed: 'assignments',
      currentAveragePercent: null,
      requiredPercentOnRemaining: null,
      pointsEarnedSoFar: 0,
      pointsGradedSoFar: 0,
      pointsRemainingPool: 0,
      pointsNeededFromRemaining: null,
      reachable: true,
      plainSummary:
        'Enter your overall percent above, or add point values and your scores to your assignments, to see the exact math.',
    };
  }

  let pointsEarnedSoFar = 0;
  let pointsGradedSoFar = 0;
  let pointsRemainingPool = 0;
  let fullRemainingPoints = 0;
  let poolPercent = 0;
  let fullPoolPercent = 0;
  let lateCount = 0;
  for (const a of assignments) {
    const pts = a.points ?? 0;
    if (pts <= 0 || all.droppedIds.has(a.id)) continue;
    if (graded(a)) {
      pointsEarnedSoFar += a.earnedPoints ?? 0;
      pointsGradedSoFar += pts;
    } else if (a.status !== 'done') {
      const penalty = Math.min(100, Math.max(0, latePenaltyByCourse?.[a.courseId] ?? 0));
      const late = penalty > 0 && ((now !== undefined && isPastDue(a, now)) || Boolean(plannedLateIds?.has(a.id)));
      const keep = late ? (100 - penalty) / 100 : 1;
      const value = pts * all.valuePerPoint(a);
      fullRemainingPoints += pts;
      pointsRemainingPool += round1(pts * keep);
      fullPoolPercent += value;
      poolPercent += value * keep;
      if (late) lateCount++;
    }
  }
  const latePenaltyPointsLost = round1(fullRemainingPoints - pointsRemainingPool);
  const neededPercent = Math.max(0, targetGrade - all.percent);
  const requiredPercentOnRemaining = poolPercent > 0 ? Math.max(0, round1((neededPercent / poolPercent) * 100)) : 0;
  const reachable = neededPercent <= poolPercent + 1e-9;
  const how = all.weighted ? 'With the category weights from Canvas, y' : 'Y';

  let plainSummary: string;
  if (poolPercent <= 0) {
    plainSummary =
      fullPoolPercent > 0
        ? 'Late penalties leave no points you can still earn, so the grade can only stay where it is. Asking about the late policy could change this.'
        : 'Everything in this class that counts is already graded.';
  } else if (neededPercent <= 0) {
    plainSummary = `You are on track for ${targetGrade}% even if nothing else is turned in.`;
  } else if (reachable) {
    plainSummary = `${how}ou need about ${requiredPercentOnRemaining}% on the remaining work to finish at ${targetGrade}%.`;
  } else {
    plainSummary = `Finishing at ${targetGrade}% would take about ${requiredPercentOnRemaining}% on the remaining work, more than full marks. You could try a different target, or ask if extra credit is available.`;
  }
  if (latePenaltyPointsLost > 0) {
    plainSummary += ` Late penalties take away ${latePenaltyPointsLost} points across ${lateCount} task${lateCount === 1 ? '' : 's'}.`;
  }
  if (all.droppedIds.size > 0) {
    plainSummary += ` Canvas's drop rules leave out ${all.droppedIds.size} low score${all.droppedIds.size === 1 ? '' : 's'}.`;
  }

  return {
    latePenaltyPointsLost,
    lateCount,
    modeUsed: 'assignments',
    currentAveragePercent: soFar ? round1(soFar.percent) : null,
    requiredPercentOnRemaining,
    pointsEarnedSoFar,
    pointsGradedSoFar,
    pointsRemainingPool,
    pointsNeededFromRemaining: all.weighted ? null : round1((neededPercent * all.totalPoints) / 100),
    reachable,
    plainSummary,
  };
}

// Days needed at each pace, plus the "due soonest" list. Unfinished work whose date has passed is
// included on purpose, because the person chose Catch Up to clear it (A39, A40).
// Pass `today` to look only at work due within the horizon.
export function computeCatchUpPaces(
  assignments: Assignment[],
  options: { today?: string; horizonDays?: number; minutesByPace?: Record<CatchUpPace, number> } = {},
): PaceDaysResult {
  const { today, horizonDays = CATCH_UP_HORIZON_DAYS, minutesByPace } = options;
  const perDay = (pace: CatchUpPace): number => minutesByPace?.[pace] ?? PACE_MINUTES_PER_DAY[pace].minutes;
  const active = assignments
    .filter((a) => a.status !== 'done' && !a.notNow)
    .filter((a) => !today || dayDiff(today, a.dueDate) <= horizonDays)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const totalRemainingMinutes = active.reduce(
    (sum, a) => sum + Math.max(0, a.estimateMinutes - (a.minutesLogged ?? 0)),
    0,
  );

  const days = (pace: CatchUpPace): number =>
    totalRemainingMinutes > 0 ? Math.max(1, Math.ceil(totalRemainingMinutes / perDay(pace))) : 0;

  return {
    totalRemainingMinutes,
    daysByPace: { aggressive: days('aggressive'), normal: days('normal'), chill: days('chill') },
    dueSoonestTasks: active,
  };
}
