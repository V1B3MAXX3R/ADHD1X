import { describe, expect, it } from 'vitest';
import { parseIcs, guessAssignmentType, splitCourseFromTitle } from '../../src/features/calendar/icsParser';
import {
  addDays,
  buildAssignmentFromItem,
  getNewAssignments,
  getUpcomingByDay,
  matchCourse,
  mergeImport,
} from '../../src/features/calendar/calendarLogic';
import { AssignmentSchema, CalendarItem, Course } from '../../src/shared/data/schemas';

const FAKE_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:event-assignment-1001',
  'SUMMARY:Essay 1 [CIS 101]',
  'DTSTART:20261020T235900',
  'DESCRIPTION:Write 500 words about\\, well\\, anything.\\nUse a clear thesis.',
  'BEGIN:VALARM',
  'DESCRIPTION:Reminder text that must be ignored',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-calendar-event-2002',
  'SUMMARY:Study group',
  'DTSTART;VALUE=DATE:20261021',
  'RRULE:FREQ=WEEKLY',
  'END:VEVENT',
  'BEGIN:VTODO',
  'UID:todo-3003',
  'SUMMARY:Read chapter 3',
  'DUE;TZID=America/Los_Angeles:20261022T170000',
  'END:VTODO',
  'BEGIN:VEVENT',
  'UID:no-date-4004',
  'SUMMARY:Broken item',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:folded-5005',
  'SUMMARY:A very long quiz tit',
  ' le that was folded',
  'DTSTART:20261023T090000',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('Calendar file reader (.ics)', () => {
  const { entries, skipped } = parseIcs(FAKE_ICS);
  const byUid = (uid: string) => entries.find((e) => e.uid === uid)!;

  it('reads every dated item and skips items with no date', () => {
    expect(entries).toHaveLength(4);
    expect(skipped).toBe(1);
  });

  it('splits the course from a Canvas-style title and reads text escapes', () => {
    const essay = byUid('event-assignment-1001');
    expect(essay.title).toBe('Essay 1');
    expect(essay.courseName).toBe('CIS 101');
    expect(essay.kind).toBe('assignment');
    expect(essay.date).toBe('2026-10-20');
    expect(essay.time).toBe('23:59');
    expect(essay.description).toBe('Write 500 words about, well, anything.\nUse a clear thesis.');
  });

  it('treats all-day items as having no time and flags repeats', () => {
    const study = byUid('event-calendar-event-2002');
    expect(study.kind).toBe('event');
    expect(study.date).toBe('2026-10-21');
    expect(study.time).toBeUndefined();
    expect(study.repeats).toBe(true);
  });

  it('reads to-do items using their due date and joins folded lines', () => {
    expect(byUid('todo-3003')).toMatchObject({ kind: 'assignment', date: '2026-10-22', time: '17:00' });
    expect(byUid('folded-5005').title).toBe('A very long quiz title that was folded');
  });

  it('shows UTC times in the viewer\'s own time zone', () => {
    const utc = parseIcs(
      'BEGIN:VEVENT\nUID:z-1\nSUMMARY:Quiz 2\nDTSTART:20261020T180000Z\nEND:VEVENT',
    ).entries[0];
    const local = new Date(Date.UTC(2026, 9, 20, 18, 0, 0));
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(utc.date).toBe(`${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`);
    expect(utc.time).toBe(`${pad(local.getHours())}:${pad(local.getMinutes())}`);
  });

  it('returns nothing for text that is not a calendar', () => {
    expect(parseIcs('hello world').entries).toEqual([]);
  });

  it('guesses assignment types and titles', () => {
    expect(guessAssignmentType('Week 3 Discussion')).toBe('discussion');
    expect(guessAssignmentType('Midterm')).toBe('exam');
    expect(guessAssignmentType('Reflection')).toBe('other');
    expect(splitCourseFromTitle('No course here')).toEqual({ title: 'No course here' });
  });
});

