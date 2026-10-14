import React from 'react';
import { CatchUpPace, PACE_MINUTES_PER_DAY } from '../catchUp';
import { CatchUpModel, ClassPace, MAX_SENSIBLE_HOURS, PACE_MAX_MINUTES, PaceOutcome } from '../catchUpModel';
import { realisticC } from '../cGoal';
import { planDayLabel } from '../studyPlan';
import { hoursLabel } from '../termLogic';
import { useCatchUp } from '../useCatchUp';
import { AggressiveHoursPicker } from './AggressiveHoursPicker';

const label = (p: CatchUpPace) => PACE_MINUTES_PER_DAY[p].label;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "today", "tomorrow" or "by Wed, Oct 21". */
export function byDay(date: string, today: string): string {
  const day = planDayLabel(date, today);
  return day === 'Today' ? 'today' : day === 'Tomorrow' ? 'tomorrow' : `by ${day}`;
}

// Words for the day past-due work should be done by: your goal date, or the term's last day.
export function limitText(model: CatchUpModel, today: string): string {
  const day = planDayLabel(model.limit.date, today);
  if (model.limit.kind === 'goal') return `your goal date (${day})`;
  if (model.limit.kind === 'termEnd') return `the last day of the term (${day})`;
  return `the next ${model.horizonDays} days`;
}

