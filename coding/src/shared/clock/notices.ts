import { Assignment, BlockName, Settings } from '../data/schemas';
import { blockAt, dayDiff, formatDueIn, formatLocalDate, isQuietTime, minutesOfDay, parseHHMM } from './clockLogic';

export interface ClockNotice {
  id: string;
  message: string;
}

const MAX_DUE_NOTICES = 3;
const HEADS_UP_MINUTES = 5;

// Gentle in-app notices driven by the clock. Only the ones the person turned on, and none during
// quiet hours. Each id includes the day, so a dismissed notice stays dismissed for that day (A5, A25).
// Wording follows the Tone setting: "warm" or "short".
export function getClockNotices(
  now: Date,
  settings: Settings,
  assignments: Assignment[],
  studyBlocks: BlockName[] = settings.usualBlocks,
): ClockNotice[] {
  const minutes = minutesOfDay(now);
  if (isQuietTime(settings.quietStart, settings.quietEnd, minutes)) return [];

  const today = formatLocalDate(now);
  const short = settings.tone === 'short';
  const notices: ClockNotice[] = [];

  if (settings.headsUp) {
    const current = blockAt(settings.blockWindows, minutes);
    if (current && studyBlocks.includes(current)) {
      const left = parseHHMM(settings.blockWindows[current].end) - minutes;
      if (left > 0 && left <= HEADS_UP_MINUTES) {
        notices.push({
          id: `ends-${today}-${current}`,
          message: short
            ? `${current} block ends in ${left} min.`
            : `Heads-up: your ${current} block wraps up in about ${left} minute${left === 1 ? '' : 's'}.`,
        });
      }
    }
  }

  if (settings.dueReminders) {
    const soon = assignments
      .filter((a) => {
        if (a.status === 'done' || a.notNow) return false;
        const diff = dayDiff(today, a.dueDate);
        return diff >= 0 && diff <= settings.daysAhead;
      })
      .sort((a, b) => `${a.dueDate}${a.dueTime ?? ''}`.localeCompare(`${b.dueDate}${b.dueTime ?? ''}`));
    for (const a of soon.slice(0, MAX_DUE_NOTICES)) {
      const when = formatDueIn(a.dueDate, a.dueTime, now);
      notices.push({
        id: `due-${today}-${a.id}`,
        message: short ? `${a.name}: ${when}.` : `Coming up: ${a.name}, ${when}.`,
      });
    }
    if (soon.length > MAX_DUE_NOTICES) {
      const more = soon.length - MAX_DUE_NOTICES;
      notices.push({
        id: `due-${today}-more`,
        message: `${more} more due in the next ${settings.daysAhead} day${settings.daysAhead === 1 ? '' : 's'}.`,
      });
    }
  }

  return notices;
}