const makeItem = (patch: Partial<CalendarItem>): CalendarItem => ({
  id: 'event-assignment-1001',
  title: 'Essay 1',
  courseName: 'CIS 101',
  kind: 'assignment',
  date: '2026-10-20',
  time: '23:59',
  repeats: false,
  importedAt: '2026-10-13T00:00:00Z',
  isNew: true,
  status: 'open',
  ...patch,
});

describe('Calendar import logic', () => {
  const parsed = parseIcs(FAKE_ICS).entries;

  it('marks first-time items as new and keeps earlier choices when imported again', () => {
    const first = mergeImport([], parsed, '2026-10-13T00:00:00Z');
    expect(first).toMatchObject({ created: 4, updated: 0 });
    expect(first.items.every((i) => i.isNew && i.status === 'open')).toBe(true);

    const saved = first.items.map((i) =>
      i.id === 'todo-3003' ? { ...i, status: 'hidden' as const, isNew: false } : i,
    );
    const again = mergeImport(saved, parsed, '2026-10-14T00:00:00Z');
    expect(again).toMatchObject({ created: 0, updated: 4 });
    expect(again.items.find((i) => i.id === 'todo-3003')).toMatchObject({ status: 'hidden', isNew: false });
  });

  it('lists only new, open, upcoming assignments not already in the list', () => {
    const items = [
      makeItem({}),
      makeItem({ id: 'old', date: '2026-10-01' }),
      makeItem({ id: 'seen', isNew: false }),
      makeItem({ id: 'ev', kind: 'event' }),
      makeItem({ id: 'hid', status: 'hidden' }),
    ];
    const names = getNewAssignments(items, [], '2026-10-13').map((i) => i.id);
    expect(names).toEqual(['event-assignment-1001']);

    const course: Course = { id: 'c1', name: 'CIS 101', isMajor: true, createdAt: '2026-10-13T00:00:00Z' };
    const added = buildAssignmentFromItem(items[0], course.id, '2026-10-13T00:00:00Z', 'a1');
    expect(getNewAssignments(items, [added], '2026-10-13')).toEqual([]);
  });

  it('groups the next 14 days by date and leaves out hidden or later items', () => {
    const items = [
      makeItem({ id: 'a', date: '2026-10-14', time: '10:00' }),
      makeItem({ id: 'b', date: '2026-10-14', time: '08:00' }),
      makeItem({ id: 'c', date: '2026-10-27' }),
      makeItem({ id: 'd', date: '2026-10-28' }),
      makeItem({ id: 'e', date: '2026-10-15', status: 'hidden' }),
    ];
    const days = getUpcomingByDay(items, '2026-10-13');
    expect(days.map((d) => d.date)).toEqual(['2026-10-14', '2026-10-27']);
    expect(days[0].items.map((i) => i.id)).toEqual(['b', 'a']);
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('matches a calendar course name to an existing course', () => {
    const courses: Course[] = [
      { id: 'c1', name: 'CIS 101 Intro to Computing', isMajor: true, createdAt: '2026-10-13T00:00:00Z' },
      { id: 'c2', name: 'ENG 1A', isMajor: false, createdAt: '2026-10-13T00:00:00Z' },
    ];
    expect(matchCourse('CIS 101', courses)?.id).toBe('c1');
    expect(matchCourse('MATH 5', courses)).toBeUndefined();
    expect(matchCourse(undefined, courses)).toBeUndefined();
  });

  it('builds a valid assignment from a calendar item', () => {
    const a = buildAssignmentFromItem(makeItem({ title: 'Quiz 2' }), 'c1', '2026-10-13T00:00:00Z', 'a1');
    expect(AssignmentSchema.safeParse(a).success).toBe(true);
    expect(a).toMatchObject({ type: 'quiz', source: 'calendar', calendarId: 'event-assignment-1001', dueDate: '2026-10-20' });
  });
});