// The pace comes after the work is worked out: each pace is set up from the due dates, the last day of the term (or
// your goal date), breaks and its time a day. Chill and Normal add time when their usual amount would leave a class
// behind; Aggressive uses your own hours. Every number comes from the shared Catch Up model.
export const PacePicker: React.FC<{ model: CatchUpModel; today: string }> = ({ model, today }) => {
  const { catchUp, save } = useCatchUp();
  const { needed, minutesNeeded } = model;
  const by = limitText(model, today);
  const nothing = needed.count === 0;
  const chosen = model.paces[catchUp.pace];

  // Why a pace does not work, in one short line.
  const trouble = (o: PaceOutcome): string => {
    if (minutesNeeded === null) return `No amount of time a day keeps every class on track by ${by}.`;
    if (minutesNeeded > o.minutesPerDay) return `Needs about ${hoursLabel(minutesNeeded)} hours a day.`;
    if (o.lateIds.length > 0) return `${plural(o.lateIds.length, 'task')} would end up after the due date.`;
    return `Not every class is caught up by ${by}.`;
  };

  // The time a day, and whether the pace went up to keep up (or to the most it goes up to).
  const hoursLine = (o: PaceOutcome): string => {
    const note =
      o.pace === 'aggressive'
        ? ', set below'
        : !o.raised
          ? ''
          : o.possible
            ? ', raised to keep up'
            : o.minutesPerDay >= PACE_MAX_MINUTES[o.pace]
              ? `, the most ${label(o.pace)} goes up to`
              : '';
    return `About ${hoursLabel(o.minutesPerDay)} hours a day${note}.`;
  };

  const card = (o: PaceOutcome): { headline: string; detail: string } => {
    if (nothing) return { headline: 'Nothing to catch up', detail: 'Nothing needed for a C is left to do.' };
    if (!o.possible) return { headline: 'Not possible', detail: trouble(o) };
    return {
      headline: o.caughtUpDate ? `Caught up ${byDay(o.caughtUpDate, today)}` : 'Nothing past due',
      detail:
        model.outOfReachIds.size > 0
          ? 'Every class that can still reach a C keeps up with its due dates.'
          : 'Every class keeps up with its due dates.',
    };
  };

  return (
    <section aria-labelledby="pace-heading" className="p-5 rounded-lg border border-border bg-surface space-y-4">
      <div>
        <h2 id="pace-heading" className="text-lg font-bold">
          6. Your pace
        </h2>
        <p className="text-sm text-muted">
          Each pace is set up from your due dates, {by}, your breaks and its time a day. Chill and Normal add time when
          their usual amount would leave a class behind. Aggressive uses your own hours.
        </p>
      </div>

      <GoalChoice model={model} today={today} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['aggressive', 'normal', 'chill'] as CatchUpPace[]).map((pace) => {
          const o = model.paces[pace];
          const selected = catchUp.pace === pace;
          const blocked = !o.possible && !nothing;
          const v = card(o);
          return (
            <button
              key={pace}
              type="button"
              aria-pressed={selected}
              disabled={blocked && !selected}
              onClick={() => void save({ pace })}
              className={`p-4 rounded-lg border-2 text-left flex flex-col justify-between gap-3 min-h-[44px] ${
                selected ? 'border-accent bg-bg' : blocked ? 'border-dashed border-border bg-bg cursor-not-allowed' : 'border-border bg-bg hover:border-accent'
              }`}
            >
              <span>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold text-base">{label(pace)}</span>
                  {selected && <span className="text-xs px-2 py-0.5 rounded bg-accent text-on-accent font-bold">Chosen</span>}
                </span>
                <span className="block text-xs text-muted mt-1">{hoursLine(o)}</span>
              </span>
              <span className="space-y-1">
                <span className={`block text-lg font-bold ${blocked ? 'text-text' : 'text-accent'}`}>{v.headline}</span>
                <span className="block text-xs text-muted">{v.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {!nothing && model.classes.length > 0 && (
        <div className="text-sm">
          <p className="font-medium">At the {label(catchUp.pace)} pace, class by class:</p>
          <ul className="mt-1 space-y-1 text-muted">
            {chosen.classes.map((k) => (
              <li key={k.courseId}>
                <span className="text-text font-medium">{k.name}</span>: {classPaceText(k, model, today)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {model.cannotBeOnTimeIds.size > 0 && (
        <p className="text-xs text-muted">
          {plural(model.cannotBeOnTimeIds.size, 'task')} needed for a C cannot be finished by{' '}
          {model.cannotBeOnTimeIds.size === 1 ? 'its' : 'their'} due date at any pace (due too soon for{' '}
          {model.cannotBeOnTimeIds.size === 1 ? 'its' : 'their'} size). Asking for an extension could help.
        </p>
      )}

      <FeasibilityNotice model={model} today={today} />

      {catchUp.pace === 'aggressive' && <AggressiveHoursPicker />}
    </section>
  );
};

// One class at one pace, in a few words.
export function classPaceText(k: ClassPace, model: CatchUpModel, today: string): string {
  const day = (d: string) => planDayLabel(d, today);
  const need = model.classes.find((c) => c.courseId === k.courseId);
  if (!need || need.neededCount === 0) {
    return need?.goal.status === 'already' ? 'at a C or better, nothing needed' : 'nothing to do for a C right now';
  }
  if (k.unplanned) return 'does not fit in the plan';
  const within =
    model.limit.kind === 'goal' ? 'by your goal date' : model.limit.kind === 'termEnd' ? 'this term' : `in the next ${model.horizonDays} days`;
  const parts: string[] = [];
  if (!k.caughtUpDate) parts.push('nothing past due');
  else if (k.caughtUpDate <= model.limit.date) parts.push(`caught up ${byDay(k.caughtUpDate, today)}`);
  else parts.push(`not caught up ${within}: it would take until ${day(k.caughtUpDate)}`);
  if (k.lateIds.length > 0) parts.push(`${plural(k.lateIds.length, 'task')} would end up after the due date`);
  if (k.lastDate && k.lastDate !== k.caughtUpDate) parts.push(`last task for a C ${day(k.lastDate)}`);
  if (!realisticC(need.goal)) parts.push('a C is out of reach on the points');
  return parts.join('; ');
}

// As soon as your pace allows, or by a date you pick.
const GoalChoice: React.FC<{ model: CatchUpModel; today: string }> = ({ model, today }) => {
  const { catchUp, save } = useCatchUp();
  const { goalDate, termEnd } = model;
  const day = (d: string) => planDayLabel(d, today);
  const notes: string[] = [];
  if (goalDate.state === 'manualMissing') notes.push('Pick a date to see what it takes. Until then, the plan goes as fast as your pace allows.');
  if (goalDate.state === 'manualPast') notes.push('That date has passed. Pick today or a later date.');
  if (goalDate.afterTermEnd && termEnd) notes.push(`That is after the last day of the term (${day(termEnd)}), so the term's last day is used.`);
  if (goalDate.onBreak) notes.push(`That day is in ${goalDate.onBreak.label}.`);

  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium mb-1">When to be caught up</legend>
      <div className="flex flex-wrap items-center gap-x-6">
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="radio"
            name="deadline-mode"
            checked={catchUp.deadlineMode === 'auto'}
            onChange={() => void save({ deadlineMode: 'auto' })}
            className="w-5 h-5"
          />
          <span>As soon as my pace allows (automatic)</span>
        </label>
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="radio"
            name="deadline-mode"
            checked={catchUp.deadlineMode === 'manual'}
            onChange={() => void save({ deadlineMode: 'manual' })}
            className="w-5 h-5"
          />
          <span>By a date I pick</span>
        </label>
        {catchUp.deadlineMode === 'manual' && (
          <span className="flex items-center gap-2">
            <label htmlFor="catch-up-deadline" className="text-sm font-medium">
              My goal date
            </label>
            <input
              id="catch-up-deadline"
              type="date"
              min={today}
              value={catchUp.deadline ?? ''}
              onChange={(e) => void save({ deadline: e.target.value || undefined })}
              className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
            />
          </span>
        )}
      </div>
      {notes.map((n) => (
        <p key={n} className="text-xs text-muted">
          {n}
        </p>
      ))}
    </fieldset>
  );
};

// Shown only when the chosen pace does not work. Says which classes fall behind, and offers the fixes.
export const FeasibilityNotice: React.FC<{ model: CatchUpModel; today: string }> = ({ model, today }) => {
  const { save } = useCatchUp();
  const { goalDate, paces, chosen, recommended, soonest, hoursPerDayNeeded: need, needed } = model;
  const o = paces[chosen];
  if (o.possible || needed.count === 0) return null;
  const day = (d: string) => planDayLabel(d, today);
  const manual = goalDate.state === 'manual' && goalDate.date !== null;
  const realistic = need !== null && need <= MAX_SENSIBLE_HOURS;
  const perBlock = need !== null ? Math.ceil((need / 3) * 2) / 2 : null;
  const aggressiveHours = paces.aggressive.minutesPerDay / 60;
  const behind = o.classes.filter((k) => !k.onTrack && !model.outOfReachIds.has(k.courseId)).map((k) => k.name);
  const names =
    behind.length <= 1
      ? behind.join('')
      : behind.length <= 3
        ? `${behind.slice(0, -1).join(', ')} and ${behind[behind.length - 1]}`
        : `${behind.slice(0, 3).join(', ')} and ${behind.length - 3} more`;

  const reasons: string[] = [];
  if (behind.length > 0) {
    reasons.push(`At ${label(chosen)}, ${names} ${behind.length === 1 ? 'is' : 'are'} not on track by ${limitText(model, today)}.`);
  }
  if (manual && o.earliest) reasons.push(`At ${label(chosen)}, the soonest goal date is ${day(o.earliest)}.`);
  if (!recommended) {
    if (manual && soonest && soonest.pace !== chosen) reasons.push(`No pace makes it by then; the soonest is ${day(soonest.date)} at ${label(soonest.pace)}.`);
    if (need === null) {
      reasons.push('No amount of time a day fixes this. A later goal date, fewer classes or an extension could help.');
    } else if (realistic) reasons.push(`It would take about ${need} hours a day.`);
    else reasons.push(`It would take about ${need} hours a day, more than is realistic. A later goal date, fewer classes or an extension could help.`);
  }

  return (
    <div role="alert" className="p-4 rounded border-2 border-focus bg-bg space-y-3 text-sm">
      <p className="font-bold">Not possible at this pace</p>
      {reasons.map((r) => (
        <p key={r}>{r}</p>
      ))}
      <div className="flex flex-wrap gap-2">
        {recommended && (
          <button
            type="button"
            onClick={() => void save({ pace: recommended })}
            className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
          >
            Switch to {label(recommended)}
          </button>
        )}
        {manual && o.earliest && (
          <button
            type="button"
            onClick={() => void save({ deadlineMode: 'manual', deadline: o.earliest! })}
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface font-medium"
          >
            Move my goal date to {day(o.earliest)}
          </button>
        )}
        {!recommended && realistic && perBlock !== null && perBlock * 3 > aggressiveHours && (
          <button
            type="button"
            onClick={() => void save({ pace: 'aggressive', aggressiveHours: { Morning: perBlock, Evening: perBlock, Night: perBlock } })}
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-surface font-medium"
          >
            Use Aggressive at {perBlock * 3} hours a day
          </button>
        )}
      </div>
    </div>
  );
};
