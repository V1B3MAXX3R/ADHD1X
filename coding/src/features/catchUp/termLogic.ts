import { AggressiveHours, BlockName, Course, SchoolBreak, Term } from '../../shared/data/schemas';
import { dayDiff } from '../../shared/clock/clockLogic';
import { CatchUpPace, PACE_MINUTES_PER_DAY } from './catchUp';

// Plain local logic for the school term: last day, breaks and the Aggressive pace blocks. Nothing here talks to Gemini.

export const BLOCK_ORDER: BlockName[] = ['Morning', 'Evening', 'Night'];
export const DEFAULT_AGGRESSIVE_HOURS: AggressiveHours = { Morning: 1.5, Evening: 1.5, Night: 1 };
/** The smallest daily amount the Aggressive pace can be, so a plan always has room to move. */
export const MIN_AGGRESSIVE_MINUTES = 30;

// ---------------------------------------------------------------- last day

// The term's last day: the one you set, or else the latest end date among your classes. Null when neither exists.
export function termLastDay(term: Pick<Term, 'lastDay'>, courses: Pick<Course, 'endDate'>[]): string | null {
  if (term.lastDay) return term.lastDay;
  const ends = courses.map((c) => c.endDate).filter((d): d is string => !!d);
  return ends.length > 0 ? ends.reduce((a, b) => (a > b ? a : b)) : null;
}

export interface TermStatus {
  lastDay: string | null;
  /** Whole days from today to the last day. 0 means the last day is today. Negative means it has passed. */
  daysLeft: number | null;
  over: boolean;
}

export function termStatus(lastDay: string | null, today: string): TermStatus {
  if (!lastDay) return { lastDay: null, daysLeft: null, over: false };
  const daysLeft = dayDiff(today, lastDay);
  return { lastDay, daysLeft, over: daysLeft < 0 };
}

// ------------------------------------------------------------------- breaks

export function breakOn(date: string, breaks: SchoolBreak[]): SchoolBreak | undefined {
  return breaks.find((b) => date >= b.start && date <= b.end);
}

export function validBreak(b: { start: string; end: string }): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(b.start) && /^\d{4}-\d{2}-\d{2}$/.test(b.end) && b.start <= b.end;
}

// ------------------------------------------------------ Aggressive pace blocks

export function aggressiveMinutes(hours: AggressiveHours): number {
  const total = BLOCK_ORDER.reduce((sum, b) => sum + Math.round((hours[b] ?? 0) * 60), 0);
  return Math.max(MIN_AGGRESSIVE_MINUTES, total);
}

// Minutes a day holds at each pace. Normal and Chill are fixed; Aggressive follows the hours you chose.
export function minutesByPace(hours: AggressiveHours = DEFAULT_AGGRESSIVE_HOURS): Record<CatchUpPace, number> {
  return {
    aggressive: aggressiveMinutes(hours),
    normal: PACE_MINUTES_PER_DAY.normal.minutes,
    chill: PACE_MINUTES_PER_DAY.chill.minutes,
  };
}

export interface DaySlot {
  block?: BlockName;
  minutes: number;
}

// The parts one study day is cut into. Only the Aggressive pace uses blocks: Morning, then Evening, then Night.
export function daySlots(pace: CatchUpPace, hours: AggressiveHours = DEFAULT_AGGRESSIVE_HOURS): DaySlot[] {
  if (pace !== 'aggressive') return [{ minutes: PACE_MINUTES_PER_DAY[pace].minutes }];
  const slots = BLOCK_ORDER.map((block) => ({ block, minutes: Math.round((hours[block] ?? 0) * 60) })).filter(
    (s) => s.minutes > 0,
  );
  const total = slots.reduce((sum, s) => sum + s.minutes, 0);
  if (total >= MIN_AGGRESSIVE_MINUTES) return slots;
  // Everything was set to (nearly) zero: keep one small Morning block so the plan still works.
  return [{ block: 'Morning', minutes: MIN_AGGRESSIVE_MINUTES }];
}

export function hoursLabel(minutes: number): string {
  return `${Math.round((minutes / 60) * 100) / 100}`;
}
