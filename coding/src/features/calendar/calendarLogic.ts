import { Assignment, CalendarItem, Course } from '../../shared/data/schemas';
import { getDefaultEstimate } from '../../shared/logic/estimates';
import { guessAssignmentType, ParsedCalendarEntry } from './icsParser';

export const MAX_CALENDAR_FILE_BYTES = 4 * 1024 * 1024;
export const UPCOMING_DAYS = 14;

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

export function entryIsInTheFuture(date: string, today: string): boolean {
  return date >= today;
}

// Keeps what the person already decided (added, hidden, seen) and only refreshes title/date/details.
export function mergeImport(
  existing: CalendarItem[],
  picked: ParsedCalendarEntry[],
  importedAt: string,
): { items: CalendarItem[]; created: number; updated: number } {
  const byId = new Map(existing.map((c) => [c.id, c]));
  const items: CalendarItem[] = [];
  let created = 0;
  let updated = 0;
  for (const e of picked) {
    const prev = byId.get(e.uid);
    if (prev) {
      updated++;
      items.push({
        ...prev,
        title: e.title,
        courseName: e.courseName,
        kind: e.kind,
        date: e.date,
        time: e.time,
        description: e.description,
        repeats: e.repeats,
      });
    } else {
      created++;
      items.push({
        id: e.uid,
        title: e.title,
        courseName: e.courseName,
        kind: e.kind,
        date: e.date,
        time: e.time,
        description: e.description,
        repeats: e.repeats,
        importedAt,
        isNew: true,
        status: 'open',
      });
    }
  }
  return { items, created, updated };
}

export function findExistingAssignment(item: CalendarItem, assignments: Assignment[]): Assignment | undefined {
  const name = item.title.trim().toLowerCase();
  return assignments.find(
    (a) => a.calendarId === item.id || (a.dueDate === item.date && a.name.trim().toLowerCase() === name),
  );
}

export function matchCourse(courseName: string | undefined, courses: Course[]): Course | undefined {
  if (!courseName) return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = norm(courseName);
  if (target.length < 3) return undefined;
  return courses.find((c) => {
    const n = norm(c.name);
    return n.length >= 3 && (n.includes(target) || target.includes(n));
  });
}

export function sortByWhen<T extends { date: string; time?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? (a.time ?? '').localeCompare(b.time ?? '') : a.date.localeCompare(b.date),
  );
}

export function getNewAssignments(
  items: CalendarItem[],
  assignments: Assignment[],
  today: string,
): CalendarItem[] {
  return sortByWhen(
    items.filter(
      (c) =>
        c.kind === 'assignment' &&
        c.isNew &&
        c.status === 'open' &&
        entryIsInTheFuture(c.date, today) &&
        !findExistingAssignment(c, assignments),
    ),
  );
}

export interface UpcomingDay {
  date: string;
  items: CalendarItem[];
}

export function getUpcomingByDay(items: CalendarItem[], today: string, days = UPCOMING_DAYS): UpcomingDay[] {
  const last = addDays(today, days);
  const inRange = sortByWhen(
    items.filter((c) => c.status !== 'hidden' && c.date >= today && c.date <= last),
  );
  const groups: UpcomingDay[] = [];
  for (const item of inRange) {
    const g = groups[groups.length - 1];
    if (g && g.date === item.date) g.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}

export function buildAssignmentFromItem(
  item: CalendarItem,
  courseId: string,
  createdAt: string,
  id: string,
): Assignment {
  const type = guessAssignmentType(item.title);
  return {
    id,
    courseId,
    name: item.title,
    type,
    dueDate: item.date,
    dueTime: item.time,
    detailsText: item.description,
    estimateMinutes: getDefaultEstimate(type),
    estimateSource: 'default',
    minutesLogged: 0,
    status: 'todo',
    notNow: false,
    addedLate: false,
    source: 'calendar',
    calendarId: item.id,
    createdAt,
  };
}

export function formatDayHeading(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime12h(time: string | undefined): string {
  if (!time) return 'all day';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
