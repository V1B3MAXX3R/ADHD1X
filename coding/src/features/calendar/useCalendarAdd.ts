import { useApp } from '../../app/AppContext';
import { CalendarItem } from '../../shared/data/schemas';
import { CalendarAddPlan, planCalendarAdd } from './calendarLogic';

// Does what planCalendarAdd works out: creates the courses the calendar names and adds the assignments.
// Only runs when the person taps a button for it (A4).
export function useCalendarAdd() {
  const { courses, assignments, upsertCourse, upsertAssignment, saveCalendarBatch } = useApp();

  // Writes the courses and assignments, and returns the items marked as added. The caller saves the items.
  const commit = async (items: CalendarItem[]): Promise<{ updated: CalendarItem[]; plan: CalendarAddPlan }> => {
    const plan = planCalendarAdd(items, courses, assignments, () => crypto.randomUUID(), new Date().toISOString());
    for (const c of plan.newCourses) await upsertCourse(c);
    const done = new Map<string, string>();
    for (const a of plan.additions) {
      await upsertAssignment(a.assignment);
      done.set(a.item.id, a.assignment.id);
    }
    const updated = items.map((i) =>
      done.has(i.id) ? { ...i, status: 'added' as const, isNew: false, assignmentId: done.get(i.id) } : i,
    );
    return { updated, plan };
  };

  const commitAndSave = async (items: CalendarItem[]) => {
    const result = await commit(items);
    const changed = result.updated.filter((u, i) => u !== items[i]);
    if (changed.length > 0) await saveCalendarBatch(changed);
    return result;
  };

  return { commit, commitAndSave };
}

export function describeAdd(plan: CalendarAddPlan): string {
  const parts: string[] = [];
  parts.push(`Added ${plan.additions.length} assignment${plan.additions.length === 1 ? '' : 's'} to your study plan`);
  if (plan.newCourses.length > 0) parts.push(`created ${plan.newCourses.length === 1 ? 'the course' : 'the courses'} ${plan.newCourses.map((c) => c.name).join(', ')}`);
  let text = parts.join(' and ') + '.';
  if (plan.needCourse.length > 0) {
    text += ` ${plan.needCourse.length} did not name a course, so they are still in the list for you to add.`;
  }
  return text;
}
