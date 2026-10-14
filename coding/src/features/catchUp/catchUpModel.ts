import { Assignment, Course, SchoolBreak, Settings } from '../../shared/data/schemas';
import { addDays } from '../calendar/calendarLogic';
import { CatchUpPace, isPastDue, PACE_MINUTES_PER_DAY } from './catchUp';
import { CGoal, CGoalClass, computeCGoal, realisticC } from './cGoal';
import { daysUntil, lateOpenWork, planChoices, reopenZeros } from './deadline';
import { isCurrentWork } from './dueBuckets';
import { gradeNow, GradeNow } from './gradeBook';
import { buildCatchUpPlan, CatchUpPlan, latePenaltyMap, listStudyDates, resolveSelectedCourseIds } from './studyPlan';
import { aggressiveMinutes, breakOn, termLastDay } from './termLogic';

// The one place Catch Up works everything out, and every section and the Today bar read from it.
// The order is deliberate:
//   1. Each class on its own: its grade now, and the fewest tasks that get it to a C by the end of the term, read
//      from the points (a class that cannot reach a C never blocks the others).
//   2. Those tasks are planned by their own due dates: work that must be done to stay on time first, then work past
//      its due date one class at a time, then each task in the week before it is due.
//   3. The paces are set up from that: due dates, the last day of the term (or your goal date), breaks and the time a
//      day each pace has. Chill and Normal add time when their usual amount would leave a class behind.
// Plain local math on this device. Grades never leave it (A36).

export const PACES_LIGHTEST_FIRST: CatchUpPace[] = ['chill', 'normal', 'aggressive'];
/** Upcoming work is planned in the week before it is due, not pulled weeks ahead. */
export const KEEP_UP_DAYS = 7;
/** How far ahead the C is worked out when the term has no last day. */
export const NO_TERM_END_DAYS = 120;
/** Suggestions never go above this many hours a day; more than this is not realistic. */
export const MAX_SENSIBLE_HOURS = 8;
/** The most Chill and Normal go up to when their usual amount is not enough. Aggressive uses your own hours. */
export const PACE_MAX_MINUTES: Record<'chill' | 'normal', number> = { chill: 120, normal: 210 };

/** How one class does at one pace. */
export interface ClassPace {
  courseId: string;
  name: string;
  /** The day this class's past-due work needed for a C is done. Null when none of it is past due. */
  caughtUpDate: string | null;
  /** This class's needed tasks, not past due yet, that would end up after their due date at this pace. */
  lateIds: string[];
  /** The day this class's last task for a C is done. */
  lastDate: string | null;
  /** True when some of this class's needed work does not fit in the plan at all. */
  unplanned: boolean;
  /** Everything needed fits, nothing new ends up late, and the past-due work is done by the limit. */
  onTrack: boolean;
}

export interface PaceOutcome {
  pace: CatchUpPace;
  minutesPerDay: number;
  /** True when Chill or Normal went above its usual amount so every class keeps up. */
  raised: boolean;
  /** The tasks needed for a C, planned by due date at this pace. */
  cPlan: CatchUpPlan;
  /** All the work, planned the same way. */
  allPlan: CatchUpPlan;
  /** The day the last class is caught up on its past-due work for a C. Null when nothing needed is past due. */
  caughtUpDate: string | null;
  /** Needed tasks that are not past due yet but would be finished after their due date at this pace. */
  lateIds: string[];
  /** True when every needed task fits in the plan (none cut off). */
  allPlanned: boolean;
  /** The last day of work needed for a C. */
  lastDate: string | null;
  /** Every class is on track at this pace. */
  possible: boolean;
  /** The soonest goal date this pace meets: the day its past-due work is done (today when none is past due). */
  earliest: string | null;
  /** Each class at this pace. */
  classes: ClassPace[];
}

/** What one class needs, whatever the pace. */
export interface ClassNeed {
  courseId: string;
  name: string;
  goal: CGoalClass;
  grade: GradeNow | null;
  /** Unfinished tasks needed for a C, their time, and how many are past due. */
  neededCount: number;
  neededMinutes: number;
  overdueCount: number;
  /** Unfinished work in the class that can still be done this term. */
  openCount: number;
}

export type GoalState = 'auto' | 'manual' | 'manualMissing' | 'manualPast';

