import { AggressiveHours, Assignment, BlockName, Course, SchoolBreak, TermMode } from '../../shared/data/schemas';
import { dayDiff } from '../../shared/clock/clockLogic';
import { addDays } from '../calendar/calendarLogic';
import { CATCH_UP_HORIZON_DAYS, CatchUpPace, isPastDue } from './catchUp';
import { breakOn, daySlots } from './termLogic';

// Plain local logic for the Catch Up plan. Nothing here talks to Gemini, and grades never leave the device (A36).

const round1 = (n: number): number => Math.round(n * 10) / 10;

// ---------------------------------------------------------------- what-if scores
// Typed-in "what if" numbers. They change the math on the Catch Up page only, never the saved scores.

export interface WhatIfOverride {
  /** A number replaces the saved value. null means "pretend this is blank". Missing means the saved value. */
  earnedPoints?: number | null;
  points?: number | null;
}
export type WhatIfOverrides = Record<string, WhatIfOverride>;

export function applyWhatIf(list: Assignment[], overrides: WhatIfOverrides): Assignment[] {
  return list.map((a) => {
    const o = overrides[a.id];
    if (!o) return a;
    return {
      ...a,
      earnedPoints: 'earnedPoints' in o ? (o.earnedPoints ?? undefined) : a.earnedPoints,
      points: 'points' in o ? (o.points ?? undefined) : a.points,
    };
  });
}

// Records one typed value. Typing the saved value again removes the what-if, so the count of changes stays honest.
export function withOverride(
  overrides: WhatIfOverrides,
  a: Assignment,
  field: 'earnedPoints' | 'points',
  entered: number | undefined,
): WhatIfOverrides {
  const next: WhatIfOverrides = { ...overrides };
  const current: WhatIfOverride = { ...(next[a.id] ?? {}) };
  if (entered === a[field]) delete current[field];
  else current[field] = entered ?? null;
  if (Object.keys(current).length === 0) delete next[a.id];
  else next[a.id] = current;
  return next;
}

// ------------------------------------------------------------------ class choice

// Several classes can be planned together. An empty list means the older single choice, or every class.
export function resolveSelectedCourseIds(
  catchUp: { selectedCourseId: string; selectedCourseIds?: string[] },
  courses: Pick<Course, 'id'>[],
): string[] {
  const existing = new Set(courses.map((c) => c.id));
  const chosen = (catchUp.selectedCourseIds ?? []).filter((id) => existing.has(id));
  if (chosen.length > 0) return chosen;
  if (catchUp.selectedCourseId !== 'all' && existing.has(catchUp.selectedCourseId)) return [catchUp.selectedCourseId];
  return courses.map((c) => c.id);
}

export function latePenaltyMap(courses: Pick<Course, 'id' | 'latePenaltyPercent'>[]): Record<string, number> {
  return Object.fromEntries(courses.map((c) => [c.id, c.latePenaltyPercent ?? 0]));
}

// ------------------------------------------------------------------- study plan

export interface PlanItem {
  assignment: Assignment;
  minutes: number;
  /** True when there is more of this task still to do after this piece. */
  continues: boolean;
  /** Morning, Evening or Night. Only the Aggressive pace cuts a day into blocks. */
  block?: BlockName;
}
export interface PlanDay {
  date: string;
  items: PlanItem[];
  minutes: number;
}
export interface PlannedAfterDue {
  assignment: Assignment;
  finishDate: string;
  penaltyPercent: number;
  pointsLost: number;
}
export interface CatchUpPlan {
  days: PlanDay[];
  taskCount: number;
  totalMinutes: number;
  finishDate: string | null;
  /** Tasks that would finish after their due date (or already have), with what a late penalty would cost. */
  afterDue: PlannedAfterDue[];
  afterDueIds: Set<string>;
  /** True when the plan was cut off because it ran past the longest plan this page makes. */
  truncated: boolean;
  /** True when the plan finishes after the term's last day. Null when there is no last day to compare with. */
  pastLastDay: boolean | null;
  /** Days with no study planned because they fall in a school break, between today and the finish. */
  breakDaysSkipped: number;
  /** True when the days are cut into Morning, Evening and Night blocks (Aggressive pace). */
  usesBlocks: boolean;
  /** The day each planned task is finished, and the day it is started. */
  finishById: Map<string, string>;
  startById: Map<string, string>;
}

