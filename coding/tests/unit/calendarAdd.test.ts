import { describe, expect, it } from 'vitest';
import { parseIcs } from '../../src/features/calendar/icsParser';
import {
  buildAssignmentFromItem,
  MAX_ASSIGNMENT_NAME,
  PlanItem,
  planCalendarAdd,
} from '../../src/features/calendar/calendarLogic';
import { AssignmentSchema, Course } from '../../src/shared/data/schemas';

let n = 0;
const makeId = () => `id-${++n}`;
const NOW = '2026-10-13T00:00:00Z';

const item = (over: Partial<PlanItem>): PlanItem => ({
  id: 'e1',
  title: 'Quiz 1',
  courseName: 'ENG 1A',
  kind: 'assignment',
  date: '2026-10-20',
  ...over,
});

const course = (name: string): Course => ({ id: `c-${name}`, name, isMajor: false, createdAt: NOW });

describe('Adding calendar assignments automatically', () => {
  it('creates the course the calendar names, once, and adds every assignment for it', () => {
    const plan = planCalendarAdd(
      [item({ id: 'a' }), item({ id: 'b', title: 'Essay 1' }), item({ id: 'c', title: 'Lab', courseName: 'CIS 101' })],
      [],
      [],
      makeId,
      NOW,
    );
    expect(plan.newCourses.map((c) => c.name)).toEqual(['ENG 1A', 'CIS 101']);
    expect(plan.additions).toHaveLength(3);
    const eng = plan.newCourses[0].id;
    expect(plan.additions.filter((a) => a.assignment.courseId === eng)).toHaveLength(2);
  });

  it('uses a course you already have instead of making a second one', () => {
    const plan = planCalendarAdd([item({ courseName: 'ENG 1A FA26' })], [course('ENG 1A')], [], makeId, NOW);
    expect(plan.newCourses).toEqual([]);
    expect(plan.additions[0].assignment.courseId).toBe('c-ENG 1A');
  });

  it('treats short or oddly written course names as one course, not several', () => {
    const plan = planCalendarAdd(
      [item({ id: 'a', courseName: 'AB' }), item({ id: 'b', courseName: 'ab' }), item({ id: 'c', courseName: 'A-B' })],
      [],
      [],
      makeId,
      NOW,
    );
    expect(plan.newCourses).toHaveLength(1);
    expect(plan.additions).toHaveLength(3);
  });

  it('never adds events, and leaves assignments with no course named for the person to place', () => {
    const plan = planCalendarAdd(
      [item({ id: 'ev', kind: 'event' }), item({ id: 'nc', courseName: undefined })],
      [],
      [],
      makeId,
      NOW,
    );
    expect(plan.additions).toEqual([]);
    expect(plan.newCourses).toEqual([]);
    expect(plan.needCourse.map((i) => i.id)).toEqual(['nc']);
  });

  it('skips assignments that are already in your assignments', () => {
    const first = planCalendarAdd([item({ id: 'a' })], [], [], makeId, NOW);
    const again = planCalendarAdd([item({ id: 'a' })], first.newCourses, [first.additions[0].assignment], makeId, NOW);
    expect(again.alreadyIn).toBe(1);
    expect(again.additions).toEqual([]);
    expect(again.newCourses).toEqual([]);
  });

  it('shortens long titles so the saved data and backups stay valid', () => {
    const long = 'x'.repeat(190);
    const a = buildAssignmentFromItem({ id: 'l', title: long, date: '2026-10-20' }, 'c1', NOW, 'a1');
    expect(a.name).toHaveLength(MAX_ASSIGNMENT_NAME);
    expect(AssignmentSchema.safeParse(a).success).toBe(true);
  });

  it('works on a real Canvas-style file: course in brackets, assignments told apart from events', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:event-assignment-111',
      'SUMMARY:Week 3 Quiz [ENG 1A]',
      'DTSTART;VALUE=DATE:20261020',
      'URL;VALUE=URI:https://canvas.example.edu/courses/1/assignments/111',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:event-calendar-event-222',
      'SUMMARY:Study group [ENG 1A]',
      'DTSTART:20261021T180000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:event-assignment-333',
      'SUMMARY:Lab 2 [CIS 101]',
      'DTSTART;VALUE=DATE:20261022',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const entries = parseIcs(ics).entries.map((e) => ({
      id: e.uid,
      title: e.title,
      courseName: e.courseName,
      kind: e.kind,
      date: e.date,
      time: e.time,
      description: e.description,
    }));
    const plan = planCalendarAdd(entries, [], [], makeId, NOW);
    expect(plan.newCourses.map((c) => c.name).sort()).toEqual(['CIS 101', 'ENG 1A']);
    expect(plan.additions.map((a) => a.assignment.name).sort()).toEqual(['Lab 2', 'Week 3 Quiz']);
    expect(plan.additions.every((a) => AssignmentSchema.safeParse(a.assignment).success)).toBe(true);
  });
});