export interface CatchUpModel {
  selectedIds: string[];
  selectedCourses: Course[];
  /** Ticked classes with work from this term. Catch Up works on these. */
  activeCourses: Course[];
  /** Ticked classes with nothing from this term (an old club, a support page). Left out, and named on the page. */
  inactiveCourses: Course[];
  /** The ticked classes' assignments from this term, as saved. */
  inView: Assignment[];
  /** The same, with 0s you plan to turn in late counted as work still to do. Used for every calculation. */
  workView: Assignment[];
  /** Work that can go in a plan (late work you took out, or that is not accepted or closed, is left out). */
  eligible: Assignment[];
  /** Unfinished work in the ticked classes. */
  openWork: Assignment[];
  lateWork: Assignment[];
  unavailableIds: Set<string>;
  reopenedIds: Set<string>;
  penalties: Record<string, number>;
  termEnd: string | null;
  /** The C is worked out on work due through this many days from today (the term's last day). */
  horizonDays: number;
  /** Each class's C, from the points and your grade now. */
  goal: CGoal;
  /** Each class: its grade now and what it needs. */
  classes: ClassNeed[];
  /** The tasks needed for a C across the ticked classes, and their time. */
  needed: { count: number; minutes: number; overdue: number };
  /** All unfinished work that can still be done, and its time. */
  available: { count: number; minutes: number };
  goalDate: {
    mode: 'auto' | 'manual';
    state: GoalState;
    date: string | null;
    afterTermEnd: boolean;
    onBreak: SchoolBreak | undefined;
  };
  /** The day every class's past-due work for a C should be done by: your goal date, else the term's last day. */
  limit: { date: string; kind: 'goal' | 'termEnd' | 'horizon' };
  /** Needed tasks that cannot be on time at any pace (due too soon for their size). Paces are not judged on them. */
  cannotBeOnTimeIds: Set<string>;
  /** Classes whose C is out of reach. Their work gets the time left over, and no pace is judged on them. */
  outOfReachIds: Set<string>;
  paces: Record<CatchUpPace, PaceOutcome>;
  chosen: CatchUpPace;
  /** The lightest pace that works, when the chosen one does not. */
  recommended: CatchUpPace | null;
  /** The soonest goal date any pace can meet, and which pace. */
  soonest: { pace: CatchUpPace; date: string } | null;
  /** The least time a day that keeps every class on track. 0 when nothing is needed; null when no amount does. */
  minutesNeeded: number | null;
  /** The same in hours, to the half hour. */
  hoursPerDayNeeded: number | null;
}

const minutesLeft = (a: Assignment): number => Math.max(0, a.estimateMinutes - (a.minutesLogged ?? 0));
const isOpen = (a: Assignment): boolean => a.status !== 'done' && !a.notNow && minutesLeft(a) > 0;

