import { Assignment, SchoolBreak } from '../../shared/data/schemas';
import { dayDiff } from '../../shared/clock/clockLogic';
import { addDays } from '../calendar/calendarLogic';
import { isPastDue } from './catchUp';
import { breakOn } from './termLogic';

// Small helpers for the catch-up deadline and late work. Plain local math on this device (A36).

export function daysUntil(date: string, today: string): number {
  return dayDiff(today, date);
}

// Number of days from today to the date (both included) that are not break days.
export function studyDaysBetween(today: string, date: string, breaks: SchoolBreak[]): number {
  const span = dayDiff(today, date);
  if (span < 0) return 0;
  let count = 0;
  for (let i = 0; i <= span; i++) if (!breakOn(addDays(today, i), breaks)) count++;
  return count;
}

// A score of 0 on work worth points that Canvas does not show as turned in. Gradebooks often put a 0 on work that was
// never turned in without marking it missing, so such a 0 is treated like work not turned in yet. A 0 on work that was
// turned in is a real grade.
export function isZeroScore(a: Assignment): boolean {
  return a.earnedPoints === 0 && (a.points ?? 0) > 0 && !a.canvas?.submittedAt;
}

// Canvas no longer takes this work: its lock date ("available until") has passed.
export function closedOnCanvas(a: Assignment, now: Date): boolean {
  if (!a.canvas?.lockAt) return false;
  const lock = new Date(a.canvas.lockAt);
  return !Number.isNaN(lock.getTime()) && lock.getTime() <= now.getTime();
}

// Late work you could still turn in: past its due date, and either not turned in or scored 0.
export function lateOpenWork(assignments: Assignment[], now: Date): Assignment[] {
  return assignments.filter((a) => {
    if (a.notNow || !isPastDue(a, now)) return false;
    if (isZeroScore(a)) return true;
    return a.status !== 'done' && typeof a.earnedPoints !== 'number';
  });
}

// Late work that cannot go in the plan: classes that do not accept late work, and late tasks you took out.
export function unavailableLateIds(
  assignments: Assignment[],
  now: Date,
  latePenaltyByCourse: Record<string, number>,
  skippedIds: readonly string[],
): Set<string> {
  const skipped = new Set(skippedIds);
  const out = new Set<string>();
  for (const a of lateOpenWork(assignments, now)) {
    if ((latePenaltyByCourse[a.courseId] ?? 0) >= 100 || skipped.has(a.id)) out.add(a.id);
  }
  return out;
}

export type AssignmentGroup = 'late' | 'upcoming' | 'turnedIn' | 'notNow';

// Which list an assignment sits in, in the Late work dropdown.
// late: past due and not turned in, or scored 0. upcoming: not due yet and not turned in.
// turnedIn: finished or scored above 0. notNow: set aside with Not now.
export function assignmentGroup(a: Assignment, now: Date): AssignmentGroup {
  if (a.notNow) return 'notNow';
  // A redo the instructor asked for is work to do again.
  const notTurnedIn = isZeroScore(a) || Boolean(a.canvas?.redo) || (a.status !== 'done' && typeof a.earnedPoints !== 'number');
  if (!notTurnedIn) return 'turnedIn';
  return isPastDue(a, now) ? 'late' : 'upcoming';
}

// What you chose in the dropdown, turned into two sets for the math.
// unavailable: work that cannot go in the plan (you took it out, or it is late in a class that does not take late work).
// reopened: work counted as still to do even though it has a score or is finished (a 0 you will turn in late, or work
// you chose to redo). Saved assignments are never changed.
export function planChoices(
  assignments: Assignment[],
  now: Date,
  latePenaltyByCourse: Record<string, number>,
  skippedIds: readonly string[],
  addedIds: readonly string[],
): { unavailable: Set<string>; reopened: Set<string> } {
  const skipped = new Set(skippedIds);
  const added = new Set(addedIds);
  const unavailable = new Set<string>();
  const reopened = new Set<string>();
  for (const a of assignments) {
    const group = assignmentGroup(a, now);
    if (group === 'notNow') continue;
    // Late work in a class that does not take it, or work Canvas has closed, cannot go in the plan.
    const blocked = (isPastDue(a, now) && (latePenaltyByCourse[a.courseId] ?? 0) >= 100) || closedOnCanvas(a, now);
    if (group === 'turnedIn') {
      if (added.has(a.id) && !blocked) reopened.add(a.id);
      continue;
    }
    if (blocked || skipped.has(a.id)) unavailable.add(a.id);
    else if (isZeroScore(a) || (a.canvas?.redo && (a.status === 'done' || typeof a.earnedPoints === 'number'))) reopened.add(a.id);
  }
  return { unavailable, reopened };
}

// For the math only: a 0 you plan to turn in late counts as work still to do, not as a final grade.
// The saved assignment is never changed.
export function reopenZeros(assignments: Assignment[], ids: ReadonlySet<string>): Assignment[] {
  return assignments.map((a) =>
    ids.has(a.id) ? { ...a, earnedPoints: undefined, status: 'todo' as const, minutesLogged: 0 } : a,
  );
}
