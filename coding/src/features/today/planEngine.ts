import { Assignment, BlockName, BlockWindows, Course, ManualMove } from '../../shared/data/schemas';
import { getSizeClass, SizeClass } from '../../shared/logic/estimates';

export const PLAN_CONSTANTS = {
  CAPACITY_RATIO: 0.85,
  STEP_MINUTES: 15,
  MIN_SHARE_MINUTES: 15,
  MAX_SHARE_MINUTES: 120,
  SMALL_REMAINING_THRESHOLD: 30,
  HEAVY_BUFFER_THRESHOLD: 180,
  BUFFER_DAYS_NORMAL: 2,
  BUFFER_DAYS_HEAVY: 3,
  LEAD_WINDOW_NORMAL: 7,
  LEAD_WINDOW_HEAVY: 14,
  BREAK_WORK_RUN_MINUTES: 60,
  BREAK_DURATION_MINUTES: 10,
  URGENCY_POINTS_URGENT: 100,
  URGENCY_BASE: 60,
  URGENCY_SLOPE: 6,
  GRADE_POINTS_CAP: 30,
  MAJOR_BONUS_POINTS: 10,
  MAJOR_BONUS_DAYS: 3,
  NIGHT_HEAVY_MAX_DAYS: 2,
  AFTER_HOURS_MINUTES: 20 * 60,
} as const;

export interface PlanPrefs {
  spacingEarly: boolean;
  heavyBlock: 'Morning' | 'Evening';
  majorWeighting: boolean;
  breaks: 'twoPlus' | 'always';
}

export interface PlanEngineInput {
  now: string;
  selectedBlocks: BlockName[];
  blockWindows: BlockWindows;
  usualBlocks: BlockName[];
  assignments: Assignment[];
  courses: Course[];
  prefs: PlanPrefs;
  manualMoves: ManualMove[];
  pinned?: string | null;
}

export interface PlannedSessionItem {
  kind: 'session';
  assignment: Assignment;
  minutesPlanned: number;
  sizeClass: SizeClass;
  urgent: boolean;
  continues: boolean;
}

export interface BreakMarkerItem {
  kind: 'break';
  minutes: number;
}

export type BlockEntry = PlannedSessionItem | BreakMarkerItem;

export interface PlannedBlock {
  block: BlockName;
  windowStart: string;
  windowEnd: string;
  capacityMinutes: number;
  entries: BlockEntry[];
}

export interface ShortfallNotice {
  assignmentId: string;
  assignmentName: string;
  dueDate: string;
  missingHours: number;
  suggestedBlock: BlockName;
}

export interface PlanEngineOutput {
  blocks: PlannedBlock[];
  items: PlannedSessionItem[];
  totals: {
    workMinutes: number;
    breakMinutes: number;
    loadMinutes: number;
  };
  finishTime: string | null;
  notFitting: Assignment[];
  enoughTime: ShortfallNotice | null;
  flags: {
    needsBlocks: boolean;
    needsConfirmAfterHours: boolean;
  };
}

function parseTimeMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function formatTime12h(totalMinutes: number): string {
  const minsInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(minsInDay / 60);
  const m = minsInDay % 60;
  const suffix = h24 >= 12 ? 'pm' : 'am';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function dayEpoch(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

function roundUpTo15(mins: number): number {
  return Math.ceil(mins / 15) * 15;
}

function roundDownTo15(mins: number): number {
  return Math.floor(mins / 15) * 15;
}

const BLOCK_CHRONO_ORDER: BlockName[] = ['Morning', 'Evening', 'Night'];

export function buildDayPlan(input: PlanEngineInput): PlanEngineOutput {
  const [todayDate, nowTimePart = '08:00'] = input.now.split('T');
  const nowMinutes = parseTimeMinutes(nowTimePart.slice(0, 5));
  const todayDays = dayEpoch(todayDate);

  if (nowMinutes >= PLAN_CONSTANTS.AFTER_HOURS_MINUTES) {
    return {
      blocks: [],
      items: [],
      totals: { workMinutes: 0, breakMinutes: 0, loadMinutes: 0 },
      finishTime: null,
      notFitting: [],
      enoughTime: null,
      flags: { needsBlocks: false, needsConfirmAfterHours: true },
    };
  }

  if (input.selectedBlocks.length === 0) {
    return {
      blocks: [],
      items: [],
      totals: { workMinutes: 0, breakMinutes: 0, loadMinutes: 0 },
      finishTime: null,
      notFitting: [],
      enoughTime: null,
      flags: { needsBlocks: true, needsConfirmAfterHours: false },
    };
  }

  const courseMajorMap = new Map<string, boolean>();
  for (const c of input.courses) {
    courseMajorMap.set(c.id, c.isMajor);
  }

  const rawCandidates = input.assignments.filter((a) => {
    if (a.status === 'done' || a.notNow) return false;
    const dueDays = dayEpoch(a.dueDate);
    if (dueDays < todayDays && !a.addedLate) return false;
    return true;
  });

  interface EnrichedCandidate {
    assignment: Assignment;
    remaining: number;
    sizeClass: SizeClass;
    daysToDue: number;
    urgent: boolean;
    daysToL: number;
    inLeadWindow: boolean;
    shareToday: number;
    score: number;
  }

  const enriched: EnrichedCandidate[] = [];

  for (const a of rawCandidates) {
    const remaining = Math.max(0, a.estimateMinutes - (a.minutesLogged ?? 0));
    if (remaining <= 0) continue;

    const sizeClass = getSizeClass(a.estimateMinutes);
    const daysToDue = dayEpoch(a.dueDate) - todayDays;
    let urgent = false;
    if (a.dueTime) {
      const dueTotalMins = daysToDue * 1440 + parseTimeMinutes(a.dueTime);
      const diffMins = dueTotalMins - nowMinutes;
      urgent = diffMins <= 1440;
    } else {
      urgent = daysToDue <= 1;
    }

    const isOver180 = a.estimateMinutes > PLAN_CONSTANTS.HEAVY_BUFFER_THRESHOLD;
    const bufferDays = input.prefs.spacingEarly
      ? isOver180
        ? PLAN_CONSTANTS.BUFFER_DAYS_HEAVY
        : PLAN_CONSTANTS.BUFFER_DAYS_NORMAL
      : 0;

    const daysToL = urgent ? 0 : daysToDue - bufferDays;
    const leadLimit = isOver180
      ? PLAN_CONSTANTS.LEAD_WINDOW_HEAVY
      : PLAN_CONSTANTS.LEAD_WINDOW_NORMAL;
    const inLeadWindow = urgent || daysToL <= leadLimit;

    let shareToday = 0;
    if (urgent || daysToL <= 0 || remaining <= PLAN_CONSTANTS.SMALL_REMAINING_THRESHOLD) {
      shareToday = remaining;
    } else {
      const rawShare = remaining / (daysToL + 1);
      const rounded = roundUpTo15(rawShare);
      shareToday = Math.min(
        PLAN_CONSTANTS.MAX_SHARE_MINUTES,
        Math.max(PLAN_CONSTANTS.MIN_SHARE_MINUTES, rounded),
      );
    }

    const urgencyPoints = urgent
      ? PLAN_CONSTANTS.URGENCY_POINTS_URGENT
      : Math.max(0, PLAN_CONSTANTS.URGENCY_BASE - PLAN_CONSTANTS.URGENCY_SLOPE * daysToDue);
    const gradePoints = Math.min(PLAN_CONSTANTS.GRADE_POINTS_CAP, a.percentOfGrade ?? 0);
    const isMajor = courseMajorMap.get(a.courseId) ?? false;
    const majorBonus =
      input.prefs.majorWeighting && isMajor && daysToDue <= PLAN_CONSTANTS.MAJOR_BONUS_DAYS
        ? PLAN_CONSTANTS.MAJOR_BONUS_POINTS
        : 0;
    const score = urgencyPoints + gradePoints + majorBonus;

    enriched.push({
      assignment: a,
      remaining,
      sizeClass,
      daysToDue,
      urgent,
      daysToL,
      inLeadWindow,
      shareToday,
      score,
    });
  }

  const compareCandidates = (x: EnrichedCandidate, y: EnrichedCandidate): number => {
    if (y.score !== x.score) return y.score - x.score;
    if (x.assignment.dueDate !== y.assignment.dueDate) {
      return x.assignment.dueDate.localeCompare(y.assignment.dueDate);
    }
    return x.assignment.name.localeCompare(y.assignment.name);
  };

  const activeToday = enriched.filter((c) => c.inLeadWindow).sort(compareCandidates);

  const selectedChrono = BLOCK_CHRONO_ORDER.filter((b) => input.selectedBlocks.includes(b));
  const blockCapacities = new Map<BlockName, number>();

  for (const b of selectedChrono) {
    const win = input.blockWindows[b];
    const startMins = parseTimeMinutes(win.start);
    const endMins = parseTimeMinutes(win.end);
    if (nowMinutes >= endMins) {
      blockCapacities.set(b, 0);
      continue;
    }
    const effectiveStart = Math.max(startMins, nowMinutes);
    const rawWindow = Math.max(0, endMins - effectiveStart);
    const cap = roundDownTo15(rawWindow * PLAN_CONSTANTS.CAPACITY_RATIO);
    blockCapacities.set(b, cap);
  }

  const activeBlocks = selectedChrono.filter((b) => (blockCapacities.get(b) ?? 0) > 0);

  const fillOrder: BlockName[] = [];
  if (activeBlocks.includes(input.prefs.heavyBlock)) {
    fillOrder.push(input.prefs.heavyBlock);
  }
  for (const b of activeBlocks) {
    if (!fillOrder.includes(b)) fillOrder.push(b);
  }

  function orderForBlock(block: BlockName, pool: EnrichedCandidate[]): EnrichedCandidate[] {
    const pinnedItem = input.pinned
      ? pool.filter((c) => c.assignment.id === input.pinned)
      : [];
    const restPool = pool.filter((c) => c.assignment.id !== input.pinned);

    const urgentList = restPool.filter((c) => c.urgent).sort(compareCandidates);
    const nonUrgent = restPool.filter((c) => !c.urgent).sort(compareCandidates);

    if (block === 'Morning') {
      const heavies = nonUrgent.filter((c) => c.sizeClass === 'heavy');
      const smallers = nonUrgent.filter((c) => c.sizeClass !== 'heavy');
      const mixed: EnrichedCandidate[] = [];
      let hi = 0;
      let si = 0;
      while (hi < heavies.length || si < smallers.length) {
        if (hi < heavies.length) mixed.push(heavies[hi++]);
        if (si < smallers.length) mixed.push(smallers[si++]);
      }
      return [...pinnedItem, ...urgentList, ...mixed];
    }

    if (block === 'Evening') {
      const heavies = nonUrgent.filter((c) => c.sizeClass === 'heavy');
      const mediums = nonUrgent.filter((c) => c.sizeClass === 'medium');
      const smalls = nonUrgent.filter((c) => c.sizeClass === 'small');
      return [...pinnedItem, ...urgentList, ...heavies, ...mediums, ...smalls];
    }

    const nightAllowed = nonUrgent.filter(
      (c) => c.sizeClass !== 'heavy' || c.daysToDue <= PLAN_CONSTANTS.NIGHT_HEAVY_MAX_DAYS,
    );
    return [...pinnedItem, ...urgentList, ...nightAllowed];
  }

  const blockSessions = new Map<BlockName, PlannedSessionItem[]>();
  for (const b of selectedChrono) blockSessions.set(b, []);

  const shareLeft = new Map<string, number>();
  for (const c of activeToday) shareLeft.set(c.assignment.id, c.shareToday);

  for (const b of fillOrder) {
    let remCap = blockCapacities.get(b) ?? 0;
    const availablePool = activeToday.filter((c) => (shareLeft.get(c.assignment.id) ?? 0) > 0);
    const ordered = orderForBlock(b, availablePool);

    for (const cand of ordered) {
      const needed = shareLeft.get(cand.assignment.id) ?? 0;
      if (needed <= 0) continue;
      if (remCap < PLAN_CONSTANTS.STEP_MINUTES) break;

      if (needed <= remCap) {
        blockSessions.get(b)!.push({
          kind: 'session',
          assignment: cand.assignment,
          minutesPlanned: needed,
          sizeClass: cand.sizeClass,
          urgent: cand.urgent,
          continues: false,
        });
        shareLeft.set(cand.assignment.id, 0);
        remCap -= needed;
      } else {
        const take = roundDownTo15(remCap);
        if (take >= PLAN_CONSTANTS.STEP_MINUTES) {
          blockSessions.get(b)!.push({
            kind: 'session',
            assignment: cand.assignment,
            minutesPlanned: take,
            sizeClass: cand.sizeClass,
            urgent: cand.urgent,
            continues: true,
          });
          shareLeft.set(cand.assignment.id, needed - take);
          remCap -= take;
        }
      }
    }
  }

  for (const move of input.manualMoves) {
    if (!blockSessions.has(move.targetBlock)) continue;
    let movedSession: PlannedSessionItem | null = null;
    for (const [, list] of blockSessions) {
      const idx = list.findIndex((s) => s.assignment.id === move.assignmentId);
      if (idx !== -1) {
        movedSession = list.splice(idx, 1)[0];
        break;
      }
    }
    if (!movedSession) {
      const cand = enriched.find((c) => c.assignment.id === move.assignmentId);
      if (cand) {
        movedSession = {
          kind: 'session',
          assignment: cand.assignment,
          minutesPlanned: cand.shareToday,
          sizeClass: cand.sizeClass,
          urgent: cand.urgent,
          continues: false,
        };
        shareLeft.set(cand.assignment.id, 0);
      }
    }
    if (movedSession) {
      const targetList = blockSessions.get(move.targetBlock)!;
      const pos = Math.min(Math.max(0, move.position), targetList.length);
      targetList.splice(pos, 0, movedSession);
    }
  }

  const placedIds = new Set<string>();
  for (const [, list] of blockSessions) {
    for (const s of list) placedIds.add(s.assignment.id);
  }
  const notFitting = activeToday
    .filter((c) => !placedIds.has(c.assignment.id))
    .map((c) => c.assignment);

  const includeBreaks =
    input.prefs.breaks === 'always' || input.selectedBlocks.length >= 2;

  const finalBlocks: PlannedBlock[] = [];
  const allSessionItems: PlannedSessionItem[] = [];
  let totalWork = 0;
  let totalBreaks = 0;

  for (const b of selectedChrono) {
    const sessions = blockSessions.get(b) ?? [];
    const entries: BlockEntry[] = [];
    let workRun = 0;

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      entries.push(s);
      allSessionItems.push(s);
      totalWork += s.minutesPlanned;
      workRun += s.minutesPlanned;

      const hasMoreInBlock = i < sessions.length - 1;
      if (includeBreaks && hasMoreInBlock && workRun >= PLAN_CONSTANTS.BREAK_WORK_RUN_MINUTES) {
        entries.push({
          kind: 'break',
          minutes: PLAN_CONSTANTS.BREAK_DURATION_MINUTES,
        });
        totalBreaks += PLAN_CONSTANTS.BREAK_DURATION_MINUTES;
        workRun = 0;
      }
    }

    finalBlocks.push({
      block: b,
      windowStart: input.blockWindows[b].start,
      windowEnd: input.blockWindows[b].end,
      capacityMinutes: blockCapacities.get(b) ?? 0,
      entries,
    });
  }

  let cursorMinutes: number | null = null;
  for (const pb of finalBlocks) {
    if (pb.entries.length === 0) continue;
    const blockStart = Math.max(nowMinutes, parseTimeMinutes(pb.windowStart));
    cursorMinutes = cursorMinutes === null ? blockStart : Math.max(cursorMinutes, blockStart);
    for (const entry of pb.entries) {
      cursorMinutes += entry.kind === 'session' ? entry.minutesPlanned : entry.minutes;
    }
  }
  const finishTime = cursorMinutes !== null ? formatTime12h(cursorMinutes) : null;

  const sortedByDue = [...enriched].sort((a, b) =>
    a.assignment.dueDate.localeCompare(b.assignment.dueDate),
  );

  const usualDayCapacity = BLOCK_CHRONO_ORDER.filter((b) => input.usualBlocks.includes(b)).reduce(
    (sum, b) => {
      const w = input.blockWindows[b];
      const mins = Math.max(0, parseTimeMinutes(w.end) - parseTimeMinutes(w.start));
      return sum + roundDownTo15(mins * PLAN_CONSTANTS.CAPACITY_RATIO);
    },
    0,
  );

  const todayRemainingCapacity = selectedChrono.reduce(
    (sum, b) => sum + (blockCapacities.get(b) ?? 0),
    0,
  );

  let cumulativeWork = 0;
  let enoughTime: ShortfallNotice | null = null;

  for (const cand of sortedByDue) {
    cumulativeWork += cand.remaining;
    const daysFuture = Math.max(0, cand.daysToDue);
    const availableCap = todayRemainingCapacity + daysFuture * usualDayCapacity;
    if (cumulativeWork > availableCap) {
      const missingMins = cumulativeWork - availableCap;
      const missingHours = Math.round((missingMins / 60) * 10) / 10;
      const suggestedBlock: BlockName = !input.selectedBlocks.includes('Morning')
        ? 'Morning'
        : !input.selectedBlocks.includes('Evening')
          ? 'Evening'
          : 'Night';
      enoughTime = {
        assignmentId: cand.assignment.id,
        assignmentName: cand.assignment.name,
        dueDate: cand.assignment.dueDate,
        missingHours,
        suggestedBlock,
      };
      break;
    }
  }

  return {
    blocks: finalBlocks,
    items: allSessionItems,
    totals: {
      workMinutes: totalWork,
      breakMinutes: totalBreaks,
      loadMinutes: totalWork + totalBreaks,
    },
    finishTime,
    notFitting,
    enoughTime,
    flags: {
      needsBlocks: false,
      needsConfirmAfterHours: false,
    },
  };
}
