import { Assignment } from '../../shared/data/schemas';

// "Where was I?" note (A62) and session goal (A91). Both are optional, short, and stay on this
// device. They are never sent to Gemini (A15, A36). Nothing here counts, scores or tracks streaks (A5, A25).

export const MAX_NOTE_LENGTH = 280;
export const MAX_GOAL_LENGTH = 200;

export type SessionOutcome = 'done' | 'partly' | 'notYet';

export const OUTCOME_CHOICES: ReadonlyArray<readonly [SessionOutcome, string]> = [
  ['done', 'Done'],
  ['partly', 'Partly'],
  ['notYet', 'Not yet'],
];

// One plain line: trims, turns line breaks into spaces and cuts to the limit. Empty becomes undefined.
export function cleanLine(text: string, max: number): string | undefined {
  const line = text.replace(/\s+/g, ' ').trim().slice(0, max).trim();
  return line === '' ? undefined : line;
}

// Unfinished tasks that have a note, soonest due first.
export function getNotedAssignments(assignments: Assignment[]): Assignment[] {
  return assignments
    .filter((a) => a.status !== 'done' && !a.notNow && Boolean(a.note?.trim()))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
}

// Whole minutes worked in a session. "Keep going" adds earlier time (workedSeconds) to the current timer.
export function minutesWorked(workedSeconds: number, totalSeconds: number, secondsRemaining: number): number {
  const current = Math.max(0, totalSeconds - secondsRemaining);
  return Math.max(0, Math.round((Math.max(0, workedSeconds) + current) / 60));
}
