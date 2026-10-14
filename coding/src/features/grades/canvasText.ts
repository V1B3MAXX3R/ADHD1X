import { Assignment } from '../../shared/data/schemas';

const day = (iso: string): string | null => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Short plain phrases for what Canvas says about an assignment, for the details view.
export function describeCanvasAssignment(a: Assignment, now: Date): string[] {
  const c = a.canvas;
  if (!c) return [];
  const out: string[] = [];
  if (c.missing) out.push('marked missing');
  if (c.submittedAt) {
    const d = day(c.submittedAt);
    out.push(`turned in${d ? ` ${d}` : ''}${c.late ? ', late' : ''}`);
  } else if (c.late) out.push('marked late');
  if (c.pointsDeducted && c.pointsDeducted > 0) out.push(`${c.pointsDeducted} points taken off for being late`);
  if (c.redo) out.push('your instructor asked for a redo');
  if (c.lockAt) {
    const d = day(c.lockAt);
    if (d) out.push(new Date(c.lockAt).getTime() <= now.getTime() ? `closed on ${d}` : `open until ${d}`);
  }
  if (c.allowedAttempts !== undefined && c.allowedAttempts > 0) {
    out.push(`${c.attempt ?? 0} of ${c.allowedAttempts} attempts used`);
  }
  return out;
}

// A Canvas link that is safe to show: https only. Saved data can come back from a backup file, so it is checked again
// here, not just on import.
export function safeLink(url: string | undefined): { href: string; host: string } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.username && !u.password ? { href: u.toString(), host: u.hostname } : null;
  } catch {
    return null;
  }
}
