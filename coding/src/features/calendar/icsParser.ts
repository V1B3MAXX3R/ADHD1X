import { AssignmentType } from '../../shared/data/schemas';

export interface ParsedCalendarEntry {
  uid: string;
  title: string;
  courseName?: string;
  kind: 'assignment' | 'event';
  date: string;
  time?: string;
  description?: string;
  repeats: boolean;
}

export interface ParseResult {
  entries: ParsedCalendarEntry[];
  skipped: number;
}

interface Prop {
  name: string;
  params: string;
  value: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function unescapeText(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

function parseLine(line: string): Prop | null {
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ':' && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon < 1) return null;
  const left = line.slice(0, colon);
  const semi = left.indexOf(';');
  return {
    name: (semi === -1 ? left : left.slice(0, semi)).toUpperCase(),
    params: semi === -1 ? '' : left.slice(semi + 1).toUpperCase(),
    value: line.slice(colon + 1),
  };
}

// Dates ending in Z are UTC and are shown in the viewer's own time. Dates with a time zone name
// or no time zone are used as written.
export function parseIcsDate(value: string, params: string): { date: string; time?: string } | null {
  const v = value.trim();
  if (params.includes('VALUE=DATE') && !params.includes('DATE-TIME') && /^\d{8}$/.test(v)) {
    return { date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` };
  }
  if (/^\d{8}$/.test(v)) return { date: `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (z) {
    const local = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? '0')));
    return {
      date: `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`,
      time: `${pad(local.getHours())}:${pad(local.getMinutes())}`,
    };
  }
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

const ASSIGNMENT_WORDS =
  /\b(due|assignment|homework|quiz|exam|midterm|final|essay|paper|discussion|lab report|project|reading|worksheet)\b/i;

function classifyKind(
  block: 'VEVENT' | 'VTODO',
  uid: string,
  title: string,
  url: string,
): 'assignment' | 'event' {
  if (block === 'VTODO') return 'assignment';
  if (/assignment/i.test(uid) || /\/assignments\//i.test(url)) return 'assignment';
  if (/calendar-event/i.test(uid)) return 'event';
  return ASSIGNMENT_WORDS.test(title) ? 'assignment' : 'event';
}

// Canvas puts the course in square brackets at the end of the title: "Essay 1 [CIS 101]".
export function splitCourseFromTitle(rawTitle: string): { title: string; courseName?: string } {
  const m = rawTitle.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
  if (m && m[1].trim()) return { title: m[1].trim(), courseName: m[2].trim() };
  return { title: rawTitle.trim() };
}

export function guessAssignmentType(title: string): AssignmentType {
  const t = title.toLowerCase();
  if (/\bdiscussion\b/.test(t)) return 'discussion';
  if (/\bquiz\b/.test(t)) return 'quiz';
  if (/\b(exam|midterm|final)\b/.test(t)) return 'exam';
  if (/\b(essay|paper)\b/.test(t)) return 'essay';
  if (/\blab\b/.test(t)) return 'lab';
  if (/\bproject\b/.test(t)) return 'project';
  if (/\breading\b/.test(t)) return 'reading';
  if (/\b(homework|worksheet|assignment)\b/.test(t)) return 'homework';
  return 'other';
}

export function parseIcs(text: string): ParseResult {
  const lines = unfold(text);
  const entries: ParsedCalendarEntry[] = [];
  const usedIds = new Set<string>();
  let skipped = 0;
  let block: 'VEVENT' | 'VTODO' | null = null;
  let props: Prop[] = [];
  let inAlarm = false;

  const finish = () => {
    if (!block) return;
    const get = (name: string) => props.find((p) => p.name === name);
    const summary = get('SUMMARY');
    const when = get('DUE') ?? get('DTSTART');
    const parsed = when ? parseIcsDate(when.value, when.params) : null;
    const rawTitle = summary ? unescapeText(summary.value).trim() : '';
    if (!rawTitle || !parsed) {
      skipped++;
      return;
    }
    const { title, courseName } = splitCourseFromTitle(rawTitle);
    const uidRaw = get('UID')?.value.trim() || `${rawTitle}@${parsed.date}`;
    let id = uidRaw;
    if (usedIds.has(id)) id = `${uidRaw}@${parsed.date}`;
    usedIds.add(id);
    const description = get('DESCRIPTION') ? unescapeText(get('DESCRIPTION')!.value).trim() : '';
    const url = get('URL')?.value ?? '';
    entries.push({
      uid: id,
      title: title.slice(0, 200),
      courseName: courseName?.slice(0, 120),
      kind: classifyKind(block, uidRaw, rawTitle, url),
      date: parsed.date,
      time: parsed.time,
      description: description ? description.slice(0, 2000) : undefined,
      repeats: props.some((p) => p.name === 'RRULE'),
    });
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    const upper = line.trim().toUpperCase();
    if (upper === 'BEGIN:VEVENT' || upper === 'BEGIN:VTODO') {
      block = upper === 'BEGIN:VEVENT' ? 'VEVENT' : 'VTODO';
      props = [];
    } else if (upper === 'END:VEVENT' || upper === 'END:VTODO') {
      finish();
      block = null;
      props = [];
    } else if (upper === 'BEGIN:VALARM') {
      inAlarm = true;
    } else if (upper === 'END:VALARM') {
      inAlarm = false;
    } else if (block && !inAlarm) {
      const p = parseLine(line);
      if (p) props.push(p);
    }
  }
  return { entries, skipped };
}