export const MAX_PLAN_DAYS = 366;

// The days that can hold study, in order, starting today. Break days are left out, so plans jump over them.
export function listStudyDates(today: string, breaks: SchoolBreak[] = []): string[] {
  const out: string[] = [];
  for (let i = 0; out.length < MAX_PLAN_DAYS && i < MAX_PLAN_DAYS * 6; i++) {
    const date = addDays(today, i);
    if (!breakOn(date, breaks)) out.push(date);
  }
  return out;
}

// One plan across the classes you picked: each task keeps its own due date and class, each day holds the chosen
// pace, and big tasks are split across days. Unfinished work from earlier dates is included on purpose,
// because the person chose Catch Up to clear it (A39, A40).
export function buildCatchUpPlan(
  assignments: Assignment[],
  options: {
    today: string;
    pace: CatchUpPace;
    latePenaltyByCourse?: Record<string, number>;
    horizonDays?: number;
    now?: Date;
    /** Hours per block on the Aggressive pace. */
    aggressiveHours?: AggressiveHours;
    /** Days with no study planned. */
    breaks?: SchoolBreak[];
    /** Midterms and finals plan exams ahead of other work that is due on or after the first exam. */
    mode?: TermMode;
    /** The term's last day, used only to say whether the plan fits before it. */
    lastDay?: string | null;
    /** The study days to use, from listStudyDates. Passing them saves work when many plans are built. */
    studyDates?: string[];
    /**
     * Plan by due date: work not yet due starts this many days before its due date (so next month's work is not
     * pulled into this week), work that must be done to stay on time goes first, then work past its due date one class
     * at a time, then the rest by due date. Leave it out for the plain order (due soonest first, as early as possible).
     */
    leadDays?: number;
    /** A daily amount in minutes, in place of the pace's (used to work out how many hours a goal would take). */
    minutesPerDay?: number;
    /**
     * Classes whose C is out of reach. Their work gets the time left over after the other classes' due-date and
     * past-due work, so it never pushes another class behind. Only used when planning by due date.
     */
    lowPriorityCourseIds?: ReadonlySet<string>;
  },
): CatchUpPlan {
  const { today, pace, latePenaltyByCourse, horizonDays = CATCH_UP_HORIZON_DAYS, now, breaks = [], mode = 'regular', lastDay = null, leadDays } = options;
  const slots = options.minutesPerDay !== undefined ? [{ minutes: Math.max(1, options.minutesPerDay) }] : daySlots(pace, options.aggressiveHours);
  const pastDue = (a: Assignment): boolean => (now !== undefined ? isPastDue(a, now) : a.dueDate < today);

  const examMode = mode === 'midterms' || mode === 'finals';
  const open = assignments
    .filter((a) => a.status !== 'done' && !a.notNow)
    .filter((a) => dayDiff(today, a.dueDate) <= horizonDays)
    .map((a) => ({ a, need: Math.max(0, a.estimateMinutes - (a.minutesLogged ?? 0)) }))
    .filter((t) => t.need > 0);
  const examDates = examMode ? open.filter((t) => t.a.type === 'exam').map((t) => t.a.dueDate).sort() : [];
  const firstExam = examDates[0];
  // 0: due before the first exam, 1: exams, 2: other work due on or after the first exam.
  const group = (a: Assignment): number => (firstExam === undefined ? 0 : a.type === 'exam' ? 1 : a.dueDate >= firstExam ? 2 : 0);
  const tasks = open.sort(
    (x, y) =>
      group(x.a) - group(y.a) ||
      x.a.dueDate.localeCompare(y.a.dueDate) ||
      (x.a.dueTime ?? '99:99').localeCompare(y.a.dueTime ?? '99:99') ||
      (y.a.points ?? 0) - (x.a.points ?? 0) ||
      x.a.name.localeCompare(y.a.name),
  );

  const studyDates = options.studyDates ?? listStudyDates(today, breaks);
  // The first study day each task may be worked on.
  const startIndex = (a: Assignment): number => {
    if (leadDays === undefined || pastDue(a)) return 0;
    const from = addDays(a.dueDate, -leadDays);
    if (from <= today) return 0;
    const i = studyDates.findIndex((d) => d >= from);
    return i === -1 ? studyDates.length : i;
  };
  const pending = tasks.map((t) => ({ a: t.a, need: t.need, start: startIndex(t.a) }));

  const days: PlanDay[] = [];
  const finishById = new Map<string, string>();
  const startById = new Map<string, string>();
  let truncated = false;
  let left = pending.length;

  if (leadDays === undefined) {
    // The plain order: due soonest first, as early as possible.
    for (let dayIndex = 0; left > 0; dayIndex++) {
      if (dayIndex >= studyDates.length) {
        truncated = true;
        break;
      }
      const date = studyDates[dayIndex];
      let day: PlanDay | undefined;
      for (const slot of slots) {
        let room = slot.minutes;
        for (const p of pending) {
          if (room <= 0) break;
          if (p.need <= 0 || p.start > dayIndex) continue;
          const take = Math.min(p.need, room);
          if (!day) {
            day = { date, items: [], minutes: 0 };
            days.push(day);
          }
          day.items.push({ assignment: p.a, minutes: take, continues: take < p.need, block: slot.block });
          day.minutes += take;
          p.need -= take;
          room -= take;
          if (!startById.has(p.a.id)) startById.set(p.a.id, date);
          finishById.set(p.a.id, date);
          if (p.need <= 0) left--;
        }
      }
    }
  } else {
    // By due date. Step 1: for work not yet due, find the latest it can be done and still be on time (working back
    // from each due date), and keep that time free. Step 2: each day, do the work that must be done that day to stay on
    // time, then work past its due date one class at a time, then upcoming work in the week before it is due.
    const capacity = slots.reduce((sum, x) => sum + x.minutes, 0);
    const lastStudyIndexBy = (date: string): number => {
      let lo = 0;
      let hi = studyDates.length - 1;
      let found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (studyDates[mid] <= date) {
          found = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      return found;
    };
    const lowPriority = (p: (typeof pending)[number]): boolean => options.lowPriorityCourseIds?.has(p.a.courseId) ?? false;
    const upcoming = pending.filter((p) => !pastDue(p.a) && !lowPriority(p));
    const leftover = pending.filter(lowPriority);
    // Past-due work is kept class by class (oldest first inside each class), with the minutes each class has left.
    const overdueByClass = new Map<string, typeof pending>();
    const overdueLeft = new Map<string, number>();
    for (const p of pending) {
      if (!pastDue(p.a) || lowPriority(p)) continue;
      const list = overdueByClass.get(p.a.courseId);
      if (list) list.push(p);
      else overdueByClass.set(p.a.courseId, [p]);
      overdueLeft.set(p.a.courseId, (overdueLeft.get(p.a.courseId) ?? 0) + p.need);
    }
    const reserved = new Array<number>(studyDates.length).fill(0);
    for (const p of [...upcoming].sort((x, y) => y.a.dueDate.localeCompare(x.a.dueDate))) {
      let need = p.need;
      for (let d = lastStudyIndexBy(p.a.dueDate); d >= 0 && need > 0; d--) {
        const take = Math.min(need, capacity - reserved[d]);
        reserved[d] += take;
        need -= take;
      }
    }

    let required = 0;
    let doneUpcoming = 0;
    for (let dayIndex = 0; left > 0; dayIndex++) {
      if (dayIndex >= studyDates.length) {
        truncated = true;
        break;
      }
      const date = studyDates[dayIndex];
      required += reserved[dayIndex];
      let day: PlanDay | undefined;
      let slotIndex = 0;
      let slotRoom = slots[0].minutes;
      // Works on one task for up to `limit` minutes of today, moving through the day's blocks.
      const work = (p: (typeof pending)[number], limit: number): number => {
        let taken = 0;
        while (taken < limit && p.need > 0 && slotIndex < slots.length) {
          const t = Math.min(p.need, slotRoom, limit - taken);
          if (!day) {
            day = { date, items: [], minutes: 0 };
            days.push(day);
          }
          day.items.push({ assignment: p.a, minutes: t, continues: t < p.need, block: slots[slotIndex].block });
          day.minutes += t;
          p.need -= t;
          slotRoom -= t;
          taken += t;
          if (!startById.has(p.a.id)) startById.set(p.a.id, date);
          finishById.set(p.a.id, date);
          if (p.need <= 0) left--;
          if (slotRoom <= 0) {
            slotIndex++;
            slotRoom = slotIndex < slots.length ? slots[slotIndex].minutes : 0;
          }
        }
        return taken;
      };
      const dayFull = () => slotIndex >= slots.length;

      let mustDo = Math.max(0, required - doneUpcoming);
      for (const p of upcoming) {
        if (mustDo <= 0 || dayFull()) break;
        if (p.need <= 0) continue;
        const t = work(p, mustDo);
        mustDo -= t;
        doneUpcoming += t;
      }
      // Past-due work, one class at a time: the class with the least of it left goes first, so each class is caught up
      // as soon as it can be, and a class that is nearly there is not held back by a class with a lot to do.
      while (!dayFull()) {
        let next: string | undefined;
        for (const [courseId, mins] of overdueLeft) if (mins > 0 && (next === undefined || mins < overdueLeft.get(next)!)) next = courseId;
        if (next === undefined) break;
        let moved = 0;
        for (const p of overdueByClass.get(next) ?? []) {
          if (dayFull()) break;
          if (p.need > 0) moved += work(p, Infinity);
        }
        overdueLeft.set(next, moved > 0 ? Math.max(0, overdueLeft.get(next)! - moved) : 0);
      }
      // Classes whose C is out of reach get the time that is left: their oldest work first.
      for (const p of leftover) {
        if (dayFull()) break;
        if (p.need > 0 && p.start <= dayIndex) work(p, Infinity);
      }
      for (const p of upcoming) {
        if (dayFull()) break;
        if (p.need > 0 && p.start <= dayIndex) doneUpcoming += work(p, Infinity);
      }
    }
  }

  const afterDue: PlannedAfterDue[] = [];
  const afterDueIds = new Set<string>();
  for (const t of tasks) {
    const finishDate = finishById.get(t.a.id);
    if (finishDate === undefined) continue;
    const late = finishDate > t.a.dueDate || (finishDate === today && now !== undefined && isPastDue(t.a, now));
    if (!late) continue;
    const penaltyPercent = latePenaltyByCourse?.[t.a.courseId] ?? 0;
    afterDueIds.add(t.a.id);
    afterDue.push({
      assignment: t.a,
      finishDate,
      penaltyPercent,
      pointsLost: round1(((t.a.points ?? 0) * penaltyPercent) / 100),
    });
  }

  const last = days.length > 0 ? days[days.length - 1] : undefined;
  const finishDate = last ? last.date : null;
  let breakDaysSkipped = 0;
  if (finishDate) for (let d = today; d <= finishDate; d = addDays(d, 1)) if (breakOn(d, breaks)) breakDaysSkipped++;
  return {
    days,
    taskCount: finishById.size,
    totalMinutes: days.reduce((sum, d) => sum + d.minutes, 0),
    finishDate,
    afterDue,
    afterDueIds,
    truncated,
    pastLastDay: lastDay && finishDate ? finishDate > lastDay : null,
    breakDaysSkipped,
    usesBlocks: slots.some((s) => s.block !== undefined),
    finishById,
    startById,
  };
}

export function planDayLabel(date: string, today: string): string {
  const diff = dayDiff(today, date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
