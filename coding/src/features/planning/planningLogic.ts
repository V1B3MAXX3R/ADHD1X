import { Assignment, BlockName, RecoveryGap } from '../../shared/data/schemas';
import { getDefaultEstimate } from '../../shared/logic/estimates';
import { minutesOfDay, parseHHMM } from '../../shared/clock/clockLogic';

// ---------- Optional energy check (A64) ----------
export type EnergyLevel = 'low' | 'okay' | 'good';

export interface EnergySuggestion {
  blocks: BlockName[];
  starterMinutes: number;
  text: string;
}

// Low suggests one block and the shortest starter. Okay and good keep the blocks the person already picked.
// This is a suggestion only: nothing changes until the person taps to use it, and nothing is kept (A25).
export function suggestForEnergy(level: EnergyLevel, current: BlockName[], usual: BlockName[]): EnergySuggestion {
  const base = current.length > 0 ? current : usual.length > 0 ? usual : (['Morning'] as BlockName[]);
  if (level === 'low') {
    const one = base[0];
    return { blocks: [one], starterMinutes: 2, text: `A lighter day: just ${one} and a 2-minute starter timer.` };
  }
  if (level === 'okay') {
    return { blocks: base, starterMinutes: 5, text: 'Your blocks as they are, with a 5-minute starter timer.' };
  }
  return { blocks: base, starterMinutes: 15, text: 'Your blocks as they are, with a 15-minute starter timer.' };
}

// ---------- Reading time from page count (A89) ----------
export function calculateReadingMinutes(pages: number, minutesPerPage = 2.5): number {
  if (!Number.isFinite(pages) || pages <= 0) return 15;
  const pace = Number.isFinite(minutesPerPage) && minutesPerPage > 0 ? minutesPerPage : 2.5;
  return Math.max(5, Math.ceil((pages * pace) / 5) * 5);
}

// ---------- Personal pace from logged time (A90) ----------
// Used only to improve estimates. Needs at least two finished tasks of the type with time logged.
export function personalPace(
  assignments: Assignment[],
  type: Assignment['type'],
): { sampleCount: number; averageMinutes: number; defaultMinutes: number; multiplier: number } | null {
  const logged = assignments.filter((a) => a.status === 'done' && a.type === type && a.minutesLogged > 0);
  if (logged.length < 2) return null;
  const averageMinutes = Math.round(logged.reduce((sum, a) => sum + a.minutesLogged, 0) / logged.length);
  const defaultMinutes = getDefaultEstimate(type);
  const ratio = averageMinutes / Math.max(1, defaultMinutes);
  return {
    sampleCount: logged.length,
    averageMinutes,
    defaultMinutes,
    multiplier: Math.min(2, Math.max(0.5, Math.round(ratio * 100) / 100)),
  };
}

// ---------- Definition of done ----------
// Uses the checklist from "Make it clear" when there is one; otherwise a short plain list for the task type.
export function buildDefinitionOfDone(a: Pick<Assignment, 'type' | 'name' | 'checklist'>): string[] {
  const fromChecklist = (a.checklist ?? []).map((c) => c.text).filter(Boolean).slice(0, 5);
  if (fromChecklist.length > 0) return fromChecklist;
  switch (a.type) {
    case 'essay':
      return [
        'Your draft answers the main question in the prompt.',
        'Required sources or examples are included.',
        'The file is saved in the requested format and uploaded.',
      ];
    case 'lab':
    case 'project':
      return [
        'Every required step runs or works without errors.',
        'Any screenshots, output or notes the instructions ask for are included.',
        'The file is saved and submitted.',
      ];
    case 'discussion':
      return [
        'You wrote a few clear sentences that answer the prompt.',
        'You included one connection to this week’s material.',
        'You clicked Post (and replied to a classmate if it is required).',
      ];
    case 'reading':
      return [
        'You read the assigned part, or skimmed the headings, intro and conclusion.',
        'You wrote down one thing you learned and one question.',
      ];
    case 'quiz':
    case 'exam':
      return [
        'You answered every question, even with your best guess.',
        'You checked that nothing is left blank.',
        'You clicked Submit.',
      ];
    default:
      return [
        `Every required part of ${a.name} has an answer.`,
        'You did one quick scan of the file name and format.',
        'You clicked Submit.',
      ];
  }
}

// ---------- Recovery gap after draining events (Lever L7) ----------
export interface ActiveRecovery {
  title: string;
  endTime: string;
  untilMinutes: number;
}

// The gap in effect at this moment, if any. Uses the device clock.
export function activeRecoveryGap(gaps: RecoveryGap[], now: Date): ActiveRecovery | null {
  const weekday = now.getDay();
  const minutes = minutesOfDay(now);
  for (const g of gaps) {
    if (!g.days.includes(weekday)) continue;
    const end = parseHHMM(g.endTime);
    if (minutes >= end && minutes < end + g.minutes) {
      return { title: g.title, endTime: g.endTime, untilMinutes: end + g.minutes };
    }
  }
  return null;
}

export function formatMinutesAsHHMM(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------- Two long days in a row (A41) ----------
export function previousDate(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
