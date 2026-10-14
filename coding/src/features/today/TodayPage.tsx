import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../../shared/components/AppShell';
import { useApp, getTodayDateString } from '../../app/AppContext';
import { buildDayPlan, PlannedSessionItem } from './planEngine';
import { BlockName } from '../../shared/data/schemas';

export const TodayPage: React.FC = () => {
  const {
    settings,
    courses,
    assignments,
    todayStudyDay,
    saveTodayPlanState,
    upsertAssignment,
    completeAssignmentWithReward,
    timer,
  } = useApp();
  const navigate = useNavigate();

  const [overrideShowPlan, setOverrideShowPlan] = useState(false);
  const [showFullFromCard, setShowFullFromCard] = useState(false);
  const [confirmAfter8pm, setConfirmAfter8pm] = useState(false);
  const [dismissedBreaks, setDismissedBreaks] = useState<Set<string>>(new Set());

  const todayStr = getTodayDateString();
  const selectedBlocks: BlockName[] = todayStudyDay?.blocks ?? settings.usualBlocks;
  const manualMoves = todayStudyDay?.manualMoves ?? [];

  const nowHour = new Date().getHours();
  const nowStr =
    nowHour >= 20 && !confirmAfter8pm ? `${todayStr}T20:30` : `${todayStr}T09:00`;

  const plan = useMemo(
    () =>
      buildDayPlan({
        now: nowStr,
        selectedBlocks,
        blockWindows: settings.blockWindows,
        usualBlocks: settings.usualBlocks,
        assignments,
        courses,
        prefs: {
          spacingEarly: settings.spacingEarly,
          heavyBlock: settings.heavyBlock,
          majorWeighting: settings.majorWeighting,
          breaks: settings.breaks,
        },
        manualMoves,
        pinned: timer.running ? timer.assignmentId : null,
      }),
    [nowStr, selectedBlocks, settings, assignments, courses, manualMoves, timer],
  );

  const toggleBlock = async (b: BlockName) => {
    const nextBlocks = selectedBlocks.includes(b)
      ? selectedBlocks.filter((x) => x !== b)
      : [...selectedBlocks, b];
    await saveTodayPlanState({
      date: todayStr,
      blocks: nextBlocks,
      accepted: false,
      manualMoves,
    });
  };

  const moveItem = async (
    assignmentId: string,
    targetBlock: BlockName,
    newPosition: number,
  ) => {
    const filtered = manualMoves.filter((m) => m.assignmentId !== assignmentId);
    await saveTodayPlanState({
      date: todayStr,
      blocks: selectedBlocks,
      accepted: todayStudyDay?.accepted ?? false,
      manualMoves: [...filtered, { assignmentId, targetBlock, position: newPosition }],
    });
  };

  if (!settings.dayPlanHome && !overrideShowPlan) {
    const upcoming = assignments
      .filter((a) => a.status !== 'done' && !a.notNow)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return (
      <AppShell title={`Today, ${todayStr}`}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-surface p-4 rounded border border-border">
            <p className="text-sm">Showing your upcoming assignments by due date.</p>
            <button
              type="button"
              onClick={() => setOverrideShowPlan(true)}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Show my day plan
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div className="p-6 rounded border border-border bg-surface text-center space-y-3">
              <p>No upcoming assignments yet.</p>
              <Link
                to="/setup/courses"
                className="inline-block min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Add a course or assignment
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => (
                <li
                  key={a.id}
                  className="p-4 rounded border border-border bg-surface flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-bold">{a.name}</span>
                    <span className="text-sm text-muted ml-2">Due {a.dueDate}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/start/${a.id}`}
                      className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium flex items-center"
                    >
                      Help me start
                    </Link>
                    <button
                      type="button"
                      onClick={() => void upsertAssignment({ ...a, notNow: true })}
                      className="min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text text-sm"
                    >
                      Not now
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Today, ${todayStr}`}>
      <div className="space-y-6">
        <section
          aria-label="Study blocks"
          className="p-4 rounded border border-border bg-surface space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              {selectedBlocks.length === 0
                ? 'Which parts of your day are you studying?'
                : `Study blocks: ${selectedBlocks.join(', ')}`}
            </span>
            <div className="flex flex-wrap gap-2">
              {(['Morning', 'Evening', 'Night'] as BlockName[]).map((b) => {
                const active = selectedBlocks.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void toggleBlock(b)}
                    className={`min-h-[44px] px-3 py-1 rounded border font-medium ${
                      active
                        ? 'bg-accent text-on-accent border-accent'
                        : 'bg-bg text-text border-border'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedBlocks.length >= 2 && (
            <p className="text-sm text-muted">
              Today&apos;s load: about {Math.round((plan.totals.loadMinutes / 60) * 10) / 10} hours ({plan.totals.workMinutes} min work + {plan.totals.breakMinutes} min breaks)
            </p>
          )}
          {plan.finishTime && (
            <p className="text-sm font-medium">Done around {plan.finishTime}</p>
          )}

          {plan.enoughTime && (
            <div role="status" className="p-3 rounded border border-border bg-bg text-sm flex flex-wrap items-center justify-between gap-2">
              <span>
                {plan.enoughTime.assignmentName} needs about {plan.enoughTime.missingHours} more hours than your blocks have before {plan.enoughTime.dueDate}. Add a block?
              </span>
              <button
                type="button"
                onClick={() => void toggleBlock(plan.enoughTime!.suggestedBlock)}
                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-text font-medium"
              >
                Propose {plan.enoughTime.suggestedBlock}
              </button>
            </div>
          )}
        </section>

        {plan.flags.needsConfirmAfterHours && (
          <div className="p-4 rounded border border-border bg-surface space-y-3">
            <p>It is after 8:00 pm. ADHD1X does not plan late-night work unless you ask.</p>
            <button
              type="button"
              onClick={() => setConfirmAfter8pm(true)}
              className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Show a plan for tonight anyway
            </button>
          </div>
        )}

        {settings.todayView === 'card' && !showFullFromCard && plan.items.length > 0 ? (
          <section className="p-6 rounded border-2 border-accent bg-surface space-y-4">
            <span className="text-xs uppercase tracking-wide text-muted">Do this next</span>
            <h2 className="text-xl font-bold">{plan.items[0].assignment.name}</h2>
            <p className="text-sm text-muted">
              About {plan.items[0].minutesPlanned} min today • Due {plan.items[0].assignment.dueDate}
              {plan.items[0].urgent ? ' * due tomorrow/soon' : ''}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/start/${plan.items[0].assignment.id}`}
                className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium flex items-center"
              >
                Help me start
              </Link>
              <button
                type="button"
                onClick={() => setShowFullFromCard(true)}
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
              >
                See full plan
              </button>
            </div>
          </section>
        ) : (
          <div className="space-y-6">
            {plan.items.length === 0 && !plan.flags.needsConfirmAfterHours && (
              <div className="p-6 rounded border border-border bg-surface text-center space-y-3">
                <p>No tasks scheduled for today&apos;s blocks yet.</p>
                <div className="flex justify-center gap-3">
                  <Link
                    to="/setup/courses"
                    className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium flex items-center"
                  >
                    Add a course or assignment
                  </Link>
                </div>
              </div>
            )}

            {plan.blocks.map((pb) => {
              const sessionEntries = pb.entries.filter(
                (e): e is PlannedSessionItem => e.kind === 'session',
              );
              return (
                <section
                  key={pb.block}
                  aria-label={`${pb.block} block`}
                  className="p-4 rounded border border-border bg-surface space-y-3"
                >
                  <h2 className="font-bold text-lg">
                    {pb.block} ({pb.windowStart} to {pb.windowEnd})
                  </h2>
                  {pb.entries.length === 0 ? (
                    <p className="text-sm text-muted">Nothing scheduled in this block.</p>
                  ) : (
                    <ol className="space-y-3">
                      {pb.entries.map((entry, idx) => {
                        if (entry.kind === 'break') {
                          const breakKey = `${pb.block}-break-${idx}`;
                          if (dismissedBreaks.has(breakKey)) return null;
                          return (
                            <li
                              key={breakKey}
                              className="p-3 rounded border border-dashed border-border bg-bg flex items-center justify-between text-sm"
                            >
                              <span>Break, {entry.minutes} min (optional)</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setDismissedBreaks(new Set([...dismissedBreaks, breakKey]))
                                }
                                className="min-h-[44px] px-3 py-1 underline text-muted"
                              >
                                Dismiss
                              </button>
                            </li>
                          );
                        }

                        const sIdx = sessionEntries.findIndex(
                          (s) => s.assignment.id === entry.assignment.id,
                        );
                        return (
                          <li
                            key={entry.assignment.id}
                            className="p-4 rounded border border-border bg-bg flex flex-wrap items-center justify-between gap-3"
                          >
                            <div>
                              <span className="font-bold">{entry.assignment.name}</span>
                              <span className="text-sm text-muted ml-2">
                                ~{entry.minutesPlanned}m • due {entry.assignment.dueDate}
                                {entry.continues ? ' (continues)' : ''}
                              </span>
                              {entry.urgent && (
                                <span className="ml-2 text-xs font-bold text-due-soon">
                                  * due tomorrow / within 24h
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/start/${entry.assignment.id}`}
                                className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium flex items-center"
                              >
                                Help me start
                              </Link>
                              <button
                                type="button"
                                onClick={() => void completeAssignmentWithReward(entry.assignment)}
                                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-xs"
                              >
                                I finished this
                              </button>
                              <button
                                type="button"
                                disabled={sIdx <= 0}
                                onClick={() =>
                                  void moveItem(entry.assignment.id, pb.block, Math.max(0, sIdx - 1))
                                }
                                className="min-h-[44px] px-2 py-1 rounded border border-border bg-surface text-xs disabled:opacity-40"
                              >
                                Move up
                              </button>
                              <button
                                type="button"
                                disabled={sIdx >= sessionEntries.length - 1}
                                onClick={() =>
                                  void moveItem(entry.assignment.id, pb.block, sIdx + 1)
                                }
                                className="min-h-[44px] px-2 py-1 rounded border border-border bg-surface text-xs disabled:opacity-40"
                              >
                                Move down
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void upsertAssignment({ ...entry.assignment, notNow: true })
                                }
                                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-xs"
                              >
                                Not now
                              </button>
                              <Link
                                to={`/assignments/${entry.assignment.id}`}
                                className="min-h-[44px] px-3 py-1 rounded border border-border bg-surface text-xs flex items-center"
                              >
                                Details
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {plan.items.length > 0 && !todayStudyDay?.accepted && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                void saveTodayPlanState({
                  date: todayStr,
                  blocks: selectedBlocks,
                  accepted: true,
                  manualMoves,
                })
              }
              className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Looks good
            </button>
          </div>
        )}

        {plan.items.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => navigate(`/start/${plan.items[0].assignment.id}`)}
              className="min-h-[44px] px-6 py-3 rounded bg-accent text-on-accent font-bold"
            >
              Help me start top task
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
};
