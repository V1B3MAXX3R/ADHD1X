import { Assignment } from '../../shared/data/schemas';
import { dayDiff } from '../../shared/clock/clockLogic';

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

export function computeCatchUpGradeMath(params: {
  targetGrade: number;
  assignments: Assignment[];
  quickCurrentPercent?: number;
  quickRemainingWeight?: number;
}): GradeMathResult {
  const { targetGrade, assignments, quickCurrentPercent, quickRemainingWeight } = params;

  // Quick mode: your overall percent in the gradebook plus how much of the course is still ungraded.
  if (inRange(quickCurrentPercent, 0, 100) && inRange(quickRemainingWeight, 0.1, 100)) {
    const completedWeight = 100 - quickRemainingWeight;
    const earnedWeighted = (quickCurrentPercent * completedWeight) / 100;
    const neededWeighted = targetGrade - earnedWeighted;
    const requiredPercent = Math.max(0, round1((neededWeighted / quickRemainingWeight) * 100));
    const reachable = requiredPercent <= 100;

    return {
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

  // Assignment mode: add up the points you have earned and the points still to come.
  let pointsEarnedSoFar = 0;
  let pointsGradedSoFar = 0;
  let pointsRemainingPool = 0;

  for (const a of assignments) {
    const maxPts = a.points ?? 0;
    if (maxPts <= 0) continue;
    if (typeof a.earnedPoints === 'number') {
      pointsEarnedSoFar += a.earnedPoints;
      pointsGradedSoFar += maxPts;
    } else if (a.status !== 'done') {
      pointsRemainingPool += maxPts;
    }
  }

  const totalCoursePoints = pointsGradedSoFar + pointsRemainingPool;
  if (totalCoursePoints <= 0) {
    return {
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
    plainSummary = `All ${totalCoursePoints} points are already graded.`;
  } else if (reachable) {
    plainSummary = `You need ${pointsNeededFromRemaining} of the remaining ${pointsRemainingPool} points (about ${requiredPercentOnRemaining}%) to finish at ${targetGrade}%.`;
  } else {
    plainSummary = `Finishing at ${targetGrade}% would take ${pointsNeededFromRemaining} points, and only ${pointsRemainingPool} are left. You could try a different target, or ask if extra credit is available.`;
  }

  return {
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

// Days needed at each pace, plus the "due soonest" list. Unfinished work whose date has passed is
// included on purpose, because the person chose Catch Up to clear it (A39, A40).
// Pass `today` to look only at work due within the horizon.
export function computeCatchUpPaces(
  assignments: Assignment[],
  options: { today?: string; horizonDays?: number } = {},
): PaceDaysResult {
  const { today, horizonDays = CATCH_UP_HORIZON_DAYS } = options;
  const active = assignments
    .filter((a) => a.status !== 'done' && !a.notNow)
    .filter((a) => !today || dayDiff(today, a.dueDate) <= horizonDays)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const totalRemainingMinutes = active.reduce(
    (sum, a) => sum + Math.max(0, a.estimateMinutes - (a.minutesLogged ?? 0)),
    0,
  );

  const days = (pace: CatchUpPace): number =>
    totalRemainingMinutes > 0 ? Math.max(1, Math.ceil(totalRemainingMinutes / PACE_MINUTES_PER_DAY[pace].minutes)) : 0;

  return {
    totalRemainingMinutes,
    daysByPace: { aggressive: days('aggressive'), normal: days('normal'), chill: days('chill') },
    dueSoonestTasks: active,
  };
}
