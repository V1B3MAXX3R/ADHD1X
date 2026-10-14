import { BlockName, ManualMove, Settings } from '../../shared/data/schemas';

// Plain local helpers for the Gemini features: cleaning up what comes back, and the built-in
// versions used when AI Mode is off or Gemini is unavailable.

// ---- Brain dump (A94) ----------------------------------------------------------------------------

export function splitBrainDump(text: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of text.split(/\n|;|,/)) {
    const title = part.replace(/^[-*\d.)\s]+/, '').trim().slice(0, 120);
    const key = title.toLowerCase();
    if (title && !seen.has(key)) {
      seen.add(key);
      items.push(title);
    }
    if (items.length >= 30) break;
  }
  return items;
}

// ---- Website personalizer ---------------------------------------------------------------------------

// Built-in keyword match. Only settings the description clearly mentions are included, so nothing else changes.
export function buildVibeFallback(description: string): Partial<Settings> {
  const t = description.toLowerCase();
  const patch: Partial<Settings> = {};
  if (/\b(calm|low[- ]?stim\w*|headache\w*|minimal|quiet|overwhelm\w*|sensory)\b/.test(t)) patch.theme = 'low';
  if (/\b(dark|dim|night|eyes?)\b/.test(t)) patch.dim = true;
  if (/\b(space|planets?|ship|galaxy|rocket)\b/.test(t)) patch.interfaceStyle = 'space';
  if (/(no|hide|hidden|without).{0,15}(timer|countdown|numbers?)|(numbers?|countdown).{0,25}(stress|anxious|overwhelm)/.test(t))
    patch.timerDisplay = 'bar';
  else if (/(show|want|like).{0,12}(numbers?|minutes)/.test(t)) patch.timerDisplay = 'number';
  if (/\b(short|direct|plain|blunt|brief)\b/.test(t)) patch.tone = 'short';
  else if (/\b(warm|friendly|encouraging)\b/.test(t)) patch.tone = 'warm';
  if (/(reduce|no|stop|turn off|less).{0,12}(motion|animations?)|motion sick/.test(t)) patch.motion = false;
  if (/\b(clutter\w*|too busy|fewer things|simpler screen)\b/.test(t)) patch.fewerOnScreen = true;
  return patch;
}

// ---- Day tuner -----------------------------------------------------------------------------------------

const DAY_TUNER_MAX_TASKS = 6;

// Turns the proposed task order into plan moves. Only tasks that really exist are used, at most six,
// and they are spread across the proposed blocks so one block is not overloaded.
export function buildDayTunerMoves(
  orderedTaskIds: string[],
  knownTaskIds: Set<string>,
  blocks: BlockName[],
): ManualMove[] {
  const ids = [...new Set(orderedTaskIds)].filter((id) => knownTaskIds.has(id)).slice(0, DAY_TUNER_MAX_TASKS);
  const targets: BlockName[] = blocks.length > 0 ? blocks : ['Morning'];
  const perBlock = Math.max(1, Math.ceil(ids.length / targets.length));
  return ids.map((assignmentId, i) => ({
    assignmentId,
    targetBlock: targets[Math.min(targets.length - 1, Math.floor(i / perBlock))],
    position: i % perBlock,
  }));
}

// ---- Milestones ------------------------------------------------------------------------------------------

export interface Milestone {
  title: string;
  dueDate: string;
  estimateMinutes: number;
}

// Keeps only milestones with a real date between today and the due date, in date order.
export function sanitizeMilestones(items: Milestone[], today: string, dueDate: string): Milestone[] {
  return items
    .map((m) => ({
      title: m.title.trim().slice(0, 100),
      dueDate: m.dueDate,
      estimateMinutes: Math.min(240, Math.max(15, Math.round(m.estimateMinutes))),
    }))
    .filter((m) => m.title && /^\d{4}-\d{2}-\d{2}$/.test(m.dueDate) && m.dueDate >= today && m.dueDate <= dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
