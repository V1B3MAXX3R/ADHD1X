import { BlockName, BlockWindows } from '../data/schemas';

// All times are the device's local time. Pure functions: pass the time in, nothing reads the clock here.

const pad = (n: number): string => String(n).padStart(2, '0');

export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "YYYY-MM-DDTHH:MM", the format the day-plan engine takes as `now`.
export function toLocalIso(d: Date): string {
  return `${formatLocalDate(d)}T${formatLocalTime(d)}`;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function msUntilNextMinute(d: Date): number {
  return 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50;
}

export function format12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${suffix}`;
}

export function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function blockAt(windows: BlockWindows, minutes: number): BlockName | null {
  for (const name of ['Morning', 'Evening', 'Night'] as BlockName[]) {
    const w = windows[name];
    if (minutes >= parseHHMM(w.start) && minutes < parseHHMM(w.end)) return name;
  }
  return null;
}

export function formatClockLabel(d: Date): string {
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${date} • ${format12h(formatLocalTime(d))}`;
}

export function dayDiff(fromDate: string, toDate: string): number {
  const epoch = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
  };
  return epoch(toDate) - epoch(fromDate);
}

function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function weekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
}

// Neutral wording on purpose: no "overdue" or "late" (A5).
export function formatDueIn(dueDate: string, dueTime: string | undefined, now: Date): string {
  const diff = dayDiff(formatLocalDate(now), dueDate);
  const at = dueTime ? ` at ${format12h(dueTime)}` : '';
  if (diff < 0) return `was due ${shortDate(dueDate)}`;
  if (diff === 0) {
    if (dueTime && parseHHMM(dueTime) < minutesOfDay(now)) return `was due today${at}`;
    return `due today${at}`;
  }
  if (diff === 1) return `due tomorrow${at}`;
  if (diff < 7) return `due ${weekday(dueDate)}${at}`;
  return `due ${shortDate(dueDate)}${at}`;
}

export interface NowDescription {
  headline: string;
  detail: string;
}

// The "Right now" line on Today.
export function describeNow(
  windows: BlockWindows,
  selectedBlocks: BlockName[],
  minutes: number,
): NowDescription {
  const current = blockAt(windows, minutes);
  if (current) {
    const left = parseHHMM(windows[current].end) - minutes;
    if (selectedBlocks.includes(current)) {
      return {
        headline: `You're in your ${current} block`,
        detail: `${formatDuration(left)} left, until ${format12h(windows[current].end)}.`,
      };
    }
    return {
      headline: `It's ${current} time`,
      detail: `${current} isn't one of today's study blocks.`,
    };
  }
  const next = (['Morning', 'Evening', 'Night'] as BlockName[])
    .filter((b) => selectedBlocks.includes(b) && parseHHMM(windows[b].start) > minutes)
    .sort((a, b) => parseHHMM(windows[a].start) - parseHHMM(windows[b].start))[0];
  if (next) {
    return {
      headline: 'Between study blocks',
      detail: `Next: ${next} at ${format12h(windows[next].start)}, in ${formatDuration(parseHHMM(windows[next].start) - minutes)}.`,
    };
  }
  return { headline: 'No more study blocks today', detail: 'Your plan for tomorrow will be ready then.' };
}

// Quiet hours can wrap past midnight (for example 20:00 to 06:00).
export function isQuietTime(quietStart: string, quietEnd: string, minutes: number): boolean {
  const s = parseHHMM(quietStart);
  const e = parseHHMM(quietEnd);
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}