export function buildCatchUpModel(input: {
  assignments: Assignment[];
  courses: Course[];
  settings: Pick<Settings, 'catchUp' | 'term' | 'schoolBreaks'>;
  today: string;
  now: Date;
}): CatchUpModel {
  const { assignments, courses, settings, today, now } = input;
  const { catchUp, term, schoolBreaks } = settings;

  // Classes, this term's work, and late work.
  const selectedIds = resolveSelectedCourseIds(catchUp, courses);
  const idSet = new Set(selectedIds);
  const selectedCourses = courses.filter((c) => idSet.has(c.id));
  // Work due more than about six months ago belongs to an earlier term, so it is left out of everything here.
  const inView = assignments.filter((a) => idSet.has(a.courseId) && isCurrentWork(a, today));
  const withWork = new Set(inView.map((a) => a.courseId));
  const activeCourses = selectedCourses.filter((c) => withWork.has(c.id));
  const inactiveCourses = selectedCourses.filter((c) => !withWork.has(c.id));
  const penalties = latePenaltyMap(courses);
  const termEnd = termLastDay(term, courses);
  const lateWork = lateOpenWork(inView, now);
  const { unavailable: unavailableIds, reopened: reopenedIds } = planChoices(
    inView,
    now,
    penalties,
    catchUp.lateSkippedIds,
    catchUp.planAddedIds,
  );
  const workView = reopenZeros(inView, reopenedIds);
  const eligible = workView.filter((a) => !unavailableIds.has(a.id));
  const openWork = workView.filter((a) => a.status !== 'done' && !a.notNow);

  // 1. Each class's C, for the whole term, from the points and your grade now.
  const termOpen = termEnd !== null && daysUntil(termEnd, today) >= 0;
  const horizonDays = termOpen ? daysUntil(termEnd as string, today) : NO_TERM_END_DAYS;
  const horizonEnd = addDays(today, horizonDays);
  const goal = computeCGoal(workView, activeCourses, {
    today,
    now,
    latePenaltyByCourse: penalties,
    horizonDays,
    unavailableIds,
    reopenedIds,
  });
  const essential = eligible.filter((a) => goal.taskIds.has(a.id));
  const overdueIds = new Set(essential.filter((a) => isPastDue(a, now)).map((a) => a.id));
  const availableOpen = eligible.filter((a) => isOpen(a) && a.dueDate <= horizonEnd);

  const classes: ClassNeed[] = goal.classes.map((g) => {
    const mine = essential.filter((a) => a.courseId === g.courseId && isOpen(a));
    const course = activeCourses.find((c) => c.id === g.courseId);
    return {
      courseId: g.courseId,
      name: g.name,
      goal: g,
      grade: course ? gradeNow(course, g.gradedPercent) : null,
      neededCount: mine.length,
      neededMinutes: mine.reduce((s, a) => s + minutesLeft(a), 0),
      overdueCount: mine.filter((a) => overdueIds.has(a.id)).length,
      openCount: availableOpen.filter((a) => a.courseId === g.courseId).length,
    };
  });

  // The goal date: as soon as your pace allows, or a date you pick.
  let state: GoalState = 'auto';
  let goalDate: string | null = null;
  if (catchUp.deadlineMode === 'manual') {
    if (!catchUp.deadline) state = 'manualMissing';
    else if (daysUntil(catchUp.deadline, today) < 0) state = 'manualPast';
    else {
      state = 'manual';
      goalDate = catchUp.deadline;
    }
  }
  // Past-due work should be done by your goal date, else by the term's last day. A goal after the term ends cannot
  // help, since the classes are over by then.
  const limit: CatchUpModel['limit'] =
    goalDate && (!termOpen || goalDate <= (termEnd as string))
      ? { date: goalDate, kind: 'goal' }
      : termOpen
        ? { date: termEnd as string, kind: 'termEnd' }
        : { date: horizonEnd, kind: 'horizon' };

  // 2. Plan by due date. A class whose C is out of reach still gets planned, with the time left over, so it raises its
  // grade without pushing a class that can still reach a C behind.
  const outOfReachIds = new Set(goal.classes.filter((c) => !realisticC(c)).map((c) => c.courseId));
  const studyDates = listStudyDates(today, schoolBreaks);
  const planBase = {
    today,
    latePenaltyByCourse: penalties,
    now,
    aggressiveHours: catchUp.aggressiveHours,
    breaks: schoolBreaks,
    mode: term.mode,
    studyDates,
    horizonDays,
    leadDays: KEEP_UP_DAYS,
    lastDay: limit.date,
    lowPriorityCourseIds: outOfReachIds,
  };
  const planAt = (minutesPerDay: number) => buildCatchUpPlan(essential, { ...planBase, pace: 'normal', minutesPerDay });

  // Needed work that would be late even at the most a day can realistically hold is due too soon for its size. It is
  // planned and shown, but no pace is judged on it.
  const fastest = essential.length > 0 ? planAt(MAX_SENSIBLE_HOURS * 60) : null;
  const cannotBeOnTimeIds = new Set(
    fastest
      ? essential
          .filter(
            (a) =>
              !overdueIds.has(a.id) &&
              !outOfReachIds.has(a.courseId) &&
              (fastest.finishById.get(a.id) ?? '9999-12-31') > a.dueDate,
          )
          .map((a) => a.id)
      : [],
  );

  // How each class does in a plan, and whether every class is on track.
  const judge = (plan: CatchUpPlan) => {
    const per = new Map<string, Omit<ClassPace, 'onTrack'>>(
      goal.classes.map((c) => [
        c.courseId,
        { courseId: c.courseId, name: c.name, caughtUpDate: null, lateIds: [], lastDate: null, unplanned: false },
      ]),
    );
    for (const a of essential) {
      const k = per.get(a.courseId);
      if (!k) continue;
      const finish = plan.finishById.get(a.id);
      if (finish === undefined) {
        k.unplanned = true;
        continue;
      }
      if (!k.lastDate || finish > k.lastDate) k.lastDate = finish;
      if (overdueIds.has(a.id)) {
        if (!k.caughtUpDate || finish > k.caughtUpDate) k.caughtUpDate = finish;
      } else if (finish > a.dueDate && !cannotBeOnTimeIds.has(a.id)) k.lateIds.push(a.id);
    }
    const perClass: ClassPace[] = [...per.values()].map((k) => ({
      ...k,
      onTrack: !k.unplanned && k.lateIds.length === 0 && (k.caughtUpDate === null || k.caughtUpDate <= limit.date),
    }));
    const allPlanned = perClass.every((k) => !k.unplanned);
    const caught = perClass.reduce<string | null>((m, k) => (k.caughtUpDate && (!m || k.caughtUpDate > m) ? k.caughtUpDate : m), null);
    // A class whose C is out of reach is shown, but never makes a pace "not possible".
    const judged = perClass.filter((k) => !outOfReachIds.has(k.courseId));
    return {
      classes: perClass,
      caughtUpDate: allPlanned ? caught : null,
      lateIds: judged.flatMap((k) => k.lateIds),
      allPlanned,
      possible: judged.every((k) => k.onTrack),
    };
  };

  // 3. The least time a day that keeps every class on track (to the next 15 minutes). It sets up Chill and Normal.
  let minutesNeeded: number | null = 0;
  if (essential.some((a) => !outOfReachIds.has(a.courseId))) {
    const works = (m: number): boolean => judge(planAt(m)).possible;
    minutesNeeded = null;
    // Searched in steps of 15 minutes, from 15 minutes up to a whole day.
    const steps = (24 * 60) / 15;
    if (works(steps * 15)) {
      let low = 0;
      let high = steps;
      while (high - low > 1) {
        const mid = (low + high) >> 1;
        if (works(mid * 15)) high = mid;
        else low = mid;
      }
      minutesNeeded = high * 15;
    }
  }

  // Chill and Normal start at their usual amount and go up to their most when the work needs it. Aggressive is the
  // hours you set.
  const modeMinutes = (pace: CatchUpPace): { minutes: number; raised: boolean } => {
    if (pace === 'aggressive') return { minutes: aggressiveMinutes(catchUp.aggressiveHours), raised: false };
    const usual = PACE_MINUTES_PER_DAY[pace].minutes;
    if (minutesNeeded === null || minutesNeeded <= usual) return { minutes: usual, raised: false };
    return { minutes: Math.min(PACE_MAX_MINUTES[pace], minutesNeeded), raised: true };
  };
  const endCap = termOpen ? (termEnd as string) : horizonEnd;

  const outcome = (pace: CatchUpPace): PaceOutcome => {
    const { minutes, raised } = modeMinutes(pace);
    const options = pace === 'aggressive' ? { ...planBase, pace } : { ...planBase, pace, minutesPerDay: minutes };
    const cPlan = buildCatchUpPlan(essential, options);
    const allPlan = buildCatchUpPlan(eligible, options);
    const j = judge(cPlan);
    // The plan does not depend on the goal date, so a pace that keeps up meets any goal from its caught-up day on.
    const keepsUp = j.allPlanned && j.lateIds.length === 0 && (j.caughtUpDate === null || j.caughtUpDate <= endCap);
    return {
      pace,
      minutesPerDay: minutes,
      raised,
      cPlan,
      allPlan,
      caughtUpDate: j.caughtUpDate,
      lateIds: j.lateIds,
      allPlanned: j.allPlanned,
      lastDate: cPlan.finishDate,
      possible: j.possible,
      earliest: keepsUp ? (j.caughtUpDate ?? today) : null,
      classes: j.classes,
    };
  };
  const paces: Record<CatchUpPace, PaceOutcome> = {
    chill: outcome('chill'),
    normal: outcome('normal'),
    aggressive: outcome('aggressive'),
  };

  const chosen = catchUp.pace;
  const recommended = paces[chosen].possible ? null : (PACES_LIGHTEST_FIRST.find((p) => paces[p].possible) ?? null);
  const soonestPace = PACES_LIGHTEST_FIRST.map((p) => ({ pace: p, date: paces[p].earliest }))
    .filter((x): x is { pace: CatchUpPace; date: string } => x.date !== null)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return {
    selectedIds,
    selectedCourses,
    activeCourses,
    inactiveCourses,
    inView,
    workView,
    eligible,
    openWork,
    lateWork,
    unavailableIds,
    reopenedIds,
    penalties,
    termEnd,
    horizonDays,
    goal,
    classes,
    needed: {
      count: classes.reduce((s, c) => s + c.neededCount, 0),
      minutes: classes.reduce((s, c) => s + c.neededMinutes, 0),
      overdue: overdueIds.size,
    },
    available: { count: availableOpen.length, minutes: availableOpen.reduce((s, a) => s + minutesLeft(a), 0) },
    goalDate: {
      mode: catchUp.deadlineMode,
      state,
      date: goalDate,
      afterTermEnd: state === 'manual' && termEnd !== null && goalDate !== null && goalDate > termEnd,
      onBreak: state === 'manual' && goalDate ? breakOn(goalDate, schoolBreaks) : undefined,
    },
    limit,
    cannotBeOnTimeIds,
    outOfReachIds,
    paces,
    chosen,
    recommended,
    soonest: soonestPace ?? null,
    minutesNeeded,
    hoursPerDayNeeded: minutesNeeded === null ? null : Math.ceil(minutesNeeded / 30) / 2,
  };
}
