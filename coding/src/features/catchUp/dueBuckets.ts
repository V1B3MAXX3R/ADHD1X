import { Assignment } from '../../shared/data/schemas';
import { dayDiff } from '../../shared/clock/clockLogic';
import { isPastDue } from './catchUp';

// Groups unfinished work by its own due date, so each assignment is shown where it really falls.
// Calm, neutral wording on purpose (A5).

export type DueBucket = 'overdue' | 'thisWeek' | 'nextWeek' | 'beforeGoal' | 'afterGoal';

export const DUE_BUCKETS: { key: DueBucket; title: string }[] = [
  { key: 'overdue', title: 'Past its due date' },
  { key: 'thisWeek', title: 'Due in the next 7 days' },
  { key: 'nextWeek', title: 'Due the week after' },
  { key: 'beforeGoal', title: 'Due later, by your goal date' },
  { key: 'afterGoal', title: 'Due after your goal date' },
];

/** Work due more than this many days ago is from an earlier term, so Catch Up leaves it out. */
export const CURRENT_WORK_DAYS = 180;

export function isCurrentWork(a: Pick<Assignment, 'dueDate'>, today: string): boolean {
  return dayDiff(a.dueDate, today) <= CURRENT_WORK_DAYS;
}

export function dueBucket(a: Assignment, today: string, now: Date, goalDate: string): DueBucket {
  if (isPastDue(a, now)) return 'overdue';
  if (a.dueDate > goalDate) return 'afterGoal';
  const days = dayDiff(today, a.dueDate);
  if (days <= 6) return 'thisWeek';
  if (days <= 13) return 'nextWeek';
  return 'beforeGoal';
}

export interface DueGroup {
  key: DueBucket;
  title: string;
  items: Assignment[];
  /** Minutes still to do, from the time guesses. */
  minutes: number;
  points: number;
}

const minutesLeft = (a: Assignment): number => Math.max(0, a.estimateMinutes - (a.minutesLogged ?? 0));

export function groupByDueDate(items: Assignment[], today: string, now: Date, goalDate: string): DueGroup[] {
  const groups = DUE_BUCKETS.map((b) => ({ ...b, items: [] as Assignment[], minutes: 0, points: 0 }));
  const byKey = new Map(groups.map((g) => [g.key, g]));
  for (const a of items) {
    const g = byKey.get(dueBucket(a, today, now, goalDate))!;
    g.items.push(a);
    g.minutes += minutesLeft(a);
    g.points += a.points ?? 0;
  }
  for (const g of groups) {
    g.items.sort(
      (x, y) =>
        x.dueDate.localeCompare(y.dueDate) ||
        (x.dueTime ?? '99:99').localeCompare(y.dueTime ?? '99:99') ||
        x.name.localeCompare(y.name),
    );
  }
  return groups;
}
